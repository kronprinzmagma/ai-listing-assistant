import { describe, it, expect, vi, beforeEach } from 'vitest'

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))
vi.mock('../../src/lib/anthropic', () => ({
  anthropic: { messages: { parse: parseMock } },
}))

import { gradeDescription } from './description-grader'

const validDescriptionGraderOutput = {
  factualGrounding: 3,
  completeness: 3,
  conciseness: 2,
  tone: 2,
  totalScore: 1.0,
  rationale: 'All facts match the product context. Condition and shipping are mentioned.',
  suggestion: 'Description is already optimal.',
}

beforeEach(() => {
  parseMock.mockReset()
})

describe('gradeDescription', () => {
  it('Test 1: returns GraderOutput {score, rationale, suggestion} from parsed output', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validDescriptionGraderOutput })
    const result = await gradeDescription(
      'iPhone 14 128GB in sehr gutem Zustand. Versand CHF 8.',
      'Apple iPhone 14 128GB Space Black, wie neu. Inkl. Originalverpackung. Versand CHF 8.',
      'iPhone 14, 128GB, Space Black, Zustand: wie neu, OVP vorhanden',
    )
    expect(result.score).toBe(1.0)
    expect(result.rationale).toBe(validDescriptionGraderOutput.rationale)
    expect(result.suggestion).toBe(validDescriptionGraderOutput.suggestion)
    expect(Object.keys(result)).toEqual(['score', 'rationale', 'suggestion'])
  })

  it('Test 2: prompt includes all 4 rubric dimensions with anchor definitions', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validDescriptionGraderOutput })
    await gradeDescription('desc', 'gold desc', 'product context')
    const promptContent = parseMock.mock.calls[0][0].messages[0].content
    expect(promptContent).toContain('factualGrounding')
    expect(promptContent).toContain('completeness')
    expect(promptContent).toContain('conciseness')
    expect(promptContent).toContain('tone')
  })

  it('Test 3: prompt includes generated description, gold description, AND productContext', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validDescriptionGraderOutput })
    const generatedDesc = 'iPhone in gutem Zustand.'
    const goldDesc = 'Apple iPhone 14 128GB, wie neu, inkl. OVP.'
    const productCtx = 'iPhone 14 Space Black, 128GB, wie neu'
    await gradeDescription(generatedDesc, goldDesc, productCtx)
    const promptContent = parseMock.mock.calls[0][0].messages[0].content
    expect(promptContent).toContain(generatedDesc)
    expect(promptContent).toContain(goldDesc)
    expect(promptContent).toContain(productCtx)
  })

  it('Test 4: function signature accepts (description, goldDescription, productContext)', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: validDescriptionGraderOutput })
    // Verify 3-argument signature compiles and runs
    const result = await gradeDescription(
      'generated description',
      'gold description',
      'product context',
    )
    expect(parseMock).toHaveBeenCalledTimes(1)
    expect(typeof result.score).toBe('number')
    expect(typeof result.rationale).toBe('string')
    expect(typeof result.suggestion).toBe('string')
  })
})
