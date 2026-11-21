# Konzept: Verkaufshilfe via Foto

## Ziel
Der Nutzer fotografiert einen Gegenstand und erhält ohne eigenen Aufwand ein vollständiges, publikationsfertiges Inserat für ricardo.ch.

## v1-Scope mit Akzeptanzkriterien

**Schritt 1 – Foto-Upload**
Fertig wenn: Nutzer kann 1–5 Fotos hochladen, Dateien sind serverseitig gespeichert, Pfade stehen für Folgeschritte zur Verfügung.

**Schritt 2 – KI-Bildanalyse**
Fertig wenn: System liefert strukturierten Output mit Objekt, Zustand, Kategorie, Titel-Entwurf, Beschreibungs-Entwurf.

**Schritt 3 – Rückfragen-Flow**
Fertig wenn: System stellt maximal 3–5 Fragen – nur zu Informationen, die auf den Bildern nicht erkennbar sind. Antworten sind gesammelt und für Schritt 4 verfügbar.

**Schritt 4 – Inserat-Generierung**
Fertig wenn: Vollständiges Inserat vorhanden mit Titel (max. 60 Zeichen), Beschreibung, Kategorie, Preis-Vorschlag, Zustand, Lieferkonditionen – auf Deutsch und Französisch.

**Schritt 5 – Review durch Nutzer**
Fertig wenn: Alle Felder übersichtlich dargestellt, einzeln editierbar, Freigabe-Button vorhanden.

## Bewusst ausserhalb v1
- Automatische Bildaufbereitung
- Preisrecherche über externe Quellen
- Direkte Publikation auf ricardo.ch
- Käuferkommunikation

## Ricardo.ch Inserat-Anforderungen
- Titel max. 60 Zeichen
- Kategorie, Preis CHF, Zustand, Lieferkonditionen
- Beschreibung kurz und präzis
- Bilder max. 10, neutraler Hintergrund
- Zweisprachig (DE/FR)

## Tech-Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **KI:** `@anthropic-ai/sdk` – Claude Sonnet 5.5 (`src/lib/models.ts`, effort `low`) für Bildanalyse und Textgenerierung; die Eval-Grader bleiben vorerst auf Sonnet 4.6
- **Bildverarbeitung:** `sharp` – resize auf max. 1500px vor API-Call
- **Session-State:** JSON-Dateien lokal (`sessions/{uuid}.json`), kein Datenbank
- **Uploads:** lokal unter `uploads/{uuid}/` gespeichert

## Setup

```bash
npm install
cp .env.example .env.local
# .env.local: ANTHROPIC_API_KEY setzen; RICARDO_PARTNERSHIP_KEY/_PASSWORD bleiben bis zum Partner-API-Zugang leer (Stub)
npm run dev
```

Tests: `npm test` (Vitest). Evals: `npm run eval:v1|v2|v3`, `npm run eval:injection` (brauchen `ANTHROPIC_API_KEY`).

Öffne http://localhost:3000.

## Dateistruktur

