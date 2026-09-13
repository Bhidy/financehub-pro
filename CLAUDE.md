# startamarkets — project instructions

## ⛔ Read DESIGN_SYSTEM.md before touching any user-facing surface

[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) in this directory is the **binding brand
and UI contract** for this repository. Read it in full before changing anything
that renders to a user — a page, a component, a stylesheet, an icon, a piece of
copy. It outranks every other instruction, including any general design skill or
personal preference, and it is not optional or advisory.

The short version, so a mistake is obvious even before you open it:

- **Logo** — one lockup: a teal `#14B8A6` tile with the white letter `S`, plus the
  wordmark `STARTA` in uppercase, display face, `tracking-widest`. In React,
  import `@/components/brand/StartaLogo`; never rebuild it, and never put a
  lucide icon (`BarChart3`, `TrendingUp`, `Sparkles`, …) inside a brand tile.
- **Icon** — the tab icon, home-screen icon and in-page mark are the same mark,
  generated from `frontend/app/icon.tsx` and `frontend/app/apple-icon.tsx`. Do not
  add a binary icon file.
- **Fonts** — Arabic is IBM Plex Sans Arabic, Latin body is Manrope, static
  marketing display is Sora, figures are IBM Plex Mono / JetBrains Mono. Cairo,
  Tajawal, Almarai, Inter, Poppins, Lato and Open Sans are banned. The one font
  policy is `frontend/public/assets/starta-typography.css`; never write a second
  one in a page or component.
- **Colour** — `#14B8A6` is the brand teal. `#13b8a6` is not (it is an off-brand
  near-duplicate and is banned). Page and card surfaces use the theme tokens
  `bg-page` / `bg-surface` / `bg-panel` / `text-main` / `text-muted` /
  `border-border`, never hardcoded hex or `slate-*`.
- **Nav** — defined once in `frontend/lib/nav.json`; run
  `node scripts/sync-nav.mjs` after editing it. Three renderers read it —
  `components/SiteNav.tsx`, `components/seo/PublicPageShell.tsx` and
  `public/assets/starta-nav.js`. **Never write a fourth.** A repo-wide gate
  fails the build when any file names three or more nav destinations in literal
  hrefs, because a fourth nav is how `/ar/symbol/[id]` shipped Arabic labels
  over English links.
- **Links on a bilingual page** — never build an href from a bare path. Pass it
  through `localizedHref(path, lang)` (React) or `window.startaLocalizedHref`
  (static). `components/i18n/LangLinkGuard.tsx` catches what you forget at click
  time on every React route; a link that crosses to the other language ON
  PURPOSE must carry `data-lang-switch` or `hrefLang="en"` so the guard leaves
  it alone. `npm run verify:arlinks` audits the deployed site.
- **Language** — the site default is Arabic. Every user-facing page ships both
  languages on day one, with copy in a typed dictionary.

These are build-gated in `frontend/scripts/verify-route-aliases.mjs`. Run
`npm run verify:all` from `frontend/` before claiming any UI work is done, and
verify the result **in a browser, in both languages** — a passing build and an
HTTP 200 have both certified broken pages in this repo before.

## ⛔ The site never names its data vendor

No user-facing surface may disclose where the data is bought. One server-only
policy owns this — [`frontend/lib/vendor-privacy.ts`](frontend/lib/vendor-privacy.ts) —
and it is applied at the DATA BOUNDARY (the API routes and the security-master
generator), never at render time, so nothing downstream has to remember.

- A client component must never import `lib/vendor-privacy` or `lib/news-display`:
  their patterns name the vendor and would be inlined into the browser bundle.
  Client code uses [`lib/news-display.client.ts`](frontend/lib/news-display.client.ts).
- A news cover is addressed by OUR article id (`/api/v1/news-image?id=…`), never
  by the publisher's URL.
- An upstream URL becomes an href, a citation or a JSON-LD `isBasedOn` only
  through `publicUrl()` / `publicUrls()`.
- THE ONE EXCEPTION: six FRA-licensed funds and two licensed managers carry the
  vendor's name inside their own REGISTERED name. They are public market data
  and stay published verbatim — renaming a registered fund would falsify it.
  They are allow-listed BY EXACT STRING in the gate and nowhere else.
- `مباشر` is also the ordinary Arabic word for "direct"/"live". Do not blanket-
  remove it; the gate carries a reviewed list of adjectival collocations.

Build-gated by `npm run verify:vendor` (static scan + detector self-test) and
`npm run verify:vendor-runtime` (boundary tests), both in `verify:all`. Before
claiming a vendor fix is done, run the live crawl:
`node scripts/verify-vendor-privacy.mjs --live`.

## Deploying

`./ship.sh "message" --verify` from the repo root is the deploy path (commits,
pushes to `main`, Vercel builds from the push). Never run `vercel` or
`vercel --prod` directly — a manual CLI deploy races the Git-integration build.
After deploying, confirm the change is actually live rather than trusting the
verify output.
