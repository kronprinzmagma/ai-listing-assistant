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

interface SearchHit {
  title: string
  url: string
}

/** Nachgebildete Websuche: eine Antwort mit den praeparierten Treffern, ohne Netz und ohne Kosten. */
function fakeSearch(hits: SearchHit[]) {
  return async () =>
    ({
      id: 'msg_fake_search',
      type: 'message',
      role: 'assistant',
      model: 'fake-search',
      stop_reason: 'end_turn',
      stop_sequence: null,
      content: [
        { type: 'server_tool_use', id: 'srvtoolu_fake', name: 'web_search', input: { query: 'eval' } },
        {
          type: 'web_search_tool_result',
          tool_use_id: 'srvtoolu_fake',
          content: hits.map((h) => ({ type: 'web_search_result', title: h.title, url: h.url, page_age: null, encrypted_content: 'eval' })),
        },
        { type: 'text', text: 'fertig', citations: null },
      ],
      usage: { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 1 } },
    }) as never
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
      const { runPriceEstimator, withEstimatedPrice } = await import('../../src/agents/price-estimator')

      let analysis: StoredAnalysis
      const mode = vars.mode === 'image' ? 'image' : vars.mode === 'search' ? 'search' : 'text'
      if (mode === 'image') {
        const { writeSyntheticPhoto } = await import('./synthetic-image')
        const photo = await writeSyntheticPhoto(vars.photo as SyntheticPhotoSpec)
        try {
          analysis = (await runImageAnalyzer({ photoPaths: [photo] })).output
        } finally {
          fs.rmSync(path.dirname(photo), { recursive: true, force: true })
        }
      } else {
        // text und search: Analyse aus den Test-Variablen
        analysis = vars.analysis as StoredAnalysis
        if (!analysis) return { error: 'Missing context.vars.analysis' }
      }

      // Antwort des Verkaeufers auf eine Rueckfrage (verbindliche Angabe, nicht Fremdtext).
      // Als zwei Strings, weil promptfoo Arrays in Test-Variablen ausmultipliziert.
      const questions =
        typeof vars.sellerQuestion === 'string' && typeof vars.sellerAnswer === 'string'
          ? [{ id: 'q1', text: vars.sellerQuestion, answer: vars.sellerAnswer }]
          : []

      // mode search: die Websuche ist nachgebildet und liefert praeparierte Ricardo-
      // Suchtreffer (searchHitsJson). Der Preisentscheid danach ist ein echter Modellaufruf.
      const searchCreate =
        mode === 'search' ? fakeSearch(JSON.parse(String(vars.searchHitsJson ?? '[]')) as SearchHit[]) : undefined

      const [writer, price] = await Promise.all([
        runListingWriter({ analysis, questions }),
        runPriceEstimator({ analysis }, searchCreate ? { searchCreate } : {}),
      ])
      return {
        output: JSON.stringify({
          mode,
          analysis,
          // Wie api/generate: bei Ricardo-Quelle gilt der Preis der Schaetzung im Inserat.
          listing: withEstimatedPrice(writer.output, price.output),
          priceEstimate: price.output,
        }),
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  }
}
