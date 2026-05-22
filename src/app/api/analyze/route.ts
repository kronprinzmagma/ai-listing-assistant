import { NextRequest, NextResponse } from 'next/server'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { runImageAnalyzer } from '@/agents/image-analyzer'

export async function POST(req: NextRequest) {
  const { sessionId } = (await req.json()) as { sessionId: string }

  try {
    validateSessionId(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  try {
    const session = await readSession(sessionId)

    if (session.analysis) {
      return NextResponse.json({ analysis: session.analysis })
    }

    const { output, trace } = await runImageAnalyzer({ photoPaths: session.photoPaths })
    session.analysis = output
    session.agentTrace = [...(session.agentTrace ?? []), trace]
    await writeSession(session)
    return NextResponse.json({ analysis: output })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
