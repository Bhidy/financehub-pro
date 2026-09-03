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
