import { NextRequest, NextResponse } from 'next/server'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { RicardoListingSchema } from '@/agents/schemas'

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as {
    sessionId: string
    listing?: unknown
    approved?: boolean
  }
  const { sessionId, listing, approved } = body

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
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
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
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
