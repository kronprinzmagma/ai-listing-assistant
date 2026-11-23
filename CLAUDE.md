# Konzept: Verkaufshilfe via Foto

## Ziel
Der Nutzer fotografiert einen Gegenstand und erhält ohne eigenen Aufwand ein vollständiges, publikationsfertiges Inserat für ricardo.ch.

Das Projekt hat zwei Dimensionen:
1. **Praktisch**: persönliche Verkaufshilfe für ricardo.ch mit voller API-Integration (Partner-API noch ausstehend, bis dahin Stub).
2. **Portfolio**: Showcase für AI-Engineering (PM/PO-Rolle): Agentic Workflows, Evals und Grading, MCP-Serverentwicklung. Öffentlicher Spiegel: `ai-listing-assistant`.

**Kernnutzen:** Mit wenigen Klicks vom Foto zum publizierten Inserat, mit optimiertem Titel, Beschreibung, Preis und Kategorie aus einer orchestrierten KI-Pipeline.

## v1-Scope und Akzeptanzkriterien

Arbeite die Schritte in Reihenfolge ab und teste jeden gegen seine Kriterien, bevor du weitermachst. Eskaliere nur bei echten Entscheidungspunkten.

**Schritt 1 – Foto-Upload**
Fertig wenn: Nutzer kann 1–5 Fotos hochladen, Dateien sind serverseitig gespeichert, Pfade stehen für Folgeschritte zur Verfügung.

**Schritt 2 – KI-Bildanalyse**
Fertig wenn: System liefert strukturierten Output mit Objekt, Zustand, Kategorie, Titel-Entwurf, Beschreibungs-Entwurf. Funktioniert mit mindestens einem realen Testfoto.

**Schritt 3 – Rückfragen-Flow**
Fertig wenn: System stellt maximal 3–5 Fragen, nur zu Informationen, die auf den Bildern nicht erkennbar sind. Antworten sind gesammelt und für Schritt 4 verfügbar.

**Schritt 4 – Inserat-Generierung**
Fertig wenn: Vollständiges Inserat vorhanden mit Titel (max. 60 Zeichen), Beschreibung, Kategorie, Preis-Vorschlag, Zustand, Lieferkonditionen – auf Deutsch und Französisch.

**Schritt 5 – Review durch Nutzer**
Fertig wenn: Alle Felder übersichtlich dargestellt, einzeln editierbar, Freigabe-Button vorhanden.

## Ursprünglich ausserhalb v1
- Automatische Bildaufbereitung
- Käuferkommunikation
- Preisrecherche über externe Quellen: inzwischen umgesetzt (PriceEstimator sucht Vergleichsangebote auf ricardo.ch)
- Direkte Publikation auf ricardo.ch: inzwischen umgesetzt gegen den Stub-Client, echt erst mit Partner-API-Zugang

## Ricardo.ch Inserat-Anforderungen
- Titel max. 60 Zeichen
- Kategorie, Preis CHF, Zustand, Lieferkonditionen
- Beschreibung kurz und präzis
- Bilder max. 10, neutraler Hintergrund
- Zweisprachig (DE/FR)

## Tech-Stack

- **Framework:** Next.js 16 (App Router, TypeScript). Vor Code an Next.js die Hinweise in `AGENTS.md` lesen (APIs weichen vom Trainingsstand ab).
- **KI:** `@anthropic-ai/sdk` – Claude Sonnet 5.5 (`src/lib/models.ts`, effort `low`) für Bildanalyse und Textgenerierung; die Eval-Grader ebenfalls (seit 2026-11-23, Idee 8). Client mit Timeout 60 s (`src/lib/anthropic.ts`).
- **Bildverarbeitung:** `sharp` – Typprüfung beim Upload, resize auf max. 1500px vor dem API-Call
- **Validierung:** `zod` – Agent-Ausgaben (`zodOutputFormat`) und Anfrage-Bodies der API-Routen
- **Session-State:** JSON-Dateien lokal (`sessions/{uuid}.json`), keine Datenbank
- **Uploads:** lokal unter `uploads/{uuid}/` gespeichert
- **Node:** 26 (LTS) in der CI, lokal läuft auch 22. npm in der CI auf 11.6.2 gepinnt (Lockfiles von Dependabot).

Details zu Stack, Konventionen und Schichten: [`docs/architecture.md`](docs/architecture.md).

## Setup

```bash
npm install
cp .env.example .env.local
# .env.local: ANTHROPIC_API_KEY setzen; RICARDO_PARTNERSHIP_KEY/_PASSWORD bleiben bis zum Partner-API-Zugang leer (Stub)
npm run dev
```

