import { z } from 'zod'
import { CATEGORY_LABELS_DE, CATEGORY_LABELS_FR, categoryDeFromFr } from '@/lib/categories'

// ImageAnalyzer output
export const AnalysisResultSchema = z.object({
  object: z.string().min(1),
  condition: z.enum(['neu', 'wie neu', 'gut', 'akzeptabel']),
  // Nur Namen aus der festen Liste (src/lib/categories.ts); das Enum steht im
  // Antwortschema, das Modell kann also keine eigene Kategorie erfinden.
  category: z.enum(CATEGORY_LABELS_DE),
  titleDraft: z.string().max(60),
  descriptionDraft: z.string().min(1),
})
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>

/** Analyse, wie sie in einer Session liegt: aeltere Sessions haben die Kategorie noch als Freitext. */
export type StoredAnalysis = Omit<AnalysisResult, 'category'> & { category: string }

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

// Kategorie: DE und FR aus der festen Liste und zueinander passend. Gilt fuer das
// fertige Inserat und fuer Aenderungen aus der Review (PATCH /api/listing).
export const RicardoListingSchema = z
  .object({
    de: ListingLocaleSchema.extend({ category: z.enum(CATEGORY_LABELS_DE) }),
    fr: ListingLocaleSchema.extend({ category: z.enum(CATEGORY_LABELS_FR) }),
  })
  .refine((l) => categoryDeFromFr(l.fr.category) === l.de.category, {
    message: 'fr.category passt nicht zu de.category',
    path: ['fr', 'category'],
  })
export type RicardoListing = z.infer<typeof RicardoListingSchema>

// Schema fuer die Modellaufrufe des ListingWriters: Titel ohne .max(60), damit ein
// zu langer Titel nicht schon in der SDK-Pruefung als Fehler endet, sondern im Code
// erkannt, einmal korrigiert und notfalls an einer Wortgrenze gekuerzt wird.
// Die Kategorie fehlt im Modell-Schema: sie kommt aus der Analyse (feste Liste) und
// wird im Code gesetzt, DE und FR passend (listing-writer.ts).
export const ListingLocaleDraftSchema = ListingLocaleSchema.omit({ category: true }).extend({ title: z.string() })
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
// Ein Vergleichsangebot von ricardo.ch aus einem Suchtreffer der Claude-Websuche.
// Link und Preis liest der Code aus Titel und URL des Treffers (price-estimator.ts).
export const ComparableSchema = z.object({
  title: z.string().min(1),
  url: z.string().regex(/^https:\/\/www\.ricardo\.ch\//),
  priceCHF: z.number().positive(),
  pageAge: z.string().nullable(),
})
export type Comparable = z.infer<typeof ComparableSchema>

export const PriceEstimateSchema = z.object({
  suggestedPriceCHF: z.number().nonnegative(),
  confidence: z.enum(['low', 'medium', 'high']),
  rationale: z.string().min(1),
  // 'ricardo': gestuetzt auf Vergleichsangebote; 'modell': nur Modellwissen.
  // Optional, weil aeltere Sessions beides nicht kennen.
  source: z.enum(['ricardo', 'modell']).optional(),
  comparables: z.array(ComparableSchema).optional(),
})
export type PriceEstimateZ = z.infer<typeof PriceEstimateSchema>

// Antwortschema fuer den Preisentscheid des Modells: es waehlt die passenden
// Angebote per Nummer aus; Links und Preise kommen nie vom Modell.
export const PriceDecisionSchema = z.object({
  comparableIndices: z.array(z.number().int()),
  suggestedPriceCHF: z.number().nonnegative(),
  confidence: z.enum(['low', 'medium', 'high']),
  rationale: z.string().min(1),
})
export type PriceDecision = z.infer<typeof PriceDecisionSchema>

// ListingWriter self-validation (PIPE-10). Wird seit 2026-11-19 im Code berechnet
// (validateTitles in listing-writer.ts), nicht mehr per zweitem Modellaufruf.
export const ListingValidationSchema = z.object({
  titleDeValid: z.boolean(),
  titleFrValid: z.boolean(),
  issues: z.array(z.string()),
})
export type ListingValidation = z.infer<typeof ListingValidationSchema>
