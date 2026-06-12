# Institutional Audit — startamarkets.com/Market-Pulse

**Date:** 2026-06-12 · **Auditor:** Claude (institutional-audit-qa, 5-auditor multi-agent workflow + adversarial verification)
**Trigger:** User report — "52W Low/High bar shows wrong info for all stocks" + full-page data accuracy/staleness audit.
**Method:** Code-chain audit (frontend → Next.js proxy → FastAPI → Postgres → ingestion → schedulers → monitoring), live production reconciliation across 12+20 symbols, docs review. 57 raw findings; every Critical/High finding independently re-derived by an adversarial verifier (29/30 confirmed, 1 downgraded).

---

## 1. Executive Summary

The user's report is **confirmed and worse than reported**. The 52-week range bar is wrong for effectively **every stock on the page**, and the same poisoned source contaminates Market Cap, P/E, P/B, Dividend Yield, Beta, and the side-drawer price.

**Root cause (verified end-to-end):** Yahoo Finance froze its EGX quote coverage on **2024-07-23** (`regularMarketTime=1721764800` on every sampled symbol). The ingestion job (`ingestion/populate_yahoo_reservoir.py`, scheduled every 4h via `.github/workflows/data_sync.yml`) faithfully re-downloads this frozen data and **re-stamps it `last_updated=NOW()`**, so it always *looks* fresh. The backend (`backend-core/app/api/v1/endpoints/yahoo.py:230-266`) serves the cache with **zero staleness checks**, and the frontend (`frontend/public/assets/market-pulse.js`) **prefers** these Yahoo values over the fresh DB feed present in the same payload. No watchdog layer monitors `yahoo_cache` content. The project itself documented on 2026-06-03 that yfinance EGX quotes were "30–650% wrong" (`docs/ARCHITECTURE.md:103`) — yet Market Pulse still prefers them.

**Flagship example (COMI / CIB):** real price 131.69 (fresh, Jun 11); page plots Yahoo's frozen 81.20 inside the 77.03–145.01 range → marker at **6.1%** (near 52W low). Truth from the platform's own candle history: range 73.41–144.93, marker at **81.5%** (near 52W high). The display is **inverted** — the stock looks near its yearly low while trading near its yearly high.

**Fresh & correct (controls):** main header last price/change (DB feed path), EGX30 index chart (candles through Jun 11, correct last trading day), market-scope counts, headline news dates (Jun 12).

## 2. Overall Risk Rating

**CRITICAL** — systematically misleading financial display on a public investment-information product, structurally invisible to monitoring.

## 3. Release Decision

**No-Go** for the Market Pulse company-overview surface (52W bar, key-fact tiles, drawer) in its current state. The rest of the page is Conditional Go.

## 4. Scope Reviewed

- Full 52W chain: `market-pulse.js:364-369, 1204-1209` → `/api/v1/yahoo/stock/[symbol]/route.ts` → `backend-core/app/api/v1/endpoints/yahoo.py` → `yahoo_cache` table → `ingestion/populate_yahoo_reservoir.py` → `.github/workflows/data_sync.yml`.
- Live reconciliation: 12 liquid symbols end-to-end (COMI, ABUK, SWDY, HRHO, TMGH, EAST, ETEL, EFIH, AMOC, ORWE, MFPC, ORAS) + 20-symbol staleness probe + failure-path checks (EKHO, QNBE, ALCN).
- All other page fields: stocks feed, market-summary, EGX30, news, ticker tape, financials tab, breadth bar.
- Docs & ops: DATA_PLATFORM_ARCHITECTURE.md, EGX_SCHEDULER.md, EGX_DATA_REPORT.md, CHART_DATA_AUDIT_REPORT.md, ARCHITECTURE.md, NEVER_FAIL_PLAN.md, watchdog (`scripts/pipeline_watchdog.py`), GitHub Actions run history, ingestion logs.

## 5. What Was Not Verified

- Direct Supabase queries (no DB credentials used): `market_tickers.high_52w/low_52w` NULL-ness confirmed only via API behavior, for COMI.
- Origin of the fraction-unit `fundamentals.dividend_yield=0.0453` (most consistent with old cache rows preserved by merge-keep logic — inference, not observed at write time).
- Whether `backend-core/data_pipeline/egypt_yahoo_loader.py` (APScheduler tier1c) also writes frozen prices into `market_tickers` (its `last_price` is demonstrably fresh, so its operative source is another feed).
- Whether the Hetzner APScheduler process is currently running (only GitHub Actions cadence verified via run history).
- Why Yahoo's 52W *bounds* are far fresher than its *price* (HRHO bounds exactly match candle truth; COMI high within 0.1%) — vendor-side behavior, unexplained.

