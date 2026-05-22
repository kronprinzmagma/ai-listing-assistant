import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockValidateSessionId,
  mockGetPendingOrders,
} = vi.hoisted(() => ({
  mockValidateSessionId: vi.fn(),
  mockGetPendingOrders: vi.fn(),
}))

vi.mock('@/lib/session', () => ({
  validateSessionId: mockValidateSessionId,
}))

vi.mock('../../../../packages/ricardo-mcp/src/client', () => ({
  RicardoClient: vi.fn().mockImplementation(function () {
    return {
      getPendingOrders: mockGetPendingOrders,
    }
  }),
}))

import { GET } from './route'

function makeGetReq(sessionId?: string): Request {
  const url = sessionId
    ? `http://test/api/orders?sessionId=${sessionId}`
    : 'http://test/api/orders'
  return new Request(url, { method: 'GET' })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockValidateSessionId.mockReturnValue(undefined)
})

describe('GET /api/orders', () => {
  it('returns 200 with empty orders array in stub mode', async () => {
    mockGetPendingOrders.mockResolvedValue([])

    const res = await GET(makeGetReq('00000000-0000-4000-8000-000000000000') as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.orders).toBeInstanceOf(Array)
    expect(json.orders).toHaveLength(0)
  })

  it('returns orders from RicardoClient.getPendingOrders()', async () => {
    mockGetPendingOrders.mockResolvedValue([
      {
        id: 'order-001',
        listingId: 'listing-001',
        buyerName: 'Max Muster',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ])

    const res = await GET(makeGetReq('00000000-0000-4000-8000-000000000000') as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.orders[0].id).toBe('order-001')
  })

  it('returns 400 for missing sessionId', async () => {
    const res = await GET(makeGetReq() as never)
    expect(res.status).toBe(400)
  })
})
