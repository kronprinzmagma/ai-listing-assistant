export const CATEGORY_ID_MAP: Record<string, number> = {
  'Elektronik': 1,
  'Smartphones': 11,
  'Laptops': 12,
  'Sport & Outdoor': 2,
  'Fahrräder': 21,
  'Fahrrad': 21,
  'Möbel': 3,
  'Haushalt': 3,
  'Medien': 4,
  'Bücher': 41,
  'Mode': 5,
  'Kleidung': 51,
  'Schuhe': 52,
  'Kinder & Familie': 6,
  'Spielzeug': 61,
}

export function mapCategoryToId(categoryLabel: string): number {
  return CATEGORY_ID_MAP[categoryLabel] ?? 0
}
