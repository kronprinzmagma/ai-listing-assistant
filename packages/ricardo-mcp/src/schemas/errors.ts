import { z } from 'zod'

export const TypedErrorSchema = z.object({
  code: z.enum([
    'INVALID_INPUT',
    'AUTH_REQUIRED',
    'AUTH_EXPIRED',
    'RATE_LIMITED',
    'NOT_FOUND',
    'API_UNAVAILABLE',
  ]),
  message: z.string(),
  retryHint: z.string(),
  retryable: z.boolean(),
})
export type TypedError = z.infer<typeof TypedErrorSchema>

function classifyError(error: unknown): TypedError['code'] {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (msg.includes('auth') || msg.includes('credential') || msg.includes('unauthorized')) {
    return 'AUTH_REQUIRED'
  }
  if (msg.includes('expired') || msg.includes('token')) return 'AUTH_EXPIRED'
  if (msg.includes('rate') || msg.includes('limit')) return 'RATE_LIMITED'
  if (msg.includes('not found') || msg.includes('404')) return 'NOT_FOUND'
  if (msg.includes('invalid') || msg.includes('validation')) return 'INVALID_INPUT'
  return 'API_UNAVAILABLE'
}

export interface CallToolResult {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: unknown
  isError?: boolean
}

export function makeTypedError(error: unknown, retryHint: string): CallToolResult {
  const typedError: TypedError = {
    code: classifyError(error),
    message: error instanceof Error ? error.message : String(error),
    retryHint,
    retryable: classifyError(error) !== 'INVALID_INPUT',
  }
  return {
    content: [{ type: 'text', text: `Error: ${typedError.message}. ${typedError.retryHint}` }],
    structuredContent: typedError,
    isError: true,
  }
}
