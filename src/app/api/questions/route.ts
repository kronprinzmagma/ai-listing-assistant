import { NextRequest, NextResponse } from 'next/server'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { runQuestionGenerator } from '@/agents/question-generator'

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

    if (session.questions) {
      return NextResponse.json({ questions: session.questions })
    }

    const { output, trace } = await runQuestionGenerator({ analysis: session.analysis })
    session.questions = output
    session.agentTrace = [...(session.agentTrace ?? []), trace]
    await writeSession(session)
    return NextResponse.json({ questions: output })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
