import { CATEGORIES } from '../../src/lib/categories'

export interface CategoryGradeResult {
  exactMatch: boolean
  parentMatch: boolean
  score: number  // 1.0 | 0.5 | 0.0
  rationale: string
  suggestion: string
}

// CATEGORY_HIERARCHY ordnet jeder Unterkategorie ihre Oberkategorie zu.
// Abgeleitet aus der festen Liste (src/lib/categories.ts), damit Eval, Modell-
// Schema und Publisher dieselben Kategorien kennen. Oberkategorien fehlen als
// Schluessel, weil sie keine Eltern haben.
export const CATEGORY_HIERARCHY: Record<string, string> = Object.fromEntries(
  CATEGORIES.flatMap((c) => ('parent' in c ? [[c.de, c.parent]] : []))
)

export function gradeCategory(generated: string, expected: string): CategoryGradeResult {
  const exactMatch = generated.toLowerCase() === expected.toLowerCase()
  const genParent = CATEGORY_HIERARCHY[generated]
  const expParent = CATEGORY_HIERARCHY[expected]
  const parentMatch = !exactMatch && !!genParent && genParent === expParent
  const score = exactMatch ? 1.0 : parentMatch ? 0.5 : 0.0
  return {
    exactMatch,
    parentMatch,
    score,
    rationale: exactMatch
      ? `Exact category match: "${generated}"`
      : parentMatch
        ? `Parent category match: both under "${genParent}"`
        : `No match: "${generated}" vs expected "${expected}"`,
    suggestion: score < 1.0
      ? `Use "${expected}" as the exact Ricardo category`
      : 'Category is correct',
  }
}