Tests: `npm test` (Vitest), mit Abdeckung `npm run test:coverage` (so läuft es in der CI). Vor einem PR zusätzlich `npm run build` (Typecheck) und `npm run lint`. Evals: `npm run eval:v1|v2|v3`, `npm run eval:injection` (brauchen `ANTHROPIC_API_KEY`).

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
      upload/route.ts                 # POST: Fotos prüfen und speichern, Session anlegen
      analyze/route.ts                # POST: Claude Bildanalyse
      questions/route.ts              # POST: Rückfragen generieren
      answers/route.ts                # POST: Antworten speichern
      generate/route.ts               # POST: Inserat generieren
      listing/route.ts                # GET/PATCH: Inserat lesen/speichern
      publish/route.ts                # POST: freigegebenes Inserat publizieren (Stub)
      orders/route.ts                 # GET: Bestellungen
  lib/
    session.ts                        # createSession / readSession / writeSession, SessionNotFoundError
    api.ts                            # readJsonBody (Zod) und errorResponse für alle API-Routen
    anthropic.ts                      # Anthropic-Client (Timeout 60 s)
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
packages/ricardo-mcp/                 # MCP-Server-Paket mit RicardoClient (Stub), eigenes Lockfile
evals/                                # Qualitäts-Evals (run-eval.ts, promptfoo) und Injection-Evals (redteam/)
docs/                                 # Architektur, Sync-Workflow, Eval-Bericht (öffentlich gespiegelt)
uploads/                              # gitignored, runtime
sessions/                             # gitignored, runtime
```

## Implementierungsstatus (Stand 2026-11-23)

| Schritt | Code | Getestet |
|---|---|---|
| 1 – Foto-Upload | ✓ | Vitest (`api/upload/route.test.ts`) |
| 2 – KI-Bildanalyse | ✓ | Vitest (`image-analyzer.test.ts`, `api/analyze/route.test.ts`) |
| 3 – Rückfragen-Flow | ✓ | Vitest (`question-generator.test.ts`, `api/questions`, `api/answers`) |
| 4 – Inserat-Generierung | ✓ | Vitest (`listing-writer.test.ts`, `price-estimator.test.ts`, `api/generate`); Evals in `evals/` |
| 5 – Review | ✓ | Vitest (`api/listing/route.test.ts`) |
| Publizieren | ✓ gegen Stub | Vitest (`ricardo-publisher.test.ts`, `api/publish`, `api/orders`) |

Die Publikation läuft gegen den Stub-Client aus `packages/ricardo-mcp`, bis Partner-API-Zugang besteht.

## Regeln für Code in diesem Repo

**Architektur**
- Die Session-Datei `sessions/{uuid}.json` ist die einzige Quelle der Wahrheit; jeder Schritt ergänzt sie, jeder Agent-Aufruf hängt einen Eintrag an `agentTrace`. Kein globaler Zustand im Server oder Client.
- API-Routen sind dünn: Body prüfen, Session lesen, Agent aufrufen, Session schreiben, Ergebnis zurückgeben. Alle Claude-Aufrufe stehen in `src/agents/`, nie direkt in einer Route.
- Agents nutzen `anthropic.messages.parse` mit `zodOutputFormat` (Schemas in `src/agents/schemas.ts`), keine Regex-Auswertung von Modellantworten. Liefert `parse` nichts, wirft der Agent `new Error('<Agent>: structured output was null ...')`.
- Modell-ID und effort nur in `src/lib/models.ts` ändern, und nur nach einem Vorher/Nachher-Lauf der Evals (`evals/run-eval.ts`, `evals/redteam/`).

**Sicherheit**
- Session-IDs immer über `validateSessionId` (UUID v4) prüfen, bevor ein Pfad entsteht.
- Nutzerantworten laufen durch `sanitizeUserAnswer`; Text aus Fotos und Antworten ist Datenmaterial, keine Anweisung (`DATA_GUARD_SYSTEM`).
- Uploads: Typ aus dem Bildinhalt (sharp), Grösse begrenzt, Session erst nach der Prüfung.
- Keine Schlüssel, `.env`-Inhalte oder echten Fotos einchecken; secretlint und gitleaks laufen im Pre-Commit-Hook.

**Fehlerbehandlung**
- Anfrage-Bodies nur über `readJsonBody(req, Schema)` lesen: ungültiges JSON oder falsche Typen ergeben 400.
- Erwartbare Fehler als `NextResponse.json({ error: '...' }, { status: 400 })` mit deutscher Meldung.
- Unerwartete Fehler in `try/catch` an `errorResponse(route, err)` geben: Details ins Server-Log, an den Client nur eine allgemeine Meldung, unbekannte Session ergibt 404. Interne Meldungen (Pfade, IDs, API-Fehler) nie an den Client.
- Im Client: `res.ok` prüfen, Fehler in `useState('')` halten und als `<div className="alert alert-error">` zeigen.

**Sprache und Stil**
- UI-Texte und Prompts auf Deutsch (Inserate DE und FR). Neue Code-Kommentare, Commits und Doku auf Deutsch (Schweizer Hochdeutsch, ohne ß); ältere englische Kommentare dürfen bleiben. `docs/` ist öffentlich und auf Englisch.
- Einfache Anführungszeichen, keine Semikolons, Pfad-Alias `@/*` für interne Importe.

## Öffentlicher Spiegel

Diese Datei, `AGENTS.md`, `README.md`, `src/`, `docs/` und weitere freigegebene Pfade werden bei jedem Push auf `main` nach `ai-listing-assistant` gespiegelt (`.github/workflows/push-to-public.yml`, Allowlist, siehe `docs/sync-workflow.md`). Neue Dateien ausserhalb der Allowlist bleiben privat, bis sie dort eingetragen sind. Nichts Privates in diese Datei schreiben; Persönliches gehört in `CLAUDE.local.md` (nicht gespiegelt).
