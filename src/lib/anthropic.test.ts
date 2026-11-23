import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('anthropic-Client', () => {
  it('bricht einen haengenden Aufruf nach 60 s ab (statt SDK-Standard 10 min)', async () => {
    // Synthetischer Wert: der Test ruft die API nie auf.
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-schluessel')
    const { anthropic, ANTHROPIC_TIMEOUT_MS } = await import('./anthropic')
    expect(ANTHROPIC_TIMEOUT_MS).toBe(60_000)
    expect(anthropic.timeout).toBe(ANTHROPIC_TIMEOUT_MS)
  })
})
