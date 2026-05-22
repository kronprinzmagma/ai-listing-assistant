import { describe, it, expect } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { registerDraftListingPrompt } from '../../src/prompts/draft-listing'

describe('draft_listing prompt', () => {
  it('registers on McpServer without error', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    expect(() => registerDraftListingPrompt(server)).not.toThrow()
  })
})
