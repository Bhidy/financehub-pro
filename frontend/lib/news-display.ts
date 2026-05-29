const LEADING_CITY_RE = /^\s*(?:cairo|egypt|dubai|riyadh|abu\s+dhabi|kuwait)\s*[-–—:]\s*/i;
const LEADING_SOURCE_RE = /^\s*(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya)\s*[-–—:]\s*/i;
const BLOCKED_SOURCE_RE = /\b(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya)\b/gi;
const BLOCKED_SOURCE_AR_RE = /(مباشر|عرب\s*فاينانس|زاوية)/g;

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
    const h = (item.headline || "").toLowerCase();
    const sym = (item.symbol || fallbackSymbol || "").toUpperCase().trim();
    const sec = (item.source_section || "").toLowerCase();
    
    const SOURCE_MARKERS: Record<string, boolean> = { ARAB: true };
    const isRealSymbol = sym && !SOURCE_MARKERS[sym];
    
    // Sector tickers
    const BANKING_TICKERS = /^(CIB|COMI|QNBE|EGBE|ADIB|SAIB|NBEK|ABUK|AIBANK|QNB|FAIT|HDBK|ENBE|MIDF|EGAL|CIEB|ABCB)$/;
    const REALESTATE_TICKERS = /^(TMGH|HRHO|PRMH|MNHD|AMER|ORAS|MFPC|PHDC|ORHD|TALB|ARDN|MASR|EHDR|OCDI|BPRE)$/;
    const ENERGY_TICKERS = /^(TAQA|ELEC|PICO|EKHO|HELI|ENPO|GASCO|EGAS|SWDY|EAST)$/;

    // 1. BANKING
    if (sec.includes('banking') || sec.includes('insurance') || (isRealSymbol && BANKING_TICKERS.test(sym))) {
        return `/assets/news-covers/${l}-banking.webp`;
    }
    if (/\bbank(?:ing|s)?\b/.test(h) && !/non.bank/i.test(h)) {
        return `/assets/news-covers/${l}-banking.webp`;
    }
    if (/\bloan\b|credit facil|deposit rate|interbank|mortgage lend|npl ratio/.test(h)) {
        return `/assets/news-covers/${l}-banking.webp`;
    }
    if (/بنك|مصرف|قرض|تمويل|ودائع|التجاري|الائتمان/.test(h)) {
        return `/assets/news-covers/${l}-banking.webp`;
    }

    // 2. REAL ESTATE
    if (/real.?estate|propert|housing/.test(sec) || (isRealSymbol && REALESTATE_TICKERS.test(sym))) {
        return `/assets/news-covers/${l}-realestate.webp`;
    }
    if (/real.?estate|propert(?:y|ies)|housing|residential|compound|villa|apartment/.test(h)) {
        return `/assets/news-covers/${l}-realestate.webp`;
    }
    if (/new.?capital|new.?cairo|hillage|madaar|development.project/.test(h)) {
        return `/assets/news-covers/${l}-realestate.webp`;
    }
    if (/عقار|إسكان|سكني|فيلا|شقة|شقق|العاصمة\s+الإدارية|طلعت\s+مصطفى|بالم\s+هيلز|سوديك/.test(h)) {
        return `/assets/news-covers/${l}-realestate.webp`;
    }

    // 3. ENERGY
    if (/energy|utilities|oil|gas/.test(sec) || (isRealSymbol && ENERGY_TICKERS.test(sym))) {
        return `/assets/news-covers/${l}-energy.webp`;
    }
    if (/\benergy\b|\boil\b|\bgas\b|petroleum|electricity|power.station/.test(h)) {
        return `/assets/news-covers/${l}-energy.webp`;
    }
    if (/solar|nuclear|fuel|renewable|lng|lpg|hydrogen|hydro.?power/.test(h)) {
        return `/assets/news-covers/${l}-energy.webp`;
    }
    if (/طاقة|نفط|غاز|بترول|كهرباء|شمسي|نووي|السويدي/.test(h)) {
        return `/assets/news-covers/${l}-energy.webp`;
    }

    // 4. EARNINGS
    if (/\b(earnings?|dividend|profit|net.income|eps|payout|distribution)\b/.test(h)) {
        return `/assets/news-covers/${l}-earnings.webp`;
    }
    if (/\b(revenue|results?|annual.report|quarterly|half.year|financial.results)\b/.test(h)) {
        return `/assets/news-covers/${l}-earnings.webp`;
    }
    if (/\b(net.profit|gross.profit|operating.profit|consolidated.profit)\b/.test(h)) {
        return `/assets/news-covers/${l}-earnings.webp`;
    }
    if (/أرباح|إيراد|نتائج\s+مالية|صافي\s+ربح|خسائر|توزيعات|ربحية/.test(h)) {
        return `/assets/news-covers/${l}-earnings.webp`;
    }
    if (/ربع سنوي|نصف سنوي|صافي ربح|ربحية|نمو الأرباح|الربع الأول|الربع الثاني|الربع الثالث/.test(h)) {
        return `/assets/news-covers/${l}-earnings.webp`;
    }

    // 5. MARKETS
    if (/\bipo\b|public.offering|\blisting\b|egx.?\d/.test(h)) {
        return `/assets/news-covers/${l}-markets.webp`;
    }
    if (/market.cap|sukuk|bond.issu|capital.increas/.test(h)) {
        return `/assets/news-covers/${l}-markets.webp`;
    }
    if (/\bbourse\b|stock.exchange|index.clos|index.ris|index.fall/.test(h)) {
        return `/assets/news-covers/${l}-markets.webp`;
    }
    if (/market.open|market.clos|trading.session|تنفيذ.صفقة/.test(h)) {
        return `/assets/news-covers/${l}-markets.webp`;
    }
    if (/اكتتاب|بورصة|مؤشر|صكوك|سندات|تداول|السوق/.test(h)) {
        return `/assets/news-covers/${l}-markets.webp`;
    }
    if (/البورصة المصرية|زيادة رأس المال|السوق الرئيسي|تداول اليوم/.test(h)) {
        return `/assets/news-covers/${l}-markets.webp`;
    }

    // 6. STOCKS
    if (isRealSymbol || /stocks?/.test(sec)) {
        return `/assets/news-covers/${l}-stocks.webp`;
    }

    // 7. ECONOMY
    return `/assets/news-covers/${l}-economy.webp`;
}
