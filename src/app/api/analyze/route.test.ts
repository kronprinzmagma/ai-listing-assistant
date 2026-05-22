import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))

vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock } },
}))
vi.mock('sharp', () => ({
  default: () => ({
    resize: () => ({ jpeg: () => ({ toBuffer: async () => Buffer.from('x') }) }),
  }),
}))

import { POST } from './route'
import { createSession, writeSession, readSession } from '@/lib/session'

const ORIGINAL_CWD = process.cwd()
let tmpRoot: string

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-route-'))
  process.chdir(tmpRoot)
  parseMock.mockReset()
  parseMock.mockResolvedValue({
    parsed_output: {
      object: 'Laptop', condition: 'gut', category: 'Elektronik',
      titleDraft: 'MacBook Pro', descriptionDraft: 'Gut.',
    },
    usage: { input_tokens: 10, output_tokens: 5 },
  })
})

afterEach(() => {
  process.chdir(ORIGINAL_CWD)
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

function makeReq(body: unknown): Request {
  return new Request('http://test/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/analyze', () => {
  it('rejects path traversal sessionId with 400', async () => {
    const res = await POST(makeReq({ sessionId: '../../etc/passwd' }) as never)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Invalid sessionId/)
    expect(parseMock).not.toHaveBeenCalled()
  })

  it('rejects malformed UUID with 400', async () => {
    const res = await POST(makeReq({ sessionId: 'not-a-uuid' }) as never)
    expect(res.status).toBe(400)
    expect(parseMock).not.toHaveBeenCalled()
  })

  it('runs the agent once and persists analysis + trace', async () => {
    const s = await createSession()
    s.photoPaths = ['/fake.jpg']
    await writeSession(s)
    const res = await POST(makeReq({ sessionId: s.id }) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.analysis.object).toBe('Laptop')
    expect(parseMock).toHaveBeenCalledTimes(1)
    const reloaded = await readSession(s.id)
    expect(reloaded.analysis?.object).toBe('Laptop')
    expect(reloaded.agentTrace).toHaveLength(1)
    expect(reloaded.agentTrace![0].agent).toBe('ImageAnalyzer')
  })

  it('is idempotent — second POST returns cached without re-calling agent', async () => {
    const s = await createSession()
    s.photoPaths = ['/fake.jpg']
    await writeSession(s)
    await POST(makeReq({ sessionId: s.id }) as never)
    await POST(makeReq({ sessionId: s.id }) as never)
    expect(parseMock).toHaveBeenCalledTimes(1)  // NOT 2
    const reloaded = await readSession(s.id)
    expect(reloaded.agentTrace).toHaveLength(1) // single trace entry
  })
})
