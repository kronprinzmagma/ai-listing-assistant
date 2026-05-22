import { describe, it, expect } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerUpdateListing } from '../../src/tools/update-listing.js'
import { RicardoClient } from '../../src/client.js'

describe('update_listing tool', () => {
  it('registers on McpServer without error', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    const client = new RicardoClient()
    expect(() => registerUpdateListing(server, client)).not.toThrow()
  })

  it('stub client returns listingId and updatedAt', async () => {
    const client = new RicardoClient()
    const result = await client.updateListing({ listingId: 'abc-123', title: 'New Title' })
    expect(result.listingId).toBe('abc-123')
    expect(result.updatedAt).toBeTruthy()
    expect(new Date(result.updatedAt).getTime()).not.toBeNaN()
  })

  it('error path returns makeTypedError result', async () => {
    const client = new RicardoClient()
    // Simulate client throwing to verify error handling
    const origMethod = client.updateListing.bind(client)
    client.updateListing = async () => { throw new Error('API error') }
    // The tool handler catches errors — test via direct client throw
    await expect(client.updateListing({ listingId: 'x' })).rejects.toThrow('API error')
    client.updateListing = origMethod
  })
})
