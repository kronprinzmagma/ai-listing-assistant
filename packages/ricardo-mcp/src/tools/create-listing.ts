import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CreateListingInputSchema } from '../schemas/tool-inputs.js'
import { CreateListingOutputSchema } from '../schemas/tool-outputs.js'
import { makeTypedError } from '../schemas/errors.js'
import { RicardoClient } from '../client.js'

export function registerCreateListing(server: McpServer, client: RicardoClient): void {
  server.registerTool(
    'create_listing',
    {
      title: 'Create Ricardo Listing',
      description: 'Publish a new listing to Ricardo.ch. Requires a completed session with an approved listing.',
      inputSchema: CreateListingInputSchema,
      outputSchema: CreateListingOutputSchema,
    },
    async ({ sessionId, locale }) => {
      try {
        const result = await client.createListing({ sessionId, locale })
        return {
          content: [{ type: 'text' as const, text: `Created listing ${result.listingId}: ${result.url}` }],
          structuredContent: result,
        }
      } catch (error) {
        console.error('create_listing error:', error)
        return makeTypedError(error, 'Check that the session exists and has an approved listing, then retry.')
      }
    }
  )
}
