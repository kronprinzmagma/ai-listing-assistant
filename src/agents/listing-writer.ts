import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic } from '@/lib/anthropic'
import {
  RicardoListingSchema,
  ListingValidationSchema,
  type RicardoListing,
  type AnalysisResult,
} from './schemas'
import type { AgentTraceEntry, Question } from '@/types/session'

const MODEL = 'claude-sonnet-4-6'

export interface ListingWriterInput {
  analysis: AnalysisResult
  questions: Question[]
  /** When set, use this template instead of the built-in generation prompt.
   *  Placeholders: {{object}}, {{condition}}, {{category}}, {{titleDraft}},
   *  {{descriptionDraft}}, {{answeredQA}} */
  promptOverride?: string
}

function buildGenerationPrompt(analysis: AnalysisResult, answeredQA: string, promptOverride?: string): string {
  if (promptOverride) {
    return promptOverride
      .replace(/\{\{object\}\}/g, analysis.object)
      .replace(/\{\{condition\}\}/g, analysis.condition)
      .replace(/\{\{category\}\}/g, analysis.category)
      .replace(/\{\{titleDraft\}\}/g, analysis.titleDraft)
      .replace(/\{\{descriptionDraft\}\}/g, analysis.descriptionDraft)
      .replace(/\{\{answeredQA\}\}/g, answeredQA)
  }
  return `Erstelle ein vollständiges Inserat für ricardo.ch auf Deutsch und Französisch.

Analyse:
- Objekt: ${analysis.object}
- Zustand: ${analysis.condition}
- Kategorie: ${analysis.category}
- Titel-Entwurf: ${analysis.titleDraft}
- Beschreibungs-Entwurf: ${analysis.descriptionDraft}

${answeredQA ? `Zusätzliche Informationen:\n${answeredQA}` : ''}

Wichtig:
- Titel in BEIDEN Sprachen max. 60 Zeichen
- Preis in CHF als realistischer Marktpreis (Zahl ohne Währungszeichen)
- Versandkosten für die Schweiz einschätzen`
}

async function generateCall(prompt: string) {
  return anthropic.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: zodOutputFormat(RicardoListingSchema) },
  })
}

async function validateCall(listing: RicardoListing) {
  return anthropic.messages.parse({
    model: MODEL,
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Prüfe dieses Inserat. Gib zurück, ob de.title und fr.title jeweils max. 60 Zeichen lang sind und liste konkrete Probleme.\n\nInserat:\n${JSON.stringify(listing)}`,
    }],
    output_config: { format: zodOutputFormat(ListingValidationSchema) },
  })
}

async function correctCall(prompt: string, prior: RicardoListing, issues: string[]) {
  const correctionPrompt = `${prompt}\n\nVorheriger Entwurf hatte Probleme. Bitte korrigieren:\n${issues.map(i => `- ${i}`).join('\n')}\n\nVorheriger Entwurf:\n${JSON.stringify(prior)}`
  return anthropic.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: correctionPrompt }],
    output_config: { format: zodOutputFormat(RicardoListingSchema) },
  })
}

export async function runListingWriter(
  input: ListingWriterInput
): Promise<{ output: RicardoListing; trace: AgentTraceEntry }> {
  const startedAt = Date.now()
  const { analysis, questions, promptOverride } = input

  const answeredQA = questions
    .filter((q) => q.answer)
    .map((q) => `F: ${q.text}\nA: ${q.answer}`)
    .join('\n\n')

  const generationPrompt = buildGenerationPrompt(analysis, answeredQA, promptOverride)

  const genMessage = await generateCall(generationPrompt)
  const genOutput = genMessage.parsed_output
  if (!genOutput) throw new Error('ListingWriter: generation call returned null structured output (model may have refused or truncated)')
  let output = genOutput
  let totalInputTokens = genMessage.usage?.input_tokens ?? 0
  let totalOutputTokens = genMessage.usage?.output_tokens ?? 0

  // PIPE-10: self-validate
  const valMessage = await validateCall(output)
  totalInputTokens += valMessage.usage?.input_tokens ?? 0
  totalOutputTokens += valMessage.usage?.output_tokens ?? 0
  const validation = valMessage.parsed_output
  if (!validation) throw new Error('ListingWriter: validation call returned null structured output')

  if (!validation.titleDeValid || !validation.titleFrValid) {
    const corrMessage = await correctCall(generationPrompt, output, validation.issues)
    const corrected = corrMessage.parsed_output
    if (!corrected) throw new Error('ListingWriter: correction call returned null structured output')
    totalInputTokens += corrMessage.usage?.input_tokens ?? 0
    totalOutputTokens += corrMessage.usage?.output_tokens ?? 0
    // Hard-enforce title length in code, not just via LLM validation
    if (corrected.de.title.length > 60) corrected.de.title = corrected.de.title.slice(0, 60)
    if (corrected.fr.title.length > 60) corrected.fr.title = corrected.fr.title.slice(0, 60)
    output = corrected
  }

  return {
    output,
    trace: {
      agent: 'ListingWriter',
      input,
      output,
      durationMs: Date.now() - startedAt,
      completedAt: new Date().toISOString(),
      modelUsed: MODEL,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
  }
}
