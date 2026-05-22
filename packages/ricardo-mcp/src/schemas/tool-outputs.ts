import { z } from 'zod'

export const CreateListingOutputSchema = z.object({
  listingId: z.string().min(1),
  url: z.string().url(),
})
export type CreateListingOutput = z.infer<typeof CreateListingOutputSchema>

export const UpdateListingOutputSchema = z.object({
  listingId: z.string().min(1),
  updatedAt: z.string().datetime(),
})
export type UpdateListingOutput = z.infer<typeof UpdateListingOutputSchema>

export const DeleteListingOutputSchema = z.object({
  success: z.boolean(),
  deletedAt: z.string().datetime(),
})
export type DeleteListingOutput = z.infer<typeof DeleteListingOutputSchema>

export const UploadImageOutputSchema = z.object({
  imageId: z.string().min(1),
  url: z.string().url(),
})
export type UploadImageOutput = z.infer<typeof UploadImageOutputSchema>

export const UpdateOrderStatusOutputSchema = z.object({
  orderId: z.string().min(1),
  updatedStatus: z.enum(['pending', 'shipped', 'completed', 'cancelled']),
})
export type UpdateOrderStatusOutput = z.infer<typeof UpdateOrderStatusOutputSchema>
