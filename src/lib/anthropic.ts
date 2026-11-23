import Anthropic from '@anthropic-ai/sdk'

// Obergrenze je Versuch. Der SDK-Standard (10 min) liess eine Anfrage bei einer
// haengenden Verbindung minutenlang offen; die Agents laufen mit effort 'low' und
// brauchen deutlich weniger. Das SDK wiederholt einen Timeout bis zu zweimal.
export const ANTHROPIC_TIMEOUT_MS = 60_000

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: ANTHROPIC_TIMEOUT_MS,
})
