# Private → Public Repo Sync

The `.github/workflows/push-to-public.yml` workflow publishes an anonymized
copy of this private repo to the public portfolio repo on every push to `main`.

## How it works

1. Checkout the private repo at the pushed commit
2. Build a `staging/` directory containing ONLY the allowlisted paths
3. Grep for `sk-ant-` and other credential patterns — abort if any match
4. Run `secretlint` against the staging tree
5. Clone the public repo using `PAT_PUBLIC_REPO`
6. rsync staging content into the public repo (preserving `.git/`)
7. Commit and push to `main` of the public repo

## Allowlist (what gets published)

| Path | Why it is public |
|------|------------------|
| `src/` | Application source — no secrets by audit (REPO-05) |
| `packages/` | Published @nilsseiter/ricardo-mcp portfolio artifact |
| `evals/` | Eval framework + results — portfolio piece |
| `docs/` | Architecture diagrams and eval reports |
| `public/` | Next.js static assets |
| `.husky/` | Pre-commit hook config |
| `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `eslint.config.mjs` | Build/test config |
| `.secretlintrc.json`, `.gitignore`, `.env.example` | Public-safe config |
| `README.md`, `AGENTS.md`, `CLAUDE.md` | Public-facing docs |

## Excluded by default (allowlist model)

Everything NOT listed above. Notable exclusions:

| Path | Why it stays private |
|------|---------------------|
| `.env.local` | Real Anthropic + Ricardo credentials |
| `sessions/` | User session data (UUIDs, photos analyzed) |
| `uploads/` | User-uploaded photos |
| `.planning/` | Private project planning + decision context |
| `.next/`, `node_modules/`, `.claude/` | Build artifacts and tool state |

## How to add a new path to the allowlist

1. Edit `.github/workflows/push-to-public.yml`
2. Add the new path under the `rsync -av --relative` block, e.g. `private/new-dir`
3. Update this doc's allowlist table with a rationale
4. Commit, push, watch the workflow run

Do NOT add paths casually. Every entry must have a documented rationale.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Workflow fails at "Verify no real credentials" | `sk-ant-` or real Ricardo key reached commit | Investigate `git log -S "sk-ant-"`; rotate the leaked key; `git filter-repo` if necessary |
| Workflow fails at "Push to public repo" with 403 | PAT expired or wrong scope | Regenerate fine-grained PAT per `docs/repo-setup.md`; update `PAT_PUBLIC_REPO` secret |
| Workflow fails with "PAT_PUBLIC_REPO secret is not configured" | Secret missing | Add it per `docs/repo-setup.md` step 3 |
| Public repo has unexpected files | Allowlist too broad | Tighten allowlist; force-push from a clean staging |
| Public repo missing expected files | Allowlist too narrow | Add path per "How to add" section above |

## Anti-patterns (do not do this)

- Do NOT switch to a blocklist model — a new file with personal data would leak silently
- Do NOT use a classic PAT with `repo` scope — use fine-grained PAT scoped to the public repo only
- Do NOT remove the `sk-ant-` grep step — it is the last safety net before push
- Do NOT `--exclude='.git/'` from the staging rsync — only from the final-into-public rsync

## Public repo

https://github.com/kronprinzmagma/ai-listing-assistant
