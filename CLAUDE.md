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
  `node scripts/sync-nav.mjs` after editing it.
- **Language** — the site default is Arabic. Every user-facing page ships both
  languages on day one, with copy in a typed dictionary.

These are build-gated in `frontend/scripts/verify-route-aliases.mjs`. Run
`npm run verify:all` from `frontend/` before claiming any UI work is done, and
verify the result **in a browser, in both languages** — a passing build and an
HTTP 200 have both certified broken pages in this repo before.

## Deploying

`./ship.sh "message" --verify` from the repo root is the deploy path (commits,
pushes to `main`, Vercel builds from the push). Never run `vercel` or
`vercel --prod` directly — a manual CLI deploy races the Git-integration build.
After deploying, confirm the change is actually live rather than trusting the
verify output.
