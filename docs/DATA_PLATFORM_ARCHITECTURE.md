# Starta Markets — Data Platform Architecture (Single Source of Truth)

> **Read this first for ANY data work (stocks or funds).** It defines the one
> source of truth, the one read path, the one contract, the ingestion discipline,
> and the guardrails. The goal: **when an auto-update writes any data, every field,
> chart, section, and page — on Web AND App — reflects it identically.** No surface
> reads from a different place.

Last updated: 2026-06-04. Status: funds migrated + live; stocks parity in progress.

---

## 1. The principle

```
            INGESTION (one canonical writer per data type, freshest-wins)
   TradingView ─┐
   Mubasher CSV ─┼─▶  CANONICAL TABLES  (the ONLY source of truth)
   yfinance     ─┘     nav_history · ohlc_data · market_tickers · egx_*
                            │   derived fields computed LIVE, never copied
                            ▼
                    POSTGRES VIEWS   funds_view · stocks_view
                            │
                            ▼
        ONE READ PATH:  Vercel /api/v1/*  (direct Supabase, force-dynamic)
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  Static public site   React app           Mobile app (Capacitor)
  (/Funds, /Fund, …)   (/funds, /egx, …)   (StartaMobileApp.tsx)
        └────────── identical data, identical fields ──────────┘
```

**Five rules:**
1. **One source of truth.** The canonical TABLES hold the data. Derived/denormalized
   values (`latest_nav`, `last_nav_date`, `%change`) are computed by **VIEWS** — never
   stored copies — so they cannot drift from the source.
2. **One read path.** Every surface reads Vercel `/api/v1/*` (route handlers in
   `frontend/app/api/v1/**`) which query Supabase directly with `export const dynamic = 'force-dynamic'`.
3. **One contract.** Canonical field names everywhere. The "Updated" label is **always**
   `last_nav_date` (the real latest data point), never a processing timestamp.
4. **One write discipline.** All writers feed the canonical tables idempotently,
   **freshest-wins** (`ON CONFLICT` + `COALESCE` + date guards) — a slow/old source can
   never overwrite newer data; missing fields are filled, not nulled.
5. **Guardrails.** A reconciliation gate proves completeness + correctness vs origin;
   freshness monitors alarm on staleness. Old sources are retired ONLY after the gate
   is green and signed off.

---

## 2. Canonical tables (source of truth)

| Domain | Source-of-truth table | Derived/denormalized (computed in view) | Origin feed |
|---|---|---|---|
| Fund NAV series | `nav_history (fund_id, date, nav)` UNIQUE(fund_id,date) | `mutual_funds.latest_nav`, `last_update_date` | Mubasher static CSV (primary), Playwright, Decypha |
| Fund metadata | `mutual_funds (fund_id PK, …)` | — | Mubasher / Decypha |
| Fund peers/actions | `fund_peers (… peer_rank)`, `fund_actions (… action_date)` | — | Decypha/scrape |
| Stock quote (LIVE) | `market_tickers (symbol, last_price, change_percent, updated_at, …)` | — (this IS the live truth) | TradingView (5-min refresh) |
| Stock chart (EOD) | `ohlc_data (symbol, date, o/h/l/c, volume)` | — | yfinance reservoir + TV harvester |
| Stock analytics | `egx_technicals / egx_estimates / egx_financials / egx_dividends / egx_news` | — | TradingView harvester |

> **Stocks vs funds differ on purpose:** for funds, `nav_history` is the truth and
> `latest_nav` is a derived copy → the view derives it. For stocks, `market_tickers`
> is the LIVE quote truth (intraday) and `ohlc_data` is EOD history — both canonical,
> different granularities. Don't collapse them into one table.

---

## 3. The views (define derived fields once)

Applied to Supabase (additive; `CREATE OR REPLACE VIEW`; reversible via `DROP VIEW`):

