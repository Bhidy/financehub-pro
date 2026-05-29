# Starta Markets Public Site Instructions

For any request involving `https://startamarkets.com`, its public pages, light/dark theme, Arabic/English content, Learn, Funds, News, Market Pulse, or production deployment:

1. Read [`docs/STARTAMARKETS_PUBLIC_SITE.md`](docs/STARTAMARKETS_PUBLIC_SITE.md) before inspecting or changing code.
2. Treat `frontend/public/` plus `frontend/next.config.ts` in this repository as the source for the branded public URLs.
3. Do not edit `/Users/home/Documents/Info Site/finhub-pro/startamarkets` for those public pages unless the user explicitly names that separate project.
4. Deploy the Vercel public site from this repository root, never from `frontend/`, because Vercel already uses `frontend` as its configured Root Directory.
5. Review dirty/untracked files before deployment and include only the intended approved release changes.
