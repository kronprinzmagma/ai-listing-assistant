import { NextRequest, NextResponse } from 'next/server'
import { readJsonBody, SessionIdBody, errorResponse } from '@/lib/api'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { runListingWriter } from '@/agents/listing-writer'
import { runPriceEstimator } from '@/agents/price-estimator'
import type { PriceEstimateZ, RicardoListing } from '@/agents/schemas'

function withEstimatedPrice(listing: RicardoListing, estimate: PriceEstimateZ): RicardoListing {
  if (estimate.source !== 'ricardo') return listing
  const price = estimate.suggestedPriceCHF
  return { de: { ...listing.de, price }, fr: { ...listing.fr, price } }
}

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req, SessionIdBody)
  if (!body.ok) return body.response
  const { sessionId } = body.data

  try {
    validateSessionId(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  try {
    const session = await readSession(sessionId)

    if (!session.analysis) {
      return NextResponse.json({ error: 'Analyse fehlt' }, { status: 400 })
    }

    // Note: concurrent requests to this route within the same session may result in duplicate
    // AI calls. This is accepted as a known limitation for a single-user tool. For multi-user
    // deployments, implement advisory file locking around the read-check-write cycle.

    // Idempotency: skip ONLY if BOTH outputs exist (per Pitfall #4)
    if (session.listing && session.priceEstimate) {
      return NextResponse.json({
        listing: session.listing,
        priceEstimate: session.priceEstimate,
      })
    }

    // Run both agents in parallel
    const [listingResult, priceResult] = await Promise.all([
      runListingWriter({ analysis: session.analysis, questions: session.questions ?? [] }),
      runPriceEstimator({ analysis: session.analysis }),
    ])

    // Stuetzt sich der Preisvorschlag auf Ricardo-Vergleichsangebote, gilt er
    // fuer das Inserat (DE und FR); sonst bleibt der Preis des Schreibers.
    const listing = withEstimatedPrice(listingResult.output, priceResult.output)
    session.listing = listing
    session.priceEstimate = priceResult.output
    session.agentTrace = [
      ...(session.agentTrace ?? []),
      listingResult.trace,
      priceResult.trace,
    ]
    await writeSession(session)

    return NextResponse.json({
      listing,
      priceEstimate: priceResult.output,
    })
  } catch (err) {
    return errorResponse('api/generate', err)
  }
}
