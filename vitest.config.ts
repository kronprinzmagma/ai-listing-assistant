import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'evals/**/*.test.ts'],
    // Greift nur mit `npm run test:coverage` (vitest --coverage); `npm test` bleibt unveraendert.
    // Ohne Mindestwert: die Zahl zeigt, welche Pfade kein Test beruehrt (repo-cockpit C6).
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text-summary', 'text'],
    },
  },
})
