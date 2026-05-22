# Eval Report

## Methodology

The eval framework uses an LLM-as-judge approach: Claude Sonnet 4.6 grades each generated listing field against a multi-criterion rubric, producing sub-scores, a normalized total (0.0–1.0), a rationale string, and a concrete improvement suggestion. Scores are deterministic for category (exact string match) and probabilistic for title and description. All grader prompts, rubrics, and result JSONs are committed to the repository.

| Grader | Rubric | File |
|--------|--------|------|
| Title grader | Specificity (0-3) + Length 40-60 chars (0-2) + Keywords (0-3) + No-clickbait (0-2) → normalized /10 | `evals/graders/title-grader.ts` |
| Description grader | Factual grounding (0-3) + Completeness (0-3) + Conciseness ≤400 chars (0-2) + Neutral tone (0-2) → normalized /10 | `evals/graders/description-grader.ts` |
| Category grader | Exact match (1.0) + parent-category match (0.5) + confidence field — no LLM call; deterministic string comparison | `evals/graders/category-grader.ts` |

## Test Cases

The `evals/cases/` directory contains 10 real-product test cases. Each case is a JSON file with:

- **Product photos** — references to `evals/cases/images/{case-id}/` (real item photos)
- **Synthesized `AnalysisResult`** — gold-standard image analysis output
- **User answers** — pre-supplied answers to the question-generation step (simulating a real session)
- **Gold-standard listing** — hand-authored DE/FR listing used as grader reference

The 10 cases cover a range of product categories: iPhone 14, IKEA Kallax shelf, Nintendo Switch, road bike, winter jacket, coffee machine, Lego Technic, headphones, book set, laptop. This spread tests the listing writer across price ranges, condition levels, and description complexity.

See [`../evals/`](../evals/) for the full directory structure and case schema definition.

## A/B Prompt Testing

Three prompt versions were tested against all 10 cases. Each run is fully committed — including runs with errors.

```bash
npm run eval:v1   # baseline prompt
npm run eval:v2   # improved: title length target, description max-400 limit
npm run eval:v3   # further improved: feature-keyword directive, 3-sentence formula
```

Results are written to `evals/results/` as timestamped JSON files. The `run-eval.ts` runner loads all 10 cases, calls the ListingWriter agent with each prompt version, applies all three graders, and writes the scored output.

Notably, the v3 run committed a JSON parse error on case `05-winterjacke` (EVAL-07 honest-notes requirement). The result file is not edited or cherry-picked — the error is visible in the committed JSON. The `evals/results/progression.md` score table documents the impact on aggregates (v3 scores are computed over 9/10 successful cases).

## Score Progression

Full v1→v2→v3 score table with per-metric deltas, grader complaints, and honest notes on regressions:

[`../evals/results/progression.md`](../evals/results/progression.md)

This file is the EVAL-08 deliverable: a committed, human-readable progression document showing that each prompt version was evaluated against fixed test cases, with changes explained by grader feedback.

## Why LLM-as-Judge

Rule-based metrics (character count, keyword presence) can verify format constraints but cannot assess whether a listing is _good_ — whether the title is specific enough to be found by a buyer searching for exactly this product, whether the description is factually grounded in the actual item condition, or whether the tone is appropriately neutral for a secondhand marketplace. LLM-as-judge combines these dimensions into a single score while producing a rationale string that explains _why_ a title was penalized. This rationale is what drives prompt iteration: each v2 and v3 change was motivated by specific grader complaints extracted from the v1 and v2 result JSONs. The audit trail — from grader rationale to prompt change to score delta — is fully committed and inspectable.

## Reproducing Results

1. `npm install` — install all dependencies including eval framework
2. `cp .env.example .env.local` and set `ANTHROPIC_API_KEY` in `.env.local`
3. `npm run eval:v3` — run the current best prompt against all 10 test cases
4. Inspect `evals/results/run-v3-*.json` for per-case scores and grader rationale, or compare against the committed run in `evals/results/` for a diff of any changes
