import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { v4 as uuidv4 } from 'uuid'
import { anthropic } from '@/lib/anthropic'
import { QuestionsOutputSchema, type AnalysisResult } from './schemas'
import type { AgentTraceEntry, Question } from '@/types/session'

const MODEL = 'claude-sonnet-4-6'

export interface QuestionGeneratorInput {
  analysis: AnalysisResult
}

export async function runQuestionGenerator(
  input: QuestionGeneratorInput
): Promise<{ output: Question[]; trace: AgentTraceEntry }> {
  const startedAt = Date.now()
  const { analysis } = input

  const prompt = `Du hilfst beim Erstellen eines Inserats für ricardo.ch.

Analyse des Gegenstands:
- Objekt: ${analysis.object}
- Zustand: ${analysis.condition}
- Kategorie: ${analysis.category}
- Titel-Entwurf: ${analysis.titleDraft}

Stelle 3-5 kurze Rückfragen auf Deutsch, um fehlende Informationen zu ergänzen, die auf den Fotos nicht erkennbar sind (z.B. Alter, Marke/Modell, Originalverpackung vorhanden, Mängel, bevorzugte Versandart).`

  const message = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: zodOutputFormat(QuestionsOutputSchema) },
  })

  const parsed = message.parsed_output
  if (!parsed) throw new Error('QuestionGenerator: structured output was null (model may have refused or truncated)')
  const output: Question[] = parsed.questions.map((text) => ({ id: uuidv4(), text }))

  return {
    output,
    trace: {
      agent: 'QuestionGenerator',
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
