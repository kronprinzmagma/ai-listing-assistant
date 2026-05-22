import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockUploadImage, mockCreateListing } = vi.hoisted(() => ({
  mockUploadImage: vi.fn(),
  mockCreateListing: vi.fn(),
}))

vi.mock('../../packages/ricardo-mcp/src/client', () => ({
  RicardoClient: vi.fn().mockImplementation(function () {
    return {
      uploadImage: mockUploadImage,
      createListing: mockCreateListing,
    }
  }),
}))

import { runRicardoPublisher } from './ricardo-publisher'
import type { Listing } from '@/types/session'

const listing: Listing = {
  de: {
    title: 'Test Artikel',
    description: 'Ein toller Artikel.',
    category: 'Elektronik',
    condition: 'gut',
    price: 50,
    shipping: 'CHF 8',
  },
  fr: {
    title: 'Article test',
    description: 'Un super article.',
    category: 'Électronique',
    condition: 'bon',
    price: 50,
    shipping: 'CHF 8',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUploadImage.mockReset()
  mockCreateListing.mockReset()
  mockUploadImage.mockResolvedValue({ imageId: 'stub-img-001', url: 'https://img.ricardo.ch/stub.jpg' })
  mockCreateListing.mockResolvedValue({ listingId: 'stub-listing-001', url: 'https://www.ricardo.ch/listings/stub-listing-001' })
})

describe('runRicardoPublisher', () => {
  it('uploads all photos sequentially and returns listingId from createListing', async () => {
    const { output } = await runRicardoPublisher({
      listing,
      photoPaths: ['/p/a.jpg', '/p/b.jpg'],
      categoryId: 1,
      partnershipKey: 'test',
    })

    expect(mockUploadImage).toHaveBeenCalledTimes(2)
    expect(mockUploadImage.mock.calls[0][0].imagePath).toBe('/p/a.jpg')
    expect(mockUploadImage.mock.calls[1][0].imagePath).toBe('/p/b.jpg')

    expect(mockCreateListing).toHaveBeenCalledTimes(1)
    const createArg = mockCreateListing.mock.calls[0][0]
    expect(createArg.imageIds).toEqual(['stub-img-001', 'stub-img-001'])

    expect(output.listingId).toBe('stub-listing-001')
    expect(output.url).toMatch(/ricardo\.ch/)
  })

  it('trace has agent RicardoPublisher, durationMs >= 0, modelUsed === none', async () => {
    const { trace } = await runRicardoPublisher({
      listing,
      photoPaths: ['/p/a.jpg'],
      categoryId: 1,
      partnershipKey: 'test',
    })

    expect(trace.agent).toBe('RicardoPublisher')
    expect(trace.durationMs).toBeGreaterThanOrEqual(0)
    expect(trace.modelUsed).toBe('none')
    expect(() => new Date(trace.completedAt)).not.toThrow()
    expect(new Date(trace.completedAt).toISOString()).toBe(trace.completedAt)
  })

  it('passes full listing payload to createListing (not just sessionId)', async () => {
    await runRicardoPublisher({
      listing,
      photoPaths: ['/p/a.jpg', '/p/b.jpg'],
      categoryId: 1,
      partnershipKey: 'test',
    })

    const createArg = mockCreateListing.mock.calls[0][0]
    expect(createArg.titleDe).toBe('Test Artikel')
    expect(createArg.categoryId).toBe(1)
    expect(createArg.imageIds).toHaveLength(2)
  })

  it('handles zero photoPaths (no uploadImage calls)', async () => {
    const { output } = await runRicardoPublisher({
      listing,
      photoPaths: [],
      categoryId: 1,
      partnershipKey: 'test',
    })

    expect(mockUploadImage).not.toHaveBeenCalled()
    const createArg = mockCreateListing.mock.calls[0][0]
    expect(createArg.imageIds).toEqual([])
    expect(output.listingId).toBeDefined()
  })

  it('partnershipKey is redacted in trace.input (security requirement)', async () => {
    const { trace } = await runRicardoPublisher({
      listing,
      photoPaths: [],
      categoryId: 1,
      partnershipKey: 'secret-key-123',
    })

    expect((trace.input as Record<string, unknown>).partnershipKey).toBe('[REDACTED]')
  })
})
