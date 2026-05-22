import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { UpdateOrderStatusInputSchema } from '../schemas/tool-inputs.js'
import { UpdateOrderStatusOutputSchema } from '../schemas/tool-outputs.js'
import { makeTypedError } from '../schemas/errors.js'
import { RicardoClient } from '../client.js'

export function registerUpdateOrderStatus(server: McpServer, client: RicardoClient): void {
  server.registerTool(
    'update_order_status',
    {
      title: 'Update Order Status',
      description: 'Update the status of a Ricardo.ch order. Requires SPIKE-01 verification — stub returns mock data.',
      inputSchema: UpdateOrderStatusInputSchema,
      outputSchema: UpdateOrderStatusOutputSchema,
    },
    async ({ orderId, status }) => {
      try {
        const result = await client.updateOrderStatus({ orderId, status })
        return {
          content: [{ type: 'text' as const, text: `Updated order ${result.orderId} status to ${result.updatedStatus}` }],
          structuredContent: result,
        }
      } catch (error) {
        console.error('update_order_status error:', error)
        return makeTypedError(error, 'Check that the orderId is valid. Note: SPIKE-01 verification required for live calls.')
      }
    }
  )
}
