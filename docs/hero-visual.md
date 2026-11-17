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

The visual and this public README are maintained together in the working repository. The existing publish workflow already includes the complete docs directory in its allowlist and copies it to the public mirror. The source now contains both this provenance file and docs/review-de-fr.png, so subsequent syncs restore the intended image instead of replacing it with a different source version.

Update the source README and asset together. Keep the embedded synthetic-demo label and the caption explaining the mocked API responses. Existing privacy checks remain in place. Public-only edits can still be overwritten by design; make future visual changes in the working repository.

### Automatic publication guard

Before the public checkout is changed, the publish workflow runs six deterministic contract tests and validates the actual staged README, PNG signature and provenance file. A missing image, commented-out reference, invalid PNG or absent provenance stops the job with a non-zero exit code. The existing credential and secretlint checks still run afterwards. The guard and its tests are maintained in the working repository, outside the public source allowlist.
