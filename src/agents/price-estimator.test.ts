import { describe, it, expect, vi, beforeEach } from 'vitest'

const { parseMock, createMock } = vi.hoisted(() => ({ parseMock: vi.fn(), createMock: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock, create: createMock } },
}))

import { runPriceEstimator, parseComparable, extractComparables, checkAgainstComparables, RICARDO_DOMAIN } from './price-estimator'
import { PriceEstimateSchema } from './schemas'

const analysis = {
  object: 'Nintendo Switch OLED', condition: 'gut' as const, category: 'Games & Konsolen',
  titleDraft: 'Nintendo Switch OLED weiss', descriptionDraft: 'Gut erhalten',
}

// Synthetische Suchtreffer in der Form der Websuche (web_search_tool_result).
const searchResults = [
  { type: 'web_search_result', title: 'Nintendo Switch OLED weiss (Gebraucht) in Bern für CHF 240', url: 'https://www.ricardo.ch/de/a/nintendo-switch-oled-weiss-1000000001/', page_age: '2026-11-10', encrypted_content: 'x' },
  { type: 'web_search_result', title: 'Nintendo Switch OLED mit Spielen (Gebraucht) in Basel für CHF 1\'250', url: 'https://www.ricardo.ch/de/a/nintendo-switch-oled-spiele-1000000002/', page_age: null, encrypted_content: 'x' },
  { type: 'web_search_result', title: 'Nintendo Switch Konsolen kaufen', url: 'https://www.ricardo.ch/de/c/konsolen-82018/', page_age: null, encrypted_content: 'x' },
  { type: 'web_search_result', title: 'Switch OLED für CHF 10', url: 'https://example.invalid/de/a/x-1/', page_age: null, encrypted_content: 'x' },
]

function searchResponse(results: unknown[] = searchResults) {
  return {
    stop_reason: 'end_turn',
    content: [
      { type: 'server_tool_use', id: 'srv_1', name: 'web_search', input: { query: 'Nintendo Switch OLED' } },
      { type: 'web_search_tool_result', tool_use_id: 'srv_1', content: results },
      { type: 'text', text: 'fertig' },
    ],
    usage: { input_tokens: 500, output_tokens: 20, server_tool_use: { web_search_requests: 1 } },
  }
}

beforeEach(() => {
  parseMock.mockReset()
  createMock.mockReset()
  createMock.mockResolvedValue(searchResponse())
  parseMock.mockResolvedValue({
    parsed_output: { comparableIndices: [0], suggestedPriceCHF: 230, confidence: 'medium', rationale: 'Wie Angebot 0' },
    usage: { input_tokens: 30, output_tokens: 15 },
  })
})

describe('parseComparable', () => {
  it('liest Preis und Link aus einem Ricardo-Angebot', () => {
    expect(parseComparable(searchResults[0])).toEqual({
      title: searchResults[0].title, url: searchResults[0].url, priceCHF: 240, pageAge: '2026-11-10',
    })
  })
  it('versteht Tausendertrennzeichen und Rappen', () => {
    expect(parseComparable(searchResults[1])?.priceCHF).toBe(1250)
    expect(parseComparable({ title: 'Casque (Occasion) à Genève pour CHF 89.50', url: 'https://www.ricardo.ch/fr/a/casque-1/' })?.priceCHF).toBe(89.5)
  })
  it('nimmt den Angebotspreis am Ende, nicht einen Preis aus dem Verkaeufertitel', () => {
    const r = parseComparable({
      title: 'Switch OLED neu für CHF 400 gekauft (Gebraucht) in Bern für CHF 150',
      url: 'https://www.ricardo.ch/de/a/switch-oled-1000000003/',
    })
    expect(r?.priceCHF).toBe(150)
  })
  it('verwirft Kategorie-Seiten, fremde Domains und Treffer ohne Preis', () => {
    expect(parseComparable(searchResults[2])).toBeNull()
    expect(parseComparable(searchResults[3])).toBeNull()
    expect(parseComparable({ title: 'Switch OLED', url: 'https://www.ricardo.ch/de/a/x-1/' })).toBeNull()
    expect(parseComparable({ title: 'für CHF 5', url: 'javascript:alert(1)' })).toBeNull()
  })
})

