import { z } from 'zod'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { ListingLocaleSchema } from '../../src/agents/schemas'

export const TestCaseSchema = z.object({
  id: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
  product: z.string().min(1),
  metadata: z.object({
    category: z.string().min(1),
    condition: z.enum(['neu', 'wie neu', 'gut', 'akzeptabel']),
    priceRangeCHF: z.tuple([z.number(), z.number()]),
  }),
  imagePaths: z.array(z.string().min(1)).min(1),
  goldListing: z.object({
    de: ListingLocaleSchema,
    fr: ListingLocaleSchema,
  }),
})
export type TestCase = z.infer<typeof TestCaseSchema>

const CASES_DIR = path.join(process.cwd(), 'evals/cases')

export function loadCases(): TestCase[] {
  const files = fs.readdirSync(CASES_DIR)
    .filter(f => /^\d{2}-.+\.json$/.test(f))
    .sort()
  return files.map(f => {
    const raw = JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), 'utf8'))
    return TestCaseSchema.parse(raw)
  })
}
