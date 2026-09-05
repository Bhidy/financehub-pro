# SEO Operations Runbook

How the search-visibility system runs itself, what it checks, and the small
number of things a human still has to do.

## The automated system (2026-09)

SEO used to be a manual checklist here. It is now a running system; the manual
sections further down are what remains AFTER automation, not the primary loop.

| Job | Trigger | What it does | Fails on |
|---|---|---|---|
| `.github/workflows/seo-guard.yml` | every push to `main`, after the Vercel deploy goes live | waits for the commit to be live (`/api/version`), audits the money pages, submits URLs changed in the last 6h to IndexNow | a **critical** finding — Discord alert + red run |
| `.github/workflows/seo-daily.yml` | 06:15 UTC daily | full forensic crawl (money pages + deterministic sample of every sitemap segment), Search Console pull, composed intelligence report to Discord, weekly full IndexNow resubmit on Mondays | a **critical** finding (report is still sent first) |
| `npm run verify:all` → `verify:routes` | every build, local and CI | offline SEO contracts: canonical/OG on every static template, sitemap index ⇄ segment-router parity, the language contract, news-URL chokepoint, category-slug uniqueness, data-gate parity | any broken contract — blocks the build |

### The scripts (`frontend/scripts/seo/`)

| File | Purpose |
|---|---|
| `lib.mjs` | shared fetch/extract/scoring primitives. No dependencies. |
| `audit.mjs` | the forensic crawler. Checks crawl policy, sitemap integrity + `lastmod` credibility, status/redirects, canonical self-reference and host, title/description/H1, **language integrity on every `/ar/*` URL**, hreflang self-reference, JSON-LD parse + per-template required types, thin content, internal-link dead ends, cacheability, and cross-page duplicate titles/descriptions. Emits a JSON report and an SEO Health Score. |
| `indexnow.mjs` | delta submitter. Verifies the key file first, then submits only URLs whose sitemap `lastmod` falls inside a window. Stateless and idempotent. |
| `gsc.mjs` | Search Console intelligence: winners/losers, striking distance (pos 4-20), CTR gaps vs position, cannibalisation, content decay. |
| `report.mjs` | composes the audit + GSC into one prioritised brief with a concrete action per defect class, and posts a digest to Discord. |

Run any of them by hand:

```bash
cd frontend
npm run seo:audit:quick     # money pages, fails on critical
npm run seo:audit           # full crawl
npm run seo:indexnow        # submit what changed in 24h
npm run seo:report          # audit + GSC + composed report
node scripts/seo/indexnow.mjs --since 6h --dry-run
```

### Honesty contract

`gsc.mjs` returns `{ configured: false }` when `GSC_SERVICE_ACCOUNT_JSON` is
absent and the report says so explicitly. **No metric is ever estimated,
back-filled or synthesised.** A fabricated impressions number would be worse
than no number because it would be acted on.

### External configuration still required

| Secret | Enables | Without it |
|---|---|---|
| `GSC_SERVICE_ACCOUNT_JSON` | the search-performance half of the daily report (rankings, CTR gaps, cannibalisation, decay) | the audit half runs fully; the report states that search intelligence is unavailable |

To enable: create a Google Cloud service account, enable the Search Console
API, add the service-account email as a user on the `https://startamarkets.com/`
property in Search Console, then store the JSON key as that repo secret.

## Added 2026-09-05 — the operating-system pass against the master spec

**Defects found live and fixed (all gated so they cannot return):**

