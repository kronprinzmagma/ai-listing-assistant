import { describe, it, expect, vi, beforeEach } from 'vitest'

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))
vi.mock('../../src/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock } },
}))

import { gradeTitle } from './title-grader'

const validTitleGraderOutput = {
  specificity: 3,
  lengthScore: 2,
  keywords: 3,
  noClickbait: 2,
  totalScore: 1.0,
  rationale: 'Perfect title with model name and all keywords.',
  suggestion: 'Title is already optimal.',
}

beforeEach(() => {
  parseMock.mockReset()
})

describe('gradeTitle', () => {
  it('Test 1: returns GraderOutput {score, rationale, suggestion} from parsed output', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validTitleGraderOutput })
    const result = await gradeTitle('iPhone 14 128GB Schwarz', 'Apple iPhone 14 128GB Black')
    expect(result.score).toBe(1.0)
    expect(result.rationale).toBe(validTitleGraderOutput.rationale)
    expect(result.suggestion).toBe(validTitleGraderOutput.suggestion)
    expect(Object.keys(result)).toEqual(['score', 'rationale', 'suggestion'])
  })

  it('Test 2: prompt includes all 4 rubric anchor dimensions', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validTitleGraderOutput })
    await gradeTitle('iPhone 14', 'Apple iPhone 14 128GB')
    const promptContent = parseMock.mock.calls[0][0].messages[0].content
    expect(promptContent).toContain('Specificity')
    expect(promptContent).toContain('Length')
    expect(promptContent).toContain('Keywords')
    expect(promptContent).toContain('Clickbait')
  })

  it('Test 3: prompt includes both generated title and gold-standard reference', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validTitleGraderOutput })
    const generatedTitle = 'iPhone 14 128GB'
    const goldTitle = 'Apple iPhone 14 128GB Space Black'
    await gradeTitle(generatedTitle, goldTitle)
    const promptContent = parseMock.mock.calls[0][0].messages[0].content
    expect(promptContent).toContain(generatedTitle)
    expect(promptContent).toContain(goldTitle)
  })

  it('Test 4: prompt mentions 40-60 char optimal range for title length', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validTitleGraderOutput })
    await gradeTitle('iPhone 14', 'Apple iPhone 14 128GB')
    const promptContent = parseMock.mock.calls[0][0].messages[0].content
    expect(promptContent).toContain('40')
    expect(promptContent).toContain('60')
  })

  it('Test 5: propagates throw when parsed_output is invalid (schema parse failure)', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: null })
    await expect(gradeTitle('iPhone 14', 'Apple iPhone 14')).rejects.toThrow()
  })
})

// Abbruch «Unterminated string in JSON» im Eval-Lauf vom 2026-11-23: Sonnet 5.5 denkt
// ohne effort mit hoher Stufe, und das Denken zaehlt zu max_tokens. Bei 512 Tokens
// blieb dann zu wenig fuer die JSON-Antwort.
describe('gradeTitle: Token-Budget', () => {
  it('denkt mit effort low und laesst max_tokens Platz fuer Denken plus Antwort', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validTitleGraderOutput })
    await gradeTitle('iPhone 14', 'Apple iPhone 14 128GB')
    const request = parseMock.mock.calls[0][0]
    expect(request.output_config.effort).toBe('low')
    expect(request.max_tokens).toBeGreaterThanOrEqual(4000)
  })
})
