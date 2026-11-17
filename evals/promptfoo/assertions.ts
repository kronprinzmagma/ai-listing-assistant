import { RicardoListingSchema, type RicardoListing } from '../../src/agents/schemas'
import { gradeCategory, gradeDescription, gradeTitle } from '../graders'
import type { TestCase } from '../cases/case-schema'

// promptfoo-Assertions fuer evals/promptfooconfig.yaml. Sie rufen dieselben
// Grader auf wie run-eval.ts, damit beide Wege dieselben Scores liefern.
//
// Bestanden-Schwelle 0.8 fuer Titel und Beschreibung: Startwert, nicht
// kalibriert (in den Laeufen vom 2026-05-21 lagen die Mittelwerte bei 0.93-0.97).
// Der Score selbst geht unveraendert als named metric in den Bericht.
const PASS_THRESHOLD = 0.8

interface AssertionContext {
  vars: Record<string, unknown>
}

interface AssertionResult {
  pass: boolean
  score: number
  reason: string
}

function parseListing(output: string): RicardoListing | AssertionResult {
  let raw: unknown
  try {
    raw = JSON.parse(output)
  } catch {
    return { pass: false, score: 0, reason: 'JSON parse failed' }
  }
  const parsed = RicardoListingSchema.safeParse(raw)
  if (!parsed.success) {
    return { pass: false, score: 0, reason: 'Invalid listing schema' }
  }
  return parsed.data
}

function isFailure(value: RicardoListing | AssertionResult): value is AssertionResult {
  return 'pass' in value
}

export async function title(output: string, context: AssertionContext): Promise<AssertionResult> {
  const tc = context.vars.caseData as TestCase
  const listing = parseListing(output)
  if (isFailure(listing)) return listing
  const grade = await gradeTitle(listing.de.title, tc.goldListing.de.title)
  return { pass: grade.score >= PASS_THRESHOLD, score: grade.score, reason: grade.rationale }
}

export async function description(output: string, context: AssertionContext): Promise<AssertionResult> {
  const tc = context.vars.caseData as TestCase
  const listing = parseListing(output)
  if (isFailure(listing)) return listing
  const productContext = `${tc.product}, ${tc.metadata.category}, ${tc.metadata.condition}`
  const grade = await gradeDescription(listing.de.description, tc.goldListing.de.description, productContext)
  return { pass: grade.score >= PASS_THRESHOLD, score: grade.score, reason: grade.rationale }
}

export function category(output: string, context: AssertionContext): AssertionResult {
  const tc = context.vars.caseData as TestCase
  const listing = parseListing(output)
  if (isFailure(listing)) return listing
  const grade = gradeCategory(listing.de.category, tc.goldListing.de.category)
  return { pass: grade.exactMatch, score: grade.score, reason: grade.rationale }
}
