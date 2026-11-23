import { describe, it, expect, vi, beforeEach } from 'vitest'

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock } },
}))

import { runListingWriter } from './listing-writer'
import { DATA_GUARD_SYSTEM } from '@/lib/models'
import { RicardoListingSchema, RicardoListingDraftSchema, shortenTitle } from './schemas'
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
  it('happy path: 1 call (generate; title check runs in code)', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 100, output_tokens: 200 } })
    const { output, trace } = await runListingWriter({ analysis, questions: [] })
    expect(RicardoListingSchema.safeParse(output).success).toBe(true)
    expect(output.de.title.length).toBeLessThanOrEqual(60)
    expect(output.fr.title.length).toBeLessThanOrEqual(60)
    expect(parseMock).toHaveBeenCalledTimes(1)
    expect(trace.agent).toBe('ListingWriter')
  })

  it('self-corrects when the title is too long (2 calls, issue names the length)', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: longTitleListing, usage: { input_tokens: 100, output_tokens: 200 } })
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 80, output_tokens: 150 } })
    const { output, trace } = await runListingWriter({ analysis, questions: [] })
    expect(parseMock).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(parseMock.mock.calls[1][0].messages)).toContain('de.title hat 75 Zeichen, erlaubt sind 60')
    expect(output.de.title).toBe(validListing.de.title)
    expect(trace.inputTokens).toBe(180)
  })

  it('still too long after correction: cut at a word boundary, never throws', async () => {
    const wordy = 'Apple MacBook Pro 13 Zoll 2020 M1 16GB RAM 512GB SSD Space Grau mit Ladekabel'
    const stillLong = { de: { ...validListing.de, title: wordy }, fr: validListing.fr }
    parseMock
      .mockResolvedValueOnce({ parsed_output: stillLong, usage: { input_tokens: 1, output_tokens: 1 } })
      .mockResolvedValueOnce({ parsed_output: stillLong, usage: { input_tokens: 1, output_tokens: 1 } })
    const { output } = await runListingWriter({ analysis, questions: [] })
    expect(output.de.title.length).toBeLessThanOrEqual(60)
    expect(wordy.startsWith(output.de.title)).toBe(true)
    expect(wordy.charAt(output.de.title.length)).toBe(' ')
    expect(RicardoListingSchema.safeParse(output).success).toBe(true)
  })

  it('model calls use a schema without maxLength (SDK would otherwise throw on >60)', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } })
    await runListingWriter({ analysis, questions: [] })
    const schema = JSON.stringify(parseMock.mock.calls[0][0].output_config.format.schema)
    expect(schema).not.toContain('maxLength')
    // Gegenprobe: das SDK-Format wirft bei 75 Zeichen nur mit dem strengen Schema
    const { zodOutputFormat } = await import('@anthropic-ai/sdk/helpers/zod')
    expect(() => zodOutputFormat(RicardoListingSchema).parse(JSON.stringify(longTitleListing))).toThrow()
    expect(() => zodOutputFormat(RicardoListingDraftSchema).parse(JSON.stringify(longTitleListing))).not.toThrow()
  })

  it('passes answered questions into the prompt as F:/A: pairs', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } })
    await runListingWriter({
      analysis,
      questions: [{ id: 'q1', text: 'Alter?', answer: '5 Jahre' }, { id: 'q2', text: 'Marke?' }],
    })
    const firstCallContent = JSON.stringify(parseMock.mock.calls[0][0].messages)
    expect(firstCallContent).toContain('F: Alter?')
    expect(firstCallContent).toContain('A: 5 Jahre')
    expect(firstCallContent).not.toContain('Marke?\nA:') // unanswered questions not included
  })

  it('kennzeichnet die Antworten als verbindliche Angaben des Verkaeufers, die der Systemhinweis zulaesst', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } })
    await runListingWriter({
      analysis,
      questions: [{ id: 'q1', text: 'Wie wird uebergeben?', answer: 'Nur Abholung in Winterthur, bar bei Abholung' }],
    })
    const call = parseMock.mock.calls[0][0]
    expect(JSON.stringify(call.messages)).toContain('Angaben des Verkäufers (Antworten auf Rückfragen, verbindlich)')
    expect(call.system).toBe(DATA_GUARD_SYSTEM)
    expect(DATA_GUARD_SYSTEM).toContain('«Angaben des Verkäufers»')
    expect(DATA_GUARD_SYSTEM).toMatch(/verbindliche Angaben/)
  })

  it('uses zodOutputFormat on the generation call', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } })
    await runListingWriter({ analysis, questions: [] })
    expect(parseMock.mock.calls[0][0].output_config).toBeDefined()
  })

  it('uses promptOverride instead of built-in prompt when provided', async () => {
    parseMock
      .mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } })
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
    await runListingWriter({ analysis, questions: [] })
    const firstCallContent = JSON.stringify(parseMock.mock.calls[0][0].messages)
    // Built-in prompt should be used
    expect(firstCallContent).toContain('Erstelle ein vollständiges Inserat')
  })
})

describe('shortenTitle', () => {
  it('leaves short titles unchanged', () => {
    expect(shortenTitle('Velo Damen 28 Zoll')).toBe('Velo Damen 28 Zoll')
  })
  it('cuts at the last word boundary and strips trailing separators', () => {
    const t = shortenTitle('Gartenstuhl Holz klappbar, 4 Stück, wetterfest lackiert - Abholung Zürich Kreis 4')
    expect(t.length).toBeLessThanOrEqual(60)
    expect(t).toBe('Gartenstuhl Holz klappbar, 4 Stück, wetterfest lackiert')
  })
  it('hard-cuts a single overlong word', () => {
    expect(shortenTitle('X'.repeat(80))).toHaveLength(60)
  })
})

describe('runListingWriter: Kategorie aus der festen Liste', () => {
  it('setzt DE und FR aus der Analyse, nicht aus dem Modell', async () => {
    const fromModel = {
      de: { ...validListing.de, category: 'Computer & Zubehör' },
      fr: { ...validListing.fr, category: 'Informatique' },
    }
    parseMock.mockResolvedValueOnce({ parsed_output: fromModel, usage: { input_tokens: 1, output_tokens: 1 } })
    const { output } = await runListingWriter({ analysis: { ...analysis, category: 'Laptops' }, questions: [] })
    expect(output.de.category).toBe('Laptops')
    expect(output.fr.category).toBe('Ordinateurs portables')
  })

  it('Freitext aus einer alten Session wird zu «Diverses»', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } })
    const { output } = await runListingWriter({ analysis: { ...analysis, category: 'Smartphones & Handys' }, questions: [] })
    expect(output.de.category).toBe('Diverses')
    expect(output.fr.category).toBe('Divers')
  })
})
