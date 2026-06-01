# 2026-06 Restructure & Cleanup — Changelog

What changed in the June 2026 cleanup, so future readers/agents understand the current state and don't hunt for moved files.

## Identity / naming
- The project folder was renamed `mubasher-deep-extract/` → **`startamarkets/`** and moved out of the old `Info Site/` container to `~/Documents/startamarkets/`.
- Confirmed: **Starta Markets = FinanceHub Pro = Vercel project `finhub` = startamarkets.com** — one product, three names. "Mubasher" is an external *data source*, not the brand.

## Online / Vercel
- **Deleted 5 duplicate Vercel projects** that each served a full public clone of the app: `finhub-pro`, `mubasher-deep-extract`, `starta-fix`, `startamarkets`, `frontend`. Only **`finhub`** remains.
- **Removed the `finhub-pro.vercel.app` alias** (was pointing at a 156-day-old deploy) → now 404.
- Added **canonical-host redirect** (`frontend/middleware.ts`): any `*.vercel.app` → 308 → `startamarkets.com`.
- Added **`/admin` → `/admin/analytics`** redirect (bare `/admin` previously 404'd).

## Security
- Repo `Bhidy/financehub-pro` set **PRIVATE** (was public since Dec 2025).
- Secret-bearing files removed from HEAD: `add_api_keys.exp`; `GEMINI.md` restored **sanitized** (keys redacted — it's still the source of the chatbot "PROTECTED 4-Layer Response" rules and the deploy-script root sentinel).
- `.gitignore` hardened (`.env*`, `*.exp`, `*.sql`, `.agent/`, `.shared/`, `__pycache__`, debug dumps).
- ⚠️ Exposed secrets must be **rotated** — see `docs/SECURITY.md`.

## Repo hygiene (tracked files 4,892 → ~1,700)
Moved to `~/Documents/_Info-Site-QUARANTINE/` (nothing deleted):
- `.agent/` (2,012 files) + `.shared/` (agent tooling), `backend_archive_legacy/`, `external-tools/`, `db_export/`, `system_backup_*`, `testsprite_tests/`, `scratch/`, `Issues/`, planning-doc folders, 269 `__pycache__` entries, and ~200 root + backend-core-root debug/scratch/dump files.

## Fixes
- `Dockerfile`: disabled `COPY backend-core/engine` (engine not in repo; dev-only, guarded; prod uses GitHub Actions) — a fresh build previously failed here.
- Restored `GEMINI.md` to fix the deploy-script root-sentinel check it had broken.

## Docs (new canonical set)
- `START_HERE.md` (orientation + governance), `README.md` (rewritten), `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, this changelog. Old `SYSTEM_ARCHITECTURE_ANALYSIS.md` superseded → archived.

## Still open (owner actions)
1. Rotate exposed secrets (`docs/SECURITY.md`).
2. Delete the stale `deploy-backend.yml` (Railway) workflow.
3. `npm audit fix` in `frontend/` (43 vulns) after committing in-flight mobile work.
4. Purge secrets from git history + force-push.