```
src/
  app/
    page.tsx                          # Schritt 1: Upload
    session/[sessionId]/
      analyze/page.tsx                # Schritt 2: Bildanalyse
      questions/page.tsx              # Schritt 3: Rückfragen
      listing/page.tsx                # Schritt 4: Generierung
      review/page.tsx                 # Schritt 5: Review
      orders/page.tsx                 # Bestellungen (Stub-Daten)
    api/
      upload/route.ts                 # POST: Fotos speichern, Session anlegen
      analyze/route.ts                # POST: Claude Bildanalyse
      questions/route.ts              # POST: Rückfragen generieren
      answers/route.ts                # POST: Antworten speichern
      generate/route.ts               # POST: Inserat generieren
      listing/route.ts                # GET/PATCH: Inserat lesen/speichern
      publish/route.ts                # POST: freigegebenes Inserat publizieren (Stub)
      orders/route.ts                 # GET: Bestellungen
  lib/
    session.ts                        # createSession / readSession / writeSession
    anthropic.ts                      # Anthropic-Client
    sanitize.ts                       # Eingabe-Bereinigung gegen Prompt-Injection
    models.ts                         # Modell-ID, effort und DATA_GUARD_SYSTEM aller Agents
    categories.ts                     # feste Kategorienliste (23 Einträge)
    category-map.ts                   # Kategorie → Ricardo-Kategorie-ID (Platzhalter)
    token-store.ts                    # Partner-Token pro Session (im Speicher)
  agents/                             # Fünf typisierte, zustandslose Agents (input → { output, trace })
    image-analyzer.ts                 # ImageAnalyzer: Fotos → AnalysisResult
    question-generator.ts             # QuestionGenerator: Analyse → Rückfragen
    listing-writer.ts                 # ListingWriter: Analyse + Antworten → Inserat (DE + FR)
    price-estimator.ts                # PriceEstimator: Analyse → Preisschätzung (CHF)
    ricardo-publisher.ts              # RicardoPublisher: Inserat → RicardoClient aus packages/ricardo-mcp (Stub)
    schemas.ts                        # Zod-Schemas für alle Agent-Ein- und -Ausgaben
  types/
    session.ts                        # SessionState, AnalysisResult, Listing, ...
packages/ricardo-mcp/                 # MCP-Server-Paket mit RicardoClient (Stub)
evals/                                # Qualitäts-Evals (run-eval.ts, promptfoo) und Injection-Evals (redteam/)
uploads/                              # gitignored, runtime
sessions/                             # gitignored, runtime
```

## Implementierungsstatus (Stand 2026-11-21)

| Schritt | Code | Getestet |
|---|---|---|
| 1 – Foto-Upload | ✓ | kein Route-Test (`src/app/api/upload/`) |
| 2 – KI-Bildanalyse | ✓ | Vitest (`image-analyzer.test.ts`, `api/analyze/route.test.ts`) |
| 3 – Rückfragen-Flow | ✓ | Vitest (`question-generator.test.ts`, `api/questions`, `api/answers`) |
| 4 – Inserat-Generierung | ✓ | Vitest (`listing-writer.test.ts`, `price-estimator.test.ts`, `api/generate`); Evals in `evals/` |
| 5 – Review | ✓ | kein Route-Test (`src/app/api/listing/`) |
| Publizieren | ✓ gegen Stub | Vitest (`ricardo-publisher.test.ts`, `api/publish`, `api/orders`) |

Die Publikation läuft gegen den Stub-Client aus `packages/ricardo-mcp`, bis Partner-API-Zugang besteht.

## v1 – Akzeptanzkriterien für Claude Code

Arbeite die Schritte in Reihenfolge ab. Teste jeden Schritt gegen die Kriterien bevor du weitermachst. Entscheide Tech-Stack selbst. Eskaliere nur bei echten Entscheidungspunkten.

**Schritt 1 – Foto-Upload**
Fertig wenn: Nutzer kann 1–5 Fotos hochladen. Dateien sind serverseitig gespeichert. Pfade stehen für Folgeschritte zur Verfügung.

**Schritt 2 – KI-Bildanalyse**
Fertig wenn: System liefert strukturierten Output mit Objekt, Zustand, Kategorie, Titel-Entwurf, Beschreibungs-Entwurf. Funktioniert mit mindestens einem realen Testfoto.

**Schritt 3 – Rückfragen-Flow**
Fertig wenn: System stellt maximal 3–5 Fragen, nur zu Informationen die auf den Bildern nicht erkennbar sind. Antworten sind gesammelt und für Schritt 4 verfügbar.

**Schritt 4 – Inserat-Generierung**
Fertig wenn: Vollständiges Inserat mit Titel (max. 60 Zeichen), Beschreibung, Kategorie, Preis-Vorschlag, Zustand, Lieferkonditionen – auf Deutsch und Französisch.

**Schritt 5 – Review**
Fertig wenn: Alle Felder übersichtlich dargestellt, einzeln editierbar, Freigabe-Button vorhanden.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**AI Listing Assistant — Verkaufshilfe via Foto**

