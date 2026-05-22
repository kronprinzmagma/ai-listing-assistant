import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createSession, writeSession, getUploadDir } from '@/lib/session'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const files = formData.getAll('photos') as File[]

  if (files.length < 1 || files.length > 5) {
    return NextResponse.json({ error: 'Bitte 1-5 Fotos hochladen.' }, { status: 400 })
  }

  const session = await createSession()
  const uploadDir = await getUploadDir(session.id)

  const photoPaths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = path.join(uploadDir, `photo-${i}.${ext}`)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.promises.writeFile(filePath, buffer)
    photoPaths.push(filePath)
  }

  session.photoPaths = photoPaths
  await writeSession(session)

  return NextResponse.json({ sessionId: session.id })
}
