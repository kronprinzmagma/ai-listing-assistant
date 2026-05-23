export type Condition = 'neu' | 'wie neu' | 'gut' | 'akzeptabel'

export interface AnalysisResult {
  object: string
  condition: Condition
  category: string
  titleDraft: string
  descriptionDraft: string
}

export interface Question {
  id: string
  text: string
  answer?: string
}

// ListingLocale and Listing are structurally unified with the Zod schemas in @/agents/schemas.
// Re-exporting from schemas ensures both type systems stay in sync and eliminates unsafe `as Listing` casts.
import type { RicardoListing as Listing, ListingLocaleZ as ListingLocale } from '@/agents/schemas'
export type { Listing, ListingLocale }

export interface AgentTraceEntry {
  agent: 'ImageAnalyzer' | 'QuestionGenerator' | 'ListingWriter' | 'PriceEstimator' | 'RicardoPublisher'
  input: unknown
  output: unknown
  durationMs: number
  completedAt: string
  modelUsed: string
  inputTokens?: number
  outputTokens?: number
}

export interface PriceEstimate {
  suggestedPriceCHF: number
  confidence: 'low' | 'medium' | 'high'
  rationale: string
}

export interface SessionState {
  id: string
  createdAt: string
  schemaVersion?: 1
  photoPaths: string[]
  analysis?: AnalysisResult
  questions?: Question[]
  listing?: Listing
  priceEstimate?: PriceEstimate
  agentTrace?: AgentTraceEntry[]
  approved?: boolean
  publishedListingId?: string   // Set after successful publish; drives idempotency guard
  publishedUrl?: string         // https://www.ricardo.ch/listings/{id}
}