| Defect | Fix | Gate |
|---|---|---|
| 82 category/provider hubs emitted TWO hreflang clusters (their own + the shell's `/Funds` triple) | `lib/fund-hub.ts` strips the shell's three lines | `verify:routes` anchors the lines; `verify:arhub` asserts one entry per language on a rendered hub; the live audit's `HREFLANG_DUPLICATE_LANG` |
| Arabic fund pages linked the ENGLISH `/Funds` hub (breadcrumb, "all funds", footer, compare) | lang-aware links; the shell footer uses `localizedHref()` | audit `AR_*` checks; `verify:routes` language integrity |
| Fund detail schema thinner than the hub schema for the SAME fund | one `investmentFundNode()` (lib/funds-hub-render.ts) for hubs and the page + `WebPage.dateModified` = NAV date | — |
| Two `FAQPage` blocks on each money page | `FundsGuide extraFaq` composes ONE FAQPage | — |
| `/Funds` titled "Funds Marketplace" | head-term title/description via route replacement (shell bytes untouched) | anchors |
| `/feed.xml` mixed both languages under `<language>en`; `/ar/feed.xml` 404; no RSS autodiscovery anywhere | `lib/news-feed.ts` renders one feed per language (language decided by `newsLang()`); autodiscovery `<link>` on hubs + articles | — |
| Experiment ledger (`content/seo-experiments.json`) was gitignored → CI reviewed an empty ledger | `.gitignore` exception, committed | `verify:inputs` pattern |

**New surfaces (all EN+AR, data-gated, sitemapped, cross-linked):**

| URL | What it is | Gate |
|---|---|---|
| `/Funds/providers` · `/ar/Funds/providers` | provider league table — every bank/asset manager: fund count, categories, median 1Y, best fund, lowest fee | ≥3 providers (`MIN_FUNDS_PER_PROVIDER`) |
| `/Funds/categories` · `/ar/Funds/categories` | category performance — count, median 1Y/YTD, best/worst fund, median fee, definitions | ≥2 live categories |
| `/Funds/risk` · `/ar/Funds/risk` | risk league table from `fund_risk_metrics` — volatility, max drawdown, downside deviation, CAGR, per-category medians | `riskEligible()` in `lib/fund-stats.ts`, shared with the sitemap; ≥10 rows |
| `/methodology` · `/ar/methodology` | sources + cadence, return/risk formulas with their tolerances, quality grades, missing-is-never-zero, currency rules, automated checks — every statement read off the producing code | — |

**Search-intent map** — `content/search-intent-map.json`: one cluster → one URL per language, priority, competitor URL. `scripts/seo/serp.mjs` reads its queries from it; `verify:intents` fails the build if a target is not a real route or two clusters share a URL.

**Audit engine additions** (`scripts/seo/audit.mjs`, all proven by `--selftest`, wired into `verify:all`): `HREFLANG_DUPLICATE_LANG` (high), `HREFLANG_NOT_RECIPROCAL` / `HREFLANG_ALTERNATE_NOT_200` (high, money pages), `DATA_STALE` (medium >21d, high >60d on fund surfaces), `PAGE_NO_ASOF` (medium), `WRONG_CURRENCY` (high — "SAR" on a fund/company surface), `HOST_ALIAS_INDEXABLE` (critical — www / the Vercel project host answering 200), `AR_PAGE_ENGLISH_SUBHEADING` (low), `PAGES_SLOW` (medium, p90 > 4 s). Three more sitemap segments are sampled (`fund-categories`, `fund-providers`, `stock-comparisons`) and the new pages are money pages.

**Command center** — `scripts/seo/report.mjs` now opens with a KPI table (footprint, health, TTFB, Google/Bing search, competitor coverage lead + head-to-head depth, answer-engine access, rankings, AI citations, near-duplicates, experiments). Every KPI that cannot be measured says so in its own row; `seo-daily.yml` passes every intelligence output to it.

**Owner actions that unlock the dark half (no code can substitute):**
1. `GSC_SERVICE_ACCOUNT_JSON` repo secret (service account added to the `https://startamarkets.com/` property) → rankings, CTR gaps, cannibalisation, decay.
2. `SERP_PROVIDER` + `SERP_API_KEY` (DataForSEO or SerpApi) → competitor positions for the 30 intent clusters.
3. `BING_WEBMASTER_API_KEY` → Bing search performance; export the AI Performance CSV monthly and run `node scripts/seo/bing.mjs --import-ai <file>` → AI citations.
4. Off-page: press coverage / referring domains (the site has 0 independent referring domains; the domain is 7 months old).

## Added 2026-09-05 (second pass) — deep audit against production, Search Console and the pipelines

**Read from Search Console (owner's session, 3 months to 2026-09-05):** 494 clicks · 144K impressions · 0.3% CTR · avg position 8.7 · 8.26K indexed / 1.22K not indexed · external links: 3 (all github.com) · Core Web Vitals: no field data yet. Arabic company pages are the largest impression source (25K) at the lowest CTR (0.2%); English news converts best (169 clicks / 21K).

**Defects found and fixed in this pass:**

| Defect (evidence) | Fix | Gate |
|---|---|---|
| 8 funds with no NAV for 90+ days (5 over a year; one last priced 2011) published as "prices today", ranked, counted, and pre-rendered for crawlers while the client app hid them | `DORMANT_DAYS = 180` (`lib/fund-stats.ts`); the current-fund universe (`getAllFundsRanked`) excludes them; their pages stay, carry a dormancy notice and `data-fund-status="dormant"`; risk-table eligibility requires a live series | audit `FUND_DORMANT` (low) replaces `DATA_STALE` on declared pages |
| 4 sitemapped stock-comparison URLs 404'd — the sitemap chose pairs by market cap, the page demanded 8 populated rows | `countPairRows()` / `pairIsPublishable()` in `content/stock-vs.ts` shared by page and sitemap; `getStatsMap()` cached | full-segment check |
| 24 Arabic news articles listed an English "latest" headline | same-language filter on the related block | audit `AR_PAGE_ENGLISH_SUBHEADING` |
| 73 Arabic history pages carried an English `<h2>` ("Last 60 trading sessions") | `HISTORY.recentHeading` in the dictionary | same |
| `/ar/Funds` and every Arabic category/provider hub served the marketplace's English empty-state `<h3>` | `empty_title` added to `AR_MARKETPLACE_CLOSING` | same |
| `/Market-Pulse` 165 words (HIGH, thin) | movers, tape, breadth line and news pre-rendered server-side from the same tables the script reads | audit `PAGE_THIN` |
| 15 Arabic sector pages under 300 words | `content/sector-descriptions.ts` — 24 sectors, EN+AR, keyed by DB sector name | — |
| thin company sub-pages and Arabic overviews | `components/seo/KeyTerms.tsx` — glossary definitions (one vetted source) with links, on overview/dividends/history | — |
| unknown `/symbol/{x}` returned the app shell with a 200 (52 soft-404s in Search Console) | hard 404 when the DB is up; app-shell degrade only on outage | — |
| `/Portfolio`, `/shared/*`, `/mobile` indexable | `X-Robots-Tag: noindex` | — |
| bare `/symbol` and `/ar/symbol` 404 | 308 → the company directories | — |
| llms.txt pointed at a redirecting Arabic URL | canonical slugged URL | — |
| Lighthouse a11y 88: closed mobile drawer held focusable links; `text-emerald-600` bold figures 3.8:1; zoom locked site-wide | `inert` on the closed drawer; `text-emerald-700` on every server-rendered table; zoom allowed (the app shell keeps its lock) | — |
| company titles carried no price while the query is the price (25K Arabic impressions at 0.2% CTR) | live price in EN + AR company titles | — |
| price-freshness monitor paged on a healthy pipeline (late-started run outside the window) | window judged at run time | — |
| symbol-quality gate compared fiscal-year net income with trailing-twelve-month (27% apart on MFPC, red on every push) | same-period comparison, TTM fallback at 50% | — |
| NAV update and weekly financials fires dropped by GitHub's scheduler (site trailed the source by two NAVs; reconciliation red) | retry cron slots (NAV: +2/day with `--zero-gain-streak 12`; financials: Fri 05:00 + Sat 03:00); catch-up runs dispatched | — |

**Search Console API access (two owner clicks left):** Google Cloud project `starta-search-console` created, the Search Console API enabled, and service account `starta-seo-reader@starta-search-console.iam.gserviceaccount.com` created (unique id 116921909948302914995). Key creation is a credential action the agent harness refuses, so the owner finishes it:
1. Cloud Console → IAM & Admin → Service Accounts → `starta-seo-reader` → **Keys → Add key → Create new key → JSON** (downloads one file).
2. Search Console → Settings → Users and permissions → **Add user** → the service-account email above → permission **Full**.
3. `gh secret set GSC_SERVICE_ACCOUNT_JSON < ~/Downloads/<the json file>` then delete the file. The next `seo-daily.yml` run fills the search-performance half of the brief.

**Still owner-side:** Bing Webmaster (not signed in on this Mac) → `BING_WEBMASTER_API_KEY`; a licensed SERP provider; press / referring domains (3 external links, all from the public GitHub repo).

## Invariants the gates now hold (do not break these)

- **`/ar/Funds` is a real Arabic hub, not a redirect.** It 308'd to the English
  `/Funds` until 2026-09, so the site had no Arabic funds URL at all — the
  single largest cause of losing the Arabic funds SERP. `verify:routes` fails
  if the redirect is reinstated.
- **`<html lang>`/`dir` come from the middleware header `x-starta-lang`.** One
  root layout serves both trees, so this is the only server-side source. If
  either half is removed, every `/ar/*` URL reverts to declaring itself
  English. Gated on both files.
- **News URLs are built ONLY through `canonicalNewsPath()`** (`lib/news-display.ts`),
  which sanitises the headline exactly as the article page does. Slugifying the
  raw headline put ~510 redirecting URLs in the news sitemap. Gated.
- **Fund category pages are data-gated** at `MIN_FUNDS_TO_PUBLISH`, and the
  sitemap applies the same threshold — the page's 404 gate and the sitemap must
  provably agree.
- **Category/provider hubs declare ONE hreflang cluster.** `lib/fund-hub.ts` removes the marketplace shell's own `/Funds` triple; the three lines are anchored in `verify:routes` and the rendered output is asserted by `verify:arhub`.
- **Every Arabic page links Arabic hubs.** The shell footer and the fund page build hub/compare links through `localizedHref()` / `lang`, never a bare `/Funds`.
- **One feed per language.** `/feed.xml` is English, `/ar/feed.xml` is Arabic, both decided by `newsLang()`.
- **Sitemap `lastmod` is observed, not generated.** The index reports the real
  max data timestamp per segment. Reverting it to `new Date()` makes every
  child claim to change on every fetch, which search engines discount.

## Weekly (Monday) — what automation does NOT cover
| Check | How | Owner |
|---|---|---|
| GSC coverage delta | Search Console → Pages: indexed count vs last week; investigate anything new under "Why pages aren't indexed" | Marketing |
| Sitemap health | `curl -s https://startamarkets.com/sitemap.xml` + each child segment returns 200 with plausible URL counts | Dev |
| New crawl errors | GSC Crawl Stats + Settings → Crawl stats: 4xx/5xx spikes | Dev |
| Rich-result errors | GSC Enhancements: FAQ / Breadcrumb / Dataset reports at 0 critical | Dev |
| News indexation speed | Newest article `site:` check or GSC URL inspection within hours of publish | Marketing |

## Monthly (60 min)
- Full KPI table vs targets (indexed pages, impressions, clicks, CTR, avg position, top-10 count, referring domains, CWV pass rate — see the master plan §14).
- Screaming Frog (or `scripts/` curl battery) re-crawl vs the Day-30 baseline: zero duplicate titles, zero soft-404s, canonicals self-referencing.
- AI-citation run: execute `docs/AI_PROMPT_BANK.md` across ChatGPT / Perplexity / Gemini / Claude; log citation share.
- Backlink pipeline review (Ahrefs/GSC Links): referring domains trend.

## Every release (automated + manual)
- `npm run verify:routes` runs in prebuild and CI — canonical/OG/Twitter presence, no Tailwind-CDN regression, robots + 10 sitemap segments + llms.txt existence. **Do not bypass.**
- Type errors fail the build (`ignoreBuildErrors: false`) — keep the tree `tsc`-clean.
- Any change to a designed static page requires a browser screenshot check (design is canonical; curl is not verification).
- New page types must ship: canonical, JSON-LD, data-gated sitemap entries (page 404 gate ⊇ sitemap gate), and an `as-of` + source provenance line for financial data.

## URL + language contracts (2026-07-18: Arabic-first)
- **The site's default language is ARABIC.** No stored preference → static pages render Arabic RTL (`getStoredLanguage()` falls back to `'ar'`; `assets/starta-lang-boot.js` stamps `lang`/`dir` in `<head>` before first paint). Stored preference keys: `starta-lang` (canonical) + legacy `lang`, mirrored to the `starta-lang` cookie by `PublicPageShell persistLang`.
- **`/ar/*` canonical URLs carry ARABIC slugs**, built ONLY by the lang-aware helpers in `frontend/lib/seo.ts` (`fundPath(id, en, ar, 'ar')`, `learnPath`, `glossaryPath`, `sectorPath`; `arabicSlug` strips tatweel/diacritics first). Sitemaps, pages, hreflang and internal links must share these builders — never hand-build an `/ar/...` slug.
  - Funds: `/ar/Funds/{id}-{arabic-slug}` (ID-keyed → stale/EN slugs 308 automatically).
  - Learn: `/ar/Learn/{arabic-title-slug}`; glossary: `/ar/Learn/glossary/{arabic-term-slug}`; sectors: `/ar/sectors/{arabic-name-slug}` — all three ALSO resolve the legacy English slug and 308 to the Arabic canonical (never remove the alias resolution; indexed URLs depend on it).
  - `generateStaticParams` gates (`assertUniqueSlugs`) fail the build on any EN∪AR slug collision; the sector map (`content/sector-names-ar.ts`) uniqueness is enforced by `verify:routes`.
- **x-default hreflang = the Arabic URL** on every EN/AR pair (the home cluster keeps `x-default: /` — the root serves by preference and defaults to Arabic). Keep new paired pages consistent.
- Path SEGMENTS stay Latin (`/ar/Funds`, `/ar/markets/...`) — middleware case-canonicalization and the binding URL contracts depend on them; only the content SLUG is Arabic.
- `Location` headers and `<loc>`/hreflang values must be percent-encoded (`encodeURI`) — raw unicode in a Location header 500s (PR #127 lesson).

## Data invariants (break these → misleading financial display)
- Trading currency comes from `market_tickers.currency` per line (FAITA/EGBE/VLMRA = USD); fundamentals (market cap, statements) are EGP.
- `name_ar` comes ONLY from TradingView ar-localized descriptions via `refresh_company_names.py` — never from `ticker_aliases`.
- EGX30 is an index: excluded from company lists, movers, sectors and sitemaps.
- Fund NAV headlines derive from `nav_history` live (never the stored copy).

## Quarterly
- Re-run the adversarial production audit (the 5-auditor pattern: findings-recheck, JSON-LD validation, regression, edge-defects, search/AI readiness).
- Competitor battlecard refresh: english.mubasher.info (structural gap), stockanalysis.com (template parity), zeed.tech (funds).
- Review Vercel deploy quota usage (rate limit ≈ hit at ~15 deploys/day — batch PRs).

## 2026-09-05 — third pass: news purity, duplicate canon, contrast, GSC access

**News market purity.** The Egypt pulse feed carries Saudi-market stories
(Aramco, Flynas, BinDawood, Americana …) that the ingester tags
`source_country='EG'` with `symbol=NULL`; 99 were live, indexable and in the
sitemap. `isOffMarketNews(headline, symbol)` in `lib/news-display.ts` is the
one rule (currency/index codes `SAR`/`TASI`, `Tadawul`/`Nomu`/"Saudi Exchange",
Arabic `ريال`/`تداول السعودية`; a mapped EGX symbol always wins). Off-market
stories are dropped from both news sitemaps, the hub window, the feeds and the
Market Pulse block, and the article page serves them `noindex,follow` with a
visible archive note.

**Duplicate copies.** The feed re-ingests stories under new ids (117 headline
groups, 185 extra URLs — the "Duplicate, Google chose different canonical" row).
`primaryNewsRows()` keeps the lowest id per `newsDedupeKey()` (sanitized,
case-folded headline) in every list, and the article page 308s every later copy
to the first via `getNewsPrimaryId()`; its metadata names the first as canonical.
Gate: `npm run verify:news` (`scripts/test-news-purity.ts`), part of `verify:all`.

**Contrast.** Lighthouse (mobile, AR money page) went 88 → 96 after the pass-2
fixes; the last failure was brand-teal link text (#14B8A6 on white, 2.4:1).
All server-rendered pages now use `text-starta-darkTeal` (#0F766E, 5.5:1);
`.dark .text-starta-darkTeal` swaps to the accent so dark mode holds. Client
components and the designed pages were left untouched.

**Search Console access.** `starta-seo-reader@starta-search-console.iam.gserviceaccount.com`
is now a **Full** user on the `https://startamarkets.com/` property (added
2026-09-05). Remaining owner step: create the JSON key in GCP → IAM → Service
Accounts → Keys, then `gh secret set GSC_SERVICE_ACCOUNT_JSON < key.json`;
`seo-daily.yml` picks it up on the next run and `scripts/seo/gsc.mjs` starts
writing the Search Console slice of the command-center report.

**URL inspection (spot check).** `/ar/Learn/glossary/السيولة` — "URL is on
Google", indexed, breadcrumbs valid; the glossary duplicate-canonical rows are
not a page-level defect on this URL.
