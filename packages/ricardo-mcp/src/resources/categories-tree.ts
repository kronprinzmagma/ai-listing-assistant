import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { RicardoClient } from '../client.js'

export function registerCategoriesTreeResource(server: McpServer, client: RicardoClient): void {
  server.registerResource(
    'categories-tree',
    'categories://tree',
    { title: 'Ricardo Category Tree', mimeType: 'application/json', description: 'Full Ricardo.ch category hierarchy for category ID mapping' },
    async (uri) => ({
      contents: [{ uri: uri.href, text: JSON.stringify(await client.getCategoryTree()) }],
    })
  )
}
