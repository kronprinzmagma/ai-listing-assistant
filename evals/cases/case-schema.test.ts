import { describe, it, expect } from 'vitest'
import { TestCaseSchema, loadCases } from './case-schema'

const VALID_CASE = {
  id: '01-iphone-14',
  product: 'iPhone 14',
  metadata: {
    category: 'Smartphones',
    condition: 'wie neu' as const,
    priceRangeCHF: [400, 500] as [number, number],
  },
  imagePaths: [
    'evals/cases/images/01-iphone-14/front.jpg',
    'evals/cases/images/01-iphone-14/back.jpg',
  ],
  goldListing: {
    de: {
      title: 'Apple iPhone 14 128GB Midnight – wie neu',
      description: 'iPhone 14 in Topzustand. Keine Kratzer, mit Original-Verpackung. Akku bei 96%. Entsperrt für alle Netze.',
      category: 'Smartphones',
      condition: 'wie neu',
      price: 450,
      shipping: 'CH-Post A-Post, ca. 5 CHF',
    },
    fr: {
      title: 'Apple iPhone 14 128Go Midnight – comme neuf',
      description: "iPhone 14 en parfait état. Sans rayures, boîte d'origine. Batterie à 96%. Débloqué tous opérateurs.",
      category: 'Smartphones',
      condition: 'comme neuf',
      price: 450,
      shipping: 'Swiss Post A-Post, env. 5 CHF',
    },
  },
}

describe('TestCaseSchema', () => {
  it('parses a valid test case with id, product, metadata, imagePaths, goldListing', () => {
    const result = TestCaseSchema.parse(VALID_CASE)
    expect(result.id).toBe('01-iphone-14')
    expect(result.product).toBe('iPhone 14')
    expect(result.metadata.condition).toBe('wie neu')
    expect(result.imagePaths).toHaveLength(2)
    expect(result.goldListing.de.title).toBe('Apple iPhone 14 128GB Midnight – wie neu')
  })

  it('rejects missing goldListing', () => {
    const { goldListing: _removed, ...withoutGoldListing } = VALID_CASE
    expect(() => TestCaseSchema.parse(withoutGoldListing)).toThrow()
  })

  it('rejects empty imagePaths', () => {
    expect(() =>
      TestCaseSchema.parse({ ...VALID_CASE, imagePaths: [] })
    ).toThrow()
  })

  it('enforces goldListing.de.title.length <= 60', () => {
    const longTitle = 'A'.repeat(61)
    expect(() =>
      TestCaseSchema.parse({
        ...VALID_CASE,
        goldListing: {
          ...VALID_CASE.goldListing,
          de: { ...VALID_CASE.goldListing.de, title: longTitle },
        },
      })
    ).toThrow()
  })

  it('enforces goldListing.fr.title.length <= 60', () => {
    const longTitle = 'B'.repeat(61)
    expect(() =>
      TestCaseSchema.parse({
        ...VALID_CASE,
        goldListing: {
          ...VALID_CASE.goldListing,
          fr: { ...VALID_CASE.goldListing.fr, title: longTitle },
        },
      })
    ).toThrow()
  })
})

describe('loadCases()', () => {
  it('loads and validates all committed seed JSON files', () => {
    const cases = loadCases()
    expect(cases.length).toBeGreaterThanOrEqual(2)
  })

  it('parses 01-iphone-14.json seed case successfully', () => {
    const cases = loadCases()
    const iphone = cases.find(c => c.id === '01-iphone-14')
    expect(iphone).toBeDefined()
    expect(iphone!.product).toBe('iPhone 14')
    expect(iphone!.goldListing.de.price).toBe(450)
  })

  it('parses 02-ikea-kallax.json seed case successfully', () => {
    const cases = loadCases()
    const kallax = cases.find(c => c.id === '02-ikea-kallax')
    expect(kallax).toBeDefined()
    expect(kallax!.metadata.category).toBe('Möbel')
  })
})
