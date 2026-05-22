export interface TokenRecord {
  partnershipKey: string
  identifiedToken?: string
  expiresAt?: number      // unix ms timestamp; undefined = no expiry
  acquiredAt: number
}

const store = new Map<string, TokenRecord>()

export const TokenStore = {
  get(sessionId: string): TokenRecord | undefined {
    const record = store.get(sessionId)
    if (!record) return undefined
    if (record.expiresAt !== undefined && Date.now() > record.expiresAt) {
      store.delete(sessionId)
      return undefined
    }
    return record
  },
  set(sessionId: string, record: TokenRecord): void {
    store.set(sessionId, record)
  },
  delete(sessionId: string): void {
    store.delete(sessionId)
  },
}
