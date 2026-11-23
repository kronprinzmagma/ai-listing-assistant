import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { createSession, writeSession, getUploadDir } from '@/lib/session'
import { errorResponse } from '@/lib/api'

// Obergrenze pro Foto. Handyfotos liegen meist bei 2-8 MB; groessere Dateien
// wuerden ganz in den Speicher gelesen (repo-cockpit C12, Idee 51).
export const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_FILES = 5

// Erlaubte Formate nach dem Inhalt der Datei (sharp liest den Bildkopf), nicht
// nach Dateiname oder Browser-Angabe. HEIC/HEIF und AVIF meldet sharp als 'heif'.
const EXT_BY_FORMAT: Record<string, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  heif: 'heic',
}

const TYPE_ERROR = 'Ungültiger Dateityp. Erlaubt: JPG, PNG, WebP, HEIC.'

async function detectExt(buffer: Buffer): Promise<string | null> {
  try {
    const { format } = await sharp(buffer).metadata()
    return (format && EXT_BY_FORMAT[format]) ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let files: File[]
  try {
    const formData = await req.formData()
    files = formData.getAll('photos').filter((f): f is File => f instanceof File)
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  if (files.length < 1 || files.length > MAX_FILES) {
    return NextResponse.json({ error: 'Bitte 1-5 Fotos hochladen.' }, { status: 400 })
  }

  // Erst alle Fotos pruefen, dann Session und Dateien anlegen: ein ungueltiges
  // Foto hinterlaesst so keine verwaiste Session.
  const checked: { buffer: Buffer; ext: string }[] = []
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Foto zu gross (höchstens ${MAX_FILE_BYTES / 1024 / 1024} MB pro Foto).` },
        { status: 413 }
      )
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = await detectExt(buffer)
    if (!ext) {
      return NextResponse.json({ error: TYPE_ERROR }, { status: 400 })
    }
    checked.push({ buffer, ext })
  }

  try {
    const session = await createSession()
    const uploadDir = await getUploadDir(session.id)
    const photoPaths: string[] = []
    for (let i = 0; i < checked.length; i++) {
      const filePath = path.join(uploadDir, `photo-${i}.${checked[i].ext}`)
      await fs.promises.writeFile(filePath, checked[i].buffer)
      photoPaths.push(filePath)
    }
    session.photoPaths = photoPaths
    await writeSession(session)
    return NextResponse.json({ sessionId: session.id })
  } catch (err) {
    return errorResponse('api/upload', err)
  }
}
