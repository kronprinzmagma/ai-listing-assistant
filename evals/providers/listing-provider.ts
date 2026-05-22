import type { ApiProvider, ProviderResponse } from 'promptfoo'
import { runListingWriter } from '../../src/agents/listing-writer'
import type { AnalysisResult } from '../../src/agents/schemas'
import type { TestCase } from '../cases/case-schema'

export default class ListingProvider implements ApiProvider {
  id(): string {
    return 'listing-writer-agent'
  }

  async callApi(
    _prompt: string,
    context?: { vars?: Record<string, unknown> }
  ): Promise<ProviderResponse> {
    const caseData = context?.vars?.caseData as TestCase | undefined
    if (!caseData) {
      return { error: 'Missing context.vars.caseData' }
    }
    const promptTemplate = context?.vars?.promptTemplate as string | undefined
    try {
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
