import { NextRequest, NextResponse } from 'next/server'
import { validateSessionId } from '@/lib/session'
import { RicardoClient } from '../../../../packages/ricardo-mcp/src/client'

const PARTNERSHIP_KEY = process.env.RICARDO_PARTNERSHIP_KEY ?? 'stub-key'

export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get('sessionId')
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId fehlt' }, { status: 400 })
  }

  try {
    validateSessionId(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  try {
    const client = new RicardoClient(PARTNERSHIP_KEY)
    const orders = await client.getPendingOrders()
    return NextResponse.json({ orders })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
