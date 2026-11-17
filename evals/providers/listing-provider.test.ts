import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const mockRunListingWriter = vi.hoisted(() => vi.fn())
vi.mock('../../src/agents/listing-writer', () => ({ runListingWriter: mockRunListingWriter }))

const CASE = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'evals/cases/01-iphone-14.json'), 'utf8'))
const readPrompt = (v: string) => fs.readFileSync(path.join(process.cwd(), 'evals/prompts', `listing-${v}.txt`), 'utf8')

beforeEach(() => {
  vi.clearAllMocks()
  mockRunListingWriter.mockResolvedValue({ output: { de: {}, fr: {} } })
})

describe('ListingProvider', () => {
  it('laedt die Prompt-Vorlage aus config.promptVersion (promptfoo-Weg)', async () => {
    const { default: ListingProvider } = await import('./listing-provider')
    const provider = new ListingProvider({ config: { promptVersion: 'v2' } })
    expect(provider.id()).toBe('listing-writer-agent-v2')
    await provider.callApi('', { vars: { caseData: CASE } })
    expect(mockRunListingWriter).toHaveBeenCalledWith(
      expect.objectContaining({ promptOverride: readPrompt('v2') }),
    )
  })

  it('vars.promptTemplate hat Vorrang (run-eval.ts-Weg)', async () => {
    const { default: ListingProvider } = await import('./listing-provider')
    const provider = new ListingProvider({ config: { promptVersion: 'v2' } })
    await provider.callApi('', { vars: { caseData: CASE, promptTemplate: 'EIGENE VORLAGE' } })
    expect(mockRunListingWriter).toHaveBeenCalledWith(
      expect.objectContaining({ promptOverride: 'EIGENE VORLAGE' }),
    )
  })

  it('ohne Version und Vorlage: eingebauter Prompt, Id wie bisher', async () => {
    const { default: ListingProvider } = await import('./listing-provider')
    const provider = new ListingProvider()
    expect(provider.id()).toBe('listing-writer-agent')
    await provider.callApi('', { vars: { caseData: CASE } })
    expect(mockRunListingWriter.mock.calls[0][0]).not.toHaveProperty('promptOverride')
  })

  it('unbekannte Version ergibt einen Fehler statt eines Aufrufs', async () => {
    const { default: ListingProvider } = await import('./listing-provider')
    const provider = new ListingProvider({ config: { promptVersion: 'v9' } })
    const result = await provider.callApi('', { vars: { caseData: CASE } })
    expect(result.error).toMatch(/v9/)
    expect(mockRunListingWriter).not.toHaveBeenCalled()
  })
})
