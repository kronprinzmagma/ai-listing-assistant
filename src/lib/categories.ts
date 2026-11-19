// Feste Kategorienliste: die einzige Quelle fuer Bildanalyse, Inserat, Review und
// Publisher. Das Modell darf nur einen dieser deutschen Namen waehlen (Enum im
// Antwortschema), der Code setzt den franzoesischen Namen dazu.
//
// VORSCHLAG, Stand 2026-11-19: Welche Liste endgueltig gilt, entscheidet Nils
// (offizielle Ricardo-Hauptkategorien oder diese kurze eigene Liste). Die Liste
// vereint die bisherigen Eintraege aus category-map.ts und der Eval-Hierarchie
// (evals/graders/category-grader.ts) plus «Games & Konsolen» und den Auffang-
// eintrag «Diverses». Die IDs sind Platzhalter wie bisher: echte Ricardo-IDs
// gibt es erst mit Zugang zur Partner-API (SPIKE-01).
export const CATEGORIES = [
  { de: 'Elektronik', fr: 'Électronique', id: 1 },
  { de: 'Smartphones', fr: 'Smartphones', id: 11, parent: 'Elektronik' },
  { de: 'Laptops', fr: 'Ordinateurs portables', id: 12, parent: 'Elektronik' },
  { de: 'Tablets', fr: 'Tablettes', id: 13, parent: 'Elektronik' },
  { de: 'Kameras', fr: 'Appareils photo', id: 14, parent: 'Elektronik' },
  { de: 'Audio', fr: 'Audio', id: 15, parent: 'Elektronik' },
  { de: 'Games & Konsolen', fr: 'Jeux vidéo & consoles', id: 7 },
  { de: 'Sport & Outdoor', fr: 'Sport & plein air', id: 2 },
  { de: 'Fahrrad', fr: 'Vélos', id: 21, parent: 'Sport & Outdoor' },
  { de: 'Haushalt', fr: 'Maison', id: 3 },
  { de: 'Möbel', fr: 'Meubles', id: 31, parent: 'Haushalt' },
  { de: 'Küche', fr: 'Cuisine', id: 32, parent: 'Haushalt' },
  { de: 'Dekoration', fr: 'Décoration', id: 33, parent: 'Haushalt' },
  { de: 'Medien', fr: 'Médias', id: 4 },
  { de: 'Bücher', fr: 'Livres', id: 41, parent: 'Medien' },
  { de: 'Filme', fr: 'Films', id: 42, parent: 'Medien' },
  { de: 'Mode', fr: 'Mode', id: 5 },
  { de: 'Kleidung', fr: 'Vêtements', id: 51, parent: 'Mode' },
  { de: 'Schuhe', fr: 'Chaussures', id: 52, parent: 'Mode' },
  { de: 'Kinder & Familie', fr: 'Enfants & famille', id: 6 },
  { de: 'Spielzeug', fr: 'Jeux & Jouets', id: 61, parent: 'Kinder & Familie' },
  { de: 'Kinderkleidung', fr: 'Vêtements enfants', id: 62, parent: 'Kinder & Familie' },
  { de: 'Diverses', fr: 'Divers', id: 9 },
] as const

export type CategoryDe = (typeof CATEGORIES)[number]['de']
export type CategoryFr = (typeof CATEGORIES)[number]['fr']

/** Auffangkategorie, wenn eine gespeicherte Kategorie nicht (mehr) in der Liste steht. */
export const FALLBACK_CATEGORY: CategoryDe = 'Diverses'

export const CATEGORY_LABELS_DE = CATEGORIES.map((c) => c.de) as [CategoryDe, ...CategoryDe[]]
export const CATEGORY_LABELS_FR = CATEGORIES.map((c) => c.fr) as [CategoryFr, ...CategoryFr[]]

export function isCategoryDe(label: string): label is CategoryDe {
  return (CATEGORY_LABELS_DE as readonly string[]).includes(label)
}

/** Deutscher Listenname oder die Auffangkategorie (z. B. fuer alte Sessions mit Freitext). */
export function toCategoryDe(label: string): CategoryDe {
  return isCategoryDe(label) ? label : FALLBACK_CATEGORY
}

export function categoryFr(de: CategoryDe): CategoryFr {
  return CATEGORIES.find((c) => c.de === de)!.fr
}

/** Deutscher Name zu einem franzoesischen Listennamen, sonst undefined. */
export function categoryDeFromFr(fr: string): CategoryDe | undefined {
  return CATEGORIES.find((c) => c.fr === fr)?.de
}
