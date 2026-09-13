/**
 * NEWS TEXT + COVER HELPERS THAT ARE SAFE TO SHIP TO A BROWSER.
 *
 * The twin of lib/news-display.ts, minus everything that names a data supplier.
 *
 * WHY THE SPLIT: news-display.ts strips supplier identity out of headlines and
 * bodies, which means the supplier's name is written in the module as a regex
 * literal. Two client components imported it, so that literal was inlined into
 * the browser bundle — the site scrubbed the word from its copy and then
 * shipped it in its own JavaScript. The scrub now happens once, server-side, at
 * the API boundary (app/api/v1/news, app/api/v1/egx/news-tv and the chat
 * backend), so by the time text reaches a client component there is nothing
 * left to strip and these functions only need to be *tidy*, not confidential.
 *
 * Names differ from the server twin on purpose: importing the wrong one should
 * be a compile error, not a silent leak. `npm run verify:vendor` fails the
 * build if a "use client" module imports lib/news-display or lib/vendor-privacy.
 */

const LEADING_CITY_RE = /^\s*(?:cairo|egypt|dubai|riyadh|abu\s+dhabi|kuwait)\s*[-–—:]\s*/i;
const LEADING_CITY_AR_RE = /^\s*(?:القاهرة|مصر)\s*[-–—:]\s*/;
const SYNDICATION_RE = /\s*(?:©|\(c\))?\s*(?:\d{4})?\s*All\s+Rights\s+Reserved.*Provided\s+by\s+SyndiGate\s+Media\s+Inc\.\s*\(\s*Syndigate\.info\s*\)\.?/gi;
const SYNDICATION_SIMPLE_RE = /\b(?:SyndiGate\s+Media\s+Inc\.|Syndigate\.info)\b/gi;

/** Display hygiene for already-scrubbed text: datelines, syndication notices, whitespace. */
export function cleanNewsText(value?: string | null): string {
    if (!value) return "";
    return String(value)
        .replace(LEADING_CITY_RE, "")
        .replace(LEADING_CITY_AR_RE, "")
        .replace(SYNDICATION_RE, "")
        .replace(SYNDICATION_SIMPLE_RE, "")
        .replace(/^[-–—:\s]+/, "")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/[ \t]+([,.;:!?])/g, "$1")
        .trim();
}

/** A short preview of an article body. */
export function newsSnippet(value?: string | null, maxLength = 230): string {
    const clean = cleanNewsText(value).replace(/\s+/g, " ").trim();
    if (!clean) return "No article body available.";
    return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength)}...`;
}

/** An article body split into paragraphs. */
export function newsParagraphs(value?: string | null): string[] {
    return cleanNewsText(value)
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);
}

/**
 * A cover image a browser may load, or null.
 *
 * DELIBERATELY STRICT: only our own origin. Covers whose publisher must not be
 * named are rewritten server-side to `/api/v1/news-image?id=…`, so a URL that
 * still points somewhere else at this stage is one that skipped the boundary —
 * render the branded cover rather than the publisher's CDN. This rule needs no
 * knowledge of WHICH hosts are confidential, which is why it can live here.
 */
export function newsCoverSrc(imageUrl?: string | null): string | null {
    if (!imageUrl) return null;
    const value = String(imageUrl).trim();
    if (!value) return null;
    if (value.startsWith("/") && !value.startsWith("//")) return value;
    if (typeof window !== "undefined") {
        try {
            if (new URL(value, window.location.origin).origin === window.location.origin) return value;
        } catch {
            return null;
        }
    }
    return null;
}

/** The house cover for a story, used whenever there is no usable publisher image. */
export function newsBrandedCover(_item: unknown, lang: string = "en", _fallbackSymbol?: string): string {
    return `/assets/news-covers/${lang === "ar" ? "ar" : "en"}-generic.webp`;
}
