import { describe, it, expect } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerUploadImage } from '../../src/tools/upload-image.js'
import { RicardoClient } from '../../src/client.js'

describe('upload_image tool', () => {
  it('registers on McpServer without error', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' })
    const client = new RicardoClient()
    expect(() => registerUploadImage(server, client)).not.toThrow()
  })

  it('stub client returns imageId and url', async () => {
    const client = new RicardoClient()
    const result = await client.uploadImage({ listingId: 'abc', imagePath: '/tmp/photo.jpg' })
    expect(result.imageId).toBeTruthy()
    expect(result.url).toMatch(/^https:\/\//)
  })
})
