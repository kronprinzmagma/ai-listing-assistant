import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

const parseMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock } },
}))

import { POST } from './route'
import { createSession, writeSession, readSession } from '@/lib/session'

const ORIGINAL_CWD = process.cwd()
let tmpRoot: string

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-q-'))
  process.chdir(tmpRoot)
  parseMock.mockReset()
  parseMock.mockResolvedValue({
    parsed_output: { questions: ['Alter?', 'Originalverpackung?', 'Mängel?'] },
    usage: { input_tokens: 10, output_tokens: 5 },
  })
})

afterEach(() => {
  process.chdir(ORIGINAL_CWD)
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

function makeReq(body: unknown): Request {
  return new Request('http://test/api/questions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/questions', () => {
  it('rejects path traversal sessionId with 400', async () => {
    const res = await POST(makeReq({ sessionId: '../../etc/passwd' }) as never)
    expect(res.status).toBe(400)
    expect(parseMock).not.toHaveBeenCalled()
  })

  it('rejects 400 when session has no analysis', async () => {
    const s = await createSession()
    const res = await POST(makeReq({ sessionId: s.id }) as never)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Analyse/)
  })

  it('runs agent once and persists questions + trace', async () => {
    const s = await createSession()
    s.analysis = { object: 'L', condition: 'gut', category: 'E', titleDraft: 'T', descriptionDraft: 'D' }
    await writeSession(s)
    const res = await POST(makeReq({ sessionId: s.id }) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.questions.length).toBeGreaterThanOrEqual(3)
    expect(parseMock).toHaveBeenCalledTimes(1)
    const reloaded = await readSession(s.id)
    expect(reloaded.questions).toHaveLength(3)
    expect(reloaded.agentTrace?.[0].agent).toBe('QuestionGenerator')
  })

  it('is idempotent — second POST returns cached', async () => {
    const s = await createSession()
    s.analysis = { object: 'L', condition: 'gut', category: 'E', titleDraft: 'T', descriptionDraft: 'D' }
    await writeSession(s)
    await POST(makeReq({ sessionId: s.id }) as never)
    await POST(makeReq({ sessionId: s.id }) as never)
    expect(parseMock).toHaveBeenCalledTimes(1)
  })
})
