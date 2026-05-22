import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { DeleteListingInputSchema } from '../schemas/tool-inputs.js'
import { DeleteListingOutputSchema } from '../schemas/tool-outputs.js'
import { makeTypedError } from '../schemas/errors.js'
import { RicardoClient } from '../client.js'

export function registerDeleteListing(server: McpServer, client: RicardoClient): void {
  server.registerTool(
    'delete_listing',
    {
      title: 'Delete Ricardo Listing',
      description: 'Close or delete a Ricardo.ch listing by its listing ID.',
      inputSchema: DeleteListingInputSchema,
      outputSchema: DeleteListingOutputSchema,
    },
    async ({ listingId }) => {
      try {
        const result = await client.deleteListing({ listingId })
        return {
          content: [{ type: 'text' as const, text: `Deleted listing ${listingId} at ${result.deletedAt}` }],
          structuredContent: result,
        }
      } catch (error) {
        console.error('delete_listing error:', error)
        return makeTypedError(error, 'Check that the listingId is valid and try again.')
      }
    }
  )
}
