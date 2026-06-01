# Starta Markets — Security & Secret Management
*Verified 2026-06. Read before touching any secret or deploy script.*

---

## 1. Where every secret lives (3 places — keep in sync)

| Location | Holds | Notes |
|---|---|---|
| **Hetzner backend** `/opt/starta/.env` | `GROQ/CEREBRAS/MISTRAL/OPENAI/ANTHROPIC_API_KEY`, `DATABASE_URL`, `SECRET_KEY`, email/Stripe keys | the AI chatbot + API read these |
| **Vercel** project `finhub` env | `NEXT_PUBLIC_API_URL`, `DATABASE_URL`, `GOOGLE_CLIENT_ID/SECRET`, `NEXT_PUBLIC_WS_URL` | frontend + serverless routes |
| **Local** `frontend/.env*`, repo `.env` | dev copies | gitignored — never commit |

> `DATABASE_URL` is in **both** Hetzner and Vercel. Rotating the DB password means updating **both** or the app breaks.

**Never hardcode secrets in code** — the app correctly uses `os.getenv` / `process.env`. `.gitignore` blocks `.env*`, `*.exp`, `*.sql`, key dumps. Do not override it.

---

## 2. 🔴 Known exposure (2026-06) — ROTATE

The repo `Bhidy/financehub-pro` was **PUBLIC from Dec 2025**; secrets leaked via:
- `backend/.env` in the **initial commit** (git history): `DATABASE_URL`, `SECRET_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`.
- `GEMINI.md`: an `sk-…` key (now redacted in HEAD).
- `scripts/add_api_keys.exp` + **13+ other `scripts/*.exp`**: hardcode the **Hetzner SSH password** (`set password "…"`).

**Done:** repo set **PRIVATE**; `GEMINI.md` + `add_api_keys.exp` sanitized/quarantined; `.gitignore` hardened.

**Public for ~5 months = assume harvested by bots. Rotate all of these:**

### Zero-downtime rotation runbook
For each secret: **(1) mint new** (keep old alive) → **(2) update every place it lives** (§1) → **(3) restart the service** → **(4) verify it works** → **(5) only then revoke the old one.**

| Secret | Mint at | Update | Restart | Verify |
|---|---|---|---|---|
| `GROQ_API_KEY` | console.groq.com | Hetzner `/opt/starta/.env` | backend container | chatbot replies |
| `CEREBRAS_API_KEY` | cloud.cerebras.ai | Hetzner `.env` | backend | chatbot |
| `MISTRAL_API_KEY` | console.mistral.ai | Hetzner `.env` | backend | chatbot |
| `OPENAI_API_KEY` | platform.openai.com | Hetzner `.env` | backend | chatbot |
| `DATABASE_URL` (Supabase pwd) | Supabase → Database → reset password | Hetzner `.env` **+** Vercel env | backend + redeploy frontend | `/api/v1/market-summary` → 200 |
| `SECRET_KEY` (JWT) | random 32+ bytes | Hetzner `.env` | backend | login works *(logs users out)* |
| **Hetzner SSH password** | `passwd` on the VPS | your records (stop using `.exp`) | — | ssh in |

> AI keys are **only** on Hetzner (chatbot runs there), not Vercel. `verify after each` — I (or you) curl the endpoint before revoking the old key.

---

## 3. Follow-ups (recommended)
- **Purge git history** of the leaked secrets (`git filter-repo --path backend/.env --path scripts/add_api_keys.exp --invert-paths`, plus the `.exp` files) and force-push. Then old clones no longer carry them.
- **Retire the password-based `.exp` scripts** — switch deploys to **SSH keys** (no password in files). Quarantine `scripts/*.exp` once the password is rotated.
- **Keep the repo private.** No reason for a commercial product repo to be public.
- Vercel deployment URLs are protection-gated (401) — keep it that way.

---

## 4. Incident record
- 2026-06-01: public-repo secret exposure found and contained (repo → private, secrets removed from HEAD, governance added). Rotation pending (owner action). Full audit: `~/Documents/STARTAMARKETS_AUDIT_2026-06.md`.
