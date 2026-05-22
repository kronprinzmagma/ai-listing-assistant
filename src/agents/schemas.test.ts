import { describe, it, expect } from 'vitest'
import {
  AnalysisResultSchema,
  QuestionsOutputSchema,
  RicardoListingSchema,
  PriceEstimateSchema,
  ListingValidationSchema,
} from './schemas'

const validLocale = {
  title: 'Apple MacBook Pro 2020',
  description: 'Gut erhaltener Laptop',
  category: 'Elektronik > Notebooks',
  condition: 'gut',
  price: 850,
  shipping: 'CHF 12 Schweizer Post',
}

describe('AnalysisResultSchema', () => {
  it('accepts valid analysis', () => {
    expect(() => AnalysisResultSchema.parse({
      object: 'Laptop', condition: 'gut', category: 'Elektronik',
      titleDraft: 'Apple MacBook Pro 2020', descriptionDraft: 'Gut.',
    })).not.toThrow()
  })
  it('rejects titleDraft >60 chars', () => {
    expect(() => AnalysisResultSchema.parse({
      object: 'L', condition: 'gut', category: 'E',
      titleDraft: 'A'.repeat(61), descriptionDraft: 'd',
    })).toThrow()
  })
  it('rejects invalid condition enum', () => {
    expect(() => AnalysisResultSchema.parse({
      object: 'L', condition: 'used', category: 'E',
      titleDraft: 'T', descriptionDraft: 'd',
    })).toThrow()
  })
})

describe('QuestionsOutputSchema', () => {
  it('accepts 3-5 questions', () => {
    expect(() => QuestionsOutputSchema.parse({ questions: ['a', 'b', 'c'] })).not.toThrow()
    expect(() => QuestionsOutputSchema.parse({ questions: ['a', 'b', 'c', 'd', 'e'] })).not.toThrow()
  })
  it('rejects fewer than 3', () => {
    expect(() => QuestionsOutputSchema.parse({ questions: ['a', 'b'] })).toThrow()
  })
  it('rejects more than 5', () => {
    expect(() => QuestionsOutputSchema.parse({ questions: Array(6).fill('x') })).toThrow()
  })
})

describe('RicardoListingSchema', () => {
  it('accepts bilingual listing', () => {
    expect(() => RicardoListingSchema.parse({ de: validLocale, fr: validLocale })).not.toThrow()
  })
  it('rejects DE title >60 chars', () => {
    expect(() => RicardoListingSchema.parse({
      de: { ...validLocale, title: 'A'.repeat(61) }, fr: validLocale,
    })).toThrow()
  })
  it('rejects FR title >60 chars', () => {
    expect(() => RicardoListingSchema.parse({
      de: validLocale, fr: { ...validLocale, title: 'A'.repeat(61) },
    })).toThrow()
  })
})

describe('PriceEstimateSchema', () => {
  it('accepts valid estimate', () => {
    expect(() => PriceEstimateSchema.parse({
      suggestedPriceCHF: 100, confidence: 'medium', rationale: 'Market avg',
    })).not.toThrow()
  })
  it('rejects unknown confidence', () => {
    expect(() => PriceEstimateSchema.parse({
      suggestedPriceCHF: 100, confidence: 'unknown', rationale: 'x',
    })).toThrow()
  })
})

describe('ListingValidationSchema', () => {
  it('accepts validation output', () => {
    expect(() => ListingValidationSchema.parse({
      titleDeValid: true, titleFrValid: false, issues: ['FR title too long'],
    })).not.toThrow()
  })
})
