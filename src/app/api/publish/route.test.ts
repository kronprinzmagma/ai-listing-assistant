import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockValidateSessionId,
  mockReadSession,
  mockWriteSession,
  mockRunRicardoPublisher,
  mockTokenStoreGet,
  mockTokenStoreSet,
  mockMapCategoryToId,
} = vi.hoisted(() => ({
  mockValidateSessionId: vi.fn(),
  mockReadSession: vi.fn(),
  mockWriteSession: vi.fn(),
  mockRunRicardoPublisher: vi.fn(),
  mockTokenStoreGet: vi.fn(),
  mockTokenStoreSet: vi.fn(),
  mockMapCategoryToId: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  validateSessionId: mockValidateSessionId,
  readSession: mockReadSession,
  writeSession: mockWriteSession,
}))

vi.mock('@/agents/ricardo-publisher', () => ({
  runRicardoPublisher: mockRunRicardoPublisher,
}))

vi.mock('@/lib/token-store', () => ({
  TokenStore: {
    get: mockTokenStoreGet,
    set: mockTokenStoreSet,
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/category-map', () => ({
  mapCategoryToId: mockMapCategoryToId,
}))

import { POST } from './route'

function makeReq(body: unknown): Request {
  return new Request('http://test/api/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validListing = {
  de: { title: 'Test Artikel', description: 'Toller Artikel.', category: 'Elektronik', condition: 'gut', price: 100, shipping: 'CHF 8' },
  fr: { title: 'Article test', description: 'Super article.', category: 'Électronique', condition: 'bon', price: 100, shipping: 'CHF 8' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockValidateSessionId.mockReturnValue(undefined)
  mockTokenStoreGet.mockReturnValue(undefined)
  mockMapCategoryToId.mockReturnValue(1)
  mockWriteSession.mockResolvedValue(undefined)
})

describe('POST /api/publish', () => {
  it('returns 400 for invalid sessionId', async () => {
    mockValidateSessionId.mockImplementation(() => { throw new Error('Invalid sessionId format') })

    const res = await POST(makeReq({ sessionId: 'bad-id' }) as never)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid sessionId')
  })

  it('returns 400 if listing not approved', async () => {
    mockReadSession.mockResolvedValue({
      id: 'sess-1',
      listing: validListing,
      approved: false,
      photoPaths: [],
    })

    const res = await POST(makeReq({ sessionId: 'sess-1' }) as never)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/freigegeben/)
  })

  it('returns 400 if no listing', async () => {
    mockReadSession.mockResolvedValue({
      id: 'sess-1',
      approved: true,
      photoPaths: [],
    })

    const res = await POST(makeReq({ sessionId: 'sess-1' }) as never)
    expect(res.status).toBe(400)
  })

  it('first publish: calls runRicardoPublisher, writes session, returns listingId+url', async () => {
    mockReadSession.mockResolvedValue({
      id: 'sess-1',
      listing: validListing,
      approved: true,
      photoPaths: ['/p/a.jpg'],
      agentTrace: [],
    })
    mockRunRicardoPublisher.mockResolvedValue({
      output: { listingId: 'listing-001', url: 'https://www.ricardo.ch/listings/listing-001' },
      trace: { agent: 'RicardoPublisher', input: {}, output: {}, durationMs: 10, completedAt: new Date().toISOString(), modelUsed: 'none' },
    })

    const res = await POST(makeReq({ sessionId: 'sess-1' }) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.listingId).toBe('listing-001')
    expect(json.url).toMatch(/ricardo\.ch/)

    // writeSession called once
    expect(mockWriteSession).toHaveBeenCalledTimes(1)
    const writtenSession = mockWriteSession.mock.calls[0][0]
    expect(writtenSession.publishedListingId).toBe('listing-001')
    expect(writtenSession.publishedUrl).toMatch(/listing-001/)

    // Token fields must NEVER be written to session
    expect(writtenSession).not.toHaveProperty('token')
    expect(writtenSession).not.toHaveProperty('partnershipKey')
  })

  it('idempotency: second publish returns alreadyPublished:true without calling agent', async () => {
    mockReadSession.mockResolvedValue({
      id: 'sess-1',
      listing: validListing,
      approved: true,
      photoPaths: [],
      publishedListingId: 'listing-001',
      publishedUrl: 'https://www.ricardo.ch/listings/listing-001',
    })

    const res = await POST(makeReq({ sessionId: 'sess-1' }) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.alreadyPublished).toBe(true)
    expect(json.listingId).toBe('listing-001')

    // Agent and writeSession must NOT be called
    expect(mockRunRicardoPublisher).not.toHaveBeenCalled()
    expect(mockWriteSession).not.toHaveBeenCalled()
  })
})
