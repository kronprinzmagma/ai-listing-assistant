import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic } from '../../src/lib/anthropic'
import { TitleGraderOutputSchema, type GraderOutput } from './schemas'

const MODEL = 'claude-sonnet-4-6'

function buildTitlePrompt(title: string, goldTitle: string): string {
  return `Du bewertest die Qualität eines Ricardo.ch-Inserat-Titels gegen eine Gold-Referenz.

Rubrik (Scoring-Anker — wichtig: konkrete Werte vergeben):
- Specificity (0-3): Nennt der Titel das exakte Produkt + Modell?
  0 = vage ("Gerät"), 1 = Produkttyp, 2 = Produkt + Hersteller, 3 = Produkt + Modell + Variante
- Length (0-2): Ist der Titel 40-60 Zeichen lang (optimal)?
  0 = >60 oder <20, 1 = 20-39 oder 61-65, 2 = 40-60
- Keywords (0-3): Enthält der Titel die wichtigsten Suchbegriffe?
  0 = keine Keywords, 1 = ein Keyword, 2 = mehrere, 3 = alle relevanten
- No-Clickbait (0-2): Sachlicher Ton, keine Übertreibungen?
  0 = "WOW"/"!!!"/Caps-Lock, 1 = leicht werblich, 2 = sachlich

totalScore = (specificity + length + keywords + noClickbait) / 10

Zu bewertender Titel: "${title}" (${title.length} Zeichen)
Gold-Referenz: "${goldTitle}"

Gib alle Sub-Scores, totalScore (normalisiert 0.0-1.0), eine rationale (1-2 Sätze)
und eine konkrete suggestion zur Verbesserung zurück.`
}

export async function gradeTitle(
  title: string,
  goldTitle: string
): Promise<GraderOutput> {
  const message = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: buildTitlePrompt(title, goldTitle) }],
    output_config: { format: zodOutputFormat(TitleGraderOutputSchema) },
  })
  const parsed = message.parsed_output!
  return {
    score: parsed.totalScore,
    rationale: parsed.rationale,
    suggestion: parsed.suggestion,
  }
}
