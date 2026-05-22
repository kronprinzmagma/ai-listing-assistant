import { describe, it, expect, vi, beforeEach } from 'vitest'

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock } },
}))

import { runListingWriter } from './listing-writer'
import { RicardoListingSchema } from './schemas'
import type { AnalysisResult } from './schemas'

const analysis: AnalysisResult = {
  object: 'Laptop', condition: 'gut', category: 'Elektronik',
  titleDraft: 'MacBook', descriptionDraft: 'Gut.',
}

const validListing = {
  de: { title: 'Apple MacBook Pro 2020', description: 'Gut erhalten.', category: 'Elektronik', condition: 'gut', price: 850, shipping: 'CHF 12' },
  fr: { title: 'Apple MacBook Pro 2020 FR', description: 'En bon état.', category: 'Électronique', condition: 'bon', price: 850, shipping: 'CHF 12' },
}

const longTitleListing = {
  de: { ...validListing.de, title: 'A'.repeat(75) },
  fr: validListing.fr,
}

beforeEach(() => {
  parseMock.mockReset()
})

describe('runListingWriter', () => {
  it('happy path: 2 calls (generate + validate, no correction)', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 100, output_tokens: 200 } })
      .mockResolvedValueOnce({ parsed_output: { titleDeValid: true, titleFrValid: true, issues: [] }, usage: { input_tokens: 50, output_tokens: 10 } })
    const { output, trace } = await runListingWriter({ analysis, questions: [] })
    expect(RicardoListingSchema.safeParse(output).success).toBe(true)
    expect(output.de.title.length).toBeLessThanOrEqual(60)
    expect(output.fr.title.length).toBeLessThanOrEqual(60)
    expect(parseMock).toHaveBeenCalledTimes(2)
    expect(trace.agent).toBe('ListingWriter')
  })

  it('self-corrects when validation reports invalid title (3 calls)', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: longTitleListing, usage: { input_tokens: 100, output_tokens: 200 } })
      .mockResolvedValueOnce({ parsed_output: { titleDeValid: false, titleFrValid: true, issues: ['DE title 75 chars > 60'] }, usage: { input_tokens: 50, output_tokens: 10 } })
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 80, output_tokens: 150 } })
    const { output } = await runListingWriter({ analysis, questions: [] })
    expect(parseMock).toHaveBeenCalledTimes(3)
    expect(output.de.title.length).toBeLessThanOrEqual(60)
  })

  it('passes answered questions into the prompt as F:/A: pairs', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } })
      .mockResolvedValueOnce({ parsed_output: { titleDeValid: true, titleFrValid: true, issues: [] }, usage: { input_tokens: 1, output_tokens: 1 } })
    await runListingWriter({
      analysis,
      questions: [{ id: 'q1', text: 'Alter?', answer: '5 Jahre' }, { id: 'q2', text: 'Marke?' }],
    })
    const firstCallContent = JSON.stringify(parseMock.mock.calls[0][0].messages)
    expect(firstCallContent).toContain('F: Alter?')
    expect(firstCallContent).toContain('A: 5 Jahre')
    expect(firstCallContent).not.toContain('Marke?\nA:') // unanswered questions not included
  })

  it('uses zodOutputFormat on generation and validation calls', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } })
      .mockResolvedValueOnce({ parsed_output: { titleDeValid: true, titleFrValid: true, issues: [] }, usage: { input_tokens: 1, output_tokens: 1 } })
    await runListingWriter({ analysis, questions: [] })
    expect(parseMock.mock.calls[0][0].output_config).toBeDefined()
    expect(parseMock.mock.calls[1][0].output_config).toBeDefined()
  })

  it('uses promptOverride instead of built-in prompt when provided', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } })
      .mockResolvedValueOnce({ parsed_output: { titleDeValid: true, titleFrValid: true, issues: [] }, usage: { input_tokens: 1, output_tokens: 1 } })
    const customPrompt = 'Custom prompt with {{object}} and {{condition}}'
    await runListingWriter({ analysis, questions: [], promptOverride: customPrompt })
    const firstCallContent = JSON.stringify(parseMock.mock.calls[0][0].messages)
    // The override prompt should be used — placeholders {{object}} should be replaced
    expect(firstCallContent).toContain('Custom prompt with Laptop')
    expect(firstCallContent).toContain('gut')
    // The built-in German prompt header should NOT be present
    expect(firstCallContent).not.toContain('Erstelle ein vollständiges Inserat')
  })

  it('falls back to built-in prompt when promptOverride is not set', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } })
      .mockResolvedValueOnce({ parsed_output: { titleDeValid: true, titleFrValid: true, issues: [] }, usage: { input_tokens: 1, output_tokens: 1 } })
    await runListingWriter({ analysis, questions: [] })
    const firstCallContent = JSON.stringify(parseMock.mock.calls[0][0].messages)
    // Built-in prompt should be used
    expect(firstCallContent).toContain('Erstelle ein vollständiges Inserat')
  })
})
