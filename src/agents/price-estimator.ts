import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic } from '@/lib/anthropic'
import { AGENT_MODEL, AGENT_EFFORT, DATA_GUARD_SYSTEM } from '@/lib/models'
import { PriceEstimateSchema, type PriceEstimateZ, type StoredAnalysis } from './schemas'
import type { AgentTraceEntry } from '@/types/session'

const MODEL = AGENT_MODEL

export interface PriceEstimatorInput {
  analysis: StoredAnalysis
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
    system: DATA_GUARD_SYSTEM,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: zodOutputFormat(PriceEstimateSchema), effort: AGENT_EFFORT },
  })

  const output = message.parsed_output
  if (!output) throw new Error('PriceEstimator: structured output was null (model may have refused or truncated)')

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
