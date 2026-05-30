const LEADING_CITY_RE = /^\s*(?:cairo|egypt|dubai|riyadh|abu\s+dhabi|kuwait)\s*[-–—:]\s*/i;
const LEADING_SOURCE_RE = /^\s*(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya|enterprise(?:am)?)\s*[-–—:]\s*/i;
const BLOCKED_SOURCE_RE = /\b(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya|enterprise(?:am)?)\b/gi;
const BLOCKED_SOURCE_AR_RE = /(مباشر|عرب\s*فاينانس|زاوية|إنتربرايز|انتربرايز)/g;
const SYNDIGATE_RE = /\s*(?:©|\(c\))?\s*(?:\d{4})?\s*All\s+Rights\s+Reserved\s+(?:For\s+Information\s+Technology\s+)?Provided\s+by\s+SyndiGate\s+Media\s+Inc\.\s*\(\s*Syndigate\.info\s*\)\.?/gi;
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
