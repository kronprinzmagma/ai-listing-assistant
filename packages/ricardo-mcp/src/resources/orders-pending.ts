import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { RicardoClient } from '../client.js'

export function registerOrdersPendingResource(server: McpServer, client: RicardoClient): void {
  server.registerResource(
    'orders-pending',
    'orders://pending',
    { title: 'Pending Orders', mimeType: 'application/json', description: 'Orders awaiting shipment (requires SPIKE-01 for live data)' },
    async (uri) => ({
      contents: [{ uri: uri.href, text: JSON.stringify(await client.getPendingOrders()) }],
    })
  )
}
