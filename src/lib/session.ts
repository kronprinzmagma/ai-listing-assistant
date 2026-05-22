import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { SessionState } from '@/types/session'

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sessionsDir(): string {
  return path.join(process.cwd(), 'sessions')
}

function uploadsDir(): string {
  return path.join(process.cwd(), 'uploads')
}

export function validateSessionId(id: string): void {
  if (typeof id !== 'string' || !UUID_V4_REGEX.test(id)) {
    throw new Error('Invalid sessionId format')
  }
  const dir = sessionsDir()
  const resolved = path.resolve(dir, `${id}.json`)
  if (!resolved.startsWith(dir + path.sep)) {
    throw new Error('Invalid sessionId: path traversal detected')
  }
}

async function ensureDirs(): Promise<void> {
  await fs.promises.mkdir(sessionsDir(), { recursive: true })
  await fs.promises.mkdir(uploadsDir(), { recursive: true })
}

export async function createSession(): Promise<SessionState> {
  await ensureDirs()
  const id = uuidv4()
  const session: SessionState = {
    id,
    createdAt: new Date().toISOString(),
    schemaVersion: 1,
    photoPaths: [],
  }
  await writeSession(session)
  return session
}

export async function readSession(id: string): Promise<SessionState> {
  const filePath = path.join(sessionsDir(), `${id}.json`)
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return JSON.parse(content) as SessionState
  } catch {
    throw new Error(`Session ${id} not found`)
  }
}

export async function writeSession(session: SessionState): Promise<void> {
  await ensureDirs()
  const filePath = path.join(sessionsDir(), `${session.id}.json`)
  const tmpPath = `${filePath}.tmp`
  await fs.promises.writeFile(tmpPath, JSON.stringify(session, null, 2))
  await fs.promises.rename(tmpPath, filePath)
}

export async function getUploadDir(sessionId: string): Promise<string> {
  const dir = path.join(uploadsDir(), sessionId)
  await fs.promises.mkdir(dir, { recursive: true })
  return dir
}
