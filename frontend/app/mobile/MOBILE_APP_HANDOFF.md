# Starta Markets — iOS App Transformation · HANDOFF

> **Read this first.** This is the authoritative handoff for the Starta Markets mobile app
> rebuild. It contains the full plan, what is done, what remains, the hard rules, the
> architecture, setup commands, and the verification + ship workflow. The previous session's
> plan file lived in a per‑account `.claude/plans/` dir (not portable), so everything you need
> is consolidated here.

Last updated after the **Phases 3–7 aggressive audit/hardening pass**, production Vercel deploy,
custom-domain alias, native archive, and TestFlight upload.

---

## 0. TL;DR for the next AI

You are rebuilding the **Starta Markets iOS app** to ultra‑premium, institutional‑grade,
world‑class quality. The app is a **bundled Capacitor app** (no remote webview) whose UI is a
single React component, built with Vite, calling the **production API directly**.

- The **only** feature reference is `https://startamarkets.com/` — specifically its **public
  pages** (`frontend/public/*.html`), NOT the `frontend/app/*` App‑Router terminal routes.
- A premium **design concept was built and approved** (5 screens). Reproduce it exactly in
  React, screen by screen, wired to real EGX data. Concept files: `frontend/public/_concept_*.html`
  and `frontend/public/_starta_concept.html` (view at `http://localhost:3000/_concept_*.html`).
- **Phases 1–7 are now rebuilt/hardened** against the approved concept and the no-fake-data rules.
- Production deployment completed and aliased to `startamarkets.com` / `www.startamarkets.com`.
- iOS build `1.0 (20260602)` was archived/exported and uploaded to App Store Connect/TestFlight; Apple
  reported the uploaded package is processing.

---

## 1. Non‑negotiable rules & requirements

1. **Scope = `startamarkets.com` public sections only.** Public nav is the source of truth:
   `Home | Mutual Funds | Market Pulse | Market News | Learn | Portfolio | About Us`.
   Implemented from `frontend/public/`: `home.html`, `marketplace.html`, `fund-details.html`,
   `fund-compare.html`, `news.html`, `news-article.html`, `learn.html`, `learn-topic.html`,
   `market-pulse.html`. **Ignore** the `frontend/app/` terminal routes (dashboard, screener,
   command-center, egx, symbol, insider-trading, analyst-ratings, earnings, economics,
   strategy, data-explorer) and the whole `finhub-pro/` tree — they are NOT this app.
2. **NO "Trade" feature** anywhere (already removed).
3. **NO locked/blurred/premium‑gated features.** Subscription tiers (Starter free / Analyst
   69 EGP / Institutional) may be *shown as information* only. Nothing is ever gated. (The old
   blurred "Starta Analyst / Unlock" panel was removed and replaced with real, free signals.)
4. **Dark AND light themes — both first‑class.** Light is the default. Every screen must look
   premium in both. Components use `--c-*` tokens that flip via `.stage[data-theme]`.
   **Verify every screen in both themes.**
5. **Bilingual EN + AR with full RTL.** Every string translated; `dir="rtl"` mirrors layout;
   IBM Plex Sans Arabic for Arabic. **Verify every screen in Arabic too.**
6. **Real charts matching the website.** The site uses inline **SVG area/line charts with
   gradient fills + tabular (mono) numbers + teal accent** (see `public/assets/market-pulse.js`).
   Use real OHLC/NAV data only — **no seeded/placeholder series anywhere**. Reuse `MiniChart`.
7. **Design bar = the approved concept** (`public/_concept_*.html`). Institutional dark navy +
   teal, Manrope display + mono data, generous spacing, app‑native (status/safe areas, 5‑tab
   bar, segmented controls, bottom sheets, glowing AI action), no clutter, readable type.

---

## 2. Architecture (how the app is built — important)

The app is **NOT** a remote webview anymore. It is a **bundled Capacitor app**:

```
Single React source ──┬─► Next.js route  /mobile        (app/mobile/page.tsx)  ← web/dev preview
 app/mobile/          │
 StartaMobileApp.tsx  └─► Vite bundle  mobile-native/dist  (mobile-native/entry.tsx) ← ships in the app
 mobile.module.css

Capacitor (capacitor.config.ts):  webDir = "mobile-native/dist"   (no server.url)
   iOS app loads the bundled UI from capacitor://localhost
   UI calls the production API DIRECTLY:  https://startamarkets.com/api/v1/*
```

