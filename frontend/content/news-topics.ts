/**
 * NEWS TOPICS — the hub architecture the news archive never had.
 *
 * News is 4,583 URLs, roughly half this site, and until now every one of them
 * was an orphan: /News listed the latest few, the sitemap listed the rest, and
 * nothing grouped them. investing.com runs 22 news categories; we ran zero, so
 * an article stopped compounding the moment it fell off the front page.
 *
 * Topics are derived from `market_news.source_section`, which carries the
 * provider's own path (`eg/pulse/stocks/ar`, `enterprise/ipos`,
 * `enterprise/%D8%A7%D9%82%D8%AA%D8%B5%D8%A7%D8%AF/ar`). Those paths are messy
 * and percent-encoded, so matching is done on the DECODED, lower-cased string
 * and by substring — a provider adding `/v2/` to a path must not silently
 * empty a topic.
 *
 * Nothing is invented: a topic exists only where the feed genuinely carries
 * that section, and a topic with too few articles is not published.
 */

export type NewsTopic = {
    /** Stable English slug — the URL contract. */
    slug: string;
    /** Arabic slug for the /ar tree. */
    slugAr: string;
    nameEn: string;
    nameAr: string;
    titleEn: string;
    titleAr: string;
    descEn: string;
    descAr: string;
    introEn: string;
    introAr: string;
    /** Substrings matched against the decoded, lower-cased source_section. */
    match: string[];
};

/** Below this an archive page would be thin, so the topic is not published. */
export const MIN_ARTICLES_PER_TOPIC = 8;

export const NEWS_TOPICS: NewsTopic[] = [
    {
        slug: 'stocks',
        slugAr: 'أخبار-الأسهم',
        nameEn: 'Stock market news',
        nameAr: 'أخبار الأسهم',
        titleEn: 'EGX Stock Market News — Egyptian Exchange Coverage',
        titleAr: 'أخبار سوق الأسهم المصري — تغطية البورصة المصرية',
        descEn: 'Egyptian Exchange stock coverage: session moves, company disclosures and trading news, updated continuously.',
        descAr: 'تغطية أسهم البورصة المصرية: حركة الجلسات وإفصاحات الشركات وأخبار التداول، بتحديث مستمر.',
        introEn: 'Coverage of individual Egyptian Exchange stocks — session moves, disclosures and company announcements as they are published.',
        introAr: 'تغطية أسهم البورصة المصرية بشكل فردي — حركة الجلسات والإفصاحات وإعلانات الشركات فور نشرها.',
        match: ['pulse/stocks', '/stocks'],
    },
    {
        slug: 'economy',
        slugAr: 'أخبار-الاقتصاد',
        nameEn: 'Egyptian economy',
        nameAr: 'أخبار الاقتصاد',
        titleEn: 'Egyptian Economy News — Inflation, Rates & Growth',
        titleAr: 'أخبار الاقتصاد المصري — التضخم والفائدة والنمو',
        descEn: 'Egyptian economic news: inflation, interest rates, the pound, budget and growth data.',
        descAr: 'أخبار الاقتصاد المصري: التضخم وأسعار الفائدة والجنيه والموازنة وبيانات النمو.',
        introEn: 'Macroeconomic coverage for Egypt — the releases and policy decisions that move the whole market rather than a single listing.',
        introAr: 'التغطية الاقتصادية الكلية لمصر — البيانات وقرارات السياسة النقدية التي تحرك السوق بأكمله وليس سهماً بعينه.',
        match: ['اقتصاد', 'economy'],
    },
    {
        slug: 'business',
        slugAr: 'أخبار-الأعمال',
        nameEn: 'Business news',
        nameAr: 'أخبار الأعمال',
        titleEn: 'Egypt Business News — Companies, Deals & Results',
        titleAr: 'أخبار الأعمال في مصر — الشركات والصفقات والنتائج',
        descEn: 'Egyptian business coverage: company results, expansion, contracts and corporate strategy.',
        descAr: 'تغطية الأعمال في مصر: نتائج الشركات والتوسعات والعقود واستراتيجيات الشركات.',
        introEn: 'Company-level business coverage across the Egyptian market — results, contracts, expansion and strategy.',
        introAr: 'تغطية أخبار الشركات في السوق المصري — النتائج والعقود والتوسعات والاستراتيجيات.',
        match: ['enterprise/business', 'أعمال'],
    },
    {
        slug: 'investment',
        slugAr: 'أخبار-الاستثمار',
        nameEn: 'Investment news',
        nameAr: 'أخبار الاستثمار',
        titleEn: 'Egypt Investment News — Funds, Flows & Capital',
        titleAr: 'أخبار الاستثمار في مصر — الصناديق والتدفقات ورأس المال',
        descEn: 'Investment coverage for Egypt: capital flows, funds, foreign investment and market positioning.',
        descAr: 'تغطية الاستثمار في مصر: تدفقات رأس المال والصناديق والاستثمار الأجنبي واتجاهات السوق.',
        introEn: 'Where capital is moving in the Egyptian market — flows, funds and investment announcements.',
        introAr: 'أين يتحرك رأس المال في السوق المصري — التدفقات والصناديق وإعلانات الاستثمار.',
        match: ['استثمار', 'enterprise/investment'],
    },
    {
        slug: 'mergers-acquisitions',
        slugAr: 'الاندماج-والاستحواذ',
        nameEn: 'Mergers & acquisitions',
        nameAr: 'الاندماج والاستحواذ',
        titleEn: 'Egypt M&A News — Mergers, Acquisitions & Stakes',
        titleAr: 'أخبار الاندماج والاستحواذ في مصر',
        descEn: 'Merger, acquisition and stake-sale news across Egyptian listed and private companies.',
        descAr: 'أخبار عمليات الاندماج والاستحواذ وبيع الحصص في الشركات المصرية المقيدة وغير المقيدة.',
        introEn: 'Deal coverage — mergers, acquisitions and stake sales involving Egyptian companies.',
        introAr: 'تغطية الصفقات — عمليات الاندماج والاستحواذ وبيع الحصص في الشركات المصرية.',
        match: ['/ma', 'دمج-واستحواذ', 'استحواذ'],
    },
    {
        slug: 'ipos',
        slugAr: 'الطروحات-والاكتتابات',
        nameEn: 'IPOs & offerings',
        nameAr: 'الطروحات والاكتتابات',
        titleEn: 'Egypt IPO News — Offerings & Listings on the EGX',
        titleAr: 'أخبار الطروحات والاكتتابات في البورصة المصرية',
        descEn: 'Initial public offerings, secondary offerings and new listings on the Egyptian Exchange.',
        descAr: 'الطروحات العامة الأولية والطروحات الثانوية والقيود الجديدة في البورصة المصرية.',
        introEn: 'Offering and listing news for the Egyptian Exchange — announced IPOs, stake offerings and new admissions.',
        introAr: 'أخبار الطروحات والقيد في البورصة المصرية — الطروحات المعلنة وبيع الحصص والقيود الجديدة.',
        match: ['ipos', 'طروحات'],
    },
    {
        slug: 'debt-and-bonds',
        slugAr: 'الدين-والسندات',
        nameEn: 'Debt & bonds',
        nameAr: 'الدين والسندات',
        titleEn: 'Egypt Debt & Bond News — Issuance, Yields & Ratings',
        titleAr: 'أخبار الدين والسندات في مصر — الإصدارات والعوائد والتصنيف',
        descEn: 'Egyptian sovereign and corporate debt: issuance, treasury bills, yields and credit ratings.',
        descAr: 'الدين السيادي وديون الشركات في مصر: الإصدارات وأذون الخزانة والعوائد والتصنيف الائتماني.',
        introEn: 'Debt-market coverage for Egypt — sovereign and corporate issuance, treasury auctions and rating actions.',
        introAr: 'تغطية سوق الدين في مصر — الإصدارات السيادية وإصدارات الشركات وعطاءات الخزانة وقرارات التصنيف.',
        match: ['ديون', 'debt'],
    },
];

