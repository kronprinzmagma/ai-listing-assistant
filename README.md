# Verkaufshilfe via Foto

Foto hochladen → KI analysiert → Inserat für ricardo.ch auf Deutsch und Französisch.

## Setup

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

## Ablauf

1. **Foto-Upload** — 1–5 Fotos hochladen
2. **KI-Analyse** — Objekt, Zustand, Kategorie werden erkannt
3. **Rückfragen** — 3–5 Fragen zu nicht erkennbaren Informationen
4. **Inserat-Generierung** — vollständiges DE/FR-Inserat
5. **Review** — alle Felder editierbar, Freigabe-Button
