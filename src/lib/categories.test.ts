import { describe, it, expect } from 'vitest'
import { CATEGORIES, CATEGORY_LABELS_DE, CATEGORY_LABELS_FR, categoryFr, categoryDeFromFr, toCategoryDe } from './categories'
import { mapCategoryToId } from './category-map'

describe('feste Kategorienliste', () => {
  it('Namen und IDs sind eindeutig', () => {
    expect(new Set(CATEGORY_LABELS_DE).size).toBe(CATEGORIES.length)
    expect(new Set(CATEGORY_LABELS_FR).size).toBe(CATEGORIES.length)
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length)
  })

  it('jede Oberkategorie steht selbst in der Liste', () => {
    for (const c of CATEGORIES) {
      if ('parent' in c) expect(CATEGORY_LABELS_DE).toContain(c.parent)
    }
  })

  it('jeder Listenname hat eine ID ungleich 0 (der Publisher faellt nie mehr still auf 0)', () => {
    for (const label of CATEGORY_LABELS_DE) expect(mapCategoryToId(label)).not.toBe(0)
  })

  it('DE und FR lassen sich hin und zurueck abbilden', () => {
    for (const de of CATEGORY_LABELS_DE) expect(categoryDeFromFr(categoryFr(de))).toBe(de)
  })

  it('unbekannter Freitext wird zur Auffangkategorie', () => {
    expect(toCategoryDe('Smartphones & Handys')).toBe('Diverses')
    expect(toCategoryDe('Smartphones')).toBe('Smartphones')
  })
})
