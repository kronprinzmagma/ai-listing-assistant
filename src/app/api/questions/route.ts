import { NextRequest, NextResponse } from 'next/server'
import { readJsonBody, SessionIdBody, errorResponse } from '@/lib/api'
import { validateSessionId, readSession, writeSession } from '@/lib/session'
import { runQuestionGenerator } from '@/agents/question-generator'

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

    if (session.questions) {
      return NextResponse.json({ questions: session.questions })
    }

    // Note: concurrent requests to this route within the same session may result in duplicate
    // AI calls. This is accepted as a known limitation for a single-user tool. For multi-user
    // deployments, implement advisory file locking around the read-check-write cycle.
    const { output, trace } = await runQuestionGenerator({ analysis: session.analysis })
    session.questions = output
    session.agentTrace = [...(session.agentTrace ?? []), trace]
    await writeSession(session)
    return NextResponse.json({ questions: output })
  } catch (err) {
    return errorResponse('api/questions', err)
  }
}
