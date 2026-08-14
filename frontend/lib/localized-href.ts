/**
 * CANONICAL LINK LOCALIZER (React side).
 *
 * Server routes carry the language in the URL (`/Learn/x` ↔ `/ar/Learn/x`).
 * Any link built from a bare path silently drops an Arabic reader onto the
 * English page — which is exactly what happened when the nav started rendering
 * from lib/nav.json with `href={item.href}`: on /ar/Calculators every nav item
 * pointed at the English route.
 *
 * The twin-route list is DERIVED from app/ar/** (scripts/sync-ar-routes.mjs),
 * so it cannot drift from the routes that exist. The browser twin of this
 * function lives in public/assets/starta-lang-boot.js.
 *
 * RULE: never interpolate a raw path into an href on a bilingual surface.
 * Pass it through here.
 */
import arTwinRoutes from '@/lib/ar-twin-routes.json';

export type Lang = 'en' | 'ar';

const AR_TWIN_ROUTES: string[] = arTwinRoutes.routes;

/** Prefix `/ar` when the language is Arabic AND the route has an Arabic twin. */
export function localizedHref(path: string, lang: Lang | string): string {
    if (lang !== 'ar') return path;
    if (path.startsWith('/ar/') || path === '/ar') return path;
    const twinned = AR_TWIN_ROUTES.some(
        (route) => path === route || path.startsWith(`${route}/`) || path.startsWith(`${route}?`),
    );
    // Not twinned (static single-URL pages keep language via storage) — never
    // invent an /ar URL that would 404.
    return twinned ? `/ar${path}` : path;
}
