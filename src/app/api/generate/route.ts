import { NextRequest, NextResponse } from 'next/server'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { runListingWriter } from '@/agents/listing-writer'
import { runPriceEstimator } from '@/agents/price-estimator'

export async function POST(req: NextRequest) {
  const { sessionId } = (await req.json()) as { sessionId: string }

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

    session.listing = listingResult.output
    session.priceEstimate = priceResult.output
    session.agentTrace = [
      ...(session.agentTrace ?? []),
      listingResult.trace,
      priceResult.trace,
    ]
    await writeSession(session)

    return NextResponse.json({
      listing: listingResult.output,
      priceEstimate: priceResult.output,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
