import { describe, it, expect, vi, beforeEach } from 'vitest'

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock } },
}))

import { runPriceEstimator } from './price-estimator'
import { PriceEstimateSchema } from './schemas'

const analysis = {
  object: 'Laptop', condition: 'gut' as const, category: 'Elektronik',
  titleDraft: 'MacBook', descriptionDraft: 'Gut erhalten',
}

beforeEach(() => {
  parseMock.mockReset()
  parseMock.mockResolvedValue({
    parsed_output: { suggestedPriceCHF: 850, confidence: 'medium', rationale: 'Vergleichbar mit Marktpreisen' },
    usage: { input_tokens: 30, output_tokens: 15 },
  })
})

describe('runPriceEstimator', () => {
  it('returns valid PriceEstimate and trace', async () => {
    const { output, trace } = await runPriceEstimator({ analysis })
    expect(PriceEstimateSchema.safeParse(output).success).toBe(true)
    expect(output.suggestedPriceCHF).toBeGreaterThanOrEqual(0)
    expect(['low', 'medium', 'high']).toContain(output.confidence)
    expect(trace.agent).toBe('PriceEstimator')
  })

  it('calls anthropic.messages.parse once with text-only content', async () => {
    await runPriceEstimator({ analysis })
    expect(parseMock).toHaveBeenCalledTimes(1)
    const content = parseMock.mock.calls[0][0].messages[0].content
    // text-only: either a string or an array of text blocks only
    if (Array.isArray(content)) {
      const imageBlocks = content.filter((c: { type: string }) => c.type === 'image')
      expect(imageBlocks).toHaveLength(0)
    } else {
      expect(typeof content).toBe('string')
    }
  })

  it('passes analysis fields into the prompt', async () => {
    await runPriceEstimator({ analysis })
    const text = JSON.stringify(parseMock.mock.calls[0][0].messages)
    expect(text).toContain('Laptop')
    expect(text).toContain('gut')
  })
})

describe('src/agents/index.ts barrel', () => {
  it('re-exports all four agent functions', async () => {
    const mod = await import('./index')
    expect(typeof mod.runImageAnalyzer).toBe('function')
    expect(typeof mod.runQuestionGenerator).toBe('function')
    expect(typeof mod.runListingWriter).toBe('function')
    expect(typeof mod.runPriceEstimator).toBe('function')
  })
})
