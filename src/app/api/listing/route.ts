import { NextRequest, NextResponse } from 'next/server'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { RicardoListingSchema } from '@/agents/schemas'
import { z } from 'zod'
import { readJsonBody, errorResponse } from '@/lib/api'

// listing wird unten gegen RicardoListingSchema geprueft (eigene Fehlermeldung).
const ListingPatchBody = z.object({
  sessionId: z.string(),
  listing: z.unknown().optional(),
  approved: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const body = await readJsonBody(req, ListingPatchBody)
  if (!body.ok) return body.response
  const { sessionId, listing, approved } = body.data

  try {
    validateSessionId(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  try {
    const session = await readSession(sessionId)
    if (listing !== undefined) {
      const parsed = RicardoListingSchema.safeParse(listing)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid listing format' }, { status: 400 })
      }
      session.listing = parsed.data
    }
    // Only allow setting approved to true, never downgrade from true to false
    if (approved === true) session.approved = true
    await writeSession(session)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorResponse('api/listing', err)
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId fehlt' }, { status: 400 })

  try {
    validateSessionId(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  try {
    const session = await readSession(sessionId)
    return NextResponse.json({ session })
  } catch (err) {
    return errorResponse('api/listing', err)
  }
}
