---
description: How to deploy updated workflows to fix the "Ghost of Hugging Face"
---

# Fixing Automated Workflows

The automated workflows were failing because GitHub Actions was still running the old configuration (pointing to `hf.space`) even though your local files might have been updated.

## 1. Verify Local Changes
I have automatically updated 3 critical files:
- `.github/workflows/enterprise-data-update.yml` (Renamed HF_API... to FINHUB_API...)
- `.github/workflows/production_watchdog.yml` (Confirmed URL)
- `backend-core/scripts/scrape_mubasher.py` (Fixed "headless" mode for server)

## 2. Deploy Workflows to GitHub
You MUST push these changes to GitHub for the Actions to pick up the new logic.

```bash
# Check status
git status

# Add workflow changes
git add .github/workflows/enterprise-data-update.yml
git add .github/workflows/production_watchdog.yml
git add backend-core/scripts/scrape_mubasher.py

# Commit
git commit -m "fix(workflows): update API URLs to Hetzner and fix headless scraper"

# Push to main
git push origin main
```

## 3. Deploy Backend Code (for Scraper Fix)
Since we modified `scrape_mubasher.py`, you must also deploy the backend code to Hetzner.

```bash
# Push triggers Coolify rebuild automatically (if configured)
# OR use your manual deploy script if preferred
git push origin main
```

## 4. Verify in GitHub Actions
1. Go to your GitHub Repository -> **Actions** tab.
2. Manually run **"Production Watchdog"** (Click "Run workflow").
3. Verify it shows Green ✅ and connects to `https://starta.46-224-223-172.sslip.io`.

## 5. Verify Scheduler
Reference the new internal scheduler status:
```bash
curl https://starta.46-224-223-172.sslip.io/api/v1/admin/debug/scheduler_jobs
```
