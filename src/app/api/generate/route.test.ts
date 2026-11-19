import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

const { parseMock, createMock } = vi.hoisted(() => ({ parseMock: vi.fn(), createMock: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock, create: createMock } },
}))

import { POST } from './route'
import { createSession, writeSession, readSession } from '@/lib/session'

const ORIGINAL_CWD = process.cwd()
let tmpRoot: string

const validListing = {
  de: { title: 'MacBook Pro 2020', description: 'Gut.', category: 'Elektronik', condition: 'gut', price: 850, shipping: 'CHF 12' },
  fr: { title: 'MacBook Pro 2020 FR', description: 'Bon.', category: 'Électronique', condition: 'bon', price: 850, shipping: 'CHF 12' },
}

function mockListingWriterAndPriceEstimator() {
  // ListingWriter happy path = 2 calls (gen + validate). PriceEstimator = 1 call. Order may interleave due to Promise.all.
  // We just configure mockResolvedValue to handle ANY shape so any call returns plausibly:
  parseMock.mockImplementation(async (req: { output_config?: { format?: unknown } }) => {
    const fmt = JSON.stringify(req.output_config?.format ?? '')
    if (fmt.includes('titleDeValid')) {
      return { parsed_output: { titleDeValid: true, titleFrValid: true, issues: [] }, usage: { input_tokens: 1, output_tokens: 1 } }
    }
    if (fmt.includes('suggestedPriceCHF')) {
      return { parsed_output: { suggestedPriceCHF: 850, confidence: 'medium', rationale: 'r' }, usage: { input_tokens: 1, output_tokens: 1 } }
    }
    // default: RicardoListing
    return { parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } }
  })
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-gen-'))
  process.chdir(tmpRoot)
  parseMock.mockReset()
  createMock.mockReset()
  // Standard: Websuche liefert nichts -> Preisschaetzung ohne Vergleichsangebote
  createMock.mockResolvedValue({ stop_reason: 'end_turn', content: [], usage: { input_tokens: 1, output_tokens: 1 } })
  mockListingWriterAndPriceEstimator()
})

afterEach(() => {
  process.chdir(ORIGINAL_CWD)
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

function makeReq(body: unknown): Request {
  return new Request('http://test/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/generate', () => {
  it('rejects path traversal sessionId with 400 and no agent calls', async () => {
    const res = await POST(makeReq({ sessionId: '../../etc/passwd' }) as never)
    expect(res.status).toBe(400)
    expect(parseMock).not.toHaveBeenCalled()
  })

  it('rejects 400 when analysis missing', async () => {
    const s = await createSession()
    const res = await POST(makeReq({ sessionId: s.id }) as never)
    expect(res.status).toBe(400)
  })

  it('runs both agents in parallel, persists listing + priceEstimate + 2 traces', async () => {
    const s = await createSession()
    s.analysis = { object: 'L', condition: 'gut', category: 'E', titleDraft: 'T', descriptionDraft: 'D' }
    await writeSession(s)
    const res = await POST(makeReq({ sessionId: s.id }) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.listing.de.title).toBe('MacBook Pro 2020')
    expect(json.priceEstimate.suggestedPriceCHF).toBe(850)
    const reloaded = await readSession(s.id)
    expect(reloaded.listing).toBeDefined()
    expect(reloaded.priceEstimate).toBeDefined()
    expect(reloaded.agentTrace).toHaveLength(2)
    const agents = reloaded.agentTrace!.map(t => t.agent).sort()
    expect(agents).toEqual(['ListingWriter', 'PriceEstimator'])
  })

  it('is idempotent: second POST returns cached, no new agent calls', async () => {
    const s = await createSession()
    s.analysis = { object: 'L', condition: 'gut', category: 'E', titleDraft: 'T', descriptionDraft: 'D' }
    await writeSession(s)
    await POST(makeReq({ sessionId: s.id }) as never)
    const callCountAfterFirst = parseMock.mock.calls.length
    await POST(makeReq({ sessionId: s.id }) as never)
    expect(parseMock.mock.calls.length).toBe(callCountAfterFirst) // no additional calls
  })

  it('uebernimmt einen auf Ricardo-Angebote gestuetzten Preis ins Inserat (DE und FR)', async () => {
    createMock.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{
        type: 'web_search_tool_result', tool_use_id: 's', content: [
          { type: 'web_search_result', title: 'MacBook Pro 2020 (Gebraucht) in Bern für CHF 700', url: 'https://www.ricardo.ch/de/a/macbook-1/', page_age: null, encrypted_content: 'x' },
        ],
      }],
      usage: { input_tokens: 1, output_tokens: 1 },
    })
    parseMock.mockImplementation(async (req: { output_config?: { format?: unknown } }) => {
      const fmt = JSON.stringify(req.output_config?.format ?? '')
      if (fmt.includes('comparableIndices')) {
        return { parsed_output: { comparableIndices: [0], suggestedPriceCHF: 690, confidence: 'medium', rationale: 'r' }, usage: { input_tokens: 1, output_tokens: 1 } }
      }
      return { parsed_output: validListing, usage: { input_tokens: 1, output_tokens: 1 } }
    })
    const s = await createSession()
    s.analysis = { object: 'L', condition: 'gut', category: 'Laptops', titleDraft: 'T', descriptionDraft: 'D' }
    await writeSession(s)
    const res = await POST(makeReq({ sessionId: s.id }) as never)
    const json = await res.json()
    expect(json.priceEstimate.source).toBe('ricardo')
    expect(json.listing.de.price).toBe(690)
    expect(json.listing.fr.price).toBe(690)
    expect((await readSession(s.id)).listing?.de.price).toBe(690)
  })
})
