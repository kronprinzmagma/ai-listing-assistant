import { describe, it, expect } from 'vitest'
import {
  GraderOutputSchema,
  TitleGraderOutputSchema,
  DescriptionGraderOutputSchema,
} from './schemas'

describe('GraderOutputSchema', () => {
  it('parses a valid grader output with score, rationale, suggestion', () => {
    const result = GraderOutputSchema.parse({
      score: 0.7,
      rationale: 'Good title with specific product name.',
      suggestion: 'Add the storage capacity to the title.',
    })
    expect(result.score).toBe(0.7)
    expect(result.rationale).toBe('Good title with specific product name.')
    expect(result.suggestion).toBe('Add the storage capacity to the title.')
  })

  it('rejects score < 0', () => {
    expect(() =>
      GraderOutputSchema.parse({ score: -0.1, rationale: 'ok', suggestion: 'ok' })
    ).toThrow()
  })

  it('rejects score > 1', () => {
    expect(() =>
      GraderOutputSchema.parse({ score: 1.1, rationale: 'ok', suggestion: 'ok' })
    ).toThrow()
  })

  it('rejects empty rationale', () => {
    expect(() =>
      GraderOutputSchema.parse({ score: 0.5, rationale: '', suggestion: 'ok' })
    ).toThrow()
  })

  it('rejects empty suggestion', () => {
    expect(() =>
      GraderOutputSchema.parse({ score: 0.5, rationale: 'ok', suggestion: '' })
    ).toThrow()
  })
})

describe('TitleGraderOutputSchema', () => {
  it('parses a valid title grader output with all sub-scores', () => {
    const result = TitleGraderOutputSchema.parse({
      specificity: 2,
      lengthScore: 1,
      keywords: 3,
      noClickbait: 2,
      totalScore: 0.8,
      rationale: 'Good title.',
      suggestion: 'Shorten the title slightly.',
    })
    expect(result.specificity).toBe(2)
    expect(result.totalScore).toBe(0.8)
  })

  it('rejects specificity out of range [0,3]', () => {
    expect(() =>
      TitleGraderOutputSchema.parse({
        specificity: 4,
        lengthScore: 1,
        keywords: 2,
        noClickbait: 2,
        totalScore: 0.5,
        rationale: 'ok',
        suggestion: 'ok',
      })
    ).toThrow()
  })

  it('rejects lengthScore out of range [0,2]', () => {
    expect(() =>
      TitleGraderOutputSchema.parse({
        specificity: 2,
        lengthScore: 3,
        keywords: 2,
        noClickbait: 2,
        totalScore: 0.5,
        rationale: 'ok',
        suggestion: 'ok',
      })
    ).toThrow()
  })

  it('rejects keywords out of range [0,3]', () => {
    expect(() =>
      TitleGraderOutputSchema.parse({
        specificity: 2,
        lengthScore: 1,
        keywords: -1,
        noClickbait: 2,
        totalScore: 0.5,
        rationale: 'ok',
        suggestion: 'ok',
      })
    ).toThrow()
  })

  it('rejects noClickbait out of range [0,2]', () => {
    expect(() =>
      TitleGraderOutputSchema.parse({
        specificity: 2,
        lengthScore: 1,
        keywords: 2,
        noClickbait: 3,
        totalScore: 0.5,
        rationale: 'ok',
        suggestion: 'ok',
      })
    ).toThrow()
  })

  it('rejects totalScore out of range [0,1]', () => {
    expect(() =>
      TitleGraderOutputSchema.parse({
        specificity: 2,
        lengthScore: 1,
        keywords: 2,
        noClickbait: 2,
        totalScore: 1.5,
        rationale: 'ok',
        suggestion: 'ok',
      })
    ).toThrow()
  })
})

describe('DescriptionGraderOutputSchema', () => {
  it('parses a valid description grader output with all sub-scores', () => {
    const result = DescriptionGraderOutputSchema.parse({
      factualGrounding: 3,
      completeness: 2,
      conciseness: 2,
      tone: 1,
      totalScore: 0.8,
      rationale: 'Accurate description.',
      suggestion: 'Add battery health information.',
    })
    expect(result.factualGrounding).toBe(3)
    expect(result.totalScore).toBe(0.8)
  })

  it('rejects factualGrounding out of range [0,3]', () => {
    expect(() =>
      DescriptionGraderOutputSchema.parse({
        factualGrounding: 4,
        completeness: 2,
        conciseness: 2,
        tone: 1,
        totalScore: 0.5,
        rationale: 'ok',
        suggestion: 'ok',
      })
    ).toThrow()
  })

  it('rejects completeness out of range [0,3]', () => {
    expect(() =>
      DescriptionGraderOutputSchema.parse({
        factualGrounding: 2,
        completeness: -1,
        conciseness: 2,
        tone: 1,
        totalScore: 0.5,
        rationale: 'ok',
        suggestion: 'ok',
      })
    ).toThrow()
  })

  it('rejects conciseness out of range [0,2]', () => {
    expect(() =>
      DescriptionGraderOutputSchema.parse({
        factualGrounding: 2,
        completeness: 2,
        conciseness: 3,
        tone: 1,
        totalScore: 0.5,
        rationale: 'ok',
        suggestion: 'ok',
      })
    ).toThrow()
  })

  it('rejects tone out of range [0,2]', () => {
    expect(() =>
      DescriptionGraderOutputSchema.parse({
        factualGrounding: 2,
        completeness: 2,
        conciseness: 1,
        tone: -1,
        totalScore: 0.5,
        rationale: 'ok',
        suggestion: 'ok',
      })
    ).toThrow()
  })

  it('rejects totalScore out of range [0,1]', () => {
    expect(() =>
      DescriptionGraderOutputSchema.parse({
        factualGrounding: 2,
        completeness: 2,
        conciseness: 1,
        tone: 2,
        totalScore: 2.0,
        rationale: 'ok',
        suggestion: 'ok',
      })
    ).toThrow()
  })
})
