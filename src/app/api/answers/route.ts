import { NextRequest, NextResponse } from 'next/server'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { sanitizeUserAnswer } from '@/lib/sanitize'

export async function POST(req: NextRequest) {
  const { sessionId, answers } = (await req.json()) as {
    sessionId: string
    answers: Record<string, string>
  }

  try {
    validateSessionId(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  try {
    const session = await readSession(sessionId)
    if (!session.questions) {
      return NextResponse.json({ error: 'Fragen fehlen' }, { status: 400 })
    }
    session.questions = session.questions.map((q) => ({
      ...q,
      answer:
        answers[q.id] !== undefined
          ? sanitizeUserAnswer(answers[q.id])
          : q.answer,
    }))
    await writeSession(session)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
