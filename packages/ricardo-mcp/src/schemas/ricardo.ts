import { z } from 'zod'

export const ConditionSchema = z.enum(['neu', 'wie neu', 'gut', 'akzeptabel'])
export type Condition = z.infer<typeof ConditionSchema>

export const ListingLocaleSchema = z.object({
  title: z.string().max(60),
  description: z.string().min(1),
  category: z.string().min(1),
  condition: ConditionSchema,
  price: z.number().nonnegative(),
  shipping: z.string().min(1),
})
export type ListingLocale = z.infer<typeof ListingLocaleSchema>

export const RicardoListingDetailSchema = z.object({
  id: z.string(),
  titleDe: z.string().max(60),
  titleFr: z.string().max(60),
  status: z.enum(['active', 'closed', 'draft']),
  createdAt: z.string().datetime(),
})
export type RicardoListingDetail = z.infer<typeof RicardoListingDetailSchema>

export const RicardoOrderSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  buyerName: z.string(),
  status: z.enum(['pending', 'shipped', 'completed', 'cancelled']),
  createdAt: z.string().datetime(),
})
export type RicardoOrder = z.infer<typeof RicardoOrderSchema>

export interface RicardoCategoryNode {
  id: number
  nameDe: string
  nameFr: string
  children?: RicardoCategoryNode[]
}

export const RicardoCategoryNodeSchema: z.ZodType<RicardoCategoryNode> = z.lazy(() =>
  z.object({
    id: z.number().int(),
    nameDe: z.string(),
    nameFr: z.string(),
    children: z.array(RicardoCategoryNodeSchema).optional(),
  })
)
