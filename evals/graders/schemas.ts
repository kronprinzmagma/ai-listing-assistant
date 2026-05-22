import { z } from 'zod'

export const GraderOutputSchema = z.object({
  score: z.number().min(0).max(1),
  rationale: z.string().min(1),
  suggestion: z.string().min(1),
})
export type GraderOutput = z.infer<typeof GraderOutputSchema>

export const TitleGraderOutputSchema = z.object({
  specificity: z.number().min(0).max(3),
  lengthScore: z.number().min(0).max(2),
  keywords: z.number().min(0).max(3),
  noClickbait: z.number().min(0).max(2),
  totalScore: z.number().min(0).max(1),
  rationale: z.string().min(1),
  suggestion: z.string().min(1),
})
export type TitleGraderOutput = z.infer<typeof TitleGraderOutputSchema>

export const DescriptionGraderOutputSchema = z.object({
  factualGrounding: z.number().min(0).max(3),
  completeness: z.number().min(0).max(3),
  conciseness: z.number().min(0).max(2),
  tone: z.number().min(0).max(2),
  totalScore: z.number().min(0).max(1),
  rationale: z.string().min(1),
  suggestion: z.string().min(1),
})
export type DescriptionGraderOutput = z.infer<typeof DescriptionGraderOutputSchema>
