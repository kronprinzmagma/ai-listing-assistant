import { z } from 'zod'

export const CreateListingInputSchema = z.object({
  sessionId: z.string().uuid(),
  locale: z.enum(['de', 'fr']),
  // Phase 4 additions — real listing payload for Ricardo CreateArticle
  titleDe: z.string().max(60).optional(),
  titleFr: z.string().max(60).optional(),
  descriptionDe: z.string().optional(),
  descriptionFr: z.string().optional(),
  categoryId: z.number().int().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  condition: z.string().optional(),
  shipping: z.string().optional(),
  imageIds: z.array(z.string()).optional(),
})
export type CreateListingInput = z.infer<typeof CreateListingInputSchema>

export const UpdateListingInputSchema = z.object({
  listingId: z.string().min(1),
  title: z.string().max(60).optional(),
  description: z.string().min(1).optional(),
  price: z.number().nonnegative().optional(),
})
export type UpdateListingInput = z.infer<typeof UpdateListingInputSchema>

export const DeleteListingInputSchema = z.object({
  listingId: z.string().min(1),
})
export type DeleteListingInput = z.infer<typeof DeleteListingInputSchema>

export const UploadImageInputSchema = z.object({
  listingId: z.string().min(1),
  imagePath: z.string().min(1),
})
export type UploadImageInput = z.infer<typeof UploadImageInputSchema>

export const UpdateOrderStatusInputSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(['pending', 'shipped', 'completed', 'cancelled']),
})
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusInputSchema>
