import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import sharp from 'sharp'
import { anthropic } from '@/lib/anthropic'
import { AGENT_MODEL, AGENT_EFFORT } from '@/lib/models'
import { AnalysisDraftSchema, AnalysisResultSchema, shortenTitle, type AnalysisResult } from './schemas'
import type { AgentTraceEntry } from '@/types/session'

const MODEL = AGENT_MODEL

const PROMPT = `Analysiere die Fotos eines Gegenstands für ein ricardo.ch-Inserat.

Liefere strukturierten Output mit:
- object: was ist der Gegenstand
- condition: einer der Werte "neu", "wie neu", "gut", "akzeptabel"
- category: genau eine Kategorie aus der vorgegebenen Liste, die spezifischste passende ("Diverses" nur, wenn keine passt)
- titleDraft: Titel-Entwurf, maximal 60 Zeichen
- descriptionDraft: kurze, präzise Beschreibung auf Deutsch`

async function resizeAndEncode(filePath: string): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
  const buffer = await sharp(filePath)
    .resize({ width: 1500, height: 1500, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
  return { base64: buffer.toString('base64'), mediaType: 'image/jpeg' as const }
}

export interface ImageAnalyzerInput {
  photoPaths: string[]
}

export async function runImageAnalyzer(
  input: ImageAnalyzerInput
): Promise<{ output: AnalysisResult; trace: AgentTraceEntry }> {
  const startedAt = Date.now()

  const imageBlocks = await Promise.all(
    input.photoPaths.map(async (p) => {
      const { base64, mediaType } = await resizeAndEncode(p)
      return {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: mediaType, data: base64 },
      }
    })
  )

  const message = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text' as const, text: PROMPT },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(AnalysisDraftSchema), effort: AGENT_EFFORT },
  })

  const draft = message.parsed_output
  if (!draft) throw new Error('ImageAnalyzer: structured output was null (model may have refused or truncated)')
  // Ein zu langer Titel-Entwurf wird gekuerzt statt die Analyse abzubrechen.
  const output: AnalysisResult = AnalysisResultSchema.parse({ ...draft, titleDraft: shortenTitle(draft.titleDraft) })

  return {
    output,
    trace: {
      agent: 'ImageAnalyzer',
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
