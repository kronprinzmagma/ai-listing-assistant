export interface CategoryGradeResult {
  exactMatch: boolean
  parentMatch: boolean
  score: number  // 1.0 | 0.5 | 0.0
  rationale: string
  suggestion: string
}

export const CATEGORY_HIERARCHY: Record<string, string> = {
  'Smartphones': 'Elektronik',
  'Laptops': 'Elektronik',
  'Tablets': 'Elektronik',
  'Kameras': 'Elektronik',
  'Audio': 'Elektronik',
  'Möbel': 'Haushalt',
  'Küche': 'Haushalt',
  'Dekoration': 'Haushalt',
  'Spielzeug': 'Kinder & Familie',
  'Kinderkleidung': 'Kinder & Familie',
  'Sport': 'Sport & Outdoor',
  'Fahrrad': 'Sport & Outdoor',
  'Kleidung': 'Mode',
  'Schuhe': 'Mode',
  'Bücher': 'Medien',
  'Filme': 'Medien',
}

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
