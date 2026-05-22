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

// PriceEstimator output
export const PriceEstimateSchema = z.object({
  suggestedPriceCHF: z.number().nonnegative(),
  confidence: z.enum(['low', 'medium', 'high']),
  rationale: z.string().min(1),
})
export type PriceEstimateZ = z.infer<typeof PriceEstimateSchema>

// ListingWriter self-validation (PIPE-10 — second-call validation output schema)
export const ListingValidationSchema = z.object({
  titleDeValid: z.boolean(),
  titleFrValid: z.boolean(),
  issues: z.array(z.string()),
})
export type ListingValidation = z.infer<typeof ListingValidationSchema>
