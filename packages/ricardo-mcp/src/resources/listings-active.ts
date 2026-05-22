import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { RicardoClient } from '../client.js'

export function registerListingsActiveResource(server: McpServer, client: RicardoClient): void {
  server.registerResource(
    'listings-active',
    'listings://active',
    { title: 'Active Listings', mimeType: 'application/json', description: 'All currently active listings on Ricardo.ch' },
    async (uri) => ({
      contents: [{ uri: uri.href, text: JSON.stringify(await client.getActiveListings()) }],
    })
  )
}
