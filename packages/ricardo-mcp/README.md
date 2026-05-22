# @nilsseiter/ricardo-mcp

MCP server for Ricardo.ch listing management. Provides Claude Desktop with tools to create, update,
and delete listings, plus resources to browse your active listings and orders.

> **Stub implementation:** All Ricardo API calls return mock data until SPIKE-01 (Ricardo Partner API
> access) is confirmed. The package design, schemas, and tool interfaces are the deliverable.

## Installation

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ricardo": {
      "command": "npx",
      "args": ["-y", "@nilsseiter/ricardo-mcp"],
      "env": {
        "RICARDO_PARTNERSHIP_KEY": "your-key",
        "RICARDO_PARTNERSHIP_PASSWORD": "your-password"
      }
    }
  }
}
```

**Field reference:**

| Field | Value | Description |
|-------|-------|-------------|
| `command` | `npx` | Download and run the package without a global install |
| `args[0]` | `-y` | Skip the npx install confirmation prompt |
| `args[1]` | `@nilsseiter/ricardo-mcp` | The scoped package name |
| `RICARDO_PARTNERSHIP_KEY` | `your-key` | Ricardo Partner API key (from Ricardo Developer Portal) |
| `RICARDO_PARTNERSHIP_PASSWORD` | `your-password` | Ricardo Partner API password |

Credentials are read from environment variables — never hardcoded.
Restart Claude Desktop after saving the config.

### Direct TypeScript Import

```typescript
import { RicardoClient } from '@nilsseiter/ricardo-mcp/client'

const client = new RicardoClient(process.env.RICARDO_PARTNERSHIP_KEY)
const listings = await client.getActiveListings()
```

## Tools

| Tool | Description | Key Inputs | Returns |
|------|-------------|------------|---------|
| `create_listing` | Publish a new listing to Ricardo.ch | `sessionId` (UUID), `locale` (de/fr) | `listingId`, `url` |
| `update_listing` | Update title, description, or price | `listingId`, optional fields | `listingId`, `updatedAt` |
| `delete_listing` | Close/remove a listing | `listingId` | `success`, `deletedAt` |
| `upload_image` | Attach an image to a listing | `listingId`, `imagePath` | `imageId`, `url` |
| `update_order_status` | Mark order as shipped/completed | `orderId`, `status` | `orderId`, `updatedStatus` |

> `update_order_status` requires SPIKE-01 (Ricardo Partner API access). Returns stub data until confirmed.

All tool inputs are Zod-validated. Invalid input returns a typed error with a retry hint rather than crashing the server.

## Resources

Resources let Claude browse Ricardo data before deciding to act. Four URIs are available:

| URI | Description |
|-----|-------------|
| `listing://{id}` | Individual listing by ID — returns full listing JSON |
| `listings://active` | All currently active listings — returns array |
| `orders://pending` | Orders awaiting shipment — returns array (requires SPIKE-01) |
| `categories://tree` | Full Ricardo category hierarchy for category mapping |

### Example: Browse active listings, then update one

In a Claude Desktop conversation with the `ricardo` MCP server connected:

```
User: Show me my active listings.
Claude: [reads listings://active resource]
        I found 2 active listings: "Rennvelo Trek Émonda" (listing://abc123)
        and "Sony WH-1000XM5" (listing://def456).

User: Show me the full details for the Trek listing.
Claude: [reads listing://abc123 resource]
        Title: Rennvelo Trek Émonda, Price: CHF 900, Condition: gut.

User: Update the price on the Trek listing to 850 CHF.
Claude: [calls update_listing tool with { listingId: "abc123", price: 850 }]
        Done. listing://abc123 is updated to CHF 850.

User: What orders are waiting to be shipped?
Claude: [reads orders://pending resource]
        No pending orders at the moment (stub: SPIKE-01 pending).
```

## Development

```bash
cd packages/ricardo-mcp
npm install
npm run build     # Compile TypeScript → dist/
npm test          # Run vitest unit tests
```

### Inspect registered tools

```bash
npx @nilsseiter/ricardo-mcp --list-tools
```

Prints all tools, resources, and prompts as JSON — useful for verifying Claude Desktop will see the correct schema.

### Publish to npm

```bash
cd packages/ricardo-mcp
npm publish       # publishConfig: { access: "public" } set in package.json
```

> First publish requires an active npm account at npmjs.com with the `@nilsseiter` scope.

## Architecture

```
Claude Desktop
    │ spawns via stdio transport
    ▼
[npx @nilsseiter/ricardo-mcp]  ← dist/index.js (MCP server)
    │
    ├─ registerTool ×5          ← src/tools/
    ├─ registerResource ×4      ← src/resources/
    ├─ registerPrompt ×1        ← src/prompts/
    │
    ▼
[RicardoClient]                 ← dist/client.js (also importable directly)
    │
    ▼
[Ricardo API / Stub]            ← ws.ricardo.ch (gated on SPIKE-01)
```

## Error Handling

All tool handlers return a typed error instead of throwing:

```typescript
{
  code: 'AUTH_REQUIRED' | 'AUTH_EXPIRED' | 'RATE_LIMITED' | 'NOT_FOUND' | 'INVALID_INPUT' | 'API_UNAVAILABLE',
  message: string,
  retryHint: string,   // actionable instruction for the LLM
  retryable: boolean,
}
```

Claude receives the `retryHint` and can self-correct (e.g. refresh credentials) without user intervention.

## License

MIT
