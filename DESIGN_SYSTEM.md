# Starta Design System — the binding contract

**This file is law.** It is not a style guide to consult when convenient. Every
human and every AI agent that touches a user-facing surface in this repository
follows it exactly. Where this file and any other instruction disagree, **this
file wins.**

The system is not aspirational — it is a description of what the **landing page**
(`frontend/public/home.html`) and the public chrome already do. That surface is
canonical. When something else disagrees with it, the something else is the bug.

Most of what follows is **build-gated** in `frontend/scripts/verify-route-aliases.mjs`
and runs on `npm run verify:all`. A violation fails the build. The gates exist
because every rule below was, at some point, broken in production by someone who
believed they were doing the right thing.

---

## 1. The logo

There is **one** lockup: a **teal tile carrying the white letter `S`**, followed by
the wordmark **`STARTA`** in uppercase, display face, bold, `tracking-widest`.

**In React, you do not build it. You import it:**

```tsx
import { StartaLogo } from "@/components/brand/StartaLogo";

<StartaLogo size="sm" href="/" />                  // nav bars
<StartaLogo size="md" tone="onDark" href="/" />    // dark hero panels
<StartaLogo size="lg" />                           // standalone lockups
```

Static HTML pages carry the same markup inline (they cannot import React) and the
mobile drawer builds it in `frontend/public/assets/starta-mobile-nav.js`. All
three are gated against drift.

### Never

- **A stock icon as the mark.** Not `BarChart3`, `TrendingUp`, `Sparkles`, `Zap`,
  not any lucide glyph, not a bespoke SVG. A chart icon in a rounded square is
  what every other fintech ships; it is not this company's mark.
- **Mixed-case `Starta` as the wordmark.** The lockup is `STARTA`. (`Starta
  Markets` in prose, page titles and `aria-label` is fine — that is copy, not the
  wordmark.)
- **`tracking-tight` on the wordmark.** It is `tracking-widest`. The letterspacing
  is the wordmark.
- **A gradient tile.** The tile is flat `bg-starta-teal`.

**This was broken.** Five different marks shipped simultaneously: the landing page
and public chrome drew the `S` tile; `/login` drew a `BarChart3`; `/register`,
`/forgot-password` and `/settings` drew a `TrendingUp`; `/mobile` drew a bespoke
SVG. Two wordmark casings, three tracking values. A visitor signing in met a
different brand from the page they had just left.

## 2. The icon

The browser-tab icon, the home-screen icon and the in-page mark are **the same
mark**. They are generated from code — `frontend/app/icon.tsx` and
`frontend/app/apple-icon.tsx` — so they cannot drift apart silently the way two
checked-in PNGs did. `frontend/public/icon.svg` carries the same mark as a path.

Do not add a binary icon file. If the mark changes, it changes in those three
files in the same commit.

## 3. Typography

| Role | Face | Token |
| --- | --- | --- |
| Arabic — all of it | IBM Plex Sans Arabic | `--font-arabic` |
| Latin body | Manrope | `--font-manrope` / `--font-sans` |
| Latin display, static marketing pages | Sora | page-level |
| Figures, tickers, labels | IBM Plex Mono / JetBrains Mono | `--font-jetbrains` / `.font-mono` |

**Banned outright: Cairo, Tajawal, Almarai, Inter, Poppins, Lato, Open Sans.**
Cairo is named explicitly because it shipped as a second Arabic face for months
while every static page used IBM Plex, so one Arabic word had two shapes
depending on the route.

**The single policy lives in `frontend/public/assets/starta-typography.css`, and
every surface loads it** — all thirteen static pages and the React root layout.

- **Never declare a direction-based font policy anywhere else.** Not in a page,
  not in a component, not in another stylesheet.
- **A page may choose a display face for Latin headings. It may not choose a face
  for Arabic.**
- **Every new font stack names the Arabic face before its generic fallback.**
  Fallback is per glyph, so this is the only thing that rescues an Arabic word
  inside an otherwise Latin run — a language switch reading `العربية` on an
  English page, for instance.