## 6. Critical Findings (all adversarially confirmed)

| ID | Finding | Evidence |
|----|---------|----------|
| C-01 | **52W marker plots a 689-day-frozen Yahoo price for every stock.** 12/12 sampled symbols have `regularMarketTime=2024-07-23`; 10/11 rendered bars wrong by **15–78 percentage points**. | `market-pulse.js:364-369`; reconciliation table §16. COMI 6.1% vs 81.5%; SWDY 0% vs 77.9%; TMGH 15.5% vs 83.5%. |
| C-02 | **Clamp falsely pins stocks AT a 52W extreme.** `Math.min(100, Math.max(0, …))` hides that the plotted price is *outside* the displayed range. 5/11 pinned: SWDY, HRHO, EAST, ETEL shown sitting AT their 52W low; EFIH AT its high. 20-symbol probe: EMFD, FWRY, PHDC, ORHD, CANA, JUFO, GBCO, RAYA, FERC, HDBK all pinned 0%; ALCN plots 46.40 *above* its displayed 20.50–34.70 range (pinned 100%). | `market-pulse.js:369` |
| C-03 | **ORAS served from the wrong listing entirely**: page price 741.25 EGP vs yahoo/history 71.05; degenerate 71.05–71.05 range silently kills the bar. | `/api/v1/yahoo/stock/ORAS` vs `/api/v1/egx/stocks` |
| C-04 | **Market Cap & P/E derived from the frozen price.** COMI cap shown 267.9B EGP (= 81.2 × shares) vs fresh DB 442.7B (**understated 39.5%**); P/E 4.41 vs 6.96. Frontend prefers `yp.market_cap || item.market_cap`. | `market-pulse.js:393-394`, live payloads |
| C-05 | **Dividend Yield shown 100× too small** — `fundamentals.dividend_yield=0.0453` (a fraction) rendered as "0.05%" on the Overview tab while the *same page's* Financials tab shows 4.53% and `profile.dividend_yield=4.5784`. | `market-pulse.js:396,407` (bug) vs `:504-512` (correct) |
| C-06 | **Drawer headline price shows the stale Yahoo price** (COMI 81.20) directly contradicting the main header (131.69) on the same screen. | `market-pulse.js:1197,1201` |
| C-07 | **Staleness is structurally invisible**: ingestion re-stamps frozen content `last_updated=NOW()` every 4h; backend has no `regularMarketTime` guard; neither watchdog layer monitors `yahoo_cache`. All dashboards green while Critical-stale data is served. | `populate_yahoo_reservoir.py:178-183,247-270`; `yahoo.py:230-266`; `scripts/pipeline_watchdog.py:110+` |

## 7. High Findings (confirmed)

- **H-01** Backend `/yahoo/stock` serves the reservoir with no staleness check and unconditionally skips live fallback on cache hit (`yahoo.py:230-266`).
- **H-02** DB fallback for 52W is doubly dead: `/api/v1/egx/stocks` never SELECTs `high_52w/low_52w` although `market_tickers` *has* those columns, and they're NULL — stale Yahoo is the single source (`endpoints/egx.py:56-58`; `frontend/app/api/v1/egx/stocks/route…`).
- **H-03** Yahoo failure paths silently delete the bar: 404 → `request()` throws (`js:111`) → swallowed (`js:965-967`) → bar absent, no notice. QNBE: 200 with null bounds → bar absent.
- **H-04** Beta implausible and source-inconsistent: page shows `fundamentals.beta` (COMI 0.55, SWDY 0.03, EAST 0.13) while the same payload's `profile.beta` ≈ 1.05–1.09. P/B same pattern (1.32 vs 1.92).
- **H-05** History candles violate OHLC invariants on **17–24% of rows** (open outside [low, high]) — the candlestick chart draws impossible candles.
- **H-06** Cross-feed disagreement: GDWA volume in stocks feed is **11.9×** its own history candle for the same session; PHGC disagrees across three feeds (stocks feed trading 176.6M shares, history frozen at Jun 3, tickers stamped Apr 30).
- **H-07** Docs misdescribe the path: DATA_PLATFORM_ARCHITECTURE.md calls `/yahoo/stock` "LIVE external yfinance"; `yahoo_cache` is absent from the canonical-tables contract and the writer schedule.
- **H-08** Known-and-ignored: ARCHITECTURE.md (2026-06-03) records yfinance EGX quotes "30–650% wrong" and demotes Yahoo to fallback — Market Pulse still prefers Yahoo for marker, cap, P/E, yield, beta.
- **H-09** Alerting gap: data_sync's watchdog alert fired with **no delivery channel** (Discord skipped — no URL; email skipped — no secrets), contradicting NEVER_FAIL_PLAN's "Discord = primary, delivery-verified".

