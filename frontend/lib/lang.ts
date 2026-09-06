/**
 * ============================================================================
 * THE LANGUAGE AND HOME CONTRACT — one file, one truth, for the whole site.
 * ============================================================================
 *
 * This repository renders its public pages through FIVE different surfaces:
 *
 *   1. static HTML files            (public/*.html + assets/starta-lang-boot.js)
 *   2. designed shells re-served    (lib/static-hub.ts route handlers)
 *   3. the SEO React shell          (components/seo/PublicPageShell.tsx)
 *   4. the app React nav            (components/SiteNav.tsx)
 *   5. standalone client pages      (SymbolPageClient, /login, /settings, …)
 *
 * Every one of them has to answer the same two questions — "where is home?"
 * and "what language am I?" — and every one of them used to answer them with
 * its own copy of the rule. They drifted, and the two defects this file exists
 * to make impossible are what drift produced:
 *
 *   DEFECT 1 (2026-09-06, production)
 *     `localizedHref('/', 'ar')` returned "/ar", so on every Arabic React page
 *     the nav's HOME link, the breadcrumb's "الرئيسية" and the footer's
 *     "الرئيسية" all pointed at /ar — a 113 KB text hub — while the brand
 *     lockup in the SAME header pointed at "/", the 299 KB designed homepage.
 *     The browser twin of the same helper (starta-lang-boot.js) did NOT do
 *     this, so static pages and React pages disagreed about where home is.
 *
 *   DEFECT 2 (same audit)
 *     Persisting the URL-derived language was OPT-IN (`persistLang`). 35 of 59
 *     shell call sites did not opt in, and the English hub routes did not seed
 *     at all, so `localStorage['starta-lang']` drifted away from the URL and
 *     the next single-URL page a visitor opened rendered in the OTHER language.
 *
 * RULES (all four are build-gated in scripts/verify-route-aliases.mjs and
 * executed in scripts/test-lang-contract.ts):
 *
 *   R1  HOME IS ONE URL: "/". It is never language-prefixed. `/` serves the
 *       designed homepage and resolves its own language from storage, so an
 *       Arabic reader who clicks HOME gets the designed homepage IN ARABIC.
 *       /ar is the Arabic section hub ("البورصة المصرية اليوم"), not home, and
 *       nothing may link to it as home.
 *
 *   R2  ARABIC IS THE DEFAULT. Absent a stored preference the language is "ar".
 *       Only the literal string "en" selects English.
 *
 *   R3  A PAGE THAT KNOWS ITS LANGUAGE FROM ITS URL MUST WRITE IT DOWN.
 *       Every /ar/* and every English-twin surface seeds the same storage keys
 *       and cookie before first paint, unconditionally — never opt-in.
 *
 *   R4  ONE RESOLVER. Storage is read with `resolveStoredLang` (or its verbatim
 *       browser twin in starta-lang-boot.js) and nowhere else. A hand-written
 *       `localStorage.getItem('lang') || 'en'` is a defect, not a shortcut.
 */

export type Lang = 'en' | 'ar';

/** R1 — the ONE home URL, in every language, on every surface. */
export const HOME_PATH = '/';

/** R2 — the site's default language when nothing is stored. */
export const DEFAULT_LANG: Lang = 'ar';

/** Canonical storage key. */
export const LANG_STORAGE_KEY = 'starta-lang';
/** Legacy key, still honoured for visitors whose preference predates the rename. */
export const LANG_LEGACY_KEY = 'lang';
/** Cookie mirror (same value, one year) so a server surface could read it. */
export const LANG_COOKIE = 'starta-lang';

/**
 * R4 — the ONE rule that turns a stored value into a language.
 * Deliberately asymmetric: anything that is not exactly "en" is Arabic, so a
 * cleared, corrupted or absent value can only ever fall back to the default.
 */
export function resolveStoredLang(raw: string | null | undefined): Lang {
    return raw === 'en' ? 'en' : DEFAULT_LANG;
}

/** True for the site's home URL in any of its equivalent spellings. */
export function isHomePath(path: string | null | undefined): boolean {
    const p = String(path ?? '').split(/[?#]/)[0];
    return p === '' || p === '/' || p === '/ar' || p === '/ar/';
}

/**
 * R3 — the pre-paint seed. Emitted by every surface whose language comes from
 * its URL, in BOTH languages. Writing only the Arabic side (which is what the
 * hub routes did) turns storage into a one-way ratchet: a reader who chose
 * English keeps being flipped back to Arabic by any /ar URL they open.
 */
export function langSeedScriptBody(lang: Lang): string {
    return (
        `try{localStorage.setItem('${LANG_STORAGE_KEY}','${lang}');` +
        `localStorage.setItem('${LANG_LEGACY_KEY}','${lang}');` +
        `document.cookie='${LANG_COOKIE}=${lang};path=/;max-age=31536000;samesite=lax';}catch(e){}`
    );
}

/** The same seed as a complete `<script>` element, for raw-HTML surfaces. */
export function langSeedScript(lang: Lang): string {
    return `<script>${langSeedScriptBody(lang)}</script>`;
}

/**
 * The breadcrumb's first crumb, for every bilingual page.
 *
 * Twenty render files each hand-wrote `{ href: isAr ? '/ar' : '/', … }`, which
 * is how the Arabic breadcrumb kept pointing at the hub after the nav was
 * fixed. There is now one definition and the hand-rolled ternary is banned by
 * a build gate.
 */
export function homeCrumb(lang: Lang): { href: string; url: string; label: string } {
    return { href: HOME_PATH, url: HOME_PATH, label: lang === 'ar' ? 'الرئيسية' : 'Home' };
}
