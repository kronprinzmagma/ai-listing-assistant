import type { AgentTraceEntry, Listing } from '@/types/session'
import { RicardoClient } from '../../packages/ricardo-mcp/src/client'

export interface RicardoPublisherInput {
  listing: Listing
  photoPaths: string[]
  categoryId: number
  partnershipKey: string
}

export interface RicardoPublisherOutput {
  listingId: string
  url: string
}

export async function runRicardoPublisher(
  input: RicardoPublisherInput
): Promise<{ output: RicardoPublisherOutput; trace: AgentTraceEntry }> {
  const startedAt = Date.now()
  const client = new RicardoClient(input.partnershipKey)

  // Upload images sequentially (Ricardo API may not support concurrent uploads)
  const imageIds: string[] = []
  for (const photoPath of input.photoPaths) {
    const uploaded = await client.uploadImage({ listingId: 'pending', imagePath: photoPath })
    imageIds.push(uploaded.imageId)
  }

  // Use a deterministic sessionId for the stub; real API ignores this field
  const stubSessionId = '00000000-0000-0000-0000-000000000000'

  const result = await client.createListing({
    sessionId: stubSessionId,
    locale: 'de',
    titleDe: input.listing.de.title,
    titleFr: input.listing.fr.title,
    descriptionDe: input.listing.de.description,
    descriptionFr: input.listing.fr.description,
    categoryId: input.categoryId,
    price: input.listing.de.price,
    condition: input.listing.de.condition,
    shipping: input.listing.de.shipping,
    imageIds,
  })

  const output: RicardoPublisherOutput = {
    listingId: result.listingId,
    url: result.url,
  }

  const trace: AgentTraceEntry = {
    agent: 'RicardoPublisher',
    input: { ...input, partnershipKey: '[REDACTED]' },
    output,
    durationMs: Date.now() - startedAt,
    completedAt: new Date().toISOString(),
    modelUsed: 'none',
  }

  return { output, trace }
}
