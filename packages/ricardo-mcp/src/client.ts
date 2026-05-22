/**
 * RicardoClient — stub implementation.
 * Real HTTP calls gated on SPIKE-01 (Ricardo Partner API access).
 * Exported as @nilsseiter/ricardo-mcp/client for direct TypeScript import.
 */
import type {
  CreateListingInput,
  UpdateListingInput,
  DeleteListingInput,
  UploadImageInput,
  UpdateOrderStatusInput,
} from './schemas/tool-inputs.js'
import type {
  CreateListingOutput,
  UpdateListingOutput,
  DeleteListingOutput,
  UploadImageOutput,
  UpdateOrderStatusOutput,
} from './schemas/tool-outputs.js'
import type { RicardoListingDetail, RicardoOrder, RicardoCategoryNode } from './schemas/ricardo.js'

export class RicardoClient {
  constructor(private readonly partnershipKey?: string) {}

  async createListing(_input: CreateListingInput): Promise<CreateListingOutput> {
    return { listingId: 'stub-listing-001', url: 'https://www.ricardo.ch/listings/stub-listing-001' }
  }

  async updateListing(input: UpdateListingInput): Promise<UpdateListingOutput> {
    return { listingId: input.listingId, updatedAt: new Date().toISOString() }
  }

  async deleteListing(_input: DeleteListingInput): Promise<DeleteListingOutput> {
    return { success: true, deletedAt: new Date().toISOString() }
  }

  async uploadImage(_input: UploadImageInput): Promise<UploadImageOutput> {
    return { imageId: 'stub-img-001', url: 'https://img.ricardo.ch/stub-img-001.jpg' }
  }

  async updateOrderStatus(input: UpdateOrderStatusInput): Promise<UpdateOrderStatusOutput> {
    return { orderId: input.orderId, updatedStatus: input.status }
  }

  async getListing(id: string): Promise<RicardoListingDetail> {
    return {
      id,
      titleDe: `Stub-Artikel ${id}`,
      titleFr: `Article stub ${id}`,
      status: 'active',
      createdAt: new Date().toISOString(),
    }
  }

  async getActiveListings(): Promise<RicardoListingDetail[]> {
    return [
      { id: 'stub-001', titleDe: 'Stub Artikel 1', titleFr: 'Article stub 1', status: 'active', createdAt: new Date().toISOString() },
    ]
  }

  async getPendingOrders(): Promise<RicardoOrder[]> {
    return []  // Stub: SPIKE-01 required for live data
  }

  async getCategoryTree(): Promise<RicardoCategoryNode[]> {
    return [
      { id: 1, nameDe: 'Elektronik', nameFr: 'Électronique', children: [
        { id: 11, nameDe: 'Smartphones', nameFr: 'Smartphones' },
        { id: 12, nameDe: 'Laptops', nameFr: 'Ordinateurs portables' },
      ]},
      { id: 2, nameDe: 'Sport & Outdoor', nameFr: 'Sport & Outdoor', children: [
        { id: 21, nameDe: 'Fahrräder', nameFr: 'Vélos' },
      ]},
    ]
  }
}
