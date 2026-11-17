import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const mockGradeTitle = vi.hoisted(() => vi.fn())
const mockGradeDescription = vi.hoisted(() => vi.fn())
vi.mock('../graders', async (importOriginal) => {
  const original = await importOriginal<typeof import('../graders')>()
  return { ...original, gradeTitle: mockGradeTitle, gradeDescription: mockGradeDescription }
})

const CASE = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'evals/cases/01-iphone-14.json'), 'utf8'))
const context = { vars: { caseData: CASE } }
const listing = (category: string) => JSON.stringify({
  de: { ...CASE.goldListing.de, category },
  fr: CASE.goldListing.fr,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGradeTitle.mockResolvedValue({ score: 0.9, rationale: 'ok', suggestion: '-' })
  mockGradeDescription.mockResolvedValue({ score: 0.7, rationale: 'zu lang', suggestion: '-' })
})

describe('promptfoo-Assertions', () => {
  it('Titel: Score vom Grader, bestanden ab 0.8', async () => {
    const { title } = await import('./assertions')
    const result = await title(listing('Smartphones'), context)
    expect(result).toEqual({ pass: true, score: 0.9, reason: 'ok' })
    expect(mockGradeTitle).toHaveBeenCalledWith(CASE.goldListing.de.title, CASE.goldListing.de.title)
  })

  it('Beschreibung: unter 0.8 nicht bestanden, Score bleibt erhalten', async () => {
    const { description } = await import('./assertions')
    const result = await description(listing('Smartphones'), context)
    expect(result).toEqual({ pass: false, score: 0.7, reason: 'zu lang' })
  })

  it('Kategorie: deterministisch, nur exakter Treffer besteht', async () => {
    const { category } = await import('./assertions')
    expect(category(listing('Smartphones'), context).pass).toBe(true)
    const other = category(listing('Laptops'), context)
    expect(other.pass).toBe(false)
    expect(other.score).toBeLessThan(1)
  })

  it('kaputtes JSON oder falsches Schema: Score 0 ohne Grader-Aufruf', async () => {
    const { title, category } = await import('./assertions')
    expect(await title('kein json', context)).toMatchObject({ pass: false, score: 0 })
    expect(category(JSON.stringify({ de: {} }), context)).toMatchObject({ pass: false, score: 0 })
    expect(mockGradeTitle).not.toHaveBeenCalled()
  })
})
