#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { RicardoClient } from './client.js'
// Tools
import { registerCreateListing } from './tools/create-listing.js'
import { registerUpdateListing } from './tools/update-listing.js'
import { registerDeleteListing } from './tools/delete-listing.js'
import { registerUploadImage } from './tools/upload-image.js'
import { registerUpdateOrderStatus } from './tools/update-order-status.js'
// Resources
import { registerListingResource } from './resources/listing.js'
import { registerListingsActiveResource } from './resources/listings-active.js'
import { registerOrdersPendingResource } from './resources/orders-pending.js'
import { registerCategoriesTreeResource } from './resources/categories-tree.js'
// Prompts
import { registerDraftListingPrompt } from './prompts/draft-listing.js'

const server = new McpServer(
  { name: 'ricardo-mcp', version: '1.0.0' },
  { instructions: 'Use create_listing after generating a listing draft with the draft_listing prompt. Browse listings://active to see current listings before updating or deleting.' }
)
const client = new RicardoClient(process.env.RICARDO_PARTNERSHIP_KEY)

// Register tools
registerCreateListing(server, client)
registerUpdateListing(server, client)
registerDeleteListing(server, client)
registerUploadImage(server, client)
registerUpdateOrderStatus(server, client)

// Register resources
registerListingResource(server, client)
registerListingsActiveResource(server, client)
registerOrdersPendingResource(server, client)
registerCategoriesTreeResource(server, client)

// Register prompts
registerDraftListingPrompt(server)

if (process.argv.includes('--list-tools')) {
  const manifest = {
    tools: [
      { name: 'create_listing', description: 'Publish a new listing to Ricardo.ch' },
      { name: 'update_listing', description: 'Update an existing Ricardo.ch listing' },
      { name: 'delete_listing', description: 'Close/delete a Ricardo.ch listing' },
      { name: 'upload_image', description: 'Upload an image to a Ricardo.ch listing' },
      { name: 'update_order_status', description: 'Update order status (requires SPIKE-01 for live calls)' },
    ],
    resources: [
      { uri: 'listing://{id}', description: 'Individual listing by ID' },
      { uri: 'listings://active', description: 'All active listings' },
      { uri: 'orders://pending', description: 'Pending orders awaiting shipment' },
      { uri: 'categories://tree', description: 'Full Ricardo category hierarchy' },
    ],
    prompts: [
      { name: 'draft_listing', description: 'Generate a DE+FR listing from product name and condition' },
    ],
  }
  console.log(JSON.stringify(manifest, null, 2))
  process.exit(0)
}

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Ricardo MCP server running on stdio')
}

process.on('SIGINT', async () => {
  await server.close()
  process.exit(0)
})

main().catch(err => {
  console.error(err)
  process.exit(1)
})
