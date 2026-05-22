import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { anthropic } from '../../src/lib/anthropic'
import { DescriptionGraderOutputSchema, type GraderOutput } from './schemas'

const MODEL = 'claude-sonnet-4-6'

function buildDescriptionPrompt(
  description: string,
  goldDescription: string,
  productContext: string,
): string {
  return `Du bewertest die Qualität einer Ricardo.ch-Inserat-Beschreibung gegen eine Gold-Referenz.

Rubrik (Scoring-Anker — wichtig: konkrete Werte vergeben):
- factualGrounding (0-3): Sind alle Aussagen durch productContext/Gold gedeckt?
  0 = Halluzination/falsche Fakten, 1 = teils ungedeckt, 2 = meistens gedeckt, 3 = vollständig gedeckt
- completeness (0-3): Werden Zustand, relevante Eigenschaften und Versand erwähnt?
  0 = fehlt alles, 1 = nur eines, 2 = zwei Aspekte, 3 = alle drei Aspekte vorhanden
- conciseness (0-2): Knapp und präzise (Richtwert 200-600 Zeichen)?
  0 = Wall-of-text (>800 Zeichen) oder zu kurz (<50 Zeichen), 1 = akzeptabel, 2 = optimal
- tone (0-2): Sachlich, kein Verkäufer-Hype?
  0 = übertrieben ("SUPER GÜNSTIG!!!"), 1 = leicht werblich, 2 = sachlich und neutral

totalScore = (factualGrounding + completeness + conciseness + tone) / 10

Zu bewertende Beschreibung:
"""
${description}
"""

Gold-Referenz:
"""
${goldDescription}
"""

Produkt-Kontext (Faktengrundlage):
"""
${productContext}
"""

Gib alle Sub-Scores, totalScore (normalisiert 0.0-1.0), eine rationale (1-2 Sätze)
und eine konkrete suggestion zur Verbesserung zurück.`
}

export async function gradeDescription(
  description: string,
  goldDescription: string,
  productContext: string,
): Promise<GraderOutput> {
  const message = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: buildDescriptionPrompt(description, goldDescription, productContext) }],
    output_config: { format: zodOutputFormat(DescriptionGraderOutputSchema) },
  })
  const parsed = message.parsed_output!
  return {
    score: parsed.totalScore,
    rationale: parsed.rationale,
    suggestion: parsed.suggestion,
  }
}
