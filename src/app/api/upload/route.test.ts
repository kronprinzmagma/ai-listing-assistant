import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import sharp from 'sharp'

import { POST, MAX_FILE_BYTES } from './route'
import { readSession } from '@/lib/session'

const ORIGINAL_CWD = process.cwd()
let tmpRoot: string

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-upload-'))
  process.chdir(tmpRoot)
})

afterEach(() => {
  process.chdir(ORIGINAL_CWD)
  fs.rmSync(tmpRoot, { recursive: true, force: true })
})

// Synthetische Bilder, keine echten Fotos.
async function bild(format: 'jpeg' | 'png' | 'webp'): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: '#c33' } })[format]().toBuffer()
}

function datei(inhalt: Buffer | string, name: string, type: string): File {
  const bytes = typeof inhalt === 'string' ? new TextEncoder().encode(inhalt) : new Uint8Array(inhalt)
  return new File([bytes], name, { type })
}

function makeReq(files: File[]): Request {
  const form = new FormData()
  for (const f of files) form.append('photos', f)
  return new Request('http://test/api/upload', { method: 'POST', body: form })
}

// Anzahl angelegter Sessions (verwaiste Dateien erkennen).
function sessionCount(): number {
  const dir = path.join(tmpRoot, 'sessions')
  return fs.existsSync(dir) ? fs.readdirSync(dir).length : 0
}

function uploadCount(): number {
  const dir = path.join(tmpRoot, 'uploads')
  return fs.existsSync(dir) ? fs.readdirSync(dir).length : 0
}

describe('POST /api/upload', () => {
  it('legt fuer gueltige Bilder eine Session mit den Fotopfaden an', async () => {
    const res = await POST(
      makeReq([datei(await bild('jpeg'), 'a.jpg', 'image/jpeg'), datei(await bild('png'), 'b.png', 'image/png')]) as never
    )
    expect(res.status).toBe(200)
    const { sessionId } = await res.json()
    const session = await readSession(sessionId)
    expect(session.photoPaths).toHaveLength(2)
    expect(session.photoPaths[0]).toMatch(/photo-0\.jpg$/)
    expect(session.photoPaths[1]).toMatch(/photo-1\.png$/)
    for (const p of session.photoPaths) expect(fs.existsSync(p)).toBe(true)
  })

  it('bestimmt die Endung aus dem Inhalt, nicht aus Name oder Browser-Angabe', async () => {
    const res = await POST(makeReq([datei(await bild('webp'), 'foto.jpg', 'image/jpeg')]) as never)
    expect(res.status).toBe(200)
    const session = await readSession((await res.json()).sessionId)
    expect(session.photoPaths[0]).toMatch(/photo-0\.webp$/)
  })

  it('weist ohne Fotos und mit mehr als 5 Fotos ab', async () => {
    expect((await POST(makeReq([]) as never)).status).toBe(400)
    const jpg = await bild('jpeg')
    const sechs = Array.from({ length: 6 }, (_, i) => datei(jpg, `${i}.jpg`, 'image/jpeg'))
    expect((await POST(makeReq(sechs) as never)).status).toBe(400)
    expect(sessionCount()).toBe(0)
  })

  it('weist eine Datei ab, die sich als JPEG ausgibt, aber keines ist', async () => {
    const res = await POST(makeReq([datei('<script>alert(1)</script>', 'x.jpg', 'image/jpeg')]) as never)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Dateityp/)
  })

  it('weist ein echtes Bild in einem nicht erlaubten Format ab (GIF)', async () => {
    const gif = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#000' } }).gif().toBuffer()
    const res = await POST(makeReq([datei(gif, 'x.gif', 'image/jpeg')]) as never)
    expect(res.status).toBe(400)
  })

  it('weist eine Datei ueber der Groessengrenze ab', async () => {
    const gross = Buffer.alloc(MAX_FILE_BYTES + 1)
    const res = await POST(makeReq([datei(gross, 'gross.jpg', 'image/jpeg')]) as never)
    expect(res.status).toBe(413)
    expect((await res.json()).error).toMatch(/MB/)
  })

  it('legt bei ungueltigem zweitem Foto keine Session und keine Dateien an', async () => {
    const res = await POST(
      makeReq([datei(await bild('jpeg'), 'a.jpg', 'image/jpeg'), datei('kein bild', 'b.jpg', 'image/jpeg')]) as never
    )
    expect(res.status).toBe(400)
    expect(sessionCount()).toBe(0)
    expect(uploadCount()).toBe(0)
  })

  it('antwortet auf einen Body ohne Formulardaten mit 400', async () => {
    const req = new Request('http://test/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })
})
