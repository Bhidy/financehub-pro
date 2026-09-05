# Data governance — listing authority, fund universe, ranking eligibility

Added 2026-09-05 after the chief-level re-audit. This is the operating reference for the three
trust layers that now sit between the raw feeds and every public page. Read it before touching
`lib/public-data.ts`, the fund hubs/rankings, the company directory or the sitemaps.

## 1. Security master — who is an EGX-listed company

**Problem it solves.** `market_tickers` is filled from TradingView's `egypt/scan`. The vendor
carries no listing status, so every row it returned became an "EGX listed company" with a page,
a directory entry and sitemap URLs: Global Telecom Holding (GTHE, delisted by EGX decree on
9 Sep 2019) was served as an active EGX stock with 2026 OHLC; 40 more lines absent from EGX's
registers, 14 ISIN-alias duplicates, 3 subscription-rights lines and a preferred-share class were
published alongside it, and 22 symbols the vendor had dropped kept June quotes as "live".

**The rule.** A price vendor can populate prices; it cannot grant listing status. Status comes from
EGX's own registers, keyed by ISIN:

| Input | File | Refresh |
|---|---|---|
| EGX main-market register (name, ISIN, EGX sector) | `frontend/scripts/fixtures/egx-official-listed.json` | **Browser-captured** — egx.com.eg is behind an F5/TSPD bot challenge that blocks scripts. Open `https://www.egx.com.eg/en/ListedStocks.aspx`, scroll to the end (rows lazy-load), extract `name / isin / sector` per row, replace `rows`, set `captured_at`. |
| EGX SME-market register | `frontend/scripts/fixtures/egx-sme-listed.json` | `node scripts/egx-security-master.mjs --refresh-sme` (public endpoint) |
| TradingView identity view | `frontend/scripts/fixtures/tv-egypt-universe.json` | `--refresh-tv` |
| Platform symbols (what the DB holds) | `frontend/scripts/fixtures/platform-symbols.json` | `--refresh-platform` |
| Hand-verified overrides (documented delistings, identity matches, share-class rules) | `frontend/scripts/fixtures/egx-security-overrides.json` | Edit with evidence URLs |

`node scripts/egx-security-master.mjs` writes `frontend/content/egx-security-master.json`
(statuses: `listed` · `delisted` · `duplicate_alias` · `rights` · `preferred` · `index` ·
`unverified`). `lib/security-master.ts` turns the `listed` set into `EGX_PUBLISHABLE_SQL`, which
**is** `EGX_ONLY` in `lib/public-data.ts` — so every public list/aggregate query and all four
sitemaps publish only listed companies. Fail-closed: a symbol the master has never seen is
`unverified` until the master is regenerated.

Non-listed symbols keep a reachable page (`getTickerAny`) that opens with `ListingStatusNotice`
and is `noindex`; their sub-tabs 404. `/companies` shows EGX's own 18-sector classification
(`content/egx-official-sectors.ts`) with the vendor label in the tooltip; `/sectors/*` stays on the
vendor taxonomy (URL contract) and is labelled as such.

Stale quotes: `quoteIsStale()` (14 days) nulls price/change/volume in the public ticker mapper, so
a dropped line never shows a months-old price as current.

**Gates.** `npm run verify:master` (`scripts/test-security-master.ts`: master == fixtures, GTHE
delisted, aliases, rights, preferred, TMGH = Real Estate, no ISIN under two symbols, publishable
size plausible, quarantine bounded) · `verify:routes` (EGX_ONLY must be the publishable SQL) ·
live: `SECURITY_MASTER_UNVERIFIED_SYMBOL` in `scripts/seo/audit.mjs`.

**When the quarantine grows** (`unverified` > 40 fails the gate): refresh the registers first — a
new IPO appears on TradingView before the browser-captured register is refreshed.

## 2. Fund universe — one rule, reconciled to the regulator

