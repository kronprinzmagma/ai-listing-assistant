import { CATEGORIES } from './categories'

// Ricardo-Kategorie-ID je deutschem Listennamen, abgeleitet aus der festen Liste
// (src/lib/categories.ts). Unbekannte Namen ergeben 0.
export const CATEGORY_ID_MAP: Record<string, number> = Object.fromEntries(
  CATEGORIES.map((c) => [c.de, c.id])
)

export function mapCategoryToId(categoryLabel: string): number {
  return CATEGORY_ID_MAP[categoryLabel] ?? 0
}