- **Arabic that sits inside a Latin document gets `lang="ar"`.** It is what the
  contract keys on, and what a screen reader needs (WCAG 3.1.2).

**This was broken.** Four font policies disagreed, and Arabic lost: every Arabic
string on `/login`, `/register` and `/forgot-password` rendered in Manrope, which
has no Arabic glyphs, so the text fell back to an arbitrary system face.

## 4. Colour

Brand:

| Token | Value |
| --- | --- |
| `starta-teal` | `#14B8A6` |
| `starta-darkTeal` | `#0F766E` |
| `starta-accent` | `#2DD4BF` |

**`#13b8a6` is not the brand teal.** It is an off-brand near-duplicate that
differs by one digit and reads as a slightly different green beside the real one.
It is banned.

Surfaces and text follow the **theme tokens**, which resolve for light and dark
automatically:

`bg-page` · `bg-surface` · `bg-panel` · `text-main` · `text-muted` · `border-border`

- **Never hardcode a page or card surface.** `bg-white dark:bg-[#0B1121]`,
  `bg-slate-50`, `#f1f5f9` — each of these is one page deciding privately what
  the product looks like, and it is how `/settings` ended up on a background no
  other page used.
- Accents, badges, and chart series may use literal colours. Page chrome may not.

## 5. Chrome

- **The nav is `frontend/lib/nav.json`.** One definition; three renderers read it.
  Add or reorder items there and run `node scripts/sync-nav.mjs`.
- **The nav's appearance is `frontend/public/assets/starta-nav.css`**, loaded by
  all three renderers. The link row is a `>=1280px` affordance; below that the
  burger drawer carries the links.
- **Never style the nav with utility classes on a static page.** Every static page
  ships its own frozen Tailwind build, so a class that is not already in that
  build silently does nothing.

## 6. Language

The site's default language is **Arabic**. Two mechanisms, and you must know which
one a page uses:

1. **URL-based** — the page has a real `/ar` twin. The URL *is* the language.
   Server components take a `lang` prop; links go through `localizedHref`.
2. **Storage-based** — single-URL pages (`/login`, `/register`,
   `/forgot-password`, `/settings`, and the static pages). The language comes
   from `useStoredLang()` in React, and from `starta-lang-boot.js` on static
   pages. Both resolve it identically: `localStorage["starta-lang"]`, English
   only if the stored value is literally `"en"`, otherwise Arabic.

**Any new user-facing page must support both languages on day one.** A page that
renders English to a visitor who has been reading Arabic is a defect, not a
missing feature. Copy lives in a typed dictionary (see `lib/auth-i18n.ts`,
`lib/settings-i18n.ts`) so TypeScript refuses a half-translated screen.

Set `dir` and `lang` on the page root together, and remember the shape that broke
the auth pages: an RTL wrapper inside an LTR document is legitimate and must keep
working.

## 7. What "premium" means here

Not decoration. In order of weight: **craft, then usability, then ideas.**

- Type and spacing carry the design. A consistent scale beats an effect.
- One radius family and one shadow family per surface, used deliberately.
- Motion is functional: it explains a state change or it does not ship.
- Every figure on screen is real and sourced. No invented metrics, no fake
  testimonials, no placeholder logos.
- Copy is specific to this product. If a sentence would survive a find-and-replace
  of the company name, rewrite it.

## 8. Before you say a UI change is done

1. `npm run verify:all` passes.
2. You looked at the result **in a browser**, in **both languages**, at desktop
   and mobile widths. `curl` is not verification; a 200 is not verification.
3. You checked the computed values you changed — the actual font family, the
   actual colour — rather than assuming the CSS you wrote won the cascade. It has
   not, more than once.

---

### The gates

`frontend/scripts/verify-route-aliases.mjs` enforces: the typography contract is
intact and loaded everywhere; no banned typeface; the brand lockup carries no
stock icon and keeps its casing; the nav mirror matches `nav.json`; and the other
route, theme and i18n contracts this repo has accumulated. Each was verified
against deliberate breakage when it was written.

If you find yourself wanting to weaken a gate, the gate is not the problem.