```sql
-- latest NAV point per fund (authoritative)
CREATE OR REPLACE VIEW fund_nav_latest AS
SELECT DISTINCT ON (fund_id) fund_id, nav AS latest_nav, date AS last_nav_date
FROM nav_history ORDER BY fund_id, date DESC;

-- funds: all mutual_funds columns + LIVE-derived nav fields (can't drift)
CREATE OR REPLACE VIEW funds_view AS
SELECT f.*, l.latest_nav AS live_latest_nav, l.last_nav_date,
       COALESCE(nc.n,0) AS nav_points
FROM mutual_funds f
LEFT JOIN fund_nav_latest l ON l.fund_id = f.fund_id
LEFT JOIN (SELECT fund_id, COUNT(*) n FROM nav_history GROUP BY fund_id) nc
       ON nc.fund_id = f.fund_id;

-- stocks: live quote table + latest EOD date for chart coherence
CREATE OR REPLACE VIEW stocks_view AS
SELECT t.*, o.last_ohlc_date
FROM market_tickers t
LEFT JOIN (SELECT symbol, MAX(date) AS last_ohlc_date FROM ohlc_data GROUP BY symbol) o
       ON o.symbol = t.symbol;

-- stock KEY STATISTICS derived FRESH from TradingView + Yahoo, replacing the
-- stale stockanalysis.com `stock_statistics` table. Maps to the same field names
-- (rsi_14, ma_50d, pe_ratio, roe, ...) so consumers don't change. ROE/ROA computed
-- live from income_statements + balance_sheets. (beta_5y is NULL — TV gap.)
CREATE OR REPLACE VIEW stock_stats_view AS
SELECT mt.symbol, mt.market_code, mt.name_en, mt.name_ar, mt.sector_name, mt.currency,
       mt.last_price, mt.pe_ratio, mt.pb_ratio, mt.dividend_yield, mt.market_cap,
       mt.beta AS beta_5y, t.rsi AS rsi_14, t.sma50 AS ma_50d, t.sma200 AS ma_200d,
       i.gross_margin, i.operating_margin, i.net_margin AS profit_margin,
       i.revenue_growth, i.net_income_growth AS profit_growth, i.eps_growth,
       i.eps AS eps_ttm, i.net_income AS net_income_ttm,
       CASE WHEN b.total_equity>0 THEN ROUND((i.net_income/b.total_equity*100)::numeric,2) END AS roe,
       CASE WHEN b.total_assets>0 THEN ROUND((i.net_income/b.total_assets*100)::numeric,2) END AS roa,
       'tradingview+yahoo' AS source
FROM market_tickers mt
LEFT JOIN LATERAL (SELECT rsi,sma50,sma200,updated_at FROM egx_technicals WHERE symbol=mt.symbol ORDER BY updated_at DESC LIMIT 1) t ON true
LEFT JOIN LATERAL (SELECT * FROM income_statements WHERE symbol=mt.symbol AND period_type='annual' ORDER BY fiscal_year DESC LIMIT 1) i ON true
LEFT JOIN LATERAL (SELECT total_equity,total_assets,total_debt FROM balance_sheets WHERE symbol=mt.symbol AND period_type='annual' ORDER BY fiscal_year DESC LIMIT 1) b ON true
WHERE mt.market_code='EGX';
```

**stockanalysis.com is fully removed from frontend reads** (it was Cloudflare-blocked/stale):
`egx/statistics` + `company/profile` now read `stock_stats_view`; `ratios` reads it too;
`market-summary` computes breadth live from `market_tickers`. The stale `stock_statistics`,
`financial_statements`, `dividend_history`, `market_breadth`, `financial_ratios` tables are
no longer read by any live frontend path.

API routes select from the views and expose the canonical `latest_nav` =
`COALESCE(live_latest_nav, NULLIF(latest_nav,0))` and `last_nav_date`.

---

## 4. The one read path

- **All** web (static `public/*.html` + React `app/*`) and mobile reads go to
  **`/api/v1/*`** (Vercel handlers → Supabase, `force-dynamic`).
- `frontend/app/api/proxy/[...path]/route.ts` has a `localSegments` allow-list that
  routes a path to the LOCAL `/api/v1` handler instead of the Hetzner backend. It now
  includes `funds, fund-sparklines, sparklines, etfs` alongside the stock segments, so
  the React app no longer hits the backend for funds.