Ein KI-gestütztes Verkaufstool, das aus Produktfotos vollständige, zweisprachige (DE/FR) Ricardo.ch-Inserate generiert und diese direkt publiziert. Das Projekt hat zwei Dimensionen:

1. **Praktisch**: Persönliche Verkaufshilfe für Ricardo.ch mit voller API-Integration
2. **Portfolio**: Showcase für AI-Engineering-Kompetenz gegenüber Tech-Unternehmen (PM/PO-Rolle) — demonstriert Agentic Workflows, Evals & Grading, MCP-Serverentwicklung

**Core Value:** Ein Nutzer fotografiert einen Gegenstand und kann ihn mit wenigen Klicks auf Ricardo.ch publizieren — inklusive optimiertem Titel, Beschreibung, Preis und Kategorie, generiert durch eine orchestrierte AI-Pipeline.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 6.0 - All source code in `src/`
- TSX - React components in `src/app/**/*.tsx`
- None detected
## Runtime
- Node.js 26 (LTS) in CI; locally also runs on Node 22 (no `.nvmrc` pinning)
- npm
- Lockfile: `package-lock.json` (present)
## Frameworks
- Next.js 16.4.6 - Full-stack React framework, App Router (`src/app/`)
- React 19.3.1 - UI rendering
- React DOM 19.3.1 - DOM bindings
- Vitest 5.1.1 - Unit tests (`vitest.config.ts`: `src/**/*.test.ts`, `evals/**/*.test.ts`)
- promptfoo 0.125.1 - Quality and injection evals (`evals/promptfooconfig.yaml`, `evals/redteam/`)
- `next dev` - Development server
- `next build` - Production build
- `next start` - Production server
- ESLint 10 with `eslint-config-next` 16.4.6 - Linting (config: `eslint.config.mjs`)
- TypeScript compiler via `tsconfig.json` (`noEmit: true`, bundler module resolution)
## Key Dependencies
- `@anthropic-ai/sdk` ^1.9.0 - Claude AI client for image analysis and text generation (`src/lib/anthropic.ts`); model `claude-sonnet-5-5`, effort `low` (`src/lib/models.ts`)
- `zod` ^4.6.7 - Agent output schemas, enforced via `zodOutputFormat` (`src/agents/schemas.ts`)
- `sharp` ^0.35.5 - Server-side image resizing before API calls (`src/agents/image-analyzer.ts`)
- `uuid` ^14.0.3 - Session ID and question ID generation (`src/lib/session.ts`, `src/agents/question-generator.ts`)
- Node.js built-in `fs` and `path` - Local file storage for sessions and uploads (`src/lib/session.ts`)
## Configuration
- `.env.local` - Required for local development (present but not read)
- Key variable: `ANTHROPIC_API_KEY` — consumed by `src/lib/anthropic.ts` via `process.env.ANTHROPIC_API_KEY`
- `next.config.ts` - Minimal Next.js config, no custom options set
- `tsconfig.json` - Strict mode, path alias `@/*` → `./src/*`, target ES2017
- `@/*` resolves to `./src/*` — used throughout all source files
## Platform Requirements
- Node.js 26.x (CI), 22.x still works locally
- `ANTHROPIC_API_KEY` set in `.env.local`
- Local filesystem write access (for `uploads/` and `sessions/` directories)
- Single-server deployment assumed (session state is filesystem-based, not suitable for multi-instance)
- Local filesystem write access required at `uploads/{uuid}/` and `sessions/{uuid}.json`
- No containerization or deployment config detected
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Page components: `page.tsx` (Next.js App Router convention)
- API routes: `route.ts` (Next.js App Router convention)
- Library modules: camelCase (`session.ts`, `sanitize.ts`, `anthropic.ts`); Agent-Module unter `src/agents/` als kebab-case (`image-analyzer.ts`, `listing-writer.ts`)
- Type definitions: `session.ts` under `src/types/`
- Async functions: camelCase verbs (`runImageAnalyzer`, `runListingWriter`, `runQuestionGenerator`, `runPriceEstimator`, `runRicardoPublisher`, `createSession`, `readSession`, `writeSession`, `getUploadDir`)
- React components: PascalCase (`UploadPage`, `ReviewPage`, `QuestionsPage`, `ListingForm`)
- Event handlers: `handle` prefix (`handleSubmit`, `handleApprove`, `handleSave`, `handleChange`, `handleDrop`)
- camelCase throughout (`sessionId`, `photoPaths`, `uploadDir`, `answeredQA`, `jsonMatch`)
- Constants: SCREAMING_SNAKE_CASE for module-level (`SESSIONS_DIR`, `UPLOADS_DIR`, `CONDITIONS_DE`, `CONDITIONS_FR`)
- PascalCase interfaces (`SessionState`, `AnalysisResult`, `Question`, `Listing`, `ListingLocale`)
- Union types for constrained values: `type Condition = 'neu' | 'wie neu' | 'gut' | 'akzeptabel'`
- Locale types: `'de' | 'fr'` inline
## Code Style
- No Prettier config detected — formatting is editor-driven or implicit
- Single quotes for strings throughout
- No semicolons (no enforced rule, but semicolons are used where disambiguation needed)
- Trailing commas present in arrays and objects
- ESLint 10 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config: `eslint.config.mjs`
- Lint command: `npm run lint` (runs `eslint`)
- Inline disable comment used where needed: `// eslint-disable-next-line @next/next/no-img-element`
- Strict mode enabled (`"strict": true` in `tsconfig.json`)
- Target: ES2017
- No `any` types observed; explicit type assertions used (`as File[]`, `as AnalysisResult`, `as Listing`)
- Type-only imports not split from value imports (all via `import { ... }`)
## Import Organization
- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- Used consistently across all source files for internal imports
## Error Handling
- Errors returned as `NextResponse.json({ error: '...' }, { status: 400 })` for client errors
- No try/catch in API routes — uncaught exceptions propagate to Next.js error handler
- Session not found throws `new Error(\`Session ${id} not found\`)` from `src/lib/session.ts`
- `useState('')` for error string, displayed via `<div className="alert alert-error">`
- `.catch(() => setError('...')` on fetch chains for network failures
- Pattern: check `res.ok` after fetch, set error if false, return early
- Agents throw `new Error('<Agent>: structured output was null ...')` when `messages.parse` returns no parsed output
- No regex extraction of AI responses: agents use `anthropic.messages.parse` with `zodOutputFormat`
## Logging
- No console.log statements observed in production code
- Errors surface to the browser via React state (`setError`) or propagate as thrown exceptions
## Comments
- Inline-Kommentare sparsam, vorwiegend in den Agent-Modulen unter `src/agents/`
- No JSDoc/TSDoc annotations anywhere
- Comment style: English for code-level notes, German for prompts and UI text
- Not used
## Function Design
- Async lib functions return typed Promises (`Promise<AnalysisResult>`, `Promise<Question[]>`, `Promise<Listing>`)
- API routes return `NextResponse.json(...)` directly
- Void functions typed with `: void` return annotation (`writeSession`, `ensureDirs`)
## Module Design
- Named exports for lib utilities and agents (`export function createSession`, `export async function runImageAnalyzer`)
- Default exports for React page components (`export default function UploadPage`)
- Single named export for the Anthropic client (`export const anthropic`)
- Not used — all imports reference specific module paths directly
## React Patterns
- Marked with `'use client'` directive at top of file
- All page components with interactivity use `'use client'`
- Layout (`src/app/layout.tsx`) is a Server Component (no directive)
- Local `useState` hooks only — no global state manager
- Loading states use boolean `useState(false)` or `useState(true)` depending on initial fetch requirement
- Error state: `useState('')` string for error messages
- Client-side `fetch` in `useEffect` for initial data load (e.g., questions, listing)
- Inline async handlers for form submissions (`handleSubmit`, `handleApprove`, `handleSave`)
## Styling
- Stylesheet: `src/app/globals.css` (imported in layout)
- Class names: BEM-like kebab-case (`upload-zone`, `photo-grid`, `photo-thumb`, `field-group`, `btn btn-primary`, `alert alert-error`, `loading-box`)
- Inline `style` props used for one-off layout overrides (`style={{ width: '100%' }}`, `style={{ display: 'flex', gap: '0.75rem' }}`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
```
## Component Responsibilities
| Component | Responsibility | File |
|-----------|----------------|------|
| UploadPage | Drag-drop file selection, POST to /api/upload, redirect to session | `src/app/page.tsx` |
| AnalyzePage | Trigger AI analysis on mount, display results, navigate forward | `src/app/session/[sessionId]/analyze/page.tsx` |
| QuestionsPage | Trigger question generation, collect user answers, submit to /api/answers | `src/app/session/[sessionId]/questions/page.tsx` |
| ListingPage | Trigger listing generation on mount, navigate to review | `src/app/session/[sessionId]/listing/page.tsx` |
| ReviewPage | Load listing via GET, render editable form, PATCH on save/approve, publish | `src/app/session/[sessionId]/review/page.tsx` |
| OrdersPage | Show orders from GET /api/orders | `src/app/session/[sessionId]/orders/page.tsx` |
| upload route | Create session, write files to disk, return sessionId | `src/app/api/upload/route.ts` |
| analyze route | Read session, call runImageAnalyzer(), persist result | `src/app/api/analyze/route.ts` |
| questions route | Read session.analysis, call runQuestionGenerator(), persist | `src/app/api/questions/route.ts` |
| answers route | Merge answers into session.questions, persist | `src/app/api/answers/route.ts` |
| generate route | Read session, call runListingWriter() + runPriceEstimator() in parallel, persist | `src/app/api/generate/route.ts` |
| publish route | Read session, call runRicardoPublisher() (RicardoClient from `packages/ricardo-mcp`, stub); idempotency guard | `src/app/api/publish/route.ts` |
| orders route | Return orders from the RicardoClient (stub) | `src/app/api/orders/route.ts` |
| listing route | GET returns full session; PATCH updates listing and/or approved flag | `src/app/api/listing/route.ts` |
| session lib | createSession / readSession / writeSession / getUploadDir | `src/lib/session.ts` |
| anthropic lib | Singleton Anthropic client configured from env | `src/lib/anthropic.ts` |
| ImageAnalyzer agent | Resize photos with sharp, send to Claude, parse AnalysisResult | `src/agents/image-analyzer.ts` |
| QuestionGenerator agent | Send AnalysisResult to Claude, parse Question[] | `src/agents/question-generator.ts` |
| ListingWriter agent | Send AnalysisResult + answered questions to Claude, parse RicardoListing (DE + FR) | `src/agents/listing-writer.ts` |
| PriceEstimator agent | Look up comparable ricardo.ch offers via Claude web search, read link and price in code, let Claude pick matches; fallback: model-only PriceEstimate (CHF, `source: 'modell'`) | `src/agents/price-estimator.ts` |
| RicardoPublisher agent | Upload images and create the listing via the RicardoClient from `packages/ricardo-mcp` (stub until partner API access) | `src/agents/ricardo-publisher.ts` |
| SessionState | Authoritative session shape, all step outputs nested inside | `src/types/session.ts` |
## Pattern Overview
- Session state is the single source of truth: `sessions/{uuid}.json` accumulates all step outputs
- Each wizard step is a separate Next.js route under `src/app/session/[sessionId]/`
- API routes are thin orchestrators: read session, call lib function, write session, return result
- All AI calls are in `src/agents/` functions, not inline in routes
- No React context, no global state manager — sessionId flows via URL params
## Layers
- Purpose: Render wizard steps, collect user input, call API routes via fetch
- Location: `src/app/page.tsx` and `src/app/session/[sessionId]/*/page.tsx`
- Contains: React components marked `'use client'`, local useState hooks
- Depends on: API routes (HTTP), `src/types/session.ts` (type imports only)
- Used by: End users via browser
- Purpose: Thin HTTP handlers, session read/write orchestration
- Location: `src/app/api/*/route.ts`
- Contains: Next.js `POST`/`GET`/`PATCH` handlers
- Depends on: `src/lib/session.ts`, lib domain functions
- Used by: UI layer via fetch
- Purpose: Business logic — AI prompt building, image processing, response parsing
- Location: `src/agents/image-analyzer.ts`, `src/agents/question-generator.ts`, `src/agents/listing-writer.ts`, `src/agents/price-estimator.ts`, `src/agents/ricardo-publisher.ts`
- Contains: Async functions returning typed results
- Depends on: `src/lib/anthropic.ts`, `src/types/session.ts`, `sharp`
- Used by: API routes
- Purpose: Persist and retrieve all session state as JSON files
- Location: `src/lib/session.ts`
- Contains: `createSession`, `readSession`, `writeSession`, `getUploadDir`
- Depends on: Node.js `fs`, `path`, `uuid`
- Used by: API routes and upload route
- Purpose: Single shared type definitions for all session data
- Location: `src/types/session.ts`
- Contains: `SessionState`, `AnalysisResult`, `Question`, `Listing`, `ListingLocale`, `Condition`
- Depends on: Nothing
- Used by: All layers
## Data Flow
### Primary Request Path (Happy Path)
### Session State Accumulation
- After upload: `{ id, createdAt, photoPaths }`
- After analyze: `+ analysis`
- After questions: `+ questions`
- After answers: `questions[].answer` populated
- After generate: `+ listing`, `+ priceEstimate`
- After approve: `+ approved: true`
- After publish: `+ publishedListingId`, `+ publishedUrl`
- Every agent call appends to `agentTrace`
- All state lives in `sessions/{uuid}.json` on disk
- No in-memory server state, no database, no cookies
- Client components hold transient UI state only (useState)
## Key Abstractions
- Purpose: The single accumulating record for a user session across all wizard steps
- Examples: `src/types/session.ts` (definition), `src/lib/session.ts` (persistence)
- Pattern: Passed by ID through URL; read/write by each API route
- Purpose: Encapsulate all Claude API calls, prompt strings, and JSON parsing
- Examples: `src/agents/image-analyzer.ts`, `src/agents/question-generator.ts`, `src/agents/listing-writer.ts`, `src/agents/price-estimator.ts`
- Pattern: Each function takes typed inputs, calls `anthropic.messages.parse` with `zodOutputFormat` (PriceEstimator additionally `messages.create` with the web search tool), returns `{ output, trace }`
## Entry Points
- Location: `src/app/page.tsx`
- Triggers: User navigating to `/`
- Responsibilities: File selection UI, POST to /api/upload, redirect to session
- Location: `src/app/layout.tsx`
- Triggers: Every page render
- Responsibilities: HTML shell, metadata, global CSS import
## Architectural Constraints
- **Threading:** Node.js single-threaded event loop; `sharp` and `fs` calls are async-safe
- **Global state:** `anthropic` singleton in `src/lib/anthropic.ts` is module-level; `sessions/` and `uploads/` directories are process-local filesystem paths from `process.cwd()`
- **Circular imports:** None detected
- **Session isolation:** Each session is isolated by UUID; no cross-session references
- **No server-side navigation guard:** Pages do not check if prior steps are complete before triggering their API call — if a user visits `/session/{uuid}/review` directly without completing prior steps, the API returns the current session state (which may have no listing)
## Anti-Patterns
### Pages trigger side-effectful API calls on every mount
## Error Handling
- API routes check for required session fields before calling lib functions (e.g., `if (!session.analysis) return 400`)
- Client pages catch fetch errors with `.catch()` and set local `error` state for display
- No global error boundary; errors are shown inline per page
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
