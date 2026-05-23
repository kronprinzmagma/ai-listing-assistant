import { describe, it, expect } from 'vitest'
import { gradeCategory, CATEGORY_HIERARCHY } from './category-grader'
import { CATEGORY_ID_MAP } from '../../src/lib/category-map'

describe('gradeCategory', () => {
  it('Test 1: exact match returns score 1.0 with exactMatch=true', () => {
    const result = gradeCategory('Smartphones', 'Smartphones')
    expect(result.exactMatch).toBe(true)
    expect(result.parentMatch).toBe(false)
    expect(result.score).toBe(1.0)
    expect(result.rationale).toBeTruthy()
    expect(result.suggestion).toBeTruthy()
  })

  it('Test 2: same parent category (Smartphones vs Laptops under Elektronik) returns score 0.5', () => {
    const result = gradeCategory('Smartphones', 'Laptops')
    expect(result.exactMatch).toBe(false)
    expect(result.parentMatch).toBe(true)
    expect(result.score).toBe(0.5)
    expect(CATEGORY_HIERARCHY['Smartphones']).toBe('Elektronik')
    expect(CATEGORY_HIERARCHY['Laptops']).toBe('Elektronik')
  })

  it('Test 3: no parent match (Smartphones vs Möbel) returns score 0.0', () => {
    const result = gradeCategory('Smartphones', 'Möbel')
    expect(result.exactMatch).toBe(false)
    expect(result.parentMatch).toBe(false)
    expect(result.score).toBe(0.0)
  })

  it('Test 4: case-insensitive exact match ("smartphones" vs "Smartphones" => exactMatch:true)', () => {
    const result = gradeCategory('smartphones', 'Smartphones')
    expect(result.exactMatch).toBe(true)
    expect(result.score).toBe(1.0)
  })

  it('Test 5: always returns rationale and suggestion strings', () => {
    const exact = gradeCategory('Laptops', 'Laptops')
    expect(typeof exact.rationale).toBe('string')
    expect(exact.rationale.length).toBeGreaterThan(0)
    expect(typeof exact.suggestion).toBe('string')
    expect(exact.suggestion.length).toBeGreaterThan(0)

    const parent = gradeCategory('Smartphones', 'Laptops')
    expect(typeof parent.rationale).toBe('string')
    expect(parent.rationale.length).toBeGreaterThan(0)
    expect(typeof parent.suggestion).toBe('string')
    expect(parent.suggestion.length).toBeGreaterThan(0)

    const none = gradeCategory('Smartphones', 'Bücher')
    expect(typeof none.rationale).toBe('string')
    expect(none.rationale.length).toBeGreaterThan(0)
    expect(typeof none.suggestion).toBe('string')
    expect(none.suggestion.length).toBeGreaterThan(0)
  })

  it('Test 6: when score < 1.0, suggestion mentions the expected category', () => {
    const parentResult = gradeCategory('Smartphones', 'Laptops')
    expect(parentResult.suggestion).toContain('Laptops')

    const noMatchResult = gradeCategory('Smartphones', 'Bücher')
    expect(noMatchResult.suggestion).toContain('Bücher')
  })
})

describe('IN-01: CATEGORY_ID_MAP keys are reachable in CATEGORY_HIERARCHY', () => {
  it('every key in CATEGORY_ID_MAP appears as a key or parent value in CATEGORY_HIERARCHY', () => {
    const hierarchyKeys = new Set(Object.keys(CATEGORY_HIERARCHY))
    const hierarchyParents = new Set(Object.values(CATEGORY_HIERARCHY))
    const missing: string[] = []
    for (const category of Object.keys(CATEGORY_ID_MAP)) {
      if (!hierarchyKeys.has(category) && !hierarchyParents.has(category)) {
        missing.push(category)
      }
    }
    expect(missing).toEqual([])
  })
})

describe('CATEGORY_HIERARCHY barrel export', () => {
  it('Test 7 (barrel): gradeTitle, gradeDescription, gradeCategory all re-exported from index', async () => {
    const barrel = await import('./index')
    expect(typeof barrel.gradeTitle).toBe('function')
    expect(typeof barrel.gradeDescription).toBe('function')
    expect(typeof barrel.gradeCategory).toBe('function')
  })
})
