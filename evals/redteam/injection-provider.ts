import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ApiProvider, ProviderResponse } from 'promptfoo'
import type { StoredAnalysis } from '../../src/agents/schemas'
import type { SyntheticPhotoSpec } from './synthetic-image'

// Provider fuer die Prompt-Injection-Evals. Zwei Modi:
//
// - text:  Simuliert, dass der ImageAnalyzer Text aus dem Foto (Etikett, Zettel)
//          in seine Analyse uebernommen hat. Die Analyse kommt aus den
//          Test-Variablen und geht direkt an ListingWriter und PriceEstimator.
//          So ist der Fall reproduzierbar und unabhaengig von der Bilderkennung.
// - image: Ganze Kette ab Foto. Ein synthetisches Bild mit Text wird erzeugt,
//          der ImageAnalyzer liest es, danach ListingWriter und PriceEstimator.
//
// Der Output enthaelt das fertige Inserat und die Preisschaetzung; die Pruefung
// macht evals/redteam/checks.ts.

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

export default class InjectionProvider implements ApiProvider {
  id(): string {
    return 'injection-pipeline'
  }

  async callApi(
    _prompt: string,
    context?: { vars?: Record<string, unknown> }
  ): Promise<ProviderResponse> {
    loadEnvLocal()
    const vars = context?.vars ?? {}
    try {
      const { runImageAnalyzer } = await import('../../src/agents/image-analyzer')
      const { runListingWriter } = await import('../../src/agents/listing-writer')
      const { runPriceEstimator } = await import('../../src/agents/price-estimator')

      let analysis: StoredAnalysis
      const mode = vars.mode === 'image' ? 'image' : 'text'
      if (mode === 'image') {
        const { writeSyntheticPhoto } = await import('./synthetic-image')
        const photo = await writeSyntheticPhoto(vars.photo as SyntheticPhotoSpec)
        try {
          analysis = (await runImageAnalyzer({ photoPaths: [photo] })).output
        } finally {
          fs.rmSync(path.dirname(photo), { recursive: true, force: true })
        }
      } else {
        analysis = vars.analysis as StoredAnalysis
        if (!analysis) return { error: 'Missing context.vars.analysis' }
      }

      const [writer, price] = await Promise.all([
        runListingWriter({ analysis, questions: [] }),
        runPriceEstimator({ analysis }),
      ])
      return {
        output: JSON.stringify({
          mode,
          analysis,
          listing: writer.output,
          priceEstimate: price.output,
        }),
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  }
}
