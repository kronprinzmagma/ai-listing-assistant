# Prompt Version Progression — Phase 2 Eval Framework

Metrics derived from committed run JSONs. All 10 test cases run per version.
Category exact match uses the deterministic grader (no LLM call).

| Metric | v1 (baseline) | v2 | v3 |
|--------|--------------|-----|-----|
| Title avg score | 0.94 | 0.93 | 0.93 (9 cases) |
| Description avg | 0.94 | 0.97 | 0.97 (9 cases) |
| Category exact match | 100% | 100% | 100% |
| Cases with error | 0 | 0 | 1 (05-winterjacke) |

Run files:
- v1: `run-v1-2026-05-21T12-17-12-235Z.json`
- v2: `run-v2-2026-05-21T12-20-50-028Z.json`
- v3: `run-v3-2026-05-21T12-24-06-841Z.json`

---

## Key Changes

### v1 → v2

**Top v1 grader complaints (from rationale fields):**
- Titles too short: cases 03 (36 chars), 06 (38 chars), 08 (35 chars) — "liegt knapp unter dem optimalen Bereich von 40-60 Zeichen"
- Descriptions too long: cases 02 (~570 chars), 04 (~480 chars), 10 (~550 chars) — "etwas länger als nötig"
- Werbliche Formulierungen in descriptions: case 03 "hochwertigen OLED-Display", "tadellosen Zustand" flagged
- Missing Versand info: case 08 — "Versandhinweis fehlt"

**v2 additions:**
- Title: `genau 40–55 Zeichen, MUSS Marke + Modell + Zustand enthalten`
- Title: Added anti-werbejargon rule + `[Marke] [Modell] [Detail] – [Zustand]` format
- Description: Added explicit `maximal 400 Zeichen` limit
- Description: Added sachlich-ohne-Werbefloskeln directive
- Description: Structured sequence: Zustand → Zubehör → Versand
- Versand: Made obligatory with example format

**Score delta:** title -0.01 (0.94→0.93), desc +0.03 (0.94→0.97), cat 0%

Description improvement is the headline win — the max-400-char limit resolved the over-long description issue across 4 cases.

---

### v2 → v3

**Top v2 grader complaints (from rationale fields):**
- Titles still too short in persistent cases: 08 (35 chars) — "es fehlen Keywords wie 'Noise Cancelling' oder 'Bluetooth'"
- 03 still 36 chars — missing a discriminating feature keyword
- Grader flagged `– gut` / `– akzeptabel` in titles as "leicht werblich/subjektiv" (cases 06, 07, 10)
- Description for case 08: "Sony WH-1000XM4 und ANC-Feature fehlen in der Beschreibung"

**v3 additions:**
- Feature-Keyword directive: "pick the most important technical detail (Noise Cancelling, 128GB, OLED, Carbon)"
- Concrete char-count examples: "Sony WH-1000XM4 Noise Cancelling – wie neu" (43 chars), Nintendo Switch example shows the gap
- Explicit 3-sentence description formula with dedicated Versand sentence format
- Anti-jargon list extended: no "toll", "super", "hochwertig"

**Score delta:** title +0.003 (0.930→0.933), desc -0.003 (0.970→0.967), cat 0%

Net: marginal improvement, within noise. See Honest Notes below.

---

## Honest Notes (EVAL-07)

### Case 05-winterjacke: JSON Parse Error in v3

Case 05 errored with `Failed to parse structured output: Error: Failed to parse structured output as JSON: Unterminated string in JSON at position 522`. This is a listing-writer issue (truncated JSON output), not a prompt issue. The v3 prompt is more verbose (adds structured examples), which may push total token count near the model's output limit for this case.

**Impact on aggregates:** v3 aggregates are computed over 9/10 successful cases only, not 10. The title avg (0.933) and desc avg (0.967) are therefore slightly inflated compared to v2's 10/10 numbers. A fair comparison would count case 05 as 0/0/0 in v3, which would lower title to 0.84 and desc to 0.87.

**This is not cherry-picked.** The raw JSON is committed and the error is visible in the result file.

### Case 04-rennrad: Title Regression in v3

Case 04 title regressed from 1.0 (v2) to 0.8 (v3). The feature-keyword directive caused the model to emphasise "Shimano 105" over the product category keyword "Rennrad" — which is what the grader expects for searchability. This is a genuine prompt regression: the Feature-Keyword directive gave the model a locally optimal but globally suboptimal signal.

### v3 Title Aggregate Is Not a Clear Win

v3 title avg (0.933) vs v2 (0.930) is a difference of +0.003 — within run-to-run noise. The case 08 improvement (0.8→1.0) was offset by the case 04 regression (1.0→0.8) and the case 05 error (0→error). A v4 prompt would need to fix the error case first before the progression is meaningful again.

### Category Grader: Perfect Across All Versions

100% category exact match across v1/v2/v3 is expected — the synthesized AnalysisResult passes the gold category directly through, and the listing writer consistently respects it. This metric would become more meaningful if real ImageAnalyzer output were used instead of synthesized analysis.

### Root Causes and Future Directions

1. **JSON truncation (05-winterjacke v3):** The fix is to add `max_tokens` headroom in the listing writer or reduce prompt verbosity. The verbose v3 examples may be pushing total output near the model limit.
2. **Title length calibration:** The 40–55 char window is hard to hit reliably. A v4 could use a 2-step: generate title, then count and pad/trim.
3. **Condition in title as "werblich":** The grader inconsistently flags condition words (like "gut", "akzeptabel") as slightly werblich even when the schema calls for them. This suggests the title grader rubric itself may need refinement.