- **Hetzner backend read endpoints for funds/stocks are being RETIRED** (kept running
  until QA sign-off). They were a duplicate implementation that drifted (e.g. backend
  `get_fund_details` 500'd on every fund — `ORDER BY ranking` vs the real `peer_rank`).
  The backend keeps only: AI chat, ingestion jobs, admin refresh.

### Canonical funds endpoints (Vercel)
| Endpoint | Reads | Notes |
|---|---|---|
| `GET /api/v1/funds` | `funds_view` (or equivalent derivation) | listing; `latest_nav`+`last_nav_date` live |
| `GET /api/v1/funds/{id}` | `funds_view` + `fund_peers` + `fund_actions` | **superset**; canonical `latest_nav`, `last_nav_date`, `peers`, `actions` |
| `GET /api/v1/funds/{id}/nav` | `nav_history` | chart series; `force-dynamic` |
| `GET /api/v1/fund-sparklines` | `nav_history` | batch; `max-age=60, swr=120` |

### Canonical stock endpoints (Vercel, all direct Supabase)
`/api/v1/tickers`, `/api/v1/egx/stocks` (now direct, was the lone proxy),
`/api/v1/egx/stock/{symbol}`, `/api/v1/egx/ohlc/{symbol}`, `/api/v1/history/{symbol}`,
`/api/v1/market-summary`, `/api/v1/sparklines`, `/api/v1/egx/{technicals,estimates,financials-tv,dividends-tv,news-tv}/{symbol}`.

---

## 5. Ingestion (writers) — freshest-wins, never stale-overwrite

| Writer | Source | Writes | Schedule |
|---|---|---|---|
| `.github/workflows/funds-nav-update.yml` → `funds_nav_updater.py` | Mubasher static CSV (no-auth) | `nav_history` (upsert) + reconciles `mutual_funds` | daily 08:00 + 19:00 Cairo |
| `scrape_mubasher.py` (in-proc scheduler) | Mubasher Playwright | funds w/o CSV (64xx) | 06:00 Cairo |
| `decypha_provider.py` | Decypha export | fund metadata | 18:00 Cairo |
| TradingView refresh (`admin /refresh/prices`, `EGX_PRIMARY_TV=1`) | TradingView | `market_tickers` | every 5 min (market hours) |
| `populate_yahoo_reservoir.py` + `tv_egx_harvester.py` | yfinance / TV | `ohlc_data`, `egx_*` | 4h / cycles |

**Invariants:** idempotent `ON CONFLICT`; never delete; derived fields come from views
(so a writer that stale-writes `mutual_funds.latest_nav` is harmless — the view ignores
it and uses `nav_history`). The CSV updater exits non-zero on <100 funds updated (kills
false-green).

---

## 6. Guardrails

- **Reconciliation gate** — `backend-core/scripts/reconcile_funds_source.py`: proves the
  single source is COMPLETE (every shown fund has nav+date+currency), FRESH, and matches
  the Mubasher origin. Run before retiring any legacy source. (Stocks equivalent: TODO.)
- **Freshness monitors** — `.github/workflows/funds-freshness-monitor.yml` (pages Discord,
  stays green) + `data-freshness-monitor.yml` (prices). Extend to stocks reconciliation.
- **CI** — `ci.yml` (actionlint + py_compile); Vercel build per PR.

---

## 7. Deploy (Web + App)

- **Web:** push to `main` → Vercel builds. **Production domain must be aliased to the new
  deployment** — Vercel does NOT always auto-alias; if `startamarkets.com` still serves an
  old build, promote the latest production deployment (Deployments → ⋯ → Promote, or
  `vercel alias set`). Commit author must be the Vercel-account email (`mohamedbhidy@gmail.com`)
  or the build is blocked.
- **App:** the Capacitor app loads the same `/api/v1` contract; a data/API fix needs no
  app re-ship, only a redeploy of the web API. Native shell changes require a TestFlight build.

---

## 8. Migration status & transition rule

- **Funds:** migrated to the single source + LIVE + reconciliation PASS (191/191 complete).
- **Stocks:** ALL reads on Supabase — `egx/stocks`, `egx/statistics`, `egx/dividends`,
  `egx/financials-data`, `egx/stats`, `egx/history` rewired from backend-proxy to direct
  Supabase; stocks reconciliation gate + freshness monitor live (227/227 PASS).
- **Only remaining backend dependencies (by design):** `yahoo/stock` (`fetchYahooProfile`)
  fetches LIVE external yfinance company profiles — external enrichment, not our canonical
  data, so it legitimately stays on the backend. `app/api/egx/[...path]` catch-all is
  UNUSED/legacy (no frontend caller) and can be deleted. Everything that reads OUR
  prices/charts/NAVs/metadata now reads Supabase.
- **Transition rule:** keep ALL legacy sources running. Retire a legacy writer/endpoint
  ONLY after: (a) reconciliation gate green, (b) Web+App verified, (c) owner sign-off.

---

## 9. Known consistency traps (do not regress)

- "Updated"/"Last update" must be `last_nav_date` (the latest NAV point), never
  `last_update_date`/`updated_at` (metadata timestamps that can run ahead of the chart).
- A headline value and its chart must read the SAME table (the view guarantees this).
- Charts must render chronologically with the last point reachable (sort by date; don't
  blind-`.reverse()`; give chart a right margin so the final point is hoverable).
- No simulated/fake series — show real data or an explicit empty state.
- `mutual_funds` has 100+ sprawled columns (`ytd_return`/`return_ytd`/`returns_ytd`,
  `manager`/`manager_name`, `latest_nav` stored vs live). Treat `funds_view` as the contract.
