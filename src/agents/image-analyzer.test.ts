import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted so parseMock is available in vi.mock factory (hoisted to top)
const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))

vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock } },
}))

// Mock sharp to avoid real image processing
vi.mock('sharp', () => ({
  default: () => ({
    resize: () => ({
      jpeg: () => ({
        toBuffer: async () => Buffer.from('fake-image-bytes'),
      }),
    }),
  }),
}))

import { runImageAnalyzer } from './image-analyzer'
import { AnalysisResultSchema } from './schemas'

beforeEach(() => {
  parseMock.mockReset()
  parseMock.mockResolvedValue({
    parsed_output: {
      object: 'Laptop',
      condition: 'gut',
      category: 'Elektronik',
      titleDraft: 'Apple MacBook Pro 2020',
      descriptionDraft: 'Gut erhaltener Laptop in einwandfreiem Zustand.',
    },
    usage: { input_tokens: 100, output_tokens: 50 },
  })
})

describe('runImageAnalyzer', () => {
  it('returns typed AnalysisResult + trace', async () => {
    const { output, trace } = await runImageAnalyzer({ photoPaths: ['/fake/x.jpg'] })
    expect(AnalysisResultSchema.safeParse(output).success).toBe(true)
    expect(output.condition).toBe('gut')
    expect(output.titleDraft.length).toBeLessThanOrEqual(60)
    expect(trace.agent).toBe('ImageAnalyzer')
    expect(trace.modelUsed).toBe('claude-sonnet-4-6')
    expect(typeof trace.durationMs).toBe('number')
    expect(trace.durationMs).toBeGreaterThanOrEqual(0)
    expect(new Date(trace.completedAt).toString()).not.toBe('Invalid Date')
    expect(trace.inputTokens).toBe(100)
    expect(trace.outputTokens).toBe(50)
  })

  it('calls anthropic.messages.parse exactly once', async () => {
    await runImageAnalyzer({ photoPaths: ['/fake/x.jpg'] })
    expect(parseMock).toHaveBeenCalledTimes(1)
  })

  it('passes one image block per photoPath plus a text prompt', async () => {
    await runImageAnalyzer({ photoPaths: ['/a.jpg', '/b.jpg', '/c.jpg'] })
    const call = parseMock.mock.calls[0][0]
    const content = call.messages[0].content
    const imageBlocks = content.filter((c: { type: string }) => c.type === 'image')
    const textBlocks = content.filter((c: { type: string }) => c.type === 'text')
    expect(imageBlocks).toHaveLength(3)
    expect(textBlocks).toHaveLength(1)
  })

  it('uses zodOutputFormat for structured output (output_config present)', async () => {
    await runImageAnalyzer({ photoPaths: ['/x.jpg'] })
    const call = parseMock.mock.calls[0][0]
    expect(call.output_config).toBeDefined()
    expect(call.output_config.format).toBeDefined()
  })

  it('is stateless — second call with new args is independent', async () => {
    await runImageAnalyzer({ photoPaths: ['/a.jpg'] })
    await runImageAnalyzer({ photoPaths: ['/b.jpg'] })
    expect(parseMock).toHaveBeenCalledTimes(2)
  })
})
