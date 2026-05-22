export const MAX_ANSWER_LENGTH = 500

export function sanitizeUserAnswer(raw: string): string {
  const truncated = raw.slice(0, MAX_ANSWER_LENGTH)
  const clean = truncated.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  return clean
    .replace(/\bIgnore (previous|above|all) instructions?\b/gi, '[blocked]')
    .replace(/\bDu bist jetzt\b/gi, '[blocked]')
    .replace(/\bForget everything\b/gi, '[blocked]')
}
