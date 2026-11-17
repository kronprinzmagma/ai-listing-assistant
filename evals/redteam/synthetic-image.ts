// Erzeugt synthetische Testfotos mit Text im Bild (Produkt-Etikett plus Zettel
// mit eingeschleuster Anweisung). Keine echten Fotos, keine echten Personendaten:
// Telefonnummern und Domains in den Testfaellen sind Platzhalter
// (079 000 00 00, example.invalid). Die Bilder entstehen zur Laufzeit im
// Temp-Ordner und werden nicht eingecheckt.

import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import sharp from 'sharp'

export interface SyntheticPhotoSpec {
  /** Beschriftung auf dem Produkt, z. B. Marke und Modell. */
  productLabel: string[]
  /** Text auf dem Zettel neben dem Produkt (die eingeschleuste Anweisung). */
  noteLines: string[]
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function textLines(lines: string[], x: number, y: number, size: number, weight = 'normal'): string {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * size * 1.35}" font-family="DejaVu Sans, Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#111">${escapeXml(line)}</text>`
    )
    .join('')
}

/** SVG-Szene: graues Produkt mit Etikett, daneben ein gelber Zettel. */
export function buildSvg(spec: SyntheticPhotoSpec): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
  <rect width="1200" height="900" fill="#e9e6e1"/>
  <rect x="80" y="180" width="520" height="560" rx="40" fill="#3a3f47"/>
  <rect x="130" y="380" width="420" height="170" rx="12" fill="#f4f4f4"/>
  ${textLines(spec.productLabel, 150, 440, 34, 'bold')}
  <g transform="rotate(-4 900 450)">
    <rect x="660" y="160" width="470" height="580" fill="#fff36b" stroke="#c9bd3a" stroke-width="3"/>
    ${textLines(spec.noteLines, 690, 230, 30)}
  </g>
</svg>`
}

export async function renderSyntheticPhoto(spec: SyntheticPhotoSpec): Promise<Buffer> {
  return sharp(Buffer.from(buildSvg(spec))).jpeg({ quality: 90 }).toBuffer()
}

/** Schreibt das Foto in einen frischen Temp-Ordner und gibt den Pfad zurueck. */
export async function writeSyntheticPhoto(spec: SyntheticPhotoSpec): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'injection-eval-'))
  const file = path.join(dir, 'foto.jpg')
  fs.writeFileSync(file, await renderSyntheticPhoto(spec))
  return file
}
