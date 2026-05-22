import { describe, it, expect } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerDeleteListing } from '../../src/tools/delete-listing.js'
import { RicardoClient } from '../../src/client.js'

describe('delete_listing tool', () => {
  it('registers on McpServer without error', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    const client = new RicardoClient()
    expect(() => registerDeleteListing(server, client)).not.toThrow()
  })

  it('stub client returns success: true and deletedAt', async () => {
    const client = new RicardoClient()
    const result = await client.deleteListing({ listingId: 'listing-999' })
    expect(result.success).toBe(true)
    expect(result.deletedAt).toBeTruthy()
    expect(new Date(result.deletedAt).getTime()).not.toBeNaN()
  })
})