`fundIsCurrent()` (`lib/fund-stats.ts`): a NAV within `DORMANT_DAYS` (180) and `MIN_NAV_POINTS`
(2) NAV points. Used by `getAllFundsRanked` (hubs, categories, providers, rankings, price list)
**and** `/api/v1/funds` (the visitor's marketplace, the mobile app) — the crawler count equals
the visitor count.

`scripts/fund-universe-reconcile.mjs` writes `content/fund-universe-reconciliation.json` from the
live API + funds sitemap + `scripts/fixtures/fra-fund-universe.json` (FRA's Q2-2026 per-type
table, transcribed from the PDF). The hub intro and `/methodology#coverage` read their numbers from
that file. `npm run verify:universe` fails the build when the file is older than 35 days — rerun the
script (and re-transcribe the FRA table each quarter).

Currency: `fundCurrency()` — the stored currency is `EGP` on every row, USD/EUR funds included; the
name carries the denomination and wins when the store says EGP. Applied in the hubs, rankings, API
and fund page.

Classification: `categoryOfFund()` falls back to the fund's registered name when the disclosure has
no type (106 of 207 funds had none); the API exposes `fund_type_source: disclosed|name|none`.

## 3. Ranking eligibility — one engine, stated reasons

`applyReturnHierarchy()` (`lib/public-data.ts`): when `fund_risk_metrics` has a row, its return
family is authoritative **including its NULLs** on every surface (hubs, rankings, list API, fund
page); the legacy columns are used only for funds with no computed row, and `returns_source` says
which. `rankingEligibility()` returns `ranked | no_history | history_lt_1y | series_gap |
suppressed`; `RankingEligibility.tsx` prints the eligible/excluded counts and the reason table on
both best-funds pages. Before this, the ranking read the legacy family and disagreed with the fund
profile on 96 of 114 funds.

## 4. Server-rendered truth for the designed shells

`lib/static-hub.ts` now applies the shells' own dictionaries (`translations.ar` + the shared chrome
in `starta-i18n.js`) server-side for Arabic routes, translates input placeholders, flips the
language toggle, and every marketplace route injects the real result count (`fundsCountInjection`).
Gate: `npm run verify:ssr` (`scripts/test-ssr-truth.ts`). Live: `SSR_COUNT_CONTRADICTION`,
`AR_PAGE_ENGLISH_UI_LABELS`, `AI_CRAWLER_BLOCKED` / `AI_CRAWLER_SERVED_ENGLISH`.

## 5. URL hygiene — one address per page (2026-09-05, round 2)

* **Route params arrive percent-encoded** under `next start`; `canonicalRedirectTarget()` compares
  decoded, raw and `encodeURI` forms on purpose. An exact-match version redirected every canonical
  Arabic URL to itself locally — a redirect-guard change is never shipped without
  `preview_start prod-build-local` + curl of a canonical Arabic URL, a Latin alias and a
  double-encoded spelling.
* **Double encoding** (`/ar/…/%25D8%25A8…`): Vercel hands the function the once-decoded path, so the
  page cannot tell; `middleware.ts` peels one layer and 308s (no slug of ours contains a literal
  `%`). Sitemaps call `absUrl()` once — `absUrl(encodeURI(x))` produced the duplicates the audit
  found (12 HIGH).
* **Malformed escapes** (`%E0%A4`) made the router's param decoding throw → 500 on every dynamic
  family; `middleware.ts` answers 400 before routing.
* **Sitemap ↔ page parity**: a data-gated sitemap segment classifies the SAME rows the page does
  (`fundCategoryEntries` → `getAllFundsRanked()`); a private SELECT without the universe rule or the
  fund names left the index/sector hubs out of the sitemap while their pages published.
