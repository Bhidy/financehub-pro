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

## Follow-ups not done in this pass

* Per-observation provenance on `nav_history` (`source_url`, `source_published_at`,
  `ingested_at`) — a backend schema/harvester change gated by the CI write-contract.
* Per-fund reconciliation against the FRA: the FRA PDF lists funds by manager; a parser for its
  RTL tables would let the residual be itemised.
* Documented delisting dates for the 22 `unverified` symbols (SUCE, ALEX, TORA, PACH, NBKE, IRAX,
  LKGP, NCGC …) so they move from `unverified` to `delisted` with evidence.
