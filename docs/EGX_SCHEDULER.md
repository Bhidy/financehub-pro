# EGX Daily Data Scheduler — ⛔ RETIRED (historical reference only)

> **Status (2026-06-12): RETIRED.** This document describes a LOCAL-laptop cron
> job that never worked ("Operation not permitted" on every run) and points to
> a script path that no longer exists. It also contradicts START_HERE.md's
> cloud-only automation rule. The live schedules are: GitHub Actions
> (`.github/workflows/data_sync.yml` — yahoo reservoir 4h;
> `tv-egx-harvester.yml` — TV technicals/news/estimates/financials) and the
> backend APScheduler on Hetzner (prices). Do NOT install the cron below.
> Kept only as a record of the pre-cloud setup.

## Cron Job Setup

### Location
- **Script:** `/Users/home/Documents/startamarkets/scripts/egx_daily_update.sh`
- **Log Dir:** `/Users/home/Documents/startamarkets/logs/`

### Installation

Add to your crontab with `crontab -e`:

```bash
# EGX Daily Update - 5 AM Egypt Time (UTC+2 = 3 AM UTC)
0 3 * * * /Users/home/Documents/startamarkets/scripts/egx_daily_update.sh

# Alternative: 5 AM Cairo Time (during EET, winter)
# 0 3 * * * /Users/home/Documents/startamarkets/scripts/egx_daily_update.sh
```

### Manual Trigger

```bash
cd /Users/home/Documents/startamarkets
./scripts/egx_daily_update.sh
```

### Monitoring

```bash
# Watch logs in real-time
tail -f logs/egx_daily_$(date +%Y%m%d).log

# Check last run
ls -la logs/egx_daily_*.log | tail -5
```
