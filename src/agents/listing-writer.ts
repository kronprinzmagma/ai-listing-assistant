import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic } from '@/lib/anthropic'
import { AGENT_MODEL, AGENT_EFFORT, DATA_GUARD_SYSTEM } from '@/lib/models'
import {
  RicardoListingSchema,
  RicardoListingDraftSchema,
  MAX_TITLE_LENGTH,
  shortenTitle,
  type ListingValidation,
  type RicardoListing,
  type RicardoListingDraft,
  type StoredAnalysis,
} from './schemas'
import { categoryFr, toCategoryDe } from '@/lib/categories'
import type { AgentTraceEntry, Question } from '@/types/session'

const MODEL = AGENT_MODEL

export interface ListingWriterInput {
  analysis: StoredAnalysis
  questions: Question[]
  /** When set, use this template instead of the built-in generation prompt.
   *  Placeholders: {{object}}, {{condition}}, {{category}}, {{titleDraft}},
   *  {{descriptionDraft}}, {{answeredQA}} */
  promptOverride?: string
}

function buildGenerationPrompt(analysis: StoredAnalysis, answeredQA: string, promptOverride?: string): string {
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
    system: DATA_GUARD_SYSTEM,
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: zodOutputFormat(RicardoListingDraftSchema), effort: AGENT_EFFORT },
  })
}

/** PIPE-10: Titellaenge im Code pruefen statt per zweitem Modellaufruf. */
export function validateTitles(listing: RicardoListingDraft): ListingValidation {
  const issues: string[] = []
  for (const lang of ['de', 'fr'] as const) {
    const len = listing[lang].title.trim().length
    if (len > MAX_TITLE_LENGTH) issues.push(`${lang}.title hat ${len} Zeichen, erlaubt sind ${MAX_TITLE_LENGTH}`)
  }
  return {
    titleDeValid: listing.de.title.trim().length <= MAX_TITLE_LENGTH,
    titleFrValid: listing.fr.title.trim().length <= MAX_TITLE_LENGTH,
    issues,
  }
}

async function correctCall(prompt: string, prior: RicardoListingDraft, issues: string[]) {
  const correctionPrompt = `${prompt}\n\nVorheriger Entwurf hatte Probleme. Bitte korrigieren:\n${issues.map(i => `- ${i}`).join('\n')}\n\nVorheriger Entwurf:\n${JSON.stringify(prior)}`
  return anthropic.messages.parse({
    model: MODEL,
    system: DATA_GUARD_SYSTEM,
    max_tokens: 8000,
    messages: [{ role: 'user', content: correctionPrompt }],
    output_config: { format: zodOutputFormat(RicardoListingDraftSchema), effort: AGENT_EFFORT },
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
  let draft: RicardoListingDraft = genOutput
  let totalInputTokens = genMessage.usage?.input_tokens ?? 0
  let totalOutputTokens = genMessage.usage?.output_tokens ?? 0

  // PIPE-10: self-validate (deterministisch, kein zusaetzlicher Modellaufruf)
  const validation = validateTitles(draft)

  if (!validation.titleDeValid || !validation.titleFrValid) {
    const corrMessage = await correctCall(generationPrompt, draft, validation.issues)
    const corrected = corrMessage.parsed_output
    if (!corrected) throw new Error('ListingWriter: correction call returned null structured output')
    totalInputTokens += corrMessage.usage?.input_tokens ?? 0
    totalOutputTokens += corrMessage.usage?.output_tokens ?? 0
    draft = corrected
  }

  // Hard-enforce title length in code: letzte Rueckfallebene, an einer Wortgrenze
  // Kategorie aus der festen Liste, nicht vom Schreiber: DE aus der Analyse
  // (Freitext alter Sessions wird zu «Diverses»), FR passend dazu.
  const categoryDe = toCategoryDe(analysis.category)
  const output: RicardoListing = RicardoListingSchema.parse({
    de: { ...draft.de, title: shortenTitle(draft.de.title), category: categoryDe },
    fr: { ...draft.fr, title: shortenTitle(draft.fr.title), category: categoryFr(categoryDe) },
  })

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
