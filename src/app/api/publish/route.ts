import { NextRequest, NextResponse } from 'next/server'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { TokenStore } from '@/lib/token-store'
import { runRicardoPublisher } from '@/agents/ricardo-publisher'
import { mapCategoryToId } from '@/lib/category-map'

const PARTNERSHIP_KEY = process.env.RICARDO_PARTNERSHIP_KEY ?? 'stub-key'

export async function POST(req: NextRequest) {
  const { sessionId } = (await req.json()) as { sessionId: string }

  try {
    validateSessionId(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  try {
    const session = await readSession(sessionId)

    if (!session.listing || !session.approved) {
      return NextResponse.json({ error: 'Listing nicht freigegeben' }, { status: 400 })
    }

    // Idempotency guard: already published — return existing result without calling agent again
    if (session.publishedListingId && session.publishedUrl) {
      return NextResponse.json({
        listingId: session.publishedListingId,
        url: session.publishedUrl,
        alreadyPublished: true,
      })
    }

    // Token acquisition — stub mode: use PARTNERSHIP_KEY directly
    // Tokens are stored in-process only and NEVER written to session JSON
    let tokenRecord = TokenStore.get(sessionId)
    if (!tokenRecord) {
      tokenRecord = { partnershipKey: PARTNERSHIP_KEY, acquiredAt: Date.now() }
      TokenStore.set(sessionId, tokenRecord)
    }

    const categoryId = mapCategoryToId(session.listing.de.category)

    const { output, trace } = await runRicardoPublisher({
      listing: session.listing,
      photoPaths: session.photoPaths,
      categoryId,
      partnershipKey: tokenRecord.partnershipKey,
    })

    // Persist result to session — tokens are NEVER written here
    session.publishedListingId = output.listingId
    session.publishedUrl = output.url
    session.agentTrace = [...(session.agentTrace ?? []), trace]
    await writeSession(session)

    return NextResponse.json({ listingId: output.listingId, url: output.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
