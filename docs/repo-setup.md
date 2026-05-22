# Phase 5 — One-Time Repo Setup

These steps require a human with GitHub account access. Claude cannot perform them.
Complete them once before the sync workflow (Plan 05-03) can run.

## 1. Create the Public Portfolio Repo

Recommended name: `ai-listing-assistant` (portfolio clarity)
Owner: `kronprinzmagma`
Visibility: Public
Initialize with: empty (no README, no .gitignore — the sync will overwrite)

Steps:
1. Open https://github.com/new
2. Owner: kronprinzmagma
3. Repository name: ai-listing-assistant
4. Description: "AI-powered Ricardo.ch listing assistant — agentic workflow, evals, MCP server"
5. Public
6. Do NOT initialize with README, .gitignore, or license
7. Click "Create repository"

## 2. Create a Fine-Grained Personal Access Token

Purpose: Allow the GitHub Actions workflow running in the PRIVATE repo to push to the PUBLIC repo.

Steps:
1. Open https://github.com/settings/personal-access-tokens/new
2. Token name: `verkaufshilfe-public-repo-sync`
3. Expiration: 90 days (rotate quarterly)
4. Resource owner: kronprinzmagma
5. Repository access: "Only select repositories" → choose `kronprinzmagma/ai-listing-assistant` ONLY
6. Permissions → Repository permissions:
   - Contents: Read and write
   - Metadata: Read-only (auto-selected)
   - Leave all others as "No access"
7. Generate token — copy the value, you will not see it again

## 3. Register the PAT as a Secret in the Private Repo

Steps:
1. Open https://github.com/kronprinzmagma/verkaufshilfe-via-foto/settings/secrets/actions
   (Adjust private repo name if different)
2. New repository secret
3. Name: `PAT_PUBLIC_REPO`
4. Value: paste the PAT from step 2
5. Add secret

## 4. Confirm Branch Configuration

The sync workflow triggers on push to `main`. Confirm:
- Private repo default branch is `main` (not `master`)
- Public repo default branch will be `main` (the first push from the workflow sets this)

## Verification Checklist

Before running Plan 05-03:

- [ ] Public repo `kronprinzmagma/ai-listing-assistant` exists and is empty
- [ ] Fine-grained PAT created, scoped to the public repo only
- [ ] `PAT_PUBLIC_REPO` secret exists in the private repo's Actions secrets
- [ ] PAT has Contents: read+write
- [ ] PAT expiration noted in calendar for rotation

## Calendar Reminder

Token expiry: <fill in 90 days from creation date>
Action on expiry: regenerate the PAT and update the `PAT_PUBLIC_REPO` secret.
