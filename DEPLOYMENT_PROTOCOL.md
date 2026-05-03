# FinanceHub Pro - Smart Deployment Protocol

> **Status:** STANDARD (Mandatory for all routine updates)
> **Version:** 2.0 (Successor to "Nuclear Deployment")
> **Last Updated:** 2026-02-12

---

## 1. The Strategy: "Smart Deployment"

### Why we switched from Nuclear
The legacy "Nuclear" strategy (destroying all containers, pruning images, and rebuilding from scratch) was reliable but **too slow** (15-20 minutes) for iterative improvements.

The "Smart Deployment" strategy uses Docker's layer caching and specific service targeting to achieve **< 45 second deployment times** for code-only changes.

### Core Mechanics
1.  **Git Sync:** Pushes local changes to GitHub `main`.
2.  **Remote Pull:** SSHs into the server and pulls the latest commit.
3.  **Targeted Build:** Builds *only* changed layers (e.g., Python code), reusing heavy dependency layers (PyTorch, Pandas).
4.  **Rolling Update:** Recreates only the modified service container without downtime for the database or other unchanged services.

---

## 2. The Protocol

### A. Pre-Deployment Checks
Before running the script, ensure:
1.  **Local tests pass**: Do not deploy broken code.
2.  **Git is clean**: You must commit your changes first. The script relies on `git push`.
3.  **SSH Access**: You must have `StartaProd2026!` ready.

### B. Execution Command
Always run this wrapper script from the project root:

```bash
./scripts/deploy_smart.sh
```

### C. What the Script Does (Automated)
```bash
# 1. Pushes to GitHub
git push origin main

# 2. Connects to Remote Server (46.224.223.172)
ssh root@...

# 3. Pulls Change
git pull origin main

# 4. Smart Build (Uses Cache)
docker compose build backend

# 5. Targeted Restart
docker compose up -d --no-deps backend
```

---

## 3. Fallback: The "Nuclear" Option

**Use ONLY if:**
*   Smart deployment fails repeatedly.
*   You made changes to `Dockerfile` base images.
*   Disk space is critically low (needs aggressive pruning).
*   You are upgrading major database versions.

**Nuclear Command:**
```bash
./scripts/deploy_production.sh backend nuclear
```

---

## 4. Verification

After any deployment, you **MUST** run the verification script to confirm the new code is live and working.

```bash
python3 scripts/verify_live_7layer.py
```

*   **Success**: Returns HTTP 200 and a JSON response with `structured_narrative`.
*   **Failure**: HTTP 500/502. Check logs immediately.

### 5. Troubleshooting

**If Verification Fails:**

1.  **Check Logs:**
    ```bash
    ssh root@46.224.223.172 "docker logs starta-backend-1 --tail 100"
    ```
    *   Look for `SyntaxError` or `NameError` (Python validation).
    *   Look for `ModuleNotFoundError` (Missing imports).

2.  **Common Fixes:**
    *   **Syntax/Name Errors**: Fix locally -> Commit -> Run `deploy_smart.sh` again.
    *   **Database Schema Drift**: You may need to run `apply_schema.py` manually if migration failed.

---

## 6. Multi-Domain Rules

**CRITICAL RULE:** Do NOT hardcode `startamarkets.com` URLs (e.g., `https://starta.46-224-223-172.sslip.io`) inside the `finhub-pro.vercel.app` codebase.
`finhub-pro` is a completely separate site/domain from `startamarkets.com`. It relies on the `NEXT_PUBLIC_API_URL` environment variable for routing all API requests (e.g., in `/app/api/v1/...` routes). 
Hardcoding the other domain's backend can lead to cross-site issues or intermittent production breakages. Future AI modifications MUST respect this domain independence.

---

**Signed,**
**Chief Technical Expert**
**FinanceHub Pro**

