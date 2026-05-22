import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { RicardoClient } from '../client.js'

export function registerListingResource(server: McpServer, client: RicardoClient): void {
  server.registerResource(
    'listing',
    new ResourceTemplate('listing://{id}', {
      list: async () => ({
        resources: (await client.getActiveListings()).map(l => ({
          uri: `listing://${l.id}`,
          name: l.titleDe,
        })),
      }),
    }),
    { title: 'Ricardo Listing', mimeType: 'application/json' },
    async (uri, { id }) => {
      try {
        const listing = await client.getListing(String(id))
        return {
          contents: [{ uri: uri.href, text: JSON.stringify(listing) }],
        }
      } catch (error) {
        console.error('listing resource error:', error)
        return {
          contents: [{ uri: uri.href, text: JSON.stringify({ error: 'Listing not found', id }) }],
        }
      }
    }
  )
}
