/**
 * Central SEO constants + helpers.
 * SINGLE SOURCE OF TRUTH for the canonical origin and for slug/URL building —
 * sitemaps, route handlers and page metadata must all import from here so a
 * slug can never drift between the sitemap and the page that serves it.
 */

export const SITE_URL = 'https://startamarkets.com';
export const SITE_NAME = 'Starta Markets';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

/**
 * SHARED OPEN GRAPH DEFAULTS — spread into every page-level `openGraph` block.
 *
 * In Next.js a page's `openGraph` object REPLACES the layout's rather than
 * merging with it. 29 of 39 templates declared their own block without an
 * `images` key, so each of them shipped no social/SERP thumbnail at all while
 * the root layout's default sat unused. Spreading this first makes the image
 * and site name impossible to drop, and keeps the values in ONE place.
 *
 * Segments that render a data-rich card of their own (a fund's NAV, a stock's
 * quote) use the `opengraph-image` file convention instead and must NOT spread
 * this — see lib/og.tsx.
 */
// Not `as const`: Next's OGImage[] is mutable, and a readonly tuple fails to
// assign to it.
export const OG_DEFAULTS = {
    siteName: SITE_NAME,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
};

/** The two public site languages. Arabic is the site's default language:
 *  x-default hreflang points at the Arabic twin, and the static pages fall
 *  back to Arabic when no stored preference exists. */
export type SiteLang = 'en' | 'ar';

/**
 * Unicode-safe slugifier (Arabic + Latin). Keeps letters/numbers of any
 * script, collapses everything else to single dashes, caps length at a word
 * boundary. Deterministic: same input → same slug forever (URLs are contracts).
 */
export function slugify(input: string | null | undefined, maxLen = 80): string {
    if (!input) return '';
    const slug = input
        .toLowerCase()
        .normalize('NFKC')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
    if (slug.length <= maxLen) return slug;
    const cut = slug.slice(0, maxLen);
    const lastDash = cut.lastIndexOf('-');
    return (lastDash > 40 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '');
}

/**
 * Arabic-canonical slugifier. Strips presentation-only codepoints (tatweel,
 * harakat/diacritics, superscript alef) BEFORE slugifying so a vowelized copy
 * edit ("مُتوازن" vs "متوازن") can never fork a URL, then applies the same
 * deterministic slugify. Used ONLY for the /ar/* canonical slugs — the base
 * slugify() behavior is a frozen contract for existing EN/news URLs.
 */
export function arabicSlug(input: string | null | undefined, maxLen = 80): string {
    if (!input) return '';
    const stripped = input.normalize('NFKC').replace(/[\u0640\u064B-\u065F\u0670]/g, '');
    return slugify(stripped, maxLen);
}

/**
 * Canonical news-article path, IN THE TREE THAT MATCHES THE ARTICLE'S OWN
 * LANGUAGE:
 *   en → /News/{id}-{slug}
 *   ar → /ar/News/{id}-{arabic-slug}
 *
 * The news feed is genuinely bilingual — 2,033 Arabic articles and 2,552
 * English ones, which are DIFFERENT articles, not translations. So this is not
 * a mirrored tree and the two sides are never hreflang alternates: an article
 * exists in exactly one language and therefore at exactly one URL. Serving an
 * Arabic article from /News meant shipping Arabic text under <html lang="en">,
 * because the root layout derives the document language from the URL.
 *
 * The slug derives from the headline, so Arabic articles already carry Arabic
 * slugs. Bare /News/{id} and any wrong-tree or stale-slug form 308 here.
 */
export function newsPath(id: number | string, headline?: string | null, lang: SiteLang = 'en'): string {
    const slug = slugify(headline);
    const base = lang === 'ar' ? '/ar/News' : '/News';
    return slug ? `${base}/${id}-${slug}` : `${base}/${id}`;
}

/**
 * Canonical fund path, per language:
 *   en → /Funds/{fund_id}-{en-slug}
 *   ar → /ar/Funds/{fund_id}-{arabic-slug}   (falls back to the EN slug when
 *        the fund has no Arabic name — never an empty slug segment)
 * The route is ID-keyed, so a stale/foreign slug always resolves and 308s to
 * this canonical — changing the AR slug is self-healing for old URLs.
 */
export function fundPath(
    fundId: number | string,
    nameEn?: string | null,
    nameAr?: string | null,
    lang: SiteLang = 'en'
): string {
    const slug = lang === 'ar' ? arabicSlug(nameAr) || slugify(nameEn) : slugify(nameEn || nameAr);
    const prefix = lang === 'ar' ? '/ar' : '';
    return slug ? `${prefix}/Funds/${fundId}-${slug}` : `${prefix}/Funds/${fundId}`;
}

/** Canonical Learn-topic path: /Learn/{slug} | /ar/Learn/{arabic-slug}.
 *  slugEn is the topic's stable catalogue key; the AR slug derives from the
 *  Arabic title (EN slug fallback keeps the URL resolvable regardless). */
export function learnPath(slugEn: string, titleAr?: string | null, lang: SiteLang = 'en'): string {
    if (lang === 'ar') return `/ar/Learn/${arabicSlug(titleAr) || slugEn}`;
    return `/Learn/${slugEn}`;
}

/** Canonical glossary-term path: /Learn/glossary/{slug} | /ar/Learn/glossary/{arabic-slug}. */
export function glossaryPath(slugEn: string, termAr?: string | null, lang: SiteLang = 'en'): string {
    if (lang === 'ar') return `/ar/Learn/glossary/${arabicSlug(termAr) || slugEn}`;
    return `/Learn/glossary/${slugEn}`;
}

