import { z } from 'zod'

// ImageAnalyzer output
export const AnalysisResultSchema = z.object({
  object: z.string().min(1),
  condition: z.enum(['neu', 'wie neu', 'gut', 'akzeptabel']),
  category: z.string().min(1),
  titleDraft: z.string().max(60),
  descriptionDraft: z.string().min(1),
})
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

// Schema fuer den Modellaufruf: ohne Laengengrenze beim Titel-Entwurf. Das SDK
// prueft .max() erst nach der Antwort und wirft dann (helpers/zod.ts, safeParse);
// ein zu langer Entwurf wuerde so die ganze Analyse abbrechen. Gekuerzt wird im
// Code (shortenTitle), danach gilt wieder AnalysisResultSchema.
export const AnalysisDraftSchema = AnalysisResultSchema.extend({ titleDraft: z.string() })

// QuestionGenerator output — wrapped in object per Pitfall #3 (zodOutputFormat requires z.object root)
export const QuestionsOutputSchema = z.object({
  questions: z.array(z.string().min(1)).min(3).max(5),
})
export type QuestionsOutput = z.infer<typeof QuestionsOutputSchema>

// ListingWriter output — Ricardo bilingual listing
export const ListingLocaleSchema = z.object({
  title: z.string().max(60),
  description: z.string().min(1),
  category: z.string().min(1),
  condition: z.string().min(1),
  price: z.number().nonnegative(),
  shipping: z.string().min(1),
})
export type ListingLocaleZ = z.infer<typeof ListingLocaleSchema>

export const RicardoListingSchema = z.object({
  de: ListingLocaleSchema,
  fr: ListingLocaleSchema,
})
export type RicardoListing = z.infer<typeof RicardoListingSchema>

// Schema fuer die Modellaufrufe des ListingWriters: Titel ohne .max(60), damit ein
// zu langer Titel nicht schon in der SDK-Pruefung als Fehler endet, sondern im Code
// erkannt, einmal korrigiert und notfalls an einer Wortgrenze gekuerzt wird.
export const ListingLocaleDraftSchema = ListingLocaleSchema.extend({ title: z.string() })
export const RicardoListingDraftSchema = z.object({
  de: ListingLocaleDraftSchema,
  fr: ListingLocaleDraftSchema,
})
export type RicardoListingDraft = z.infer<typeof RicardoListingDraftSchema>

export const MAX_TITLE_LENGTH = 60

/** Kuerzt auf hoechstens max Zeichen, bevorzugt an der letzten Wortgrenze. */
export function shortenTitle(title: string, max = MAX_TITLE_LENGTH): string {
  const trimmed = title.trim()
  if (trimmed.length <= max) return trimmed
  const cut = trimmed.slice(0, max + 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace >= Math.floor(max / 2) ? cut.slice(0, lastSpace) : trimmed.slice(0, max)
  return base.replace(/[\s,;:\-–]+$/u, '')
}

// PriceEstimator output
export const PriceEstimateSchema = z.object({
  suggestedPriceCHF: z.number().nonnegative(),
  confidence: z.enum(['low', 'medium', 'high']),
  rationale: z.string().min(1),
})
export type PriceEstimateZ = z.infer<typeof PriceEstimateSchema>

// ListingWriter self-validation (PIPE-10). Wird seit 2026-11-19 im Code berechnet
// (validateTitles in listing-writer.ts), nicht mehr per zweitem Modellaufruf.
export const ListingValidationSchema = z.object({
  titleDeValid: z.boolean(),
  titleFrValid: z.boolean(),
  issues: z.array(z.string()),
})
export type ListingValidation = z.infer<typeof ListingValidationSchema>
