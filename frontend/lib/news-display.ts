import { newsPath, type SiteLang } from "./seo";

const LEADING_CITY_RE = /^\s*(?:cairo|egypt|dubai|riyadh|abu\s+dhabi|kuwait)\s*[-–—:]\s*/i;
const LEADING_SOURCE_RE = /^\s*(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya|enterprise(?:am)?)\s*[-–—:]\s*/i;
const BLOCKED_SOURCE_RE = /\b(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya|enterprise(?:am)?)\b/gi;
const BLOCKED_SOURCE_AR_RE = /(مباشر|عرب\s*فاينانس|زاوية|إنتربرايز|انتربرايز)/g;
const SYNDIGATE_RE = /\s*(?:©|\(c\))?\s*(?:\d{4})?\s*All\s+Rights\s+Reserved.*Provided\s+by\s+SyndiGate\s+Media\s+Inc\.\s*\(\s*Syndigate\.info\s*\)\.?/gi;
const SYNDIGATE_ALT_RE = /\s*Provided\s+by\s+SyndiGate\s+Media\s+Inc\.\s*\(\s*Syndigate\.info\s*\)\.?/gi;
const SYNDIGATE_SIMPLE_RE = /\b(?:SyndiGate\s+Media\s+Inc\.|Syndigate\.info)\b/gi;

function stripBlockedSources(value: string): string {
    let text = value;

    for (let i = 0; i < 3; i += 1) {
        const updated = text
            .replace(LEADING_CITY_RE, "")
            .replace(LEADING_SOURCE_RE, "")
            .trim()
            .replace(/^[-–—:\s]+/, "");
        if (updated === text) break;
        text = updated;
    }

    return text
        .replace(BLOCKED_SOURCE_RE, "")
        .replace(BLOCKED_SOURCE_AR_RE, "")
        .replace(SYNDIGATE_RE, "")
        .replace(SYNDIGATE_ALT_RE, "")
        .replace(SYNDIGATE_SIMPLE_RE, "")
        .replace(/[ \t]+([,.;:!?])/g, "$1");
}

export function sanitizeNewsText(value?: string | null): string {
    if (!value) return "";

    return stripBlockedSources(value)
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n[ \t]+/g, "\n")
        .trim();
}

/**
 * THE canonical URL for a news article — the single chokepoint every emitter
 * must use (page metadata, sitemaps, RSS, internal links).
 *
 * WHY THIS EXISTS: the article page derives its canonical from the SANITIZED
 * headline (dateline prefixes like "Egypt - " are stripped by
 * stripBlockedSources), while the sitemaps and the RSS feed used to slugify
 * the RAW headline. The two disagreed for every article whose headline carried
 * a dateline — roughly 11% of the archive (~510 URLs) — so the sitemap
 * advertised `/News/271720-egypt-egx-ends-...` while the page 308'd to
 * `/News/271720-egx-ends-...`. Sitemap-advertised redirects burn crawl budget
 * and devalue the sitemap as a signal.
 *
 * Any new place that needs a news URL must call THIS, never newsPath() with a
 * raw headline. `verify:seo` enforces that.
 */
/**
 * THE ONE LANGUAGE DECISION FOR A NEWS ARTICLE.
 *
 * The feed is genuinely bilingual (2,033 Arabic articles, 2,552 English) and
 * an article exists in ONE language, so its language decides which tree it
 * lives in. This must be computed identically by the article page, the
 * sitemaps and the feed — a page that thinks an article is Arabic while the
 * sitemap thinks it is English advertises a URL that immediately 308s, which
 * burns crawl budget and devalues the sitemap as a signal.
 *
 * source_section is authoritative when present ('.../ar'); otherwise fall back
 * to the script of the RAW headline (not the sanitized one — sanitizing strips
 * dateline prefixes and must never change the language verdict).
 */
export type NewsLangSource = { headline?: string | null; source_section?: string | null };

export function newsLang(article: NewsLangSource): SiteLang {
    if ((article.source_section || "").endsWith("/ar")) return "ar";
    return /[\u0600-\u06FF]/.test(article.headline || "") ? "ar" : "en";
}

/**
 * Canonical URL for an article, in its own language's tree. Pass
 * `sourceSection` wherever the caller has it; without it the headline script
 * decides, which agrees with the page for every article whose headline is
 * written in the article's own language.
 */
