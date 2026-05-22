import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

// ----- Hoisted mocks -----
const mockLoadCases = vi.hoisted(() => vi.fn())
const mockGradeTitle = vi.hoisted(() => vi.fn())
const mockGradeDescription = vi.hoisted(() => vi.fn())
const mockGradeCategory = vi.hoisted(() => vi.fn())
const mockCallApi = vi.hoisted(() => vi.fn())

vi.mock('./cases/case-schema', () => ({ loadCases: mockLoadCases }))
vi.mock('./graders', () => ({
  gradeTitle: mockGradeTitle,
  gradeDescription: mockGradeDescription,
  gradeCategory: mockGradeCategory,
}))
vi.mock('./providers/listing-provider', () => ({
  default: class MockListingProvider {
    id() { return 'listing-writer-agent' }
    callApi = mockCallApi
  },
}))

const FAKE_LISTING_JSON = JSON.stringify({
  de: { title: 'Test Titel', description: 'Testbeschreibung', category: 'Smartphones', condition: 'wie neu', price: 400, shipping: 'CH-Post' },
  fr: { title: 'Titre test', description: 'Description test', category: 'Smartphones', condition: 'comme neuf', price: 400, shipping: 'La Poste' },
})

const FAKE_CASE = {
  id: '01-iphone-14',
  product: 'iPhone 14',
  metadata: { category: 'Smartphones', condition: 'wie neu', priceRangeCHF: [400, 500] as [number, number] },
  imagePaths: ['evals/cases/images/01-iphone-14/front.jpg'],
  goldListing: {
    de: { title: 'Apple iPhone 14 128GB – wie neu', description: 'Topzustand.', category: 'Smartphones', condition: 'wie neu', price: 450, shipping: 'A-Post 5 CHF' },
    fr: { title: 'iPhone 14 128Go – comme neuf', description: 'Excellent état.', category: 'Smartphones', condition: 'comme neuf', price: 450, shipping: 'La Poste 5 CHF' },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadCases.mockReturnValue([FAKE_CASE])
  mockCallApi.mockResolvedValue({ output: FAKE_LISTING_JSON })
  mockGradeTitle.mockResolvedValue({ score: 0.8, rationale: 'Good title', suggestion: 'None' })
  mockGradeDescription.mockResolvedValue({ score: 0.7, rationale: 'Good desc', suggestion: 'None' })
  mockGradeCategory.mockReturnValue({ score: 1.0, rationale: 'Exact match', suggestion: 'Category is correct', exactMatch: true, parentMatch: false })
})

