# Starta Markets Public Site Architecture and Deployment

> **Authoritative guide for branded public pages on [startamarkets.com](https://startamarkets.com).**
> Read this document before making changes to the landing page, public funds, Learn, News, Market Pulse, language, theme, or production deployment.

## Critical Orientation

The production public site lives in:

```text
/Users/home/Documents/startamarkets/frontend
```

Do **not** assume that any legacy or separate Starta checkout is the source for `startamarkets.com`. This repository is the active source for the branded public production pages.

The live public pages are mostly static HTML pages under `frontend/public/`, served through Next.js rewrites. They are not the similarly named React App Router screens under `frontend/app/`.

## Production Identity

| Item | Value |
| --- | --- |
| Public domain | `https://startamarkets.com` |
| Hosting | Vercel |
| Vercel project | `finhub` |
| Project ID | `prj_EYpG42djOp1vEYI5BTadOreRFWC0` |
| Org ID | `team_Gqpf3K97tjrOCyIlEnGjWCOE` |
| Vercel Root Directory setting | `frontend` |
| Frontend framework | Next.js |
| Main config | `frontend/next.config.ts` |

## Public Route Map

These branded URLs are rewrite-served from files in `frontend/public/`:

| Public URL | Served file | Main purpose |
| --- | --- | --- |
| `/` | `public/home.html` | Branded landing page |
| `/Funds` | `public/marketplace.html` | Mutual funds marketplace |
| `/Fund` | `public/fund-details.html` | Fund detail view; fund is selected by query/state |
| `/Funds/Compare` | `public/fund-compare.html` | Selected fund comparison |
| `/Learn` | `public/learn.html` | Learning topic catalog |
| `/Learn/:slug` | `public/learn-topic.html` | Learning detail article |
| `/News` | `public/news.html` | Public news listing |
| `/News/:id` | `public/news-article.html` | Public news article |
| `/Market-Pulse` | `public/market-pulse.html` | EGX market dashboard |

Redirects defined in `frontend/next.config.ts`:

| Old URL | Canonical URL |
| --- | --- |
| `/home` | `/` |
| `/MarketPulse` | `/Market-Pulse` |

When investigating a public-page bug, start with the served HTML file above and its referenced assets. Do not begin in an App Router route with a similar name unless the requested URL is not in this table.

## Source Layout

```text
startamarkets/
├── index.html                         # Duplicate of public/home.html; must stay identical
├── docs/
│   └── STARTAMARKETS_PUBLIC_SITE.md   # This guide
└── frontend/
    ├── next.config.ts                 # Public URL rewrites and redirects
    ├── public/
    │   ├── home.html
    │   ├── marketplace.html
    │   ├── fund-details.html
    │   ├── fund-compare.html
    │   ├── learn.html
    │   ├── learn-topic.html
    │   ├── news.html
    │   ├── news-article.html
    │   ├── market-pulse.html
    │   ├── data/
    │   │   └── learn-topics.js        # Bilingual Learn article content and section images
    │   └── assets/
    │       ├── starta-theme.js        # Shared persisted public-site theme controller
    │       ├── market-pulse.css
    │       ├── market-pulse.js
    │       ├── news-public.css
    │       ├── news-public.js
    │       └── learn/                 # Learn covers and in-article illustrations
    └── scripts/
        └── verify-route-aliases.mjs   # Guards routes, theme inclusion, and home duplication
```

## Rendering Architecture

### Static Public Shell

The public site is implemented as static HTML pages enhanced with browser-side JavaScript and CSS. Next.js provides:

- Rewrites from branded paths to static files.
- Same-origin API routes under `/api/v1/...`.
- Vercel build and hosting.

This means public UI changes usually belong in `frontend/public/`, not in React components.

### Public Data Calls

Key page data dependencies:

| Page | Data used |
| --- | --- |
| Home and Funds marketplace | `/api/v1/funds?market=EGX` |
| Fund detail | `/api/v1/funds/:id`, `/api/v1/funds/:id/nav` |
| Fund compare | `/api/v1/funds?market=EGX&ids=...`, `/api/v1/funds/:id/nav` |
| Market Pulse | `/api/v1/egx/stocks`, `/api/v1/market-summary`, `/api/v1/egx30/index`, `/api/v1/egx/ohlc/:symbol`, `/api/v1/news` |
| News | `/api/v1/news`, `/api/v1/news-image` |
| Learn | Static content from `/data/learn-topics.js` |

### Home Page Duplication Rule

`frontend/public/home.html` is the file served through the `/` rewrite. The repository also contains `index.html`. They must remain byte-for-byte identical because `frontend/scripts/verify-route-aliases.mjs` rejects drift.

After changing home:

```bash
cp frontend/public/home.html index.html
```

## Theme System

All branded public pages must load this script early in `<head>`:

```html
<script src="/assets/starta-theme.js"></script>
```

Rules:

- Theme preference key: `localStorage.theme`.
- Supported values: `dark` and `light`.
- Default fallback: `dark`.
- The `<html>` element uses `data-theme="dark"` as its fallback, then the shared controller applies the saved preference before display.
- Theme buttons use `#themeToggle` or `[data-theme-toggle]`; the controller owns persistence and icon/accessibility synchronization.
- Do not add a page-local theme state manager or force a theme on navigation.

Styling guidance:

- Use each page's branded CSS variables and theme surfaces, such as `var(--c-surface)`, `var(--c-panel)`, `var(--surface)`, or `var(--surface-soft)`.
- Do not introduce fixed white backgrounds for cards, tables, charts, logo tiles, skeletons, or fallback media without a dark-mode counterpart.
- The Starta dark visual language is near-black/midnight surfaces with teal accents; the light visual language is clean warm-white surfaces with teal accents.

## Language System

Public bilingual pages use browser storage:

| Key | Use |
| --- | --- |
| `starta-lang` | Primary stored public-site language |
| `lang` | Compatibility value used by existing pages |

Rules:

- Values are `en` and `ar`.
- Arabic mode sets `document.documentElement.lang = "ar"` and `dir = "rtl"`.
- When a change is requested only for Arabic or only for English, edit only that language object's content/assets.

## Learn System

The Learn catalog and all detail articles are driven from:

```text
frontend/public/data/learn-topics.js
```

Each topic has:

- `slug`, `accent`, `icon`.
- Optional language-specific cover assets (`coverImageEn`, `coverImageAr`).
- Separate `en` and `ar` objects.
- `sections`, where an optional `image` object renders an in-content figure:

```js
image: {
  src: "/assets/learn/ar/topic/example.webp",
  alt: "Accessible description",
  caption: "Explanatory caption."
}
```

`frontend/public/learn-topic.html` renders the selected language content. Language-specific imagery should be attached only to the intended language section object. Do not replace or share English imagery when an Arabic-only update is requested.

Arabic article illustration directories:

```text
public/assets/learn/ar/stock-market/
public/assets/learn/ar/mutual-fund/
public/assets/learn/ar/nav/
public/assets/learn/ar/fund-types/
public/assets/learn/ar/risk-return/
public/assets/learn/ar/diversification/
public/assets/learn/ar/factsheet/
public/assets/learn/ar/dividends/
public/assets/learn/ar/support-resistance/
public/assets/learn/ar/investing-vs-trading/
```

Learn image performance rules:

- Displayed topic covers and section illustrations must use compressed `.webp` assets.
- New source artwork may begin as PNG or JPG, but do not reference it directly from `learn-topics.js`; export a compressed WebP copy first.
- Arabic card covers are stored under `public/assets/learn/covers-v5/ar/`; existing English covers are stored under `public/assets/learn/covers-v5/en/`.
- Arabic catalog cards display their lesson number as an overlay supplied by `learn.html`, so cover artwork does not need to embed the number.

## Market Pulse System

Source files:

```text
frontend/public/market-pulse.html
frontend/public/assets/market-pulse.css
frontend/public/assets/market-pulse.js
```

Important behavior:

- Live page path is `/Market-Pulse`, with the hyphen and capitalization used in navigation.
- Market Pulse uses same-origin `/api/v1/...` endpoints for EGX and news data.
- Theme is controlled by `starta-theme.js`; do not reintroduce theme storage logic inside `market-pulse.js`.
- Panel, chart, ticker, skeleton, logo, and news media backgrounds must use theme-aware surfaces.

## Public Header Navigation

The public desktop header menu is standardized across all branded pages in this order:

```text
Home | Mutual Funds | Market Pulse | Market News | Learn | Portfolio | About Us
```

Rules:

- `Home` navigates to `/`.
- The public news navigation label is `Market News` in English and `أخبار السوق` in Arabic.
- `Learn` follows `Market News`; `Portfolio` follows `Learn`.
- In Arabic mode (`dir="rtl"`), nav links must use `IBM Plex Sans Arabic` at `13px` with `letter-spacing: 0`. This is enforced via `html[dir="rtl"] .nav-links a` in `news-public.css` and `market-pulse.css`, and via `html[dir="rtl"] nav .font-mono a` in each Tailwind-based page's `<style>` block.
- Do not reintroduce `Features` or `Pricing` into the header navigation.
- The landing page may still contain feature and pricing content sections; this rule concerns the header menu only.

## Funds Compare Selection

The floating comparison tray belongs only to the current visit on `/Funds`.

Rules:

- The tray starts empty every time `/Funds` loads or is refreshed.
- Leaving `/Funds` clears the current floating-tray selection.
- Do not persist floating-tray selections in `localStorage`.
- Opening `/Funds/Compare` passes intentional selections through the `ids` URL query parameter; the comparison page must not reconstruct an old comparison from storage.

## Change Checklist

For changes to public site pages:

1. Confirm the target URL in the Public Route Map.
2. Edit the matching `frontend/public/` files and shared assets only.
3. Preserve bilingual separation: edit `ar` or `en` content only when requested.
4. Preserve shared theme persistence and use branded surface variables.
5. If `public/home.html` changed, synchronize `index.html`.
6. Do not include unrelated experiments, generated cache files, or backend scratch scripts in a production release.

## Verification Before Deployment

From the frontend directory:

```bash
cd "/Users/home/Documents/startamarkets/frontend"
npm run verify:routes
npm run build
```

For JavaScript asset edits, also syntax-check the modified scripts, for example:

```bash
node --check public/assets/starta-theme.js
node --check public/assets/market-pulse.js
node --check public/data/learn-topics.js
```

Also run from the repository root:

```bash
cd "/Users/home/Documents/startamarkets"
git diff --check
git status --short
```

Before deploying, read `git status --short`. This workspace often contains unrelated local work. A deployment must contain only approved intended changes.

## Production Deployment

### Critical Rule: Deploy From Repository Root

Vercel is configured with `frontend` as the project Root Directory. Therefore deployment input must contain a `frontend/` directory.

- Correct deployment root: `/Users/home/Documents/startamarkets`
- Incorrect deployment root: `/Users/home/Documents/startamarkets/frontend`

Deploying from inside `frontend` causes Vercel to look for `frontend/frontend` and fail with a missing-path error.

### Standard Deployment From a Clean Intended Worktree

Only use this when the repository root contains exactly the intended release content:

```bash
cd "/Users/home/Documents/startamarkets"

# If the repository root has not yet been linked locally, link it to the
# existing Vercel project "finhub" first. The generated .vercel directory is ignored.
./frontend/node_modules/.bin/vercel link --yes

# Deploy the repository root; Vercel builds frontend/ according to project settings.
./frontend/node_modules/.bin/vercel deploy --prod --yes
```

Verify that the link points to the existing `finhub` project, not a new project:

```text
projectId: prj_EYpG42djOp1vEYI5BTadOreRFWC0
orgId: team_Gqpf3K97tjrOCyIlEnGjWCOE
```

### Deployment From a Dirty Worktree

Do not blindly deploy the entire repository when unrelated files are modified or untracked. Use a clean release directory assembled from the intended tracked baseline plus only the approved changed public-site files. The release directory must have this shape:

```text
release-root/
├── .vercel/project.json   # Links to existing finhub project
├── index.html             # Include when home.html is part of the release
└── frontend/              # Next.js project and intended public-site changes
```

Then deploy from `release-root`, never from its `frontend/` child:

```bash
./frontend/node_modules/.bin/vercel deploy --prod --yes
```

### Successful Production Result

A completed Vercel production deployment should end with output that includes an alias to:

```text
https://startamarkets.com
```

### Custom Domain Resolution and Cache-Busting Protocol

To prevent situations where production updates are not visible on the live `https://startamarkets.com` custom domain even after a successful build, always follow this protocol:

1. **Bust the CDN & Browser Caches**:
   - Aggressive Edge Caching is active on Vercel's global CDN and inside user browsers for static public assets under `frontend/public/assets/` (like `market-pulse.js` and `market-pulse.css`).
   - **Rule**: Whenever you modify any static JavaScript or CSS file, you **must** increment the query version parameter (`?v=X.X.X`) inside the referencing HTML script and stylesheet tags (e.g., inside `market-pulse.html`). Increment it sequentially (e.g., from `?v=1.1.3` to `?v=1.1.5`).
   
2. **Git Branch Alignment (Vercel Integration)**:
   - Vercel's automated Git pipeline is tied to the `main` branch. Pushing commits directly to `main` on GitHub triggers a secure, remote production build that updates the `https://startamarkets.com` deployment.
   - Always commit and push changes:
     ```bash
     git commit -am "Fix: refinement changes"
     git push origin main
     ```

3. **Verify and Resolve Static Custom Domain Aliases**:
   - Sometimes, the custom domains (`startamarkets.com` and `www.startamarkets.com`) might be statically aliased to an older deployment instead of the production branch deployment on Vercel.
   - To check active aliases and resolve them to the latest deployment URL:
     ```bash
     # List all active aliases
     ./frontend/node_modules/.bin/vercel alias list

     # Explicitly bind the live domains to the latest deployment URL
     ./frontend/node_modules/.bin/vercel alias set <latest-deployment-url> startamarkets.com
     ./frontend/node_modules/.bin/vercel alias set <latest-deployment-url> www.startamarkets.com
     ```

> **MANDATORY POST-DEPLOY ALIAS STEP — Never skip this.**
>
> Every deployment (via `vercel deploy --prod` OR via `git push origin main`) produces a new unique URL like `finhub-xxxxxxx-bhidys-projects.vercel.app`. Unless this URL is explicitly aliased to `startamarkets.com`, the live custom domain silently keeps serving the **old deployment**.
>
> This is the most common root cause of "nothing changed on the site" even when the build succeeded.
>
> **Always run these commands after every deployment:**
> ```bash
> # 1. Get the latest deployment URL
> ./frontend/node_modules/.bin/vercel ls --scope bhidys-projects 2>&1 | grep finhub | head -3
>
> # 2. Alias both domains to the newest URL
> ./frontend/node_modules/.bin/vercel alias set <latest-deployment-url> startamarkets.com
> ./frontend/node_modules/.bin/vercel alias set <latest-deployment-url> www.startamarkets.com
> ```
>
> **Verify the alias is live:**
> ```bash
> curl -s "https://startamarkets.com/Market-Pulse" | grep "v=1.1.X"
> ```
> Replace `v=1.1.X` with the version tag deployed. If the grep returns output, the alias is working correctly.

## Do Not Confuse These Systems

| Looking for | Correct location |
| --- | --- |
| `startamarkets.com/Market-Pulse` public branded page | `startamarkets/frontend/public/market-pulse.html` |
| `startamarkets.com/Learn` public branded page | `startamarkets/frontend/public/learn.html` |
| Public route wiring | `startamarkets/frontend/next.config.ts` |
| Public Vercel deployment | `startamarkets`, deploying its `frontend/` root setting |
| Separate/legacy similarly named project | `finhub-pro/startamarkets` - do not edit for these public URLs |

## Last Confirmed Deployment

### May 27, 2026 — Market Pulse Portfolio Tab & Movers Relocation (v1.1.6)

Deployment URL: `https://startamarkets.com`
Aliased to: `startamarkets.com` and `www.startamarkets.com` via `vercel alias set`.
Commit: `224e53a` on `origin/main`.

Changes included:
- `My Portfolio` tab added to Watchlist panel with glassmorphic premium select dropdown
- `Most Active` tab relocated from Watchlist to Movers panel (right rail) as the default tab
- `+` button redirects to `/Portfolio` when `My Portfolio` tab is active
- Portfolio holdings rendered as clickable rows from `localStorage` via `PFStore`
- All assets versioned to `?v=1.1.6` for cache busting
- `portfolio-store.js` added as explicit script dependency in `market-pulse.html`

Post-deployment verification confirmed via `curl` that HTML contains `portfolioSelect`, `my_portfolio` tab, `portfolio-store.js?v=1.1.6`, and `market-pulse.js?v=1.1.6`.

**Root cause note**: Deployment was initially invisible because `startamarkets.com` was still aliased to a 21-day-old deployment. Fixed by explicitly running `vercel alias set` after deployment. This step is now documented as mandatory in the Custom Domain Resolution section above.

---

### May 25, 2026 — Nav & Arabic Font Standardization

Production deployment to the Vercel `finhub` project aliased to `https://startamarkets.com`. Included:

- Portfolio link added to header nav on all pages that were missing it: `learn.html`, `learn-topic.html`, `marketplace.html`, `fund-details.html`, `fund-compare.html`.
- Arabic nav font standardized to `IBM Plex Sans Arabic` at `13px` across all pages.

Deployment used a clean release directory (excluded unrelated dirty files).
