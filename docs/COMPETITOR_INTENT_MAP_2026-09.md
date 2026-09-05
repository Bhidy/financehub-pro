# Competitor & intent map — Egyptian funds and EGX equities (re-audit 2026-09-05)

Evidence: server HTML fetched on 2026-09-05 (word count = visible text, links = `<a>` count in served HTML), `scripts/seo/competitor.mjs` (sitemap coverage), the FRA Q2-2026 report and EGX's registers. Only what the pages actually serve is recorded — no rankings are asserted (no licensed SERP provider is configured; `serp.mjs` reports `configured:false` until `SERP_PROVIDER`/`SERP_API_KEY` are set). Competitor text was not copied anywhere.

## Coverage (public sitemaps, competitor.mjs)

| | Starta | snduk |
|---|---:|---:|
| Distinct pages | 9,548 | 1,228 |
| Individual funds | 966 | **1,109** |
| Stocks / companies | 5,375 | 2 |
| Market screens / indices | 76 | 16 |
| Education / glossary | 121 | 0 |
| News | 2,990 | 40 |
| Numeric fund schema (InvestmentFund + MonetaryAmount) | yes | no |

snduk's one structural lead is *individual fund* URLs (1,109 vs 966). Part of that is issuances we do not price; the rest is dormant/closed funds it still serves as current — exactly the class our universe rule now excludes on purpose.

## Query clusters

| Cluster (AR query) | Who ranks / what serves it (served HTML) | Their depth | Starta page | Gap → how we outperform without copying |
|---|---|---|---|---|
| أسعار وثائق صناديق الاستثمار اليوم | snduk `/eg/page/mutual-funds-prices-today` — H1 exact-match, 4,058 words, 359 links, no per-row as-of date, no provenance | strongest competitor asset | `/ar/Funds/prices-today` (dated **per row**, stale badge, CSV download, ranking-eligibility stated) | Their table is a flat list; ours states the as-of date per fund, withholds stale prices, exposes the return source and offers a downloadable table. Add: nothing structural — keep the freshness edge visible. |
| أفضل صناديق الاستثمار في مصر | snduk category pages + egxbot; Mubasher funds hub (`/countries/eg/funds`, 1,455 words, 411 links, generic) | medium | `/ar/Funds/best-mutual-funds-egypt-2026` (7,514 words, 210 headings, eligibility block, audited engine) | Already deeper; the differentiator is the stated eligibility + one return engine (their 1Y figures are unexplained). |
| صناديق أسواق النقد / الصناديق النقدية | snduk `/categories/money-market-funds` — H1 «الصناديق النقدية», 1,298 words, 52 links | medium | `/ar/Funds/category/صناديق-أسواق-النقد` (57 funds after name-fallback classification, was 26) | Coverage now exceeds theirs; keep the FRA reconciliation link visible (68 MM issuances per FRA incl. Islamic/USD/EUR). |
| صناديق الأسهم | snduk equity category — 1,271 words, 52 links, lists 70 "equity funds" (includes index/sector/thematic) | medium | `/ar/Funds/category/صناديق-الأسهم` + NEW `/ar/Funds/category/صناديق-المؤشرات` + `/ar/Funds/category/الصناديق-القطاعية` | We split the FRA's own types (equity 39 · index 12 · thematic 8 · sector 4) into three canonical pages instead of one bucket. |
| صناديق بنك مصر / الأهلي / CIB | snduk `/eg/page/banque-misr` — H1 exact-match, 748 words, 45 links; banks' own pages are JS shells (NBE 9 words, CIB 0 words server-side) | thin | `/ar/Funds/provider/…` hubs (70 banks/managers with ≥3 funds) | Banks cannot rank their own fund pages (client-rendered); ours are server-rendered with NAVs. QNB has <3 funds → no hub (correct: no thin page). |
| مقارنة صناديق | snduk comparison workflow (150 words server-side) | thin | `/ar/Funds/Compare` (588 words, 48 links) + `/ar/Funds/vs/*` pairs | Ours is server-rendered with FAQ + popular pairs. |
| أسعار الأسهم المصرية اليوم | TradingView "All Egyptian stocks" (2,681 words, 458 links); Mubasher stocks index 404s; Investing.com funds page 403s | strong (TV) | `/ar/companies` (276 register-confirmed companies, official EGX sectors, stale quotes withheld) | TV lists 296 lines incl. delisted/OTC; we publish only register-listed companies with the exchange's own sectors — an accuracy edge to state, not a volume race. |
| قطاع البنوك / أسهم العقارات في البورصة | Mubasher sector pages (vendor taxonomy); TV screens | medium | NEW `/ar/sectors/egx/بنوك`, `/ar/sectors/egx/عقارات` (18 official sectors, data-gated ≥3) | Nobody serves the exchange's own 18-sector classification as hubs. |
| EGX30 / أكبر الشركات / أعلى توزيعات / أقل مكرر ربحية / الأكثر ارتفاعاً | TV screens; Mubasher | strong (TV) | `/ar/markets/*` screens (data-gated, gated on the listing master) | Screens now exclude delisted/OTC lines TV still shows (GTHE). |

## Official / primary sources used as authority (not competitors)

- **EGX register of listed securities** (main market, 262 ISINs; SME market, 21) — the listing authority behind `content/egx-security-master.json`. The main-market page is bot-protected (F5/TSPD) and must be captured in a browser.
- **FRA Q2-2026 fund report** — 224 funds by issuance across 28 types (per-type table transcribed to `scripts/fixtures/fra-fund-universe.json`).
- **VEON / EGX decree** — GTHE delisting, 9 Sep 2019.

## What we deliberately do not copy

- snduk's "No funds available" contradictory empty states and mixed-language pages (we gate both in CI: `verify:ssr`, `SSR_COUNT_CONTRADICTION`, `AR_PAGE_ENGLISH_UI_LABELS`).
- Serving dormant funds as current prices (our 180-day rule keeps them as history).
- Vendor listing universes as "listed companies" (our register allow-list).

## Owner actions to complete the measurement loop

- Set `SERP_PROVIDER` + `SERP_API_KEY` (licensed provider) → `serp.mjs` starts tracking the clusters in `content/search-intent-map.json` (34 clusters) and share-of-voice becomes measurable.
- Set `BING_WEBMASTER_API_KEY`; export the Bing AI Performance CSV monthly → `bing.mjs --import-ai`.
