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

/** Canonical news-article path: /News/{id}-{slug} (bare /News/{id} 308s here). */
export function newsPath(id: number | string, headline?: string | null): string {
    const slug = slugify(headline);
    return slug ? `/News/${id}-${slug}` : `/News/${id}`;
}

/** Canonical fund path: /Funds/{fund_id}-{slug}. */
export function fundPath(fundId: number | string, nameEn?: string | null, nameAr?: string | null): string {
    const slug = slugify(nameEn || nameAr);
    return slug ? `/Funds/${fundId}-${slug}` : `/Funds/${fundId}`;
}

/** Canonical symbol path: /symbol/{SYMBOL} (uppercase enforced by middleware). */
export function symbolPath(symbol: string): string {
    return `/symbol/${(symbol || '').toUpperCase()}`;
}

/** Extract the leading numeric id from an "{id}-{slug}" route param. */
export function idFromParam(param: string): number | null {
    const m = /^(\d+)(?:-|$)/.exec(param || '');
    if (!m) return null;
    const id = parseInt(m[1], 10);
    return Number.isInteger(id) && id > 0 ? id : null;
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