/** Decoded, lower-cased section string — matching input for every topic. */
export function normalizeSection(section: unknown): string {
    const raw = typeof section === 'string' ? section : '';
    let out = raw;
    try {
        out = decodeURIComponent(raw);
    } catch {
        // malformed escapes: match the raw value instead
    }
    return out.toLowerCase();
}

/**
 * The topic an article belongs to, or null.
 * FIRST match wins and the list is ordered from most specific to broadest, so
 * an IPO story filed under a stocks path lands in IPOs rather than Stocks.
 */
export function topicOfArticle(section: unknown): NewsTopic | null {
    const s = normalizeSection(section);
    if (!s) return null;
    const ordered = [...NEWS_TOPICS].sort((a, b) => a.slug === 'stocks' ? 1 : b.slug === 'stocks' ? -1 : 0);
    return ordered.find((topic) => topic.match.some((m) => s.includes(m))) ?? null;
}

// Symmetric and unambiguous in both trees: `/News/{id}-{slug}` is the article
// contract, so topics live under an explicit `category` segment rather than
// competing with it.
export const newsTopicPath = (topic: NewsTopic, lang: 'en' | 'ar'): string =>
    lang === 'ar' ? `/ar/News/category/${topic.slugAr}` : `/News/category/${topic.slug}`;

export function findNewsTopic(slug: string): NewsTopic | null {
    let decoded = slug;
    try {
        decoded = decodeURIComponent(slug);
    } catch {
        // compare raw
    }
    return NEWS_TOPICS.find((t) => t.slug === decoded || t.slugAr === decoded) ?? null;
}
