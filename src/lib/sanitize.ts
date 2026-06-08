export const MAX_ANSWER_LENGTH = 500

// Blocklist is defense-in-depth only — primary defense is length truncation and prompt structure.
// Blocklists cannot reliably block all injection variants (homoglyphs, zero-width chars, etc.).
// Do not rely on this alone; it supplements strict length limits and prompt-level input isolation.
export function sanitizeUserAnswer(raw: string): string {
  const truncated = raw.slice(0, MAX_ANSWER_LENGTH)
  const clean = truncated.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  return clean
    .replace(/\bIgnore\s+(previous|above|all)\s+instructions?\b/gi, '[blocked]')
    .replace(/\bIGNORE\s+ALL\b/gi, '[blocked]')
    .replace(/\bDu\s+bist\s+jetzt\b/gi, '[blocked]')
    .replace(/\bVergiss\s+alle\s+Anweisungen\b/gi, '[blocked]')
    .replace(/\bOublie\s+(les\s+instructions|toutes\s+les\s+instructions)\b/gi, '[blocked]')
    .replace(/\bsystem\s+prompt\b/gi, '[blocked]')
    .replace(/\bForget\s+everything\b/gi, '[blocked]')
}
