# SEO Operations Runbook

The living checklist that keeps the 2026-07 SEO foundation healthy. Owner column: Dev / Content / Marketing / Leadership.

## Weekly (30 min, Monday)
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
