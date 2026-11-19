// Stichprobe fuer den Preisschaetzer mit Ricardo-Vergleichsangeboten (Websuche).
// Kostet API-Guthaben: pro Gegenstand 1-2 Websuchen (je rund 1 Rappen) plus zwei
// Modellaufrufe. Nur synthetische Gegenstaende, nichts wird publiziert.
//
//   npm run eval:price            # alle Faelle unten
//   npm run eval:price -- 1       # nur der erste Fall
import * as fs from 'node:fs'
import * as path from 'node:path'

// .env.local laden, bevor der Anthropic-Client importiert wird (wie run-eval.ts).
function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    if (key && !process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim()
  }
}

const CASES = [
  {
    object: 'Nintendo Switch OLED Konsole weiss',
    condition: 'gut' as const,
    category: 'Games & Konsolen',
    titleDraft: 'Nintendo Switch OLED weiss – gut',
    descriptionDraft: 'Konsole mit Dock und Joy-Cons, leichte Gebrauchsspuren.',
  },
  {
    object: 'IKEA Kallax Regal 4x4 weiss',
    condition: 'gut' as const,
    category: 'Möbel',
    titleDraft: 'IKEA Kallax Regal 4x4 weiss – gut',
    descriptionDraft: 'Regal mit leichten Gebrauchsspuren, zerlegt.',
  },
]

async function main(): Promise<void> {
  loadEnvLocal()
  const { runPriceEstimator } = await import('../src/agents/price-estimator')
  const limit = Number(process.argv[2] ?? CASES.length)
  for (const analysis of CASES.slice(0, limit)) {
    const { output, trace } = await runPriceEstimator({ analysis })
    const info = trace.input as { searches?: number; comparablesFound?: number; searchError?: string }
    console.log(`\n${analysis.object}`)
    console.log(`  Vorschlag: CHF ${output.suggestedPriceCHF} (${output.source}, Sicherheit ${output.confidence})`)
    console.log(`  Suchen: ${info.searches ?? 0}, Treffer mit Preis: ${info.comparablesFound ?? 0}, genutzt: ${output.comparables?.length ?? 0}`)
    if (info.searchError) console.log(`  Suche fehlgeschlagen: ${info.searchError}`)
    for (const c of output.comparables ?? []) console.log(`  - CHF ${c.priceCHF}  ${c.url}`)
    console.log(`  Begruendung: ${output.rationale}`)
    console.log(`  Tokens: ${trace.inputTokens} ein, ${trace.outputTokens} aus`)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