* **Fund sub-types**: the price vendor files index / sector / Shariah-named funds as `equity`;
  `categoryOfFund()` lets a name marker refine a vendor "equity" (FRA's own taxonomy separates them).
  Canary counts in `scripts/test-fund-categories.ts` (index 8 · sector 12 · shariah 15 on 2026-09-05).
* **Title / description budgets**: `clampTitle()` (60 incl. the 17-char brand suffix) and
  `clampDescription()` (160, sentence-boundary cut) in `lib/seo.ts`; every long-name family
  (symbol sub-tabs, metric pages, category/provider hubs, sector pages, glossary) routes through them.
* Live gates: `PAGE_CANONICAL_MISMATCH`, `HREFLANG_NO_SELF_REFERENCE`, `AR_PAGE_LINKS_EN_TREE`
  (data downloads exempt), `TITLE_TOO_LONG`, `DESCRIPTION_TOO_LONG` in `scripts/seo/audit.mjs`.

## 6. Public API endpoints are publication surfaces too (adversarial pass, 2026-09-05 evening)

* `/api/v1/egx/stocks` and `/api/v1/egx/stats` read `market_tickers WHERE market_code = 'EGX'`
  and served all 318 vendor lines — the nine documented delistings included — while every page was
  gated. Both now carry `AND ${EGX_ONLY}`. Rule: any query that PUBLISHES securities filters on the
  security master, pages and APIs alike; `verify:master` covers the SQL shape, the live check is
  `SECURITY_MASTER_UNVERIFIED_SYMBOL` plus the API assertion in the post-deploy verifier.
* `/api/v1/funds/{id}` returned the raw `funds_view` row: `currency` "EGP" on USD/EUR funds, the
  legacy (often NULL) return family, no `as_of_date`/`is_stale` — while `/api/v1/funds`, the CSV and
  the SSR profile disagreed. It now applies `applyReturnHierarchy()` + `fundCurrency()` + the
  10-day staleness contract. Rule: one fund, one number everywhere — list API, detail API, CSV,
  profile, hub, ranking (cross-surface check: `verify-live4.py` in the audit scratchpad, to be
  ported into `scripts/seo/audit.mjs`).
* The Arabic homepage's hreflang cluster rendered `hrefLang="en" href=""` / `x-default href=""`
  (Next 16 rewrites the origin URL to an empty path); explicit absolute `<link>` elements now carry
  it, and both homepages declare `x-default → /ar` like every other pair.
* **Vercel automatic mitigation:** a burst of hostile-looking probes from one IP (`/.env`,
  `wp-login.php`, SQLi strings, path traversal) made Vercel challenge EVERY non-browser client for
  ~25 minutes (`x-vercel-mitigated: challenge`, 403 "Vercel Security Checkpoint" — also from an
  unrelated network). Browsers pass; crawlers that do not run JS may not. Never run hostile probes
  against production from one IP without pacing; after any such window re-check `robots.txt` with
  a plain client and, if it persists, the Firewall tab of the finhub project (the CLI token's
  account, `bhidys-projects`, not the Chrome profile's account).

* **Compute next to the data:** functions ran in `iad1` (US East) while the database is Supabase
  `eu-central-1` and the audience is in Egypt — every SSR query crossed the Atlantic (company page
  TTFB 1.3 s, fund profile 2.7 s, measured 2026-09-05). `frontend/vercel.json` pins `regions: ["fra1"]`;
  the post-deploy verifier asserts `x-vercel-id` carries `fra1::fra1` and page latency.
* **Sargable predicates:** every per-symbol read (`ohlc_data`, `market_news`, `egx_technicals`,
  `egx_financials`, `dividend_history`, `egx_dividends`) compared `UPPER(symbol) = $1`, which none of the
  `(symbol, …)` indexes can serve — a sequential scan of ohlc_data per company-page view and per
  sub-tab (the COMI/TMGH outliers of 3–5 s). The call sites already upper-case the parameter, so the
  predicate is now `symbol = $1`; `qa/egx_audit.py` suite 14.3 asserts the stored symbols ARE
  upper-case on each table, asserts a symbol-led index exists, and prints `EXPLAIN ANALYZE` for the
  page's queries in both spellings on every CI run. `getPerformance()` and `getStats()` are cached
  per symbol for 15 minutes (tag `seo-tickers`), like the stats map.

* **Fund profile read path:** `getFund()` ran its four side-table reads (fund_risk_metrics,
  mutual_funds meta, fund_platforms, fund_data_quality) as sequential round trips; they are one
  parallel round now, each still isolated. Every per-fund predicate is a plain equality on
  `fund_id` (VARCHAR, PK/FK-indexed); `qa/egx_audit.py` suite 14.4 EXPLAIN-ANALYZEs the eight
  per-fund queries for 2734 and 2738 plus the whole-universe hub read, fails if any per-fund query
  exceeds 250 ms (the view read measures 104–121 ms; a sequential scan lands at ≥ 800 ms), and prints
  the fund tables' index inventory and `fund_id` types on every CI run. `getFund()` is cached per
  fund for 15 minutes (tag `seo-funds`) — the row is deterministic for a NAV state that changes twice
  a day, and it already crosses the client boundary as JSON.

## Follow-ups not done in this pass

* `nav_history` provenance (`source`, `source_url`, `ingested_at`) is live in the writers and the
  schema (self-migrating `NAV_DDL`, CI probe 14.1e); rows written before 2026-09-05 stay
  "unrecorded (before source tracking)" — never back-filled with a guessed source. The first
  populated rows arrive on the next publishing day (the Friday run saved 0 new points).
* Per-fund reconciliation against the FRA: the FRA PDF lists funds by manager; a parser for its
  RTL tables would let the residual be itemised.
* 14 symbols remain `unverified` (LKGP …) — documented delisting dates move them to `delisted`
  with evidence (9 done so far: GTHE, IRAX, NCGC, SUCE, TORA, PACH, NBKE, ALEX, EITP).
* Owner keys: `SERP_PROVIDER` + `SERP_API_KEY` (share-of-voice), `BING_WEBMASTER_API_KEY`.
* `PAGES_UNCACHEABLE`: Vercel ignores page-level `Cache-Control` on these dynamic routes — a
  platform limitation, not a code defect; revisit if Vercel adds route-level CDN caching for them.
* Four Arabic company pages carry Latin `<h1>`s (GDWA, KRDI, MCRO, TAQA) — the upstream has no
  Arabic name; a hand override list would fix the heading and the AR title in one place.
