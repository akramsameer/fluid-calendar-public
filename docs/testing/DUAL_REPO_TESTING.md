# Dual-Repo Verification Testing

Tracks build and test results for the open-core architecture across two test repos.

## Test Repositories

| Repo | URL | Purpose |
|------|-----|---------|
| **Private (SaaS)** | `git@github.com:akramsameer/fluid-calendar-saas-test.git` | Full repo with `saas/` — tests full SaaS build |
| **Public (OS)** | `git@github.com:akramsameer/fluid-calendar-test.git` | OS-only — no `saas/` directory, tests `build:os` |

## Commit & Push Workflow

This is the private repo (`fluid-calendar-saas`). The public repo (`fluid-calendar-test`) is an
OS-only mirror. All development happens here — never commit directly in the public repo.

### After every commit, push to both repos:

```bash
# 1. Commit your changes (as normal)
git add <files>
git commit -m "your message"

# 2. Push to both repos with the automated script
./scripts/push-dual.sh

# Or with options:
./scripts/push-dual.sh --branch staging   # target a specific branch on the public repo
./scripts/push-dual.sh --no-origin        # skip pushing to origin (if already pushed)
```

The script pushes to `origin` and `saas-test`, merges into the `os-only` worktree at
`/tmp/fluid-os-test`, and pushes to `os-test`. It includes safety checks:
- Verifies `saas/` is in the worktree's `.gitignore` before merging
- Checks no `saas/` files leaked into the merge
- Aborts cleanly on merge conflicts

### What happens to each type of change:

| Change type | Private repo | Public repo |
|-------------|-------------|-------------|
| Core code (`src/`) | Included | Included (via merge) |
| SaaS code (`saas/`) | Included | Excluded (`.gitignore`) |
| Prisma schema (`prisma/`) | Included | Included (merged schema is committed) |
| Config files (`.env.example`, `next.config.ts`, etc.) | Included | Included |

### Important notes:
- The `os-only` branch has `saas/` in `.gitignore`, so merging from `v2-beta` automatically
  skips SaaS files
- The public repo's `main` branch = the `os-only` branch
- Never commit directly in the public repo or the os-only worktree

## Setup

### Remotes (already configured)
```bash
git remote add saas-test git@github.com:akramsameer/fluid-calendar-saas-test.git
git remote add os-test git@github.com:akramsameer/fluid-calendar-test.git
```

### Branches
| Branch | Remote | Purpose |
|--------|--------|---------|
| `v2-beta` | `origin`, `saas-test` | Main dev branch (full codebase) |
| `os-only` | `os-test` (as `main`) | OS-only mirror (no `saas/`) |

### OS-Only Branch
The `os-only` branch was created from `v2-beta` with:
- `saas/` removed from git tracking (`git rm -r --cached saas/`)
- `saas/` uncommented in `.gitignore`
- `opensource.md` removed (contains documented secrets that trigger GitHub push protection)

### OS-Only Worktree
Located at `/tmp/fluid-os-test` for managing the os-only branch.

### SaaS Clone Setup Notes
The SaaS test clone does **NOT** need `setup-saas.ts` to be run. The old symlink-based setup
script conflicts with the new webpack-alias architecture. Instead:
1. `npm install` — install dependencies
2. `npx prisma generate` — generate Prisma client (schema already merged in v2-beta)
3. `npm run build` — builds using `@saas` webpack alias pointing to `saas/src/`

## Build Results

### Private SaaS Repo (`fluid-calendar-saas-test`)

| Check | Status | Notes |
|-------|--------|-------|
| `npm install` | ✅ Pass | |
| `npm run build` | ✅ Pass | Full SaaS build with all routes |
| `npm run type-check` | ✅ Pass | 0 errors |
| `npm run lint` | ✅ Pass | 0 warnings |

**Last tested**: 2026-03-02 (commit c8d9d98, branch v2-beta)

**Key routes rendered** (SaaS-specific):
- `/beta`, `/beta/join`, `/beta/status`, `/beta/verified`, `/beta/verify`
- `/pricing` (12.8 kB)
- `/bookings` (7.84 kB)
- `/book/book/[username]/[slug]`
- `/subscription/success`, `/subscription/lifetime/success`
- `/settings/waitlist` (37.9 kB)
- `/learn/learn`, `/learn/learn/[slug]`
- All admin API routes (`/api/admin/*`)
- All subscription/webhook API routes

### Public OS Repo (`fluid-calendar-test`)

| Check | Status | Notes |
|-------|--------|-------|
| `npm install` | ✅ Pass | |
| `npm run build:os` | ✅ Pass | OS-only build |
| `npm run type-check` | ✅ Pass | 0 errors |
| `npm run lint` | ✅ Pass | 0 warnings |

**Last tested**: 2026-03-02 (branch os-only)

**Key routes rendered** (OS stubs returning 404/defaults):
- `/calendar` (97.3 kB) — core, fully functional
- `/tasks` (53.4 kB) — core, fully functional
- `/focus` (10.9 kB) — core, fully functional
- `/settings` (27.7 kB) — core, fully functional
- `/pricing`, `/bookings`, `/book/*`, etc. — OS stubs (471 B each)

## Build Outputs

Build output logs are stored in `docs/testing/screenshots/`.

| File | Description |
|------|-------------|
| `saas-build-output.txt` | Full SaaS `npm run build` output |
| `os-build-output.txt` | OS-only `npm run build:os` output |
| `saas-typecheck-output.txt` | SaaS `tsc --noEmit` output |
| `os-typecheck-output.txt` | OS `tsc --noEmit` output |
| `saas-lint-output.txt` | SaaS `next lint` output |
| `os-lint-output.txt` | OS `next lint` output |

## Issues Found & Resolved

### 1. `setup-saas.ts` conflicts with alias architecture
**Problem**: Running `npx tsx scripts/setup-saas.ts` creates symlinks from `saas/app/` into `src/app/`,
pulling SaaS-only components (like `lifetime-offer.tsx`) into the `src/` tree. These files import
from `@saas/hooks/useSubscription`, which tsconfig resolves to OS stubs (`src/features/`), causing
type errors during `next build`'s type-checking phase.

**Root cause**: The old symlink-based setup script is incompatible with the new webpack-alias architecture.
Webpack's `NormalModuleReplacementPlugin` correctly resolves `@saas` to `saas/src/` at bundle time,
but TypeScript's type checker uses tsconfig paths which always point to `src/features/` (OS stubs).

**Fix**: Do NOT run `setup-saas.ts` in the SaaS clone. The alias-based architecture handles everything
via `next.config.ts` without any symlinks.

### 2. GitHub push protection on `opensource.md`
**Problem**: The `opensource.md` file contains a documented Azure AD secret (in a remediation checklist),
which triggers GitHub's push protection on the public test repo.

**Fix**: Removed `opensource.md` from the `os-only` branch using `git filter-branch` to rewrite history.

## Verification Checklist

- [x] Private repo: `npm run build` passes (SaaS landing page rendered)
- [x] Public repo: `npm run build:os` passes (OS landing page rendered)
- [x] Both repos: `type-check` passes with 0 errors
- [x] Both repos: `lint` passes with 0 warnings
- [x] MD file documents all results with build outputs
