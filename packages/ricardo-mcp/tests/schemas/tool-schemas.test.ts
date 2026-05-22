import { describe, it, expect } from 'vitest'
import { ConditionSchema, RicardoListingDetailSchema } from '../../src/schemas/ricardo.js'
import { CreateListingInputSchema, UploadImageInputSchema, UpdateOrderStatusInputSchema } from '../../src/schemas/tool-inputs.js'
import { CreateListingOutputSchema, DeleteListingOutputSchema } from '../../src/schemas/tool-outputs.js'
import { TypedErrorSchema, makeTypedError } from '../../src/schemas/errors.js'

describe('ConditionSchema', () => {
  it('accepts valid conditions', () => {
    expect(ConditionSchema.parse('neu')).toBe('neu')
    expect(ConditionSchema.parse('wie neu')).toBe('wie neu')
    expect(ConditionSchema.parse('gut')).toBe('gut')
    expect(ConditionSchema.parse('akzeptabel')).toBe('akzeptabel')
  })
  it('rejects invalid condition', () => {
    expect(() => ConditionSchema.parse('used')).toThrow()
  })
})

describe('CreateListingInputSchema', () => {
  it('accepts valid UUID + locale', () => {
    const result = CreateListingInputSchema.parse({ sessionId: '550e8400-e29b-41d4-a716-446655440000', locale: 'de' })
    expect(result.locale).toBe('de')
  })
  it('rejects non-UUID sessionId', () => {
    expect(() => CreateListingInputSchema.parse({ sessionId: 'not-a-uuid', locale: 'de' })).toThrow()
  })
  it('rejects missing locale', () => {
    expect(() => CreateListingInputSchema.parse({ sessionId: '550e8400-e29b-41d4-a716-446655440000' })).toThrow()
  })
})

describe('UploadImageInputSchema', () => {
  it('rejects empty imagePath', () => {
    expect(() => UploadImageInputSchema.parse({ listingId: 'abc', imagePath: '' })).toThrow()
  })
})

describe('CreateListingOutputSchema', () => {
  it('requires valid URL', () => {
    expect(() => CreateListingOutputSchema.parse({ listingId: 'x', url: 'not-a-url' })).toThrow()
    expect(CreateListingOutputSchema.parse({ listingId: 'x', url: 'https://www.ricardo.ch/listings/x' }).listingId).toBe('x')
  })
})

describe('TypedErrorSchema', () => {
  it('parses valid error', () => {
    const e = TypedErrorSchema.parse({ code: 'NOT_FOUND', message: 'not found', retryHint: 'check id', retryable: false })
    expect(e.code).toBe('NOT_FOUND')
  })
  it('rejects unknown code', () => {
    expect(() => TypedErrorSchema.parse({ code: 'UNKNOWN', message: 'x', retryHint: 'y', retryable: true })).toThrow()
  })
})

describe('makeTypedError', () => {
  it('returns isError: true', () => {
    const result = makeTypedError(new Error('oops'), 'retry later')
    expect(result.isError).toBe(true)
  })
  it('classifies auth errors correctly', () => {
    const result = makeTypedError(new Error('unauthorized auth failed'), 'check credentials')
    const sc = result.structuredContent as { code: string }
    expect(sc.code).toBe('AUTH_REQUIRED')
  })
  it('defaults to API_UNAVAILABLE for unknown errors', () => {
    const result = makeTypedError(new Error('something went wrong'), 'try again')
    const sc = result.structuredContent as { code: string }
    expect(sc.code).toBe('API_UNAVAILABLE')
  })
})