- **Single source of truth:** `app/mobile/StartaMobileApp.tsx` (+ `mobile.module.css`) is
  imported by BOTH the Next route and the Vite entry. Edit it once; both update.
- **Direct API base:** `getJson()` prefixes every call with `API_BASE`, injected at build time
  via Vite `define: { __API_BASE__ }` (`vite.mobile.config.ts`). Web build → `""` (same‑origin);
  native bundle → `https://startamarkets.com`. Override with `MOBILE_API_BASE` env when testing.
- **CORS:** `next.config.ts` `headers()` adds `Access-Control-Allow-Origin: *` for `/api/:path*`
  so the bundled app (origin `capacitor://localhost`) can reach the prod API. **This must be
  deployed to production** for the shipped app's data to load (see §9).

---

## 3. Project structure & key files

Working dir (the startamarkets.com production frontend; Vercel project `finhub`, root dir `frontend`):
```
/Users/home/Documents/startamarkets/frontend
```

| Path | What it is |
| --- | --- |
| `app/mobile/StartaMobileApp.tsx` | THE app UI (one React file, ~2.1k lines). All screens + data layer. |
| `app/mobile/mobile.module.css` | All styles. Top = design tokens (dark/light). Bottom = **premium component library** (added this rebuild). |
| `app/mobile/page.tsx` | Next route that renders `StartaMobileApp` (web/dev preview at `/mobile`). |
| `app/mobile/MOBILE_APP_HANDOFF.md` | **This file.** |
| `mobile-native/index.html` | Bundle HTML shell (viewport-fit=cover, dark launch bg). |
| `mobile-native/entry.tsx` | Vite entry; mounts `StartaMobileApp`. |
| `mobile-native/public/` | Assets copied for the bundle: `assets/starta-mobile/{fonts,brand}`, `data/learn-topics.js`. |
| `mobile-native/dist/` | Build output → Capacitor `webDir`. (gitignored-ish; regenerated) |
| `vite.mobile.config.ts` | Vite config for the bundle (root=`mobile-native`, base=`./`, injects `__API_BASE__`). |
| `capacitor.config.ts` | `webDir: mobile-native/dist`, `ios.contentInset: never`, `backgroundColor: #070b14ff`, no `server.url`. |
| `next.config.ts` | Has the **CORS** `headers()` block for `/api/:path*` (deploy needed). |
| `ios/App/App.xcodeproj` | The Xcode (Capacitor) iOS project. |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` | Full‑bleed app icon (fixed; no black corners). |
| `scripts/build-app-icon.mjs` | Regenerates the icon with `sharp` from the brand mark. |
| `app/api/v1/sparklines/route.ts` | **NEW** batch stock sparklines (ohlc_data). |
| `app/api/v1/fund-sparklines/route.ts` | **NEW** batch fund NAV sparklines (nav_history). |
| `public/_concept_*.html`, `public/_starta_concept.html` | **Approved design concepts** (Market Pulse, stock, funds, portfolio, AI). `public/_concept.css` is their shared stylesheet. **Temp — delete before production deploy.** |
| `../docs/STARTAMARKETS_PUBLIC_SITE.md` | Authoritative public‑site + **Vercel deploy** guide (read before deploying). |

App Store Connect: **Bundle ID** `com.mubasher.startamarkets` · **SKU** `starta-markets-ios` ·
**Apple ID** `6775210873` · Team **Mubasher International** · TestFlight internal group "Bhidy List".

---

## 4. Setup & commands

Local dev server (Next + the real `/api/v1/*`, needs `.env.local` w/ `DATABASE_URL` — present locally):
```bash
cd "/Users/home/Documents/startamarkets/frontend"
npm run dev            # http://localhost:3000  (serves /mobile and /api/v1/*)
```
Build the native bundle:
```bash
# production (ships in the app) — API base = https://startamarkets.com
./node_modules/.bin/vite build --config vite.mobile.config.ts
# local testing (bundle hits your local API; dev server must send CORS — it does after the next.config edit)
MOBILE_API_BASE=http://localhost:3000 ./node_modules/.bin/vite build --config vite.mobile.config.ts
```
Preview the built bundle standalone:
```bash
./node_modules/.bin/vite preview --config vite.mobile.config.ts --port 4173   # http://localhost:4173
```
Sync into iOS + open Xcode:
```bash
npx cap sync ios
open ios/App/App.xcodeproj      # archive + upload to TestFlight from Xcode
```
Regenerate app icon (if brand changes): `node scripts/build-app-icon.mjs`

---

## 5. Verification workflow (use the Preview MCP — this is how Phase 1 was verified)

- `.claude/launch.json` exists at the **workspace root** with server `starta-frontend` (port 3000).
- `preview_start("starta-frontend")` → returns a `serverId`. `preview_resize(serverId, 428, 926)`
  (iPhone 13 Pro Max). Then drive the page with `preview_eval` and capture `preview_screenshot`.
- Point the preview browser at the **bundle** (`http://localhost:4173/`) for a clean render
  (no Next site‑shell), or the **Next route** (`http://localhost:3000/mobile`) for live data
  via same‑origin (note: the Next route wraps the app in the site shell, which adds a harmless
  lavender margin in screenshots — the bundle does not).
- Useful eval snippets (the preview has no real notch, so simulate safe areas):
  ```js
  const m = document.querySelector('main');
  m.style.setProperty('--safe-top','59px'); m.style.setProperty('--safe-bottom','34px'); // simulate notch
  m.setAttribute('data-theme','dark');    // verify DARK theme  (default is light)
  m.setAttribute('dir','rtl');             // verify RTL / Arabic
  // enter the app from the welcome screen:
  [...document.querySelectorAll('button')].find(b=>/already have an account/i.test(b.textContent||'')).click();
  ```
- The dev server tends to stop on session interrupts; just `preview_start` again. After editing
  `mobile.module.css`/TSX, the Next route hot‑reloads, but the **bundle must be rebuilt** (`vite build`)
  and the preview reloaded to see changes.

---

## 6. ✅ DONE (do not redo)

**Foundation**
- Full‑bleed native shell + `env(safe-area-inset-*)` everywhere (`.stage/.device/.screen/.tabbar/.auth/.aiOverlay`). Fixed the original black‑bars bug (was a phone‑in‑phone mockup + fake "9:41" bar + dark stage). Removed fake status bar + decorative orbs.
- **App icon** regenerated full‑bleed, opaque, no pre‑baked rounding/black corners (`AppIcon-512@2x.png`, `scripts/build-app-icon.mjs`).
- **Bundled Capacitor app**: `vite.mobile.config.ts`, `mobile-native/{index.html,entry.tsx,public}`, `capacitor.config.ts` (webDir=`mobile-native/dist`, no `server.url`, `contentInset:never`, dark `backgroundColor`).
- **Direct API**: `__API_BASE__` in `getJson`; **CORS** added in `next.config.ts` for `/api/:path*` (⚠ needs prod deploy).
- **Real charts everywhere**: batch endpoints `app/api/v1/sparklines` + `fund-sparklines`; helpers `loadSparklines`, `loadFundSparklines`, `loadPriceSeries`, `loadFundNav`; `MiniChart` guarded for empty data; removed `seededTrend` from `normalizeStock/Fund`; StockDetail uses real OHLC w/ working timeframe pills; FundDetail uses real NAV; portfolio trend computed from real holdings' OHLC.
- Removed **Trade** button + ALL **feature locks** → replaced with real free "Price Signals" (momentum/volatility/range/trend computed from the series).

**Phase 0 — design system**
- Institutional tokens in `.stage` + `.stage[data-theme="dark"]`: premium light canvas by default, navy dark mode (`#0F172A`/`#070b14`) + teal (`#14B8A6`/`#2dd4bf`), layered surfaces, shadows, radii, `--mono`. **Light is default.** Launch bg light.
- **Premium component library** appended to the bottom of `mobile.module.css`: `.appTop`, `.brandWrap/.logoTile/.brandTtl`, `.iconBtn2`, `.pushTop/.pushBack/.pushTtl`, `.secHead`, `.lblMono`, `.heroCard/.heroTopRow/.liveTag/.bigNum/.deltaRow/.deltaChip/.chartFull/.legendRow`, `.tfBar/.segBar` (+`.on`), `.gridTwo/.statTile`, `.breadthBar`, `.rangeBar`, `.listRow/.rowSym/.rowWho/.rowSpark/.rowPx`, `.btn2/.linkCard2`, `.up/.down/.brandText`. These flip dark/light via tokens and are RTL‑aware. **Use these for all new screens.**

**Design concept** — built + **APPROVED by the user** (5 screens). Files in `public/_concept_*.html`.

**Phase 1 — Market Pulse (flagship) — DONE & verified (dark+light, real data)**
- New components in `StartaMobileApp.tsx`: `BrandGlyph`, `MarketTopBar`, `IndexHero` (EGX30 + timeframes 1W/1M/3M/1Y/MAX slicing real `egxIndex.history`), `MarketScope` (breadth bar + volume/turnover/highs/lows from `market-summary`), `MoversPanel` (segmented Most Active/Gainers/Losers) + `MoverRow`, `MarketsScreen` (+ a Market News strip).
- **Nav consolidated to 5 tabs**: `TabId = "markets" | "funds" | "news" | "portfolio" | "more"`, default `"markets"`; AI is the FAB. Bilingual tab labels added (`markets`/`الأسواق`).
- Watchlist remains available as a pushed utility screen from Markets and More, not as a sixth primary tab.

---

## 7. ✅ PHASES 1–7 STATUS

- **Finish Phase 1 depth (`market-pulse.html`) — DONE:** Watchlist (Custom + Portfolio tabs, add/remove,
  persist locally), tap‑a‑stock **bottom‑sheet drawer**, live **ticker tape** strip.
- **Phase 2 — Mutual Funds** (`marketplace.html`/`fund-details.html`/`fund-compare.html`) — DONE / hardening pass verified:
  marketplace with search + filter chips (All/Equity/Sharia/Balanced/Fixed Income/Money Market) +
  sort + grid/table + **compare tray (up to 3)**; FundDetail with NAV chart, allocation, managers,
  distributors, factsheets/docs, guidelines, risk disclosures, buying/selling rules, FAQ; Compare page.
  Concept: `public/_concept_funds.html`. Data: `/api/v1/funds`, `/api/v1/funds/:id`, `/api/v1/funds/:id/nav`, `/api/v1/fund-sparklines`.
  Notes from this pass: no capped fund universe (all live funds are listed), no fabricated fund/news
  names, compare starts empty until the user selects funds, and charts render only from real NAV
  series. Missing NAV history uses explicit no-history states.
- **Phase 3 — Market News (`news.html`) — DONE / hardened:** real `/api/v1/news` list, categories,
  search, article reader, related stories, static Starta website cover only
  (`/assets/news-covers/{lang}-generic.webp`), and compact non-overlapping AI summary CTA.
- **Phase 4 — Portfolio (`portfolio.html`) — DONE / honest live-data state:** no generated portfolio
  values or charts when `/api/v1/portfolio/demo` returns no holdings; when holdings exist, portfolio
  trend is computed only from real holding OHLC/sparkline data. Allocation/risk/dividends use explicit
  empty states when a feed is not available.
- **Phase 5 — Learn/Academy (`learn.html`/`learn-topic.html`) — DONE:** bilingual 10-topic catalog
  from `/data/learn-topics.js`, no fake progress, no emoji topic icons, readable topic reader, and AI
  explanation entry point.
- **Phase 6 — AI Analyst — DONE / wired:** FAB + contextual Ask AI actions call `/api/v1/ai/chat`.
  The UI shows backend answers/cards only; if the API is unavailable, it says so and does not invent
  substitute analysis. AI card/message text is cleaned for app-native presentation.
- **Phase 7 — More/Auth/Settings — DONE / hardened:** auth gate is an honest local live-data entry
  (no fake OTP/register flow); More has no dead Help row; Alerts show a real empty state instead of
  fake alert rows; Settings marks push/biometric integrations disabled until native services exist;
  subscriptions remain informational only.
- **Cross‑cutting verification completed:** type check passed, native Vite bundle passed, live browser
  checked `/mobile` for tab gaps, scrolling, news cover assets, empty portfolio, Learn, More, Settings,
  and article AI CTA overlap. Light is default; dark/RTL tokens remain active.
- **Cleanup before production deploy:** delete `public/_concept*.html`, `public/_concept.css`,
  `public/_starta_concept.html` (temp) — DONE for the production deployment. Remove unused old
  screen components + their CSS during future cleanup passes if more dead styles are identified.

## 7.1 Latest Release — 2026-06-02

- Production deployment URL: `https://finhub-hmw3dmqy4-bhidys-projects.vercel.app`
- Aliases set successfully:
  - `https://startamarkets.com`
  - `https://www.startamarkets.com`
- Verified:
  - `https://startamarkets.com/mobile` returns `200`.
  - `/api/v1/market-summary` returns live EGX data from production.
  - `/api/v1/news?limit=1` returns live production news data.
  - In-app browser production audit at 430px mobile width: Home, Markets, Funds, News,
    Portfolio, and More loaded with no broken images and no document-level right-edge clipping.
    Reported overflow is limited to intentional horizontal rails (ticker, symbol rail, filter chips).
  - No temporary concept files were present in `frontend/public` before production deployment.
- Native:
  - `vite build --config vite.mobile.config.ts` passed.
  - `npx cap sync ios` passed.
  - Xcode archive succeeded at `/tmp/StartaMarkets.xcarchive`.
  - App Store Connect IPA export succeeded at `/tmp/StartaExport/App.ipa`.
  - Uploaded IPA summary: version `1.0`, build `20260602`, bundle `com.mubasher.startamarkets`, iOS Distribution certificate, `beta-reports-active = true`.
  - TestFlight upload succeeded; App Store Connect reported "Uploaded package is processing."

## 7.2 Current Senior QA Hardening Pass — 2026-06-02

Applied, verified, deployed to production, and uploaded to TestFlight:

- Global scroll hardening: Lenis is disabled for `/mobile`; app content uses native momentum scrolling with `touch-action: pan-x pan-y`; horizontal chip/ticker rails allow horizontal pan.
- Global clipping hardening: app box sizing/min-width guards, safe-area content padding, and automated mobile checks now report no right-edge clipped cards on Markets/Funds/News/More/RTL Settings.
- Light default restored and isolated to the mobile app via `starta-mobile-theme`; the web shell theme no longer forces dark mobile inputs.
- Market data now loads the richer public-site EGX stock feed: `/api/v1/egx/stocks?limit=300`, preserving Arabic names, market cap, and P/E. `market-summary` and static feeds use short in-app/server caching.
- News now requests Egyptian public-site news filters: `source_country=EG&days=90&limit=48`, includes Economy and Real Estate buckets, and uses Starta static category covers (`/assets/news-covers/{lang}-{bucket}.webp`) with generic fallback.
- Native asset parity: copied 250 stock logos and 90 Learn images into `mobile-native/public`, so bundled iOS builds do not fall back to initials or missing Learn art.
- Learn parity: catalog cards render public Learn covers; lesson pages render cover art, section imagery, and captions from `learn-topics.js`.
- Interaction fixes: shared back dispatcher closes AI, stock sheets, and pushed screens; Escape works in web preview; Capacitor back button is wired when available; stock sheet has a close button; AI same-seed prompts rerun and messages auto-scroll.
- RTL fixes: directional controls mirror in Arabic; financial mono/tabular typography is preserved for numbers after the Arabic font override; Settings switches no longer overflow in RTL.
- Funds honesty fix: fund risk is nullable and displays "Unavailable" when the feed does not publish a real risk field. No risk is inferred from returns/type.
- Fund comparison chart now renders selected funds as normalized multi-series performance on a shared chart with legend, instead of separate non-comparable sparklines.
- Home split from Market Pulse: Home starts with the live EGX index chart and ticker, and Market Pulse is a dedicated stock workspace page.
- Market Pulse workspace is selected-symbol driven, starts from COMI, and exposes company profile, quote detail, and AI briefing actions without duplicating Home Top Movers or News.
- Portfolio rebuilt against the public Portfolio benchmark: chart-first layout, live demo portfolio fallback, plus-icon tools panel, local manual holdings, CSV paste import, watchlist-to-portfolio starter, allocations, risk stats, AI insights, and live repricing from the EGX stock feed.
- Funds render performance was hardened with initial batching plus "Show more funds" instead of mounting all 163 fund cards at once.
- Primary shell now uses Home, Markets, Funds, News, Portfolio, More. Watchlist is available from Markets/More and pushed as its own screen.

Verification run:

- `npm run check-types -- --pretty false` — passed.
- `./node_modules/.bin/vite build --config vite.mobile.config.ts` — passed.
- `npm run build` — passed. Remaining warnings are existing site-wide Next metadata warnings and one existing chart-container warning outside the mobile app.
- Production Vercel deploy — passed and aliased to `startamarkets.com` / `www.startamarkets.com`.
- Xcode archive/export/upload — passed; App Store Connect/TestFlight processing started.
- Automated mobile QA at 430px — passed: Home/Markets/Funds/News/Portfolio/More load on production; no broken images; no document-level card clipping; intentional horizontal rails only.

Full continuation plan:

1. Wait for App Store Connect processing to finish, then assign build `1.0 (20260602)` to the internal TestFlight group "Bhidy List".
2. Install the processed TestFlight build on a real iPhone and re-check: launch, scroll feel, safe-area edges, light default, dark toggle, Arabic RTL, Home chart, Market Pulse stock workspace, Funds batching, News covers, Portfolio tools.
3. Add a small automated mobile regression script to CI/dev scripts for scroll, clipping, broken image, RTL, tab/push flows, and production API smoke checks.
4. Future polish candidates after real-device approval: deeper portfolio transaction editing, persisted multi-portfolio selection, and richer dividend/corporate-action portfolio states where real feeds exist.

---

## 8. Data layer / API (all real, same‑origin in prod)

Used by the app (via `getJson` → `API_BASE`):
`/api/v1/egx/stocks?limit=300`, `/api/v1/market-summary`, `/api/v1/egx30/index`, `/api/v1/funds?market=EGX`,
`/api/v1/funds/:id`, `/api/v1/funds/:id/nav`, `/api/v1/news`, `/api/v1/news-image`,
`/api/v1/ohlc/:symbol?period=1w|1m|3m|6m|1y`, `/api/v1/intraday/:symbol`,
`/api/v1/company-profile-v2?symbol=`, `/api/v1/financials/:symbol`, `/api/v1/ratios?symbol=`,
`/api/v1/shareholders?symbol=`, `/api/v1/corporate-actions?symbol=`, `/api/v1/portfolio/demo`,
`/api/v1/ai/chat`, plus the two NEW batch routes `/api/v1/sparklines?symbols=…&period=…` and
`/api/v1/fund-sparklines?ids=…&period=…`. All return real EGX data from the DB. Period values for
ohlc: `1w,1m,3m,6m,1y,3y,5y,max` (param is `period`).

---

## 9. Ship to TestFlight (final phase)

> **Use the one-command scripts. Do not hand-run `vercel` or `xcodebuild`.**

```bash
# 1. Deploy web changes to production (CORS header, /mobile route, etc.)
#    From the REPO ROOT (~/Documents/startamarkets):
./scripts/deploy-web.sh

# 2. Build + archive + upload the iOS app to TestFlight:
#    From the REPO ROOT:
./scripts/ship-ios.sh
```

`ship-ios.sh` does everything in step 2 automatically:
- Builds the Vite mobile bundle (`npm run build:mobile`)
- Syncs into the Capacitor iOS project (`cap sync ios`)
- **Auto-bumps the build number** (`max(current+1, YYYYMMDD)`) — no Xcode GUI needed
- Archives with `xcodebuild` (Release, distribution cert, automatic signing)
- Exports + uploads to TestFlight via the App Store Connect API key

After the upload succeeds, the script prints the exact `git commit` command to record the
build-number bump in the repo. Run it, then open a PR → merge.

**Sanity after TestFlight processing (~5–15 min):** install on a real iPhone → app opens to
Market Pulse with real data, full-bleed, no black bars, light default, themes + Arabic working.

**Key facts:**
- Bundle ID: `com.mubasher.startamarkets`
- API key: `~/.appstoreconnect/private_keys/AuthKey_53QD83W9UK.p8`
- iOS project: `frontend/ios/App/`
- Full rules: [`docs/DEPLOY_RUNBOOK.md`](../../../docs/DEPLOY_RUNBOOK.md)

---

## 10. Gotchas / notes

- `vite`/`@vitejs/plugin-react` are devDeps in `frontend/package.json` (React 19, Vite 8). The Vite
  build is **not** part of the Vercel `next build`; it's only for the native bundle.
- Fonts are **bundled** (offline‑safe): Sora (display), Manrope (UI), IBM Plex Mono (data),
  IBM Plex Sans Arabic — in `mobile-native/public/assets/starta-mobile/fonts/`. `--mono` =
  "IBM Plex Mono". (Concept HTML loads Manrope/JetBrains Mono from Google Fonts — that's the
  concept only; the app uses the bundled set.)
- `esbuild`/Vite do **not** type‑check (and Next has `typescript.ignoreBuildErrors`), so TS errors
  won't fail builds — but keep types honest. Some `summary.*` fields (e.g. `new_highs`) may not be
  on the `MarketSummary` type yet though they exist in the JSON; reads work at runtime.
- App icon must stay **opaque, full‑bleed, no alpha** (Apple requirement). iOS rounds corners itself.
- iOS is **portrait‑only**; the ≥600px CSS media query gives iPad a centered phone frame.
```
```
```