/** Canonical sector path: /sectors/{en-slug} | /ar/sectors/{arabic-slug}.
 *  Both slugs derive from names (EN from the DB sector_name, AR from the
 *  hand-authored Arabic display name); pages resolve either form and 308 to
 *  the canonical for the tree they serve. */
export function sectorPath(sectorNameEn: string, sectorNameAr?: string | null, lang: SiteLang = 'en'): string {
    if (lang === 'ar') return `/ar/sectors/${arabicSlug(sectorNameAr) || slugify(sectorNameEn)}`;
    return `/sectors/${slugify(sectorNameEn)}`;
}

/**
 * Build-time collision gate for slug-keyed localized routes. Call from
 * generateStaticParams with the UNION of EN + AR slugs for a family: any
 * duplicate would make two documents claim one URL (or an alias resolve to
 * the wrong document), so the build must fail loudly, not ship it.
 */
export function assertUniqueSlugs(family: string, slugs: string[]): void {
    const seen = new Map<string, number>();
    for (const s of slugs) seen.set(s, (seen.get(s) ?? 0) + 1);
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([s]) => s);
    if (dupes.length > 0) {
        throw new Error(
            `[seo] ${family}: slug collision(s) across EN/AR slugs: ${dupes.join(', ')} — ` +
                'disambiguate the colliding titles/terms before shipping.'
        );
    }
}

/** Canonical symbol path: /symbol/{SYMBOL} (uppercase enforced by middleware).
 *  The ENGLISH contract, frozen — thousands of indexed URLs depend on it. */
export function symbolPath(symbol: string): string {
    return `/symbol/${(symbol || '').toUpperCase()}`;
}

/** True when a string actually contains Arabic script (not merely non-empty).
 *  Three rows in market_tickers carry an ENGLISH company name in name_ar; a
 *  slug built from those would be Latin, and the middleware's ticker
 *  upper-casing would then fight the page's lower-case canonical forever. */
export function hasArabicScript(value: string | null | undefined): boolean {
    return !!value && /[\u0600-\u06FF]/.test(value);
}

/**
 * Canonical ARABIC symbol path: /ar/symbol/{SYMBOL}-{arabic-slug}.
 *
 * Completes the Arabic-first URL contract — funds, learn, glossary and sectors
 * already carry Arabic slugs; company pages were the last tree still keyed on
 * a bare Latin ticker, which reads as an English URL to an Arabic searcher.
 *
 * The slug is appended ONLY when the company genuinely has an Arabic name
 * (38% of tickers do today). Everything else stays at /ar/symbol/{SYMBOL},
 * which remains a valid canonical — an empty or transliterated slug would be
 * worse than none.
 */
export function symbolPathAr(symbol: string, nameAr?: string | null): string {
    const sym = (symbol || '').toUpperCase();
    const slug = hasArabicScript(nameAr) ? arabicSlug(nameAr) : '';
    return slug ? `/ar/symbol/${sym}-${slug}` : `/ar/symbol/${sym}`;
}

/**
 * Recover the ticker from an /ar/symbol route param.
 *
 * Splits at the first dash IMMEDIATELY FOLLOWED BY AN ARABIC LETTER, because
 * a ticker may legitimately contain a dash (EGS48271C018-EGP) while a
 * generated Arabic slug always begins with Arabic script. That makes the split
 * exact rather than heuristic: "COMI-البنك-التجاري" -> "COMI",
 * "EGS48271C018-EGP" -> "EGS48271C018-EGP".
 */
export function symbolFromArParam(param: string): string {
    let decoded = param || '';
    try {
        decoded = decodeURIComponent(decoded);
    } catch {
        // malformed escapes: fall through and split the raw value
    }
    const m = /^(.+?)-(?=[\u0600-\u06FF])/.exec(decoded);
    return (m ? m[1] : decoded).toUpperCase();
}

/** Extract the leading numeric id from an "{id}-{slug}" route param. */
export function idFromParam(param: string): number | null {
    const m = /^(\d+)(?:-|$)/.exec(param || '');
    if (!m) return null;
    const id = parseInt(m[1], 10);
    return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Canonicalization guard for dynamic routes with unicode (Arabic) slugs.
 * Route params arrive PERCENT-ENCODED while our canonical paths carry raw
 * unicode — naive string comparison always mismatches for Arabic slugs and a
 * redirect to a raw-unicode Location header 500s. Returns the encoded redirect
 * target when the request truly differs from canonical, else null.
 */
export function canonicalRedirectTarget(requestPath: string, canonicalPath: string): string | null {
    let decoded = requestPath;
    try {
        decoded = decodeURIComponent(requestPath);
    } catch {
        // malformed escapes: fall through and compare raw
    }
    if (decoded === canonicalPath || requestPath === canonicalPath || requestPath === encodeURI(canonicalPath)) {
        return null;
    }
    return encodeURI(canonicalPath);
}

/** Escape a string for inclusion in XML text/attribute content. */
export function xmlEscape(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** Absolute URL for a path, percent-encoding non-ASCII (Arabic slugs) safely. */
export function absUrl(path: string): string {
    // encodeURI keeps `/`, `-`, `?`, `&` but encodes Arabic letters — required
    // for valid sitemap <loc> entries.
    return SITE_URL + encodeURI(path);
}
