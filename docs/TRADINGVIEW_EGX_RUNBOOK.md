# TradingView EGX Data Feed — Operator Runbook

Implementation of `TRADINGVIEW_EGX_NUCLEAR_DATA_FEED_PLAN.md`. This runbook covers
what was built, how to validate it, and the exact gated steps to promote it to
primary. **Nothing here deploys automatically.**

## What was built (new files only — no existing files changed except one gated edit)

| File | Purpose |
| :--- | :--- |
| `backend-core/data_pipeline/tradingview_client.py` | TradingView client: prices, technicals, statements, dividends, estimates, news, identity/logos. Validation + NaN-safe + FeedDegraded. |
| `backend-core/data_pipeline/egx_feed_router.py` | `EGXFeedRouter` (TV→yfinance) + `ChartBarRouter`. Never-single-source invariant. |
| `backend-core/migrations/0001_tradingview_egx.sql` | Additive, idempotent DDL: dedup UNIQUE keys, `symbol_map`, `egx_technicals/estimates/news`, deadletter, `source` columns. |
| `scripts/tv_egx_harvester.py` | Idempotent harvester (prices/technicals/estimates/news/symbolmap). |
| `scripts/tv_shadow_diff.py` | Read-only TV-vs-DB price diff (Phase-1 gate). |
| `qa/egx_audit.py` | Phase-7 audit: data-quality + chaos + live integrity. |
| `backend-core/tests/test_tradingview_egx.py` | Offline unit tests (8) + live smoke (opt-in). |
| `.github/workflows/tv-egx-harvester.yml` | Scheduled auxiliary cycles + CI chaos gate. |
| `admin.py` (1 gated block) | SOURCE-0 TradingView primary, gated by `EGX_PRIMARY_TV` (default OFF). |

## The single gated change
`backend-core/app/api/v1/endpoints/admin.py` `process_egx()` now tries TradingView
first **only if** `EGX_PRIMARY_TV` is truthy. Default unset ⇒ identical to today.
On any TV failure it falls through to the existing StockAnalysis→yfinance chain.

## Validation already performed (local, live against TradingView)
- `get_egx_stocks()` → 289/289 usable, zero duplicates, all EGP, all prices > 0.
- Technicals 1044 (symbol,tf) rows; statements 20yr (bank EBITDA null); 46 analyst names; news; ISIN+logo.
- `EGXFeedRouter`: TV primary served + source-tagged + ≥2-source invariant.
- QA `--suite resilience` 5/5 GREEN (fallback, fail-loud, fall-through).
- QA `--suite live` 6/6 GREEN. Unit tests 8 passed.

## Promotion procedure (each step reversible)

### Phase 0 — reference (zero risk)
```
psql "$DATABASE_URL" -f backend-core/migrations/0001_tradingview_egx.sql
DATABASE_URL=... python scripts/tv_egx_harvester.py --cycle symbolmap   # ISIN+logos
```
Rollback: `DROP TABLE symbol_map;` (price path untouched).

### Phase 1 — shadow validation (no writes to price path)
```
DATABASE_URL=... python scripts/tv_shadow_diff.py
```
Gate: universe ≥ 285 AND > 95% of overlap within 0.5%. Exit 0 = pass.

### Phase 2 — flip price primary (one env var)
Set on the Hetzner backend (Coolify env / `/opt/starta/.env`):
```
EGX_PRIMARY_TV=1
```
Redeploy backend. The existing 5-min price cron now serves TradingView; yfinance
remains the automatic fallback. Watch `market_tickers.source` and the Data
Freshness Monitor for 48h.
Rollback: unset `EGX_PRIMARY_TV`, redeploy. Instant.

> **1-minute intraday**: for true 1-min (vs the current 5-min cron), add a
> backend-side scheduler (APScheduler/systemd-timer on Hetzner) calling
> `refresh_all_prices()` every 60s in market hours. The feed is 15-min delayed,
> so 1-min polling improves worst-case staleness from ~20→~16 min.

### Phase 3 — statements / dividends
Repoint the statement/dividend writers to TV (`--cycle estimates`, plus a
statements cycle). Retire `ingest_stockanalysis/statistics/dividends`.

### Phase 4 — net-new layers + realtime propagation
`egx_technicals` / `egx_estimates` / `egx_news` cycles + frontend tabs. Enable
Supabase Realtime on hot tables (see migration footer); add the web Realtime
subscription + on-demand `revalidateTag` after successful writes. (iOS already
subscribes.)

### Phase 6 — chart history websocket (optional, authenticated)
Implement `TVChartWSClient` (placeholder in `egx_feed_router.py`). Needs a TV
session token. `ChartBarRouter` already falls back to yfinance, so charts work
until this lands.

### Phase 7 — QA gate (run before every promotion)
```
DATABASE_URL=... python qa/egx_audit.py            # all suites; non-zero exit = NO-GO
```

## Safety rules
- New files only; never `git add -A` (repo carries unrelated uncommitted work).
- Never single-source: `EGXFeedRouter` must keep ≥2 sources (asserted + tested).
- Migrations are additive/idempotent; run on Supabase only with explicit approval.
- Rotate the two pre-existing leaked secrets (see `docs/SECURITY.md`) — unrelated
  to this work but required for a clean posture.