## 8. Medium Findings (selected)

- KORA's headline **+19.53%** (tape + gainers) is computed off zero-volume placeholder candles (3 sessions of open=high=low=close=2.97, vol 0).
- Raw ISIN **EGS72XL1C014** rendered as a ticker in the most-active tape (Premium Healthcare rights issue; currency mislabeled SAR).
- Advancers/Decliners **69/176 omits 54 unchanged** securities (sums to 245 ≠ 299); breadth bar denominator excludes them so the bar always fills 100%; the count is hard-coded green even when decliners dominate.
- `market-summary.last_updated` is the **request time**, not the data's as-of time (figures are the Jun 11 session); trading value 10.87B = Σ(volume × last close) — approximation, not actual turnover.
- Stocks feed quality: all numerics as strings, OHLC fields 100% null, 231/299 null P/E, 44 zero-volume rows, no timestamp.
- `EPS` and `Avg Vol (10D)` facts can never render — frontend reads `p.avg_vol_10d`/`f.trailing_eps`, keys that don't exist in the payload (`averageDailyVolume10Day` does).
- No error states anywhere: "..." placeholders and "Loading chart data…" can persist forever; Financials "Net Income" permanently "--".
- Chart period fallback silently renders the last 90 all-time candles under whichever period button is active.
- EGX_SCHEDULER.md documents a local-laptop cron that never worked and points to a deleted path (contradicts START_HERE's cloud-only rule); watchdog monitors the *retired* `stock_statistics` table while live `yahoo_cache` is unmonitored.

## 9. Low Findings (selected)

- Chart dates parsed as UTC midnight → viewers west of UTC see every session labeled one day early.
- Zero change renders green "+0.00%" (would hit all 54 unchanged names).
- `backend-core/yahoo_ingestion.log` is a dead 5-month-old artifact ending in continuous 429 blocks; duplicate `@router.get` decorator on the stock-profile endpoint.
- COMI symbol-news returns 5/10 items, newest 30 days old, `source=null` on all.
- **Controls passed:** EGX30 index fresh and internally consistent; main header price/change verified on the fresh DB path.

## 10. Refuted / downgraded (1)

- "Displayed 52W bounds off up to +15.7%" — numbers reproduce exactly, but the verifier judged severity inflated: bound drift is secondary to the marker defect and partially a vendor-methodology question. Kept as Medium.

## 11–15. Domain summaries

- **Data quality:** single-source dependency on a frozen vendor feed; freshness laundering (re-stamping); cross-feed contradictions (GDWA, PHGC, ORAS); OHLC invariant violations; placeholder candles driving headline movers.
- **Flow/UX:** silent failure everywhere (no empty/error states); same metric shown with three different values on one screen (price 131.69 header / 81.20 drawer; yield 0.05% overview / 4.53% financials).
- **Backend/API:** no staleness gating, no as-of timestamps on `/egx/stocks` and `market-summary`, stringly-typed numerics.
- **Database:** `high_52w/low_52w` columns exist but are NULL and never selected; `yahoo_cache` outside the canonical-tables contract.
- **Monitoring:** liveness is watched, content correctness is not; alert delivery channels unconfigured.

## 16. Reconciliation table (52W bar, live production, 2026-06-12)

| Sym | Plotted px (date) | Displayed 52W | Real px | True 52W (candles) | Marker shown | Marker correct | Error |
|------|------|------|------|------|------|------|------|
| COMI | 81.20 (2024-07-23) | 77.03–145.01 | 131.69 | 73.41–144.93 | 6.1% | 81.5% | 75.4 pts |
| ABUK | 58.32 (2024-07-23) | 45.01–95.00 | 76.50 | 38.90–92.45 | 26.6% | 70.2% | 43.6 pts |
| SWDY | 47.69 (2024-07-23) | 62.03–93.00 | 84.41 | 60.77–91.11 | 0.0% ⚠pinned | 77.9% | 77.9 pts |
| HRHO | 21.55 (2024-07-23) | 23.05–31.50 | 26.03 | 23.05–31.50 | 0.0% ⚠pinned | 35.3% | 35.3 pts |
| TMGH | 58.00 (2024-07-23) | 50.02–101.40 | 92.91 | 49.86–101.40 | 15.5% | 83.5% | 68.0 pts |
| EAST | 21.80 (2024-07-23) | 26.60–49.99 | 38.11 | 24.01–47.47 | 0.0% ⚠pinned | 60.1% | 60.1 pts |
| ETEL | 32.77 (2024-07-23) | 33.66–112.98 | 90.16 | 33.13–111.21 | 0.0% ⚠pinned | 73.0% | 73.0 pts |
| EFIH | 25.15 (2024-07-23) | 10.90–23.70 | 20.42 | 10.68–23.70 | 100% ⚠pinned | 74.8% | 25.2 pts |
| AMOC | 9.08 (2024-07-23) | 6.66–9.85 | 7.95 | 5.79–9.37 | 75.9% | 60.3% | 15.6 pts |
| ORWE | 25.01 (2024-07-23) | 19.66–25.11 | 22.99 | 18.39–24.30 | 98.2% | 77.8% | 20.4 pts |
| MFPC | 43.80 (2024-07-23) | 26.55–52.00 | 39.98 | 24.48–47.94 | 67.8% | 66.1% | 1.7 pts (coincidence) |
| ORAS | 71.05 (2024-07-23) | degenerate | 741.25(!) | 70.80–71.05 | NO BAR | n/a | wrong listing |

## 17. Defect Register (actionable, deduplicated)

| # | Sev | Defect | Fix |
|---|-----|--------|-----|
| D1 | Crit | 52W marker uses `yp.price` (frozen) | Plot `item.last_price`; derive bounds server-side from `ohlc_data` (the platform's own fresh candles) |
| D2 | Crit | Yahoo preferred over fresh DB for cap/P/E/P/B | Invert fallback: DB first; Yahoo only if missing **and** `regularMarketTime` < 7d old |
| D3 | Crit | Dividend yield ×100 unit bug | Use `profile.dividend_yield` (already %) on Overview/Drawer |
| D4 | Crit | Drawer price = stale Yahoo | Use `item.last_price` (`js:1197,1201`) |
| D5 | Crit | ORAS wrong listing | Fix symbol→listing mapping in stocks feed |
| D6 | Crit | Freshness laundering + zero content monitoring | Persist upstream `regularMarketTime`; gate serving on it; add `yahoo_cache` content check to watchdog L1/L2 |
| D7 | High | Clamp hides out-of-range prices | Remove clamp; if out of range, show an explicit state |
| D8 | High | Silent failure removes bar/fields | Visible "data unavailable" state |
| D9 | High | `high_52w/low_52w` NULL & never selected | Populate nightly from `ohlc_data`; add to `/egx/stocks` SELECT |
| D10 | High | Beta/P-B implausible source | Use `profile.beta`; disclose source |
| D11 | High | OHLC invariant violations 17–24% | Ingestion-time validation + repair |
| D12 | High | GDWA/PHGC cross-feed contradictions | Reconciliation job across feeds |
| D13 | Med | Breadth omits 54 unchanged; hard-coded green | Include unchanged; conditional class |
| D14 | Med | KORA +19.53% from placeholder candles | Exclude zero-volume placeholder sessions from change calc |
| D15 | Med | Raw ISIN in tape | Symbol-mapping filter |
| D16 | Med | `last_updated` = request time | Return real as-of timestamps on all feeds |
| D17 | Med | EPS/AvgVol dead keys | Map `averageDailyVolume10Day` / correct EPS key |
| D18 | Med | Docs wrong (live-vs-cache, dead local cron) | Correct DATA_PLATFORM_ARCHITECTURE.md, retire EGX_SCHEDULER.md |
| D19 | High | Alert channels not configured | Set Discord URL / SMTP secrets in Actions; delivery-verify |

## 18. Recommended Fix Priority

1. **P0 (ship together):** D1–D5 — one PR makes every number on the overview honest using data the page already fetches.
2. **P1:** D6–D9 — staleness gating + monitoring so this class of defect can never be silent again.
3. **P2:** D10–D14, D19.
4. **P3:** D15–D18 + Low items.

## 19. Retest Plan

For each of the 12 reconciliation symbols after fix: assert |marker% − history-derived%| < 2 pts; bounds within 1% of trailing-252-bar min/max; overview cap = `last_price × shares` within 1%; yield in [0.1%, 25%] band sanity; drawer price == header price. Add these as an automated check in `qa/egx_audit.py` and to the watchdog L2 route. Re-run the 20-symbol staleness probe; expect 0 symbols serving `regularMarketTime` ≤ 2024.

## 20. Final Senior Expert Verdict

**Senior Expert Verdict: No-Go** (Market Pulse company-overview surface).

The platform's display layer prefers a vendor feed that died 23 months ago over its own fresh data, then re-stamps it fresh every 4 hours so no monitor can see it. A retail user reading CIB today is told the stock sits at its 52-week low at 6% of range with a 267.9B cap and a 4.41 P/E; the truth — from this platform's own candle store — is 81.5% of range, 442.7B, 6.96. Four stocks are shown *at* their 52-week low that aren't; one (EFIH) *at* a high it isn't at; ORAS is priced off the wrong listing entirely. This is precisely the class of misleading financial display an institutional platform cannot ship. The fix is cheap: the correct numbers are already in the payloads and the candle store — invert the fallback order, compute 52W from own history, gate Yahoo on its own quote timestamp, and put `yahoo_cache` under content monitoring.

---

## 21. Addendum — C-03 / C-05(ORAS) / H-05 Resolution (2026-06-12, PR #87)

**Scope executed:** ORAS frozen candles (C-03), ORAS dividend yield (45.32%), impossible candles (H-05 root cause), ingestion gating.

**Root cause (verified with evidence):** Yahoo re-assigned `ORAS.CA` — `quoteType=MUTUALFUND`, shortName carries Morningstar id `0P0001N2JF`, `regularMarketTime` frozen at 2024-07-23 — yet it emits a synthetic flat 71.05/vol=0 bar daily. `populate_yahoo_reservoir.py` upserted these into `ohlc_data` ungated every 4h (1,133 of 1,178 ORAS bars were synthetic). `yahoo_master_map.json` is a probe dump, not a mapping; the only "mapping" is the hard-coded `{symbol}.CA`, which cannot be fixed Yahoo-side — the equity no longer exists there.

**Dividend yield 45.32% = data error (confirmed):** TV's `dividends_yield_current` is corrupt for ORAS (implied DPS 336 EGP vs actual 12.23; StockAnalysis shows 1.65%, TV TTM variant 3.16%). Survey over all 289 EGX symbols found 4 corrupt cases split across BOTH TV variants (BINV/MBSC/EGS385S1C012/ORAS); `dividend_amount_recent/close` arbitrates all 4 correctly. Cross-validation now applied in `tradingview_client.py` (EGX + KSA + dividends cycle).

**Fixes shipped (PR #87, branch `fix/oras-frozen-candles-c03`):**
1. Reservoir gate: reject candles when quoteType ≠ equity/ETF, regularMarketTime > 7d, or Yahoo close >1.5× apart from live TV price; drop flat zero-volume bars. Implements D7 for the candle store.
2. Same synthetic-bar filter on backend `/egx/history` yfinance path.
3. `scripts/backfill_egx_history_sa.py` + `egx-history-backfill.yml` (dispatch): purge-and-backfill from StockAnalysis 10Y daily (EGP), live-price-gated (>20% deviation refuses), transactional. Repairs SA's prev-close "open" (H-05's root cause: SA "open" = prior session close, verified row-by-row).
4. `_finite` import fix in harvester — EGX30 index upsert had silently failed every prices cycle.

**Production state after execution (verified):**
- `/api/v1/egx/history/ORAS?period=max`: 2,417 bars (2016-06-13 → 2026-06-11), last close 741.25 == live, 0 zero-vol placeholder bars, **0 OHLC invariant violations** (was 730/2417 pre-repair, 1,133 synthetic pre-purge).
- `/api/v1/egx/statistics/ORAS`: `dividend_yield` 3.1612 (was 45.3234).
- Market Pulse page (headless browser, production): ORAS chart renders 165 candle elements, header 741.25, no "71.05" anywhere on the page, no stuck loading state. Screenshot: `oras_market_pulse.png`.

**Residual risk:** scheduled `data_sync` runs the un-gated reservoir from `main` every 4h — ORAS is re-poisoned at the next run unless PR #87 is merged first. C-07 (yahoo_cache re-stamping) and the remaining 52W/monitoring items are NOT addressed by this PR.

**C-03 status: RESOLVED (pending PR #87 merge to keep it resolved).**
