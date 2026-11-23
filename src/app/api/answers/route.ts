import { NextRequest, NextResponse } from 'next/server'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { sanitizeUserAnswer } from '@/lib/sanitize'
import { z } from 'zod'
import { readJsonBody, errorResponse } from '@/lib/api'

// answers: Objekt Frage-ID -> Antwort (kein Array, kein Einzelwert).
const AnswersBody = z.object({
  sessionId: z.string(),
  answers: z.record(z.string(), z.unknown()),
})

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req, AnswersBody)
  if (!body.ok) return body.response
  const { sessionId, answers: answersMap } = body.data

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
        answersMap[q.id] !== undefined
          ? sanitizeUserAnswer(String(answersMap[q.id]).slice(0, 1000))
          : q.answer,
    }))
    await writeSession(session)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return errorResponse('api/answers', err)
  }
}
