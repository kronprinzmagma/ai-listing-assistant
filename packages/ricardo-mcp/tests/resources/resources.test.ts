import { describe, it, expect } from 'vitest'
import { RicardoClient } from '../../src/client'

describe('RicardoClient resource stubs', () => {
  const client = new RicardoClient()

  it('getListing returns a RicardoListingDetail stub', async () => {
    const result = await client.getListing('test-abc')
    expect(result.id).toBe('test-abc')
    expect(result.status).toBe('active')
    expect(typeof result.titleDe).toBe('string')
    expect(typeof result.createdAt).toBe('string')
  })

  it('getActiveListings returns an array', async () => {
    const result = await client.getActiveListings()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('titleDe')
  })

  it('getPendingOrders returns an array (may be empty)', async () => {
    const result = await client.getPendingOrders()
    expect(Array.isArray(result)).toBe(true)
  })

  it('getCategoryTree returns categories with nameDe and nameFr', async () => {
    const result = await client.getCategoryTree()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('nameDe')
    expect(result[0]).toHaveProperty('nameFr')
    expect(typeof result[0].id).toBe('number')
  })
})
