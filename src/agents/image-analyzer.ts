import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import sharp from 'sharp'
import { anthropic } from '@/lib/anthropic'
import { AnalysisResultSchema, type AnalysisResult } from './schemas'
import type { AgentTraceEntry } from '@/types/session'

const MODEL = 'claude-sonnet-4-6'

const PROMPT = `Analysiere die Fotos eines Gegenstands für ein ricardo.ch-Inserat.

Liefere strukturierten Output mit:
- object: was ist der Gegenstand
- condition: einer der Werte "neu", "wie neu", "gut", "akzeptabel"
- category: passende ricardo.ch-Kategorie
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
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text' as const, text: PROMPT },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(AnalysisResultSchema) },
  })

  const output = message.parsed_output
  if (!output) throw new Error('ImageAnalyzer: structured output was null (model may have refused or truncated)')

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
