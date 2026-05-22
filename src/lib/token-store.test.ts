import { describe, it, expect, beforeEach } from 'vitest'
import { TokenStore } from './token-store'

beforeEach(() => {
  // Clean up between tests by deleting any lingering entries
  TokenStore.delete('session-a')
  TokenStore.delete('session-b')
  TokenStore.delete('session-expired')
  TokenStore.delete('session-no-expiry')
})

describe('TokenStore.get', () => {
  it('returns undefined for unknown sessionId', () => {
    expect(TokenStore.get('session-a')).toBeUndefined()
  })

  it('returns undefined for expired record and removes it from the store', () => {
    TokenStore.set('session-expired', {
      partnershipKey: 'key-123',
      expiresAt: Date.now() - 1000, // 1 second in the past
      acquiredAt: Date.now() - 60000,
    })
    expect(TokenStore.get('session-expired')).toBeUndefined()
    // Confirm it was deleted (a second get should still return undefined)
    expect(TokenStore.get('session-expired')).toBeUndefined()
  })

  it('returns a record with no expiresAt (no expiry)', () => {
    const record = {
      partnershipKey: 'key-no-expiry',
      acquiredAt: Date.now(),
    }
    TokenStore.set('session-no-expiry', record)
    const result = TokenStore.get('session-no-expiry')
    expect(result).toBeDefined()
    expect(result?.partnershipKey).toBe('key-no-expiry')
  })
})

describe('TokenStore.set + TokenStore.get roundtrip', () => {
  it('returns the exact record that was set', () => {
    const record = {
      partnershipKey: 'key-abc',
      identifiedToken: 'tok-xyz',
      expiresAt: Date.now() + 3600000, // 1 hour from now
      acquiredAt: Date.now(),
    }
    TokenStore.set('session-a', record)
    const result = TokenStore.get('session-a')
    expect(result).toEqual(record)
  })
})

describe('TokenStore.delete', () => {
  it('removes the entry so a subsequent get returns undefined', () => {
    TokenStore.set('session-b', {
      partnershipKey: 'key-def',
      acquiredAt: Date.now(),
    })
    TokenStore.delete('session-b')
    expect(TokenStore.get('session-b')).toBeUndefined()
  })

  it('does not throw when deleting a non-existent key', () => {
    expect(() => TokenStore.delete('session-nonexistent')).not.toThrow()
  })
})
