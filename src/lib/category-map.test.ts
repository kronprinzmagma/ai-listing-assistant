import { describe, it, expect } from 'vitest'
import { mapCategoryToId } from './category-map'

describe('mapCategoryToId', () => {
  it('maps Elektronik to 1', () => {
    expect(mapCategoryToId('Elektronik')).toBe(1)
  })

  it('maps Smartphones to 11', () => {
    expect(mapCategoryToId('Smartphones')).toBe(11)
  })

  it('maps Sport & Outdoor to 2', () => {
    expect(mapCategoryToId('Sport & Outdoor')).toBe(2)
  })

  it('returns 0 for unknown label', () => {
    expect(mapCategoryToId('unknown-label')).toBe(0)
  })

  it('returns 0 for lowercase elektronik (case-sensitive)', () => {
    expect(mapCategoryToId('elektronik')).toBe(0)
  })
})
