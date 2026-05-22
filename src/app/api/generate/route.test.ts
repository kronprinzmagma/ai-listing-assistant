import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock } },
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
})
