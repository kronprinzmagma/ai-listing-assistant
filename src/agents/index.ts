/**
 * Agentic Pipeline — four named, typed, stateless agents.
 *
 * Pipeline order (matches /api/* route invocation):
 *   1. ImageAnalyzer    — photos → AnalysisResult (object, condition, category, draft title + description)
 *   2. QuestionGenerator — analysis → 3-5 Question[] (only about non-visible info)
 *   3. ListingWriter     — analysis + answers → RicardoListing (DE + FR, title ≤ 60 chars, with PIPE-10 self-validation)
 *   4. PriceEstimator    — analysis → PriceEstimate (CHF + confidence + rationale)
 *
 * Steps 3 and 4 (ListingWriter + PriceEstimator) run in parallel in /api/generate.
 *
 * Each agent is a pure async function: input → { output, trace }.
 * No internal state, no module-level mutability. Session JSON is the only state store.
 */

export { runImageAnalyzer } from './image-analyzer'
export type { ImageAnalyzerInput } from './image-analyzer'

export { runQuestionGenerator } from './question-generator'
export type { QuestionGeneratorInput } from './question-generator'

export { runListingWriter } from './listing-writer'
export type { ListingWriterInput } from './listing-writer'

export { runPriceEstimator } from './price-estimator'
export type { PriceEstimatorInput } from './price-estimator'

// Re-export the shared schemas + types for downstream consumers
export {
  AnalysisResultSchema,
  QuestionsOutputSchema,
  RicardoListingSchema,
  PriceEstimateSchema,
  ListingValidationSchema,
} from './schemas'
export type {
  AnalysisResult,
  QuestionsOutput,
  RicardoListing,
  ListingValidation,
  PriceEstimateZ,
} from './schemas'
