import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  validateSessionId,
  createSession,
  readSession,
  writeSession,
} from './session'

const ORIGINAL_CWD = process.cwd()
let tmpRoot: string

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-session-'))
  process.chdir(tmpRoot)
})

afterEach(() => {
  process.chdir(ORIGINAL_CWD)
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

describe('validateSessionId', () => {
  it('accepts a valid v4 UUID', () => {
    expect(() => validateSessionId('550e8400-e29b-41d4-a716-446655440000')).not.toThrow()
  })
  it('rejects path traversal characters', () => {
    expect(() => validateSessionId('../../etc/passwd')).toThrow(/Invalid sessionId/)
  })
  it('rejects malformed UUID', () => {
    expect(() => validateSessionId('not-a-uuid')).toThrow(/Invalid sessionId/)
  })
  it('rejects UUID without dashes', () => {
    expect(() => validateSessionId('550e8400e29b41d4a716446655440000')).toThrow(/Invalid sessionId/)
  })
  it('rejects v5 UUID (wrong version digit)', () => {
    expect(() => validateSessionId('550e8400-e29b-51d4-a716-446655440000')).toThrow(/Invalid sessionId/)
  })
  it('rejects non-string input', () => {
    expect(() => validateSessionId(undefined as unknown as string)).toThrow(/Invalid sessionId/)
  })
})

describe('createSession + writeSession + readSession round-trip', () => {
  it('createSession writes schemaVersion: 1 and a v4 UUID', async () => {
    const s = await createSession()
    expect(s.schemaVersion).toBe(1)
    expect(s.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(fs.existsSync(path.join(tmpRoot, 'sessions', `${s.id}.json`))).toBe(true)
  })
  it('round-trips agentTrace field', async () => {
    const s = await createSession()
    s.agentTrace = [{
      agent: 'ImageAnalyzer',
      input: { photoPaths: ['/x.jpg'] },
      output: { ok: true },
      durationMs: 42,
      completedAt: new Date().toISOString(),
      modelUsed: 'claude-sonnet-4-6',
    }]
    await writeSession(s)
    const reloaded = await readSession(s.id)
    expect(reloaded.agentTrace).toHaveLength(1)
    expect(reloaded.agentTrace![0].agent).toBe('ImageAnalyzer')
    expect(reloaded.agentTrace![0].durationMs).toBe(42)
  })
  it('readSession throws on nonexistent (but valid format) UUID', async () => {
    await expect(readSession('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(/not found/)
  })
  it('writeSession is atomic (no .tmp file left behind on success)', async () => {
    const s = await createSession()
    await writeSession(s)
    const files = fs.readdirSync(path.join(tmpRoot, 'sessions'))
    expect(files.some(f => f.endsWith('.tmp'))).toBe(false)
  })
})
