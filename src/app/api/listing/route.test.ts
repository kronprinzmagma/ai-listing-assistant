import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

import { GET, PATCH } from './route'
import { createSession, readSession, writeSession } from '@/lib/session'
import type { RicardoListing } from '@/agents/schemas'

const ORIGINAL_CWD = process.cwd()
let tmpRoot: string

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-listing-'))
  process.chdir(tmpRoot)
})

afterEach(() => {
  process.chdir(ORIGINAL_CWD)
  fs.rmSync(tmpRoot, { recursive: true, force: true })
  vi.restoreAllMocks()
})

const LISTING: RicardoListing = {
  de: { title: 'Velo', description: 'Gut erhalten.', category: 'Fahrrad', condition: 'gut', price: 120, shipping: 'Abholung' },
  fr: { title: 'Vélo', description: 'Bon état.', category: 'Vélos', condition: 'bon', price: 120, shipping: 'Retrait' },
}

function patchReq(body: string): Request {
  return new Request('http://test/api/listing', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

function getReq(query: string) {
  const url = `http://test/api/listing${query}`
  return Object.assign(new Request(url), { nextUrl: new URL(url) })
}

describe('PATCH /api/listing', () => {
  it('antwortet auf ungueltiges JSON mit 400 statt 500', async () => {
    const res = await PATCH(patchReq('{kein json') as never)
    expect(res.status).toBe(400)
  })

  it('weist einen Body mit falschem Typ fuer approved ab', async () => {
    const s = await createSession()
    const res = await PATCH(patchReq(JSON.stringify({ sessionId: s.id, approved: 'ja' })) as never)
    expect(res.status).toBe(400)
    expect((await readSession(s.id)).approved).toBeUndefined()
  })

  it('weist eine ungueltige sessionId ab', async () => {
    const res = await PATCH(patchReq(JSON.stringify({ sessionId: '../../etc/passwd', approved: true })) as never)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid sessionId')
  })

  it('speichert ein gueltiges Inserat und die Freigabe', async () => {
    const s = await createSession()
    const res = await PATCH(patchReq(JSON.stringify({ sessionId: s.id, listing: LISTING, approved: true })) as never)
    expect(res.status).toBe(200)
    const reloaded = await readSession(s.id)
    expect(reloaded.listing?.de.title).toBe('Velo')
    expect(reloaded.approved).toBe(true)
  })

  it('weist ein Inserat im falschen Format ab', async () => {
    const s = await createSession()
    const res = await PATCH(patchReq(JSON.stringify({ sessionId: s.id, listing: { de: {} } })) as never)
    expect(res.status).toBe(400)
  })

  it('nimmt eine Freigabe nie zurueck', async () => {
    const s = await createSession()
    s.approved = true
    await writeSession(s)
    const res = await PATCH(patchReq(JSON.stringify({ sessionId: s.id, approved: false })) as never)
    expect(res.status).toBe(200)
    expect((await readSession(s.id)).approved).toBe(true)
  })

  it('meldet eine unbekannte Session mit 404, ohne interne Angaben', async () => {
    const res = await PATCH(
      patchReq(JSON.stringify({ sessionId: '550e8400-e29b-41d4-a716-446655440000', approved: true })) as never
    )
    expect(res.status).toBe(404)
    expect(JSON.stringify(await res.json())).not.toContain('550e8400')
  })
})

describe('GET /api/listing', () => {
  it('verlangt eine sessionId', async () => {
    expect((await GET(getReq('') as never)).status).toBe(400)
  })

  it('liefert die Session', async () => {
    const s = await createSession()
    const res = await GET(getReq(`?sessionId=${s.id}`) as never)
    expect(res.status).toBe(200)
    expect((await res.json()).session.id).toBe(s.id)
  })

  it('gibt bei einer defekten Session-Datei keine interne Fehlermeldung weiter', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const s = await createSession()
    fs.writeFileSync(path.join(tmpRoot, 'sessions', `${s.id}.json`), '{defekt')
    const res = await GET(getReq(`?sessionId=${s.id}`) as never)
    expect(res.status).toBe(500)
    const text = JSON.stringify(await res.json())
    expect(text).not.toMatch(/corrupted|JSON|position/i)
  })
})