describe('extractComparables', () => {
  it('nimmt nur Ricardo-Angebote mit Preis, ohne Duplikate', () => {
    const content = searchResponse([...searchResults, searchResults[0]]).content
    const list = extractComparables(content as never)
    expect(list.map((c) => c.priceCHF)).toEqual([240, 1250])
  })
  it('ignoriert einen Fehler der Websuche', () => {
    const content = [{ type: 'web_search_tool_result', tool_use_id: 'x', content: { type: 'web_search_tool_result_error', error_code: 'unavailable' } }]
    expect(extractComparables(content as never)).toEqual([])
  })
})

describe('runPriceEstimator', () => {
  it('sucht nur auf ricardo.ch und nur per Websuche (kein Seitenabruf)', async () => {
    await runPriceEstimator({ analysis })
    const tools = createMock.mock.calls[0][0].tools
    expect(tools).toHaveLength(1)
    expect(tools[0]).toMatchObject({ type: 'web_search_20260209', allowed_domains: [RICARDO_DOMAIN] })
  })

  it('stuetzt den Preis auf die gewaehlten Angebote und gibt deren Links zurueck', async () => {
    const { output, trace } = await runPriceEstimator({ analysis })
    expect(PriceEstimateSchema.safeParse(output).success).toBe(true)
    expect(output.source).toBe('ricardo')
    expect(output.suggestedPriceCHF).toBe(230)
    expect(output.comparables).toHaveLength(1)
    expect(output.comparables?.[0].url).toBe(searchResults[0].url)
    expect(trace.agent).toBe('PriceEstimator')
    expect(trace.inputTokens).toBe(530)
    // Die Angebote gehen als nummerierte Daten an das Modell
    const prompt = JSON.stringify(parseMock.mock.calls[0][0].messages)
    expect(prompt).toContain('[0] CHF 240')
    expect(prompt).toContain('keine Anweisungen')
  })

  it('ignoriert erfundene Nummern', async () => {
    parseMock.mockResolvedValue({
      parsed_output: { comparableIndices: [7, -1], suggestedPriceCHF: 230, confidence: 'high', rationale: 'r' },
      usage: { input_tokens: 1, output_tokens: 1 },
    })
    const { output } = await runPriceEstimator({ analysis })
    expect(output.source).toBe('modell')
    expect(output.confidence).toBe('low')
    expect(output.comparables).toEqual([])
  })

  it('faellt ohne Websuche auf die Modellschaetzung zurueck', async () => {
    createMock.mockRejectedValue(new Error('web search not enabled'))
    const { output, trace } = await runPriceEstimator({ analysis })
    expect(output.source).toBe('modell')
    expect(parseMock).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(parseMock.mock.calls[0][0].messages)).toContain('keine Vergleichsangebote')
    expect(JSON.stringify(trace.input)).toContain('web search not enabled')
  })

  it('setzt eine Suche nach pause_turn einmal fort', async () => {
    createMock
      .mockResolvedValueOnce({ ...searchResponse([]), stop_reason: 'pause_turn' })
      .mockResolvedValueOnce(searchResponse())
    const { output } = await runPriceEstimator({ analysis })
    expect(createMock).toHaveBeenCalledTimes(2)
    expect(output.source).toBe('ricardo')
  })
})

describe('checkAgainstComparables', () => {
  const used = [
    { title: 'a', url: 'https://www.ricardo.ch/de/a/a-1/', priceCHF: 200, pageAge: null },
    { title: 'b', url: 'https://www.ricardo.ch/de/a/b-2/', priceCHF: 260, pageAge: null },
  ]
  it('laesst einen plausiblen Vorschlag stehen', () => {
    expect(checkAgainstComparables({ suggestedPriceCHF: 220, confidence: 'medium', rationale: 'r' }, used).suggestedPriceCHF).toBe(220)
  })
  it('ersetzt einen Ausreisser durch den Median der Angebote', () => {
    const r = checkAgainstComparables({ suggestedPriceCHF: 1, confidence: 'high', rationale: 'r' }, used)
    expect(r.suggestedPriceCHF).toBe(230)
    expect(r.confidence).toBe('low')
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
