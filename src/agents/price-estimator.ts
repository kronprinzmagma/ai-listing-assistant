import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic } from '@/lib/anthropic'
import { PriceEstimateSchema, type PriceEstimateZ, type AnalysisResult } from './schemas'
import type { AgentTraceEntry } from '@/types/session'

const MODEL = 'claude-sonnet-4-6'

export interface PriceEstimatorInput {
  analysis: AnalysisResult
}

export async function runPriceEstimator(
  input: PriceEstimatorInput
): Promise<{ output: PriceEstimateZ; trace: AgentTraceEntry }> {
  const startedAt = Date.now()
  const { analysis } = input

  const prompt = `Schätze einen realistischen Marktpreis in CHF für diesen Gegenstand auf ricardo.ch.

Analyse:
- Objekt: ${analysis.object}
- Zustand: ${analysis.condition}
- Kategorie: ${analysis.category}
- Titel-Entwurf: ${analysis.titleDraft}
- Beschreibung: ${analysis.descriptionDraft}

Gib zurück:
- suggestedPriceCHF: realistische Preisschätzung in Schweizer Franken (Zahl, ohne Währung)
- confidence: "low" | "medium" | "high" — wie sicher ist die Schätzung
- rationale: kurze Begründung auf Deutsch`

  const message = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: zodOutputFormat(PriceEstimateSchema) },
  })

  const output = message.parsed_output!

  return {
    output,
    trace: {
      agent: 'PriceEstimator',
      input,
      output,
      durationMs: Date.now() - startedAt,
      completedAt: new Date().toISOString(),
      modelUsed: MODEL,
      inputTokens: message.usage?.input_tokens,
      outputTokens: message.usage?.output_tokens,
    },
  }
}
