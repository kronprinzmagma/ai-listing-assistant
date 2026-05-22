import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerDraftListingPrompt(server: McpServer): void {
  server.registerPrompt(
    'draft_listing',
    {
      title: 'Draft Ricardo Listing',
      description: 'Generate a complete Ricardo.ch listing (DE + FR) from basic product info',
      argsSchema: z.object({
        product_name: z.string().min(1).describe('Product name or short description'),
        condition: z.enum(['neu', 'wie neu', 'gut', 'akzeptabel']).describe('Item condition'),
      }),
    },
    ({ product_name, condition }) => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Create a complete Ricardo.ch listing for: ${product_name} (Zustand/état: ${condition}).

Requirements:
- German title (max 60 chars), German description (concise, factual)
- French title (max 60 chars), French description (concise, factual)
- Suggested category (Ricardo.ch category name)
- Price suggestion in CHF with rationale
- Shipping option (e.g. "A-Post CHF 8.–")

Return as JSON matching the RicardoListing schema: { de: { title, description, category, condition, price, shipping }, fr: { ... } }`,
        },
      }],
    })
  )
}
