import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ApiProvider, ProviderOptions, ProviderResponse } from 'promptfoo'
import { runListingWriter } from '../../src/agents/listing-writer'
import type { AnalysisResult } from '../../src/agents/schemas'
import type { TestCase } from '../cases/case-schema'

const PROMPT_VERSIONS = ['v1', 'v2', 'v3'] as const

// Liest die Prompt-Vorlage einer Version aus evals/prompts/. Wird genutzt, wenn
// promptfoo den Provider mit `config.promptVersion` startet (evals/promptfooconfig.yaml);
// run-eval.ts uebergibt die Vorlage stattdessen direkt als vars.promptTemplate.
function readPromptTemplate(version: string): string {
  if (!(PROMPT_VERSIONS as readonly string[]).includes(version)) {
    throw new Error(`Invalid prompt version "${version}" — must be ${PROMPT_VERSIONS.join(', ')}`)
  }
  return fs.readFileSync(path.join(process.cwd(), 'evals/prompts', `listing-${version}.txt`), 'utf8')
}

export default class ListingProvider implements ApiProvider {
  private readonly promptVersion?: string

  constructor(options: ProviderOptions = {}) {
    const version = (options.config as { promptVersion?: unknown } | undefined)?.promptVersion
    this.promptVersion = typeof version === 'string' ? version : undefined
  }

  id(): string {
    return this.promptVersion ? `listing-writer-agent-${this.promptVersion}` : 'listing-writer-agent'
  }

  async callApi(
    _prompt: string,
    context?: { vars?: Record<string, unknown> }
  ): Promise<ProviderResponse> {
    const caseData = context?.vars?.caseData as TestCase | undefined
    if (!caseData) {
      return { error: 'Missing context.vars.caseData' }
    }
    try {
      const promptTemplate =
        (context?.vars?.promptTemplate as string | undefined) ??
        (this.promptVersion ? readPromptTemplate(this.promptVersion) : undefined)
      // Synthesize AnalysisResult from the gold listing — this isolates the
      // ListingWriter from ImageAnalyzer variance, so the eval measures ONLY
      // ListingWriter quality. Image-grounded eval is out of scope for Phase 2.
      const analysis: AnalysisResult = {
        object: caseData.product,
        condition: caseData.metadata.condition,
        category: caseData.metadata.category,
        titleDraft: caseData.goldListing.de.title,
        descriptionDraft: caseData.goldListing.de.description,
      }
      const { output } = await runListingWriter({
        analysis,
        questions: [],
        ...(promptTemplate ? { promptOverride: promptTemplate } : {}),
      })
      return { output: JSON.stringify(output) }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  }
}