export function canonicalNewsPath(
    id: number | string,
    headline?: string | null,
    sourceSection?: string | null
): string {
    return newsPath(id, sanitizeNewsText(headline) || null, newsLang({ headline, source_section: sourceSection }));
}

export function formatNewsDate(value?: string | null): string {
    if (!value) return "Unknown date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleString();
}

export function formatNewsRelative(value?: string | null): string {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function buildNewsSnippet(value?: string | null, maxLength = 230): string {
    const clean = sanitizeNewsText(value).replace(/\s+/g, " ").trim();
    if (!clean) return "No article body available.";
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength)}...`;
}

export function splitNewsParagraphs(value?: string | null): string[] {
    const clean = sanitizeNewsText(value);
    if (!clean) return [];
    return clean
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}

export function resolveNewsImageSrc(imageUrl?: string | null): string | null {
    if (!imageUrl) return null;
    if (imageUrl.includes("static.mubasher.info/File.Story_Image/")) {
        return `/api/v1/news-image?url=${encodeURIComponent(imageUrl)}`;
    }
    return imageUrl;
}

export function getNewsBrandedCover(item: any, lang: string = "en", fallbackSymbol?: string): string {
    const l = lang === "ar" ? "ar" : "en";
    return `/assets/news-covers/${l}-generic.webp`;
}

/* ------------------------------------------------------------------------
 * MARKET PURITY + DUPLICATE CANON FOR NEWS (2026-09-05)
 *
 * Two archive defects measured on the live sitemap:
 *   1. 99 Saudi-market stories (Aramco, Flynas, BinDawood, Americana …)
 *      published as Egypt news. The Egypt pulse feed carries them, the
 *      ingester tags everything source_country='EG', and because they match
 *      no EGX ticker they arrive with symbol=NULL. The tell is the currency:
 *      an EGX story quotes EGP, these quote SAR (or name Tadawul / TASI).
 *      A story that DID map to an EGX symbol is never off-market, whatever
 *      the headline says — a cross-border deal by an EGX company is Egypt news.
 *   2. 117 headline groups re-ingested under a second id (185 extra URLs):
 *      identical stories with two live canonical URLs, which is exactly the
 *      "Duplicate, Google chose different canonical" row in Search Console.
 *
 * ONE function decides both, and every emitter — the news sitemaps, the hubs
 * (window), the feeds, the Market Pulse block and the article page — goes
 * through it, so no list can link to a copy the page itself 308s away.
 * ---------------------------------------------------------------------- */

// Case-sensitive on purpose: "SAR"/"TASI" are currency and index codes; a
// case-insensitive match would fire on ordinary words.
const OFF_MARKET_CODES_RE = /\bSAR\b|\bTASI\b/;
const OFF_MARKET_NAMES_RE = /\bTadawul\b|\bNomu\b|Saudi (?:Stock )?Exchange/i;
const OFF_MARKET_AR_RE = /ريال|تداول السعودية|السوق السعودي|\bتاسي\b/;

/** True for a story about a market other than the EGX that arrived through the Egypt feed. */
export function isOffMarketNews(headline?: string | null, symbol?: string | null): boolean {
    if (symbol && String(symbol).trim()) return false;
    const h = headline || '';
    return OFF_MARKET_CODES_RE.test(h) || OFF_MARKET_NAMES_RE.test(h) || OFF_MARKET_AR_RE.test(h);
}

/** Identity of a story for duplicate detection: sanitized headline, case-folded, punctuation-collapsed. */
export function newsDedupeKey(headline?: string | null): string {
    return sanitizeNewsText(headline).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

type NewsRowLike = { id: number | string; headline?: string | null; symbol?: string | null };

/**
 * The publishable subset of a list of news rows, in the caller's order:
 * off-market stories removed, and of several rows sharing a headline only the
 * PRIMARY (lowest id — the first time the story arrived) kept.
 */
export function primaryNewsRows<T extends NewsRowLike>(rows: T[]): T[] {
    const primary = new Map<string, number>();
    for (const r of rows) {
        const key = newsDedupeKey(r.headline);
        if (!key) continue;
        const id = Number(r.id);
        const cur = primary.get(key);
        if (cur === undefined || id < cur) primary.set(key, id);
    }
    return rows.filter((r) => {
        if (isOffMarketNews(r.headline, r.symbol)) return false;
        const key = newsDedupeKey(r.headline);
        return !key || primary.get(key) === Number(r.id);
    });
}

/** Escape a string for use inside a SQL LIKE/ILIKE pattern. */
export function likeEscape(value: string): string {
    return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}
