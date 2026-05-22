import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { UpdateListingInputSchema } from '../schemas/tool-inputs.js'
import { UpdateListingOutputSchema } from '../schemas/tool-outputs.js'
import { makeTypedError } from '../schemas/errors.js'
import { RicardoClient } from '../client.js'

export function registerUpdateListing(server: McpServer, client: RicardoClient): void {
  server.registerTool(
    'update_listing',
    {
      title: 'Update Ricardo Listing',
      description: 'Update an existing Ricardo.ch listing. Provide listingId and any fields to change.',
      inputSchema: UpdateListingInputSchema,
      outputSchema: UpdateListingOutputSchema,
    },
    async ({ listingId, title, description, price }) => {
      try {
        const result = await client.updateListing({ listingId, title, description, price })
        return {
          content: [{ type: 'text' as const, text: `Updated listing ${result.listingId} at ${result.updatedAt}` }],
          structuredContent: result,
        }
      } catch (error) {
        console.error('update_listing error:', error)
        return makeTypedError(error, 'Check that the listingId is valid and try again.')
      }
    }
  )
}
