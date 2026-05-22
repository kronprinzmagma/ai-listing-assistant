import * as fs from 'node:fs'
import * as path from 'node:path'

// Load .env.local BEFORE the Anthropic SDK module is imported.
// The Anthropic singleton (src/lib/anthropic.ts) reads ANTHROPIC_API_KEY
// at construction time, so we must populate process.env before any import
// of that module. We also override blank values (e.g. shell has ANTHROPIC_API_KEY="").
function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    // Override if blank in environment (e.g., shell sets ANTHROPIC_API_KEY="")
    if (key && !process.env[key]) {
      process.env[key] = val
    }
  }
}

export interface EvalRunResult {
  outPath: string
  summary: {
    runId: string
    timestamp: string
    promptVersion: string
    cases: Array<{
      caseId: string
      titleScore: number
      titleRationale: string
      descriptionScore: number
      descriptionRationale: string
      categoryScore: number
      categoryRationale: string
      error?: string
    }>
    aggregates: {
      titleAvg: number
      descriptionAvg: number
      categoryExactMatchRate: number
    }
  }
}

export interface MainOptions {
  promptVersion?: string
}

export async function main(options: MainOptions = {}): Promise<EvalRunResult> {
  // Load env first — before importing any module that creates the Anthropic client
  loadEnvLocal()

  // Resolve prompt version
  const version = options.promptVersion ?? process.argv[2] ?? 'v1'
  if (!['v1', 'v2', 'v3'].includes(version)) {
    throw new Error(`Invalid prompt version "${version}" — must be v1, v2, or v3`)
  }

  // Load prompt template for the selected version
  const promptFilePath = path.join(process.cwd(), 'evals/prompts', `listing-${version}.txt`)
  if (!fs.existsSync(promptFilePath)) {
    throw new Error(`Prompt file not found: ${promptFilePath}`)
  }
  const promptTemplate = fs.readFileSync(promptFilePath, 'utf8')

  // Dynamic imports ensure ANTHROPIC_API_KEY is set before the SDK singleton is created.
  // (Static imports at the top of the file would be hoisted and evaluated before
  // loadEnvLocal() runs, resulting in the Anthropic client having an empty API key.)
  const { loadCases } = await import('./cases/case-schema')
  const { gradeTitle, gradeDescription, gradeCategory } = await import('./graders')
  const { default: ListingProvider } = await import('./providers/listing-provider')

  const cases = loadCases()
  const provider = new ListingProvider()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  const caseResults: EvalRunResult['summary']['cases'] = []

  for (const tc of cases) {
    const callResult = await provider.callApi('', { vars: { caseData: tc, promptTemplate } })
    if (callResult.error || !callResult.output) {
      caseResults.push({
        caseId: tc.id,
        titleScore: 0, titleRationale: 'agent error',
        descriptionScore: 0, descriptionRationale: 'agent error',
        categoryScore: 0, categoryRationale: 'agent error',
        error: callResult.error ?? 'no output',
      })
      continue
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listing = JSON.parse(callResult.output as string) as any
    const productContext = `${tc.product}, ${tc.metadata.category}, ${tc.metadata.condition}`

    const [titleGrade, descGrade] = await Promise.all([
      gradeTitle(listing.de.title, tc.goldListing.de.title),
      gradeDescription(listing.de.description, tc.goldListing.de.description, productContext),
    ])
    const catGrade = gradeCategory(listing.de.category, tc.goldListing.de.category)

    caseResults.push({
      caseId: tc.id,
      titleScore: titleGrade.score,
      titleRationale: titleGrade.rationale,
      descriptionScore: descGrade.score,
      descriptionRationale: descGrade.rationale,
      categoryScore: catGrade.score,
      categoryRationale: catGrade.rationale,
    })
  }

  const successful = caseResults.filter(c => !c.error)
  const aggregates = {
    titleAvg: successful.length
      ? successful.reduce((s, c) => s + c.titleScore, 0) / successful.length
      : 0,
    descriptionAvg: successful.length
      ? successful.reduce((s, c) => s + c.descriptionScore, 0) / successful.length
      : 0,
    categoryExactMatchRate: successful.length
      ? successful.filter(c => c.categoryScore === 1.0).length / successful.length
      : 0,
  }

  const runId = `run-${version}-${timestamp}`
  const summary = { runId, timestamp, promptVersion: version, cases: caseResults, aggregates }
  const outDir = path.join(process.cwd(), 'evals/results')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${runId}.json`)
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2))

  console.table(caseResults.map(c => ({
    case: c.caseId,
    title: c.titleScore.toFixed(2),
    desc: c.descriptionScore.toFixed(2),
    cat: c.categoryScore.toFixed(2),
    error: c.error ?? '-',
  })))
  console.log(`\nAggregates: title=${aggregates.titleAvg.toFixed(2)}, desc=${aggregates.descriptionAvg.toFixed(2)}, cat-exact=${(aggregates.categoryExactMatchRate * 100).toFixed(0)}%`)
  console.log(`Result: ${outPath}`)

  return { outPath, summary }
}

// Allow direct invocation: tsx evals/run-eval.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => { console.error(err); process.exit(1) })
}
