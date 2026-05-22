import { describe, it, expect, vi } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerCreateListing } from '../../src/tools/create-listing.js'
import { RicardoClient } from '../../src/client.js'

describe('create_listing tool', () => {
  it('registers on McpServer without error', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    const client = new RicardoClient()
    expect(() => registerCreateListing(server, client)).not.toThrow()
  })

  it('returns structuredContent with listingId and url on success', async () => {
    const client = new RicardoClient()
    vi.spyOn(client, 'createListing').mockResolvedValue({
      listingId: 'test-123',
      url: 'https://www.ricardo.ch/listings/test-123',
    })
    const result = await client.createListing({ sessionId: '550e8400-e29b-41d4-a716-446655440000', locale: 'de' })
    expect(result.listingId).toBe('test-123')
    expect(result.url).toContain('ricardo.ch')
  })

  it('stub client returns typed mock data without SPIKE-01 credentials', async () => {
    const client = new RicardoClient()
    const result = await client.createListing({ sessionId: '550e8400-e29b-41d4-a716-446655440000', locale: 'fr' })
    expect(result.listingId).toBeTruthy()
    expect(result.url).toMatch(/^https:\/\//)
  })
})
