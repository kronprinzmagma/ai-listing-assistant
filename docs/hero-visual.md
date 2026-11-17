# README visual provenance

Asset: [review-de-fr.png](review-de-fr.png)

Captured from public source commit `de678906a8b77150180e3f665e24c75e2841676f` on 2026-11-17. This is a staged demonstration with exclusively synthetic data, not evidence of a live AI run or measured model performance. The visible application/CLI content is based on existing code, not an invented interface.

## Method

The original ReviewPage React component and globals.css were bundled for an isolated Chromium capture. Next.js routing/Link were shimmed and fetch returned a fixed listing fixture. The left capture uses the German tab; the right capture was taken after clicking Français in the same component. Tab switching and field editing were checked. These are two views of one screen, not a new side-by-side application layout. The title, two-column arrangement and workflow annotation are editorial.

## Synthetic inputs and limits

Fictional unbranded blue metal desk lamp, used/good condition, CHF 25, collection in Musterstadt / Ville-Exemple. All German and French listing copy is hand-written synthetic fixture content; no photos, real seller information, live AI output or market valuation were used. The five-stage workflow is present in the source. This image focuses on stage 5 instead of compressing all five pages into unreadable thumbnails. No approval or publishing was performed. RicardoClient is a stub; partner API access is not implied.

## Source references

- [src/app/session/[sessionId]/review/page.tsx](../src/app/session/[sessionId]/review/page.tsx)
- [src/app/globals.css](../src/app/globals.css)
- [src/agents/listing-writer.ts](../src/agents/listing-writer.ts)
- [src/agents/ricardo-publisher.ts](../src/agents/ricardo-publisher.ts)
- [packages/ricardo-mcp/src/client.ts](../packages/ricardo-mcp/src/client.ts)

## Maintenance

The PNG is a static documentation asset; no production code or dependency was changed. Its outer framing was authored in HTML/CSS and captured with Chromium, without generative image synthesis. The demo label is embedded in the pixels as well as the README caption. Keep both when reusing it.

This change targets only this public mirror. The private-to-public synchronisation may replace README.md and may omit or remove public-only assets. Durable preservation would require a separately authorised change to the private sync source/allowlist; none was made here. Recheck the README and asset after future syncs.
