import { describe, it, expect } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerUpdateOrderStatus } from '../../src/tools/update-order-status.js'
import { RicardoClient } from '../../src/client.js'

describe('update_order_status tool', () => {
  it('registers on McpServer without error', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    const client = new RicardoClient()
    expect(() => registerUpdateOrderStatus(server, client)).not.toThrow()
  })

  it('stub client returns orderId and updatedStatus', async () => {
    const client = new RicardoClient()
    const result = await client.updateOrderStatus({ orderId: 'order-42', status: 'shipped' })
    expect(result.orderId).toBe('order-42')
    expect(result.updatedStatus).toBe('shipped')
  })

  it('stub returns correct status for all valid statuses', async () => {
    const client = new RicardoClient()
    for (const status of ['pending', 'shipped', 'completed', 'cancelled'] as const) {
      const result = await client.updateOrderStatus({ orderId: 'x', status })
      expect(result.updatedStatus).toBe(status)
    }
  })
})