describe('main()', () => {
  // Test 1: main() exists and returns Promise<{ outPath, summary }>
  it('exists and returns EvalRunResult shape', async () => {
    const { main } = await import('./run-eval')
    expect(typeof main).toBe('function')
    const result = await main()
    expect(result).toHaveProperty('outPath')
    expect(result).toHaveProperty('summary')
    expect(typeof result.outPath).toBe('string')
    expect(typeof result.summary).toBe('object')
    // Clean up
    if (fs.existsSync(result.outPath)) fs.unlinkSync(result.outPath)
  })

  // Test 2: main() writes a JSON file to evals/results/ with EvaluateSummary shape
  it('writes JSON file to evals/results/ with correct shape', async () => {
    const { main } = await import('./run-eval')
    const result = await main()
    // Verify file was written
    expect(fs.existsSync(result.outPath)).toBe(true)
    const written = JSON.parse(fs.readFileSync(result.outPath, 'utf8'))
    expect(written).toHaveProperty('runId')
    expect(written).toHaveProperty('timestamp')
    expect(written).toHaveProperty('cases')
    expect(written).toHaveProperty('aggregates')
    expect(Array.isArray(written.cases)).toBe(true)
    expect(written.cases.length).toBeGreaterThanOrEqual(1)
    const c = written.cases[0]
    expect(c).toHaveProperty('caseId')
    expect(c).toHaveProperty('titleScore')
    expect(c).toHaveProperty('descriptionScore')
    expect(c).toHaveProperty('categoryScore')
    // Clean up
    fs.unlinkSync(result.outPath)
  })

  // Test 3: main() calls console.table (side effect — verifies score table output)
  it('calls console.table with per-case scores', async () => {
    const consoleSpy = vi.spyOn(console, 'table').mockImplementation(() => {})
    const { main } = await import('./run-eval')
    const result = await main()
    expect(consoleSpy).toHaveBeenCalledOnce()
    const tableArg = consoleSpy.mock.calls[0][0] as Array<{case: string; title: string; desc: string; cat: string}>
    expect(Array.isArray(tableArg)).toBe(true)
    expect(tableArg[0]).toHaveProperty('case')
    expect(tableArg[0]).toHaveProperty('title')
    expect(tableArg[0]).toHaveProperty('desc')
    expect(tableArg[0]).toHaveProperty('cat')
    consoleSpy.mockRestore()
    // Clean up result file
    if (fs.existsSync(result.outPath)) fs.unlinkSync(result.outPath)
  })

  // Test 4: promptfooconfig.yaml exists with required keys
  it('promptfooconfig.yaml contains required top-level keys', () => {
    const configPath = path.join(process.cwd(), 'evals/promptfooconfig.yaml')
    expect(fs.existsSync(configPath)).toBe(true)
    const content = fs.readFileSync(configPath, 'utf8')
    expect(content).toMatch(/^providers:/m)
    expect(content).toMatch(/^prompts:/m)
    expect(content).toMatch(/^tests:/m)
    expect(content).toMatch(/^defaultTest:/m)
  })

  // Test 5: main() accepts promptVersion and writes run-{version}-{timestamp}.json
  it('writes run-v2-* output file when called with promptVersion=v2', async () => {
    const { main } = await import('./run-eval')
    const result = await main({ promptVersion: 'v2' })
    // Output path should contain 'v2'
    expect(result.outPath).toMatch(/run-v2-/)
    // File should exist
    expect(fs.existsSync(result.outPath)).toBe(true)
    // Summary runId should reflect version
    expect(result.summary.runId).toMatch(/run-v2-/)
    // Clean up
    if (fs.existsSync(result.outPath)) fs.unlinkSync(result.outPath)
  })

  // Test 6: provider receives promptTemplate from vars
  it('callApi is invoked with promptTemplate in vars when promptVersion is set', async () => {
    const { main } = await import('./run-eval')
    await main({ promptVersion: 'v1' })
    // The callApi mock should have been called with vars containing promptTemplate
    const callArgs = mockCallApi.mock.calls[0]
    const context = callArgs[1] as { vars?: Record<string, unknown> }
    expect(context?.vars).toHaveProperty('promptTemplate')
    expect(typeof context.vars!.promptTemplate).toBe('string')
    // Clean up any written files
    const resultsDir = path.join(process.cwd(), 'evals/results')
    const files = fs.readdirSync(resultsDir).filter(f => f.startsWith('run-v1-') && f.endsWith('.json'))
    for (const f of files) {
      try { fs.unlinkSync(path.join(resultsDir, f)) } catch { /* ignore */ }
    }
  })

  // EVAL-07: error cases are recorded in result JSON, not dropped
  it('records agent errors in result JSON (EVAL-07)', async () => {
    mockCallApi.mockResolvedValue({ error: 'API key missing' })
    const { main } = await import('./run-eval')
    const result = await main()
    expect(fs.existsSync(result.outPath)).toBe(true)
    const written = JSON.parse(fs.readFileSync(result.outPath, 'utf8'))
    expect(written.cases[0]).toHaveProperty('error')
    expect(written.cases[0].error).toBe('API key missing')
    expect(written.cases[0].titleScore).toBe(0)
    // Clean up
    fs.unlinkSync(result.outPath)
  })
})
