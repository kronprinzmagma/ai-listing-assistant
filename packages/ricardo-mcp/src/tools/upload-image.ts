import path from 'path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { UploadImageInputSchema } from '../schemas/tool-inputs.js'
import { UploadImageOutputSchema } from '../schemas/tool-outputs.js'
import { makeTypedError } from '../schemas/errors.js'
import { RicardoClient } from '../client.js'

const ALLOWED_UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads')

export function registerUploadImage(server: McpServer, client: RicardoClient): void {
  server.registerTool(
    'upload_image',
    {
      title: 'Upload Image to Ricardo Listing',
      description: 'Upload an image file to an existing Ricardo.ch listing.',
      inputSchema: UploadImageInputSchema,
      outputSchema: UploadImageOutputSchema,
    },
    async ({ listingId, imagePath }) => {
      const resolved = path.resolve(imagePath)
      if (!resolved.startsWith(ALLOWED_UPLOAD_DIR + path.sep)) {
        throw new Error('imagePath outside allowed upload directory')
      }
      try {
        const result = await client.uploadImage({ listingId, imagePath })
        return {
          content: [{ type: 'text' as const, text: `Uploaded image ${result.imageId} to listing ${listingId}: ${result.url}` }],
          structuredContent: result,
        }
      } catch (error) {
        console.error('upload_image error:', error)
        return makeTypedError(error, 'Check that the listingId is valid and imagePath exists, then retry.')
      }
    }
  )
}
