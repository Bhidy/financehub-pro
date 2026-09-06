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
import { HOME_PATH } from '@/lib/lang';

export type Lang = 'en' | 'ar';

/**
 * EXACT PATTERNS — the SAME algorithm, over the SAME generated list, as the
 * browser twin in public/assets/starta-lang-boot.js.
 *
 * This function used to prefix-match the flattened `routes` array, which is the
 * algorithm scripts/sync-ar-routes.mjs documents as abandoned ("It is NOT what
 * the click-time helper matches against any more") — the browser half was
 * migrated to exact patterns after prefix matching 404'd 4,584 article links;
 * this half never was. Live on 2026-09-06 the consequence was worse than a 404:
 *
 *   localizedHref('/News/858878-…', 'ar')  ->  '/ar/News/858878-…'
 *                                          ->  308 to '/News/858878-…'
 *
 * i.e. an Arabic page's own link bounced the reader OUT of the Arabic tree into
 * the English one — which is precisely the "the language changes when I open
 * another page" report. (app/ar/News/[id] carries an explicit `@ar-not-a-twin`
 * marker: Arabic and English articles are different articles, not translations,
 * so a news id must never be moved between the trees.) Prefix matching also
 * minted '/ar/markets', which is a hard 404.
 *
 * scripts/test-lang-contract.ts now runs both implementations over the whole
 * route corpus and fails the build the moment they disagree again.
 */
const AR_TWIN_PATTERNS: RegExp[] = arTwinRoutes.patterns.map((p) => new RegExp(p));

/** Prefix `/ar` when the language is Arabic AND the route has an Arabic twin. */
export function localizedHref(path: string, lang: Lang | string): string {
    if (lang !== 'ar') return path;
    const raw = String(path ?? '');
    if (raw.startsWith('/ar/') || raw === '/ar') return raw;

    // Split the query/hash off before matching, exactly as the browser twin
    // does, and re-attach it after — /Funds/Compare?ids=1,2&lang=ar must match
    // `^/Funds/Compare$`.
    let bare = raw;
    let rest = '';
    const cut = bare.search(/[?#]/);
    if (cut >= 0) {
        rest = bare.slice(cut);
        bare = bare.slice(0, cut);
    }
    if (bare.length > 1 && bare.endsWith('/')) bare = bare.slice(0, -1);

    // HOME IS ONE URL (lib/lang.ts R1). This branch used to return '/ar', which
    // is what put the nav's HOME link, the breadcrumb "الرئيسية" and the footer
    // "الرئيسية" on every Arabic page onto the 113 KB Arabic hub instead of the
    // 299 KB designed homepage — while the brand lockup in the same header
    // still pointed at '/'. '/' serves the designed homepage and resolves its
    // own language from storage, so an Arabic reader who clicks HOME lands on
    // the designed homepage IN ARABIC. Never reinstate the '/ar' mapping.
    if (bare === '' || bare === '/') return HOME_PATH + rest;

    for (const re of AR_TWIN_PATTERNS) {
        if (re.test(bare)) return `/ar${bare}${rest}`;
    }
    // Not a twinned route (single-URL pages keep their language via storage) —
    // never invent an /ar URL that would 404 or 308 back to English.
    return raw;
}
