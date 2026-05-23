import { NextRequest, NextResponse } from 'next/server'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { sanitizeUserAnswer } from '@/lib/sanitize'

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { sessionId: string; answers: unknown }
  const { sessionId, answers } = body

  try {
    validateSessionId(sessionId)
  } catch {
    return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ error: 'Ungültige Antworten' }, { status: 400 })
  }
  const answersMap = answers as Record<string, unknown>

  try {
    const session = await readSession(sessionId)
    if (!session.questions) {
      return NextResponse.json({ error: 'Fragen fehlen' }, { status: 400 })
    }
    session.questions = session.questions.map((q) => ({
      ...q,
      answer:
        answersMap[q.id] !== undefined
          ? sanitizeUserAnswer(String(answersMap[q.id]).slice(0, 1000))
          : q.answer,
    }))
    await writeSession(session)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
