import { NextResponse } from 'next/server'
import { z } from 'zod'
import { SessionNotFoundError } from '@/lib/session'

// Gemeinsame Bausteine der API-Routen (repo-cockpit C12, C3; Idee 51):
// Anfrage-Body nur ueber ein Zod-Schema lesen und interne Fehlermeldungen
// (Dateipfade, Session-IDs, API-Fehler) nie an den Client geben.

export const SessionIdBody = z.object({ sessionId: z.string() })

type BodyResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

/** Liest den JSON-Body und prueft ihn gegen das Schema; Fehler ergeben 400. */
export async function readJsonBody<S extends z.ZodType>(
  req: Request,
  schema: S
): Promise<BodyResult<z.infer<S>>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Ungültige Anfrage (kein JSON).' }, { status: 400 }) }
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 }) }
  }
  return { ok: true, data: parsed.data }
}

/**
 * Antwort fuer unerwartete Fehler: Details nur ins Server-Log, an den Client
 * eine allgemeine Meldung. Eine unbekannte Session ergibt 404.
 */
export function errorResponse(route: string, err: unknown): NextResponse {
  if (err instanceof SessionNotFoundError) {
    return NextResponse.json({ error: 'Session nicht gefunden.' }, { status: 404 })
  }
  console.error("API-Fehler in", route, err)
  return NextResponse.json({ error: 'Interner Fehler. Bitte später erneut versuchen.' }, { status: 500 })
}
