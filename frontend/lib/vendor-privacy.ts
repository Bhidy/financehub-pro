/**
 * DATA-VENDOR PRIVACY — the ONE place that knows which upstream data providers
 * this site must never name, and the ONE set of functions that enforce it.
 *
 * WHY THIS EXISTS
 * The NAV pipeline, the news feed and a handful of delisting citations all
 * carry an upstream provider's brand, URLs and pipeline tags. Before this file
 * that identity reached the reader through EIGHT independent paths, each fixed
 * (or not fixed) on its own:
 *
 *   1. a "Source" column on every fund's NAV-history page
 *   2. the provenance breakdown table under it, plus links to source documents
 *   3. an outbound "Fund page at the data source" link on every fund profile
 *   4. `isBasedOn` inside the NAV-history Dataset JSON-LD
 *   5. `source` / `url` / `image_url` returned raw by TWO public JSON APIs
 *   6. the `/Funds/prices-today.csv` header comment
 *   7. the hostname printed under a delisting notice on symbol pages
 *   8. the scrubber's own regex literals, inlined into the browser bundle
 *
 * Commercial sourcing is not something a reader needs, and not something a
 * competitor should be handed. One policy, one chokepoint, one build gate:
 * `npm run verify:vendor` (scripts/verify-vendor-privacy.mjs) fails the build
 * when a new path opens.
 *
 * SERVER ONLY. Importing this from a "use client" module would inline the
 * literals below into a browser bundle — the exact exposure it exists to
 * prevent. The gate fails the build if that happens. Client components consume
 * text that was already scrubbed at the data boundary; they do not scrub.
 *
 * WHAT THIS IS *NOT*: a ban on a word. Six FRA-licensed funds and one asset
 * manager in the published universe carry a provider's name inside their own
 * REGISTERED name (e.g. «صندوق مباشر للاستثمار في الأسهم المصرية»). Those are
 * public market data about entities we cover, not a disclosure of where our
 * data comes from, and renaming them would falsify a registered fund name and
 * break matching against FRA/EIMA records. The gate allows those names — and
 * nothing else — through an explicit, documented allow-list.
 */

/**
 * Hostnames whose appearance in user-facing output identifies a commercial
 * data supplier. Matched on the registrable domain, so every subdomain
 * (static., english., www.) is covered by one entry.
 */
const CONFIDENTIAL_VENDOR_DOMAINS = ['mubasher.info'] as const;

/**
 * Brand tokens to remove from free text that passes through our hands (news
 * headlines, article bodies, citation notes). Latin and Arabic.
 *
 * NOTE the Arabic entry: «مباشر» is also the ordinary word for "live" /
 * "direct" and appears legitimately across the Arabic site ("بيانات مباشرة",
 * "وصول مباشر إلى API", and the fund «صندوق استثمار شركة العقارى العربى
 * المباشر», managed by a different house entirely). That is why this pattern is
 * applied ONLY to free text arriving from an upstream feed — where a bare
 * «مباشر» token is a dateline or a byline — and never to our own copy, fund
 * names or manager names.
 */
const VENDOR_BRAND_LATIN = /\b(?:mubasher(?:\.info)?)\b/gi;
const VENDOR_BRAND_AR = /(?<![؀-ۿ])مباشر(?![؀-ۿ])/g;

/** Pipeline `source` tags that name the vendor. Never shown, never returned. */
const VENDOR_SOURCE_TAG = /^mubasher[_-]/i;

// Stateless twins of the patterns above. A /g regex carries `lastIndex`
// between calls, so `.test()` on a shared /g literal alternates true/false on
// identical input — a classic source of a leak that only shows on every second
// row. Match with these; substitute with the /g originals.
const VENDOR_BRAND_LATIN_TEST = new RegExp(VENDOR_BRAND_LATIN.source, 'i');
const VENDOR_BRAND_AR_TEST = new RegExp(VENDOR_BRAND_AR.source);

/** True when `value` names a confidential supplier in any form. */
export function namesConfidentialVendor(value: unknown): boolean {
    if (typeof value !== 'string' || !value) return false;
    return VENDOR_BRAND_LATIN_TEST.test(value) || VENDOR_BRAND_AR_TEST.test(value);
}

/** True for a URL served by a confidential supplier (any subdomain, any path). */
export function isConfidentialVendorUrl(raw: unknown): boolean {
    if (typeof raw !== 'string' || !raw.trim()) return false;
    let host: string;
    try {
        host = new URL(raw).hostname.toLowerCase();
    } catch {
        // Not a URL — fall back to a substring check so a bare "static.x.info"
        // in a citation string is still caught.
        const lowered = raw.toLowerCase();
        return CONFIDENTIAL_VENDOR_DOMAINS.some((d) => lowered.includes(d));
    }
    return CONFIDENTIAL_VENDOR_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * A link the site may publish, or null. Use at EVERY point where an upstream
 * URL would become an href, a citation, or a JSON-LD `isBasedOn` / `url`.
 */
export function publicUrl(raw: unknown): string | null {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    return isConfidentialVendorUrl(raw) ? null : raw;
}

/** The publishable subset of a citation list, order preserved. */
export function publicUrls(urls: readonly unknown[] | null | undefined): string[] {
    if (!Array.isArray(urls)) return [];
    return urls.filter((u): u is string => typeof u === 'string' && !!publicUrl(u));
}

/**
 * A publishable provider/source name, or null. Applied to the `source` column
 * of the news feed and to every NAV pipeline tag, so a vendor-tagged row is
 * returned with a null source rather than the vendor's name.
 */
export function publicSourceName(raw: unknown): string | null {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    const value = raw.trim();
    if (VENDOR_SOURCE_TAG.test(value)) return null;
    return namesConfidentialVendor(value) ? null : value;
}

/**
 * Free text with supplier identity removed: leading datelines/bylines first
 * ("Cairo - Mubasher: ..."), then any residual brand token, then the
 * punctuation the removal left behind.
 *
 * Idempotent, and safe to run on text that carries none.
 */
const VENDOR_DATELINE_LATIN = new RegExp(`^\\s*(?:${VENDOR_BRAND_LATIN.source})\\s*[-–—:]\\s*`, 'i');
const VENDOR_DATELINE_AR = /^\s*مباشر\s*[-–—:]\s*/;

export function scrubVendorNames(value: string): string {
    return value
        .replace(VENDOR_DATELINE_LATIN, '')
        .replace(VENDOR_DATELINE_AR, '')
        .replace(VENDOR_BRAND_LATIN, '')
        .replace(VENDOR_BRAND_AR, '')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/[ \t]+([,.;:!?])/g, '$1')
        .replace(/^[-–—:\s]+/, '')
        .trim();
}

/**
 * THE public address of a news cover image, or null.
 *
 * A supplier's CDN URL must never appear in an `<img src>`, so an article whose
 * cover is hosted by a confidential supplier is addressed by OUR article id and
 * resolved server-side by /api/v1/news-image. That also removes the proxy's
 * previous SSRF surface: it no longer accepts a caller-supplied URL at all.
 *
 * A cover from a non-confidential publisher keeps its own URL (one fewer hop).
 */
export function publicImageUrl(imageUrl: unknown, articleId: unknown): string | null {
    if (typeof imageUrl !== 'string' || !imageUrl.trim()) return null;
    if (!isConfidentialVendorUrl(imageUrl)) return imageUrl;
    const id = Number(articleId);
    return Number.isInteger(id) && id > 0 ? `/api/v1/news-image?id=${id}` : null;
}
