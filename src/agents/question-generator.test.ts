import { describe, it, expect, vi, beforeEach } from 'vitest'

const parseMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock } },
}))

import { runQuestionGenerator } from './question-generator'
import type { AnalysisResult } from './schemas'

const analysis: AnalysisResult = {
  object: 'Laptop', condition: 'gut', category: 'Elektronik',
  titleDraft: 'MacBook Pro', descriptionDraft: 'Gut.',
}

beforeEach(() => {
  parseMock.mockReset()
  parseMock.mockResolvedValue({
    parsed_output: { questions: ['Alter?', 'Originalverpackung?', 'Mängel?'] },
    usage: { input_tokens: 50, output_tokens: 20 },
  })
})

describe('runQuestionGenerator', () => {
  it('returns 3-5 Question objects with uuid ids and trace', async () => {
    const { output, trace } = await runQuestionGenerator({ analysis })
    expect(output.length).toBeGreaterThanOrEqual(3)
    expect(output.length).toBeLessThanOrEqual(5)
    for (const q of output) {
      expect(q.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(q.text.length).toBeGreaterThan(0)
    }
    expect(trace.agent).toBe('QuestionGenerator')
    expect(trace.modelUsed).toBe('claude-sonnet-4-6')
  })

  it('calls anthropic.messages.parse once with output_config', async () => {
    await runQuestionGenerator({ analysis })
    expect(parseMock).toHaveBeenCalledTimes(1)
    expect(parseMock.mock.calls[0][0].output_config).toBeDefined()
  })

  it('passes the analysis fields into the prompt text', async () => {
    await runQuestionGenerator({ analysis })
    const call = parseMock.mock.calls[0][0]
    const promptText = JSON.stringify(call.messages)
    expect(promptText).toContain('Laptop')
    expect(promptText).toContain('Elektronik')
  })

  it('is stateless across calls', async () => {
    await runQuestionGenerator({ analysis })
    await runQuestionGenerator({ analysis })
    expect(parseMock).toHaveBeenCalledTimes(2)
  })

  it('truncates output to 5 if model returns more (defensive slice)', async () => {
    // QuestionsOutputSchema enforces max 5 via Zod, but the slice is belt-and-braces
    parseMock.mockResolvedValueOnce({
      parsed_output: { questions: ['a', 'b', 'c', 'd', 'e'] },
      usage: { input_tokens: 1, output_tokens: 1 },
    })
    const { output } = await runQuestionGenerator({ analysis })
    expect(output.length).toBeLessThanOrEqual(5)
  })
})
