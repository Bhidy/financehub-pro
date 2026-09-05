/**
 * FUND CATEGORY TAXONOMY — the single definition of how Egyptian mutual funds
 * are grouped, shared by the category pages, the funds directory, the money
 * page, the sitemap and every internal link.
 *
 * WHY THIS EXISTS (topical architecture): each category is a distinct, high
 * intent search need ("صناديق السيولة النقدية في مصر", "صناديق أسهم مصر")
 * that previously had NO destination on this site — the queries resolved to
 * bank pages or to nothing. One category = one canonical destination, so the
 * categories cannot cannibalise each other or the money page.
 *
 * Classification is MECHANICAL: it reads the fund's own `fund_type_en` /
 * `classification_en` / `is_shariah` fields from funds_view. Nothing here
 * assigns a fund to a category editorially, and nothing invents a category
 * that no fund actually belongs to — a category with too few funds is not
 * published at all (see MIN_FUNDS_TO_PUBLISH).
 *
 * Copy is descriptive, never advisory: these pages describe what a category
 * IS and list what exists in it. They must not recommend, rank by suitability,
 * or imply an investment opinion (YMYL).
 */

import { arabicSlug } from '@/lib/seo';
import taxonomyOverrides from './fund-taxonomy-overrides.json';

export type FundCategory = {
    /** Stable key — never change: it is the English URL slug and a URL contract. */
    key: string;
    nameEn: string;
    nameAr: string;
    /** Arabic slug source. The AR canonical is /ar/Funds/category/{arabicSlug(slugSourceAr)}. */
    slugSourceAr: string;
    titleEn: string;
    titleAr: string;
    descriptionEn: string;
    descriptionAr: string;
    /** What the category is, in plain factual terms. Rendered as the page intro. */
    introEn: string;
    introAr: string;
    /** Mechanical matcher over the fund's own classification fields. */
    match: (typeText: string, isShariah: boolean) => boolean;
    /**
     * The raw `fund_type` value the designed marketplace's own type filter
     * uses, so a category URL can pre-select that filter and show the visitor
     * the same set the page claims. '' means "no single upstream type maps to
     * this category" (Shariah is a flag, not a type) — the filter stays on
     * "all" and the pre-rendered rows still describe the category.
     */
    marketplaceType: string;
};

/** A category with fewer funds than this is not a page — it would be thin and
 *  would compete with the directory for the same intent. */
export const MIN_FUNDS_TO_PUBLISH = 3;

export const FUND_CATEGORIES: FundCategory[] = [
    {
        key: 'money-market',
        nameEn: 'Money Market Funds',
        nameAr: 'صناديق أسواق النقد',
        slugSourceAr: 'صناديق أسواق النقد',
        titleEn: 'Money Market Funds in Egypt — NAVs, Returns & Fees',
        titleAr: 'صناديق أسواق النقد في مصر — الأسعار والعوائد والرسوم',
        descriptionEn:
            'Egyptian money market (liquidity) funds that publish a NAV — each with its live NAV, trailing returns, management fee and minimum subscription. Updated twice daily from manager disclosures.',
        descriptionAr:
            'صناديق أسواق النقد (السيولة النقدية) المصرية التي تنشر صافي قيمة أصولها، مع صافي قيمة الأصول والعوائد التاريخية ورسوم الإدارة والحد الأدنى للاشتراك. يتم التحديث مرتين يومياً من إفصاحات مديري الصناديق.',
        introEn:
            'Money market funds — also called liquidity funds — invest in short-dated instruments such as treasury bills, time deposits and short-term debt. They are the lowest-volatility category in the Egyptian market and are typically used for capital held for short periods. The table lists every money market fund covered on this site with its own reported NAV and trailing returns.',
        introAr:
            'صناديق أسواق النقد — وتُعرف أيضاً بصناديق السيولة النقدية — تستثمر في أدوات قصيرة الأجل مثل أذون الخزانة والودائع لأجل وأدوات الدين قصيرة الأجل. وهي الفئة الأقل تقلباً في السوق المصري وتُستخدم عادةً للأموال المحتفظ بها لفترات قصيرة. يعرض الجدول كل صناديق أسواق النقد المغطاة على هذا الموقع بصافي قيمة الأصول المعلنة والعوائد التاريخية.',
        match: (t) => /money\s*market|liquidity|cash|نقد|سيول/.test(t),
        marketplaceType: 'money_market',
    },
    {
        key: 'fixed-income',
        nameEn: 'Fixed Income Funds',
        nameAr: 'صناديق الدخل الثابت',
        slugSourceAr: 'صناديق الدخل الثابت',
        titleEn: 'Fixed Income Funds in Egypt — NAVs, Returns & Fees',
        titleAr: 'صناديق الدخل الثابت في مصر — الأسعار والعوائد والرسوم',
        descriptionEn:
            'Egyptian fixed income and bond funds ranked by trailing return, with live NAVs, management fees and minimum subscriptions. Updated twice daily from manager disclosures.',
        descriptionAr:
            'صناديق الدخل الثابت والسندات في مصر مرتبة حسب العائد، مع صافي قيمة الأصول ورسوم الإدارة والحد الأدنى للاشتراك. يتم التحديث مرتين يومياً من إفصاحات مديري الصناديق.',
        introEn:
            'Fixed income funds hold debt instruments — government bonds, treasury bills and corporate debt — and distribute or accumulate the interest those instruments pay. Their returns move with Egyptian interest rates and with the credit quality of what they hold. Every fixed income fund covered on this site is listed below with its reported NAV and trailing returns.',
        introAr:
            'تحتفظ صناديق الدخل الثابت بأدوات دين — سندات حكومية وأذون خزانة وسندات شركات — وتوزّع أو تراكم العائد الذي تدفعه هذه الأدوات. تتحرك عوائدها مع أسعار الفائدة في مصر ومع الجودة الائتمانية لما تحتفظ به. كل صناديق الدخل الثابت المغطاة على هذا الموقع مدرجة أدناه بصافي قيمة الأصول المعلنة والعوائد التاريخية.',
        match: (t) => /fixed\s*income|bond|debt|دخل\s*ثابت|سندات/.test(t),
        marketplaceType: 'fixed_income',
    },
    {
        key: 'equity',
        nameEn: 'Equity Funds',
        nameAr: 'صناديق الأسهم',
        slugSourceAr: 'صناديق الأسهم',
        titleEn: 'Equity Funds in Egypt — NAVs, Returns & Fees',
        titleAr: 'صناديق الأسهم في مصر — الأسعار والعوائد والرسوم',
        descriptionEn:
            'Egyptian equity (stock) funds with live NAVs, trailing 1-year and 3-year returns, management fees and minimum subscriptions. Updated twice daily from manager disclosures.',
        descriptionAr:
            'صناديق الأسهم في مصر مع صافي قيمة الأصول والعوائد لسنة وثلاث سنوات ورسوم الإدارة والحد الأدنى للاشتراك. يتم التحديث مرتين يومياً من إفصاحات مديري الصناديق.',
        introEn:
            'Equity funds invest primarily in shares listed on the Egyptian Exchange (EGX). Their net asset value moves with the market, so they carry the highest short-term volatility of the categories on this site and their trailing returns vary widely between funds and between periods. Every equity fund covered here is listed below with its reported NAV and trailing returns.',
        introAr:
            'تستثمر صناديق الأسهم بشكل أساسي في الأسهم المقيدة بالبورصة المصرية (EGX). تتحرك صافي قيمة أصولها مع السوق، لذا فهي تحمل أعلى تقلب قصير الأجل بين الفئات المعروضة على هذا الموقع، وتتفاوت عوائدها التاريخية بشكل كبير بين صندوق وآخر وبين فترة وأخرى. كل صناديق الأسهم المغطاة هنا مدرجة أدناه بصافي قيمة الأصول المعلنة والعوائد التاريخية.',
        match: (t) => /equit|stock|share|أسهم/.test(t),
        marketplaceType: 'equity',
    },
    {
        key: 'balanced',
        nameEn: 'Balanced Funds',
        nameAr: 'الصناديق المتوازنة',
        slugSourceAr: 'الصناديق المتوازنة',
        titleEn: 'Balanced Funds in Egypt — NAVs, Returns & Fees',
        titleAr: 'الصناديق المتوازنة في مصر — الأسعار والعوائد والرسوم',
        descriptionEn:
            'Egyptian balanced and mixed-allocation funds with live NAVs, trailing returns, management fees and minimum subscriptions. Updated twice daily from manager disclosures.',
        descriptionAr:
            'الصناديق المتوازنة ومتعددة الأصول في مصر مع صافي قيمة الأصول والعوائد التاريخية ورسوم الإدارة والحد الأدنى للاشتراك. يتم التحديث مرتين يومياً من إفصاحات مديري الصناديق.',
        introEn:
            'Balanced funds hold a mix of equities and debt instruments in one portfolio, so their net asset value moves less than a pure equity fund and more than a money market fund. The exact split between asset classes is set by each fund’s own mandate and differs between managers. Every balanced fund covered on this site is listed below.',
        introAr:
            'تحتفظ الصناديق المتوازنة بمزيج من الأسهم وأدوات الدين في محفظة واحدة، لذا تتحرك صافي قيمة أصولها أقل من صندوق أسهم بالكامل وأكثر من صندوق أسواق النقد. يحدد كل صندوق نسبة التوزيع بين فئات الأصول وفقاً للائحته الخاصة وتختلف بين مدير وآخر. كل الصناديق المتوازنة المغطاة على هذا الموقع مدرجة أدناه.',
        match: (t) => /balanced|mixed|asset\s*alloc|متوازن/.test(t),
        marketplaceType: 'balanced',
    },
    {
        key: 'gold',
        nameEn: 'Gold Funds',
        nameAr: 'صناديق الذهب',
        slugSourceAr: 'صناديق الذهب',
        titleEn: 'Gold Funds in Egypt — NAVs, Returns & Fees',
        titleAr: 'صناديق الذهب في مصر — الأسعار والعوائد والرسوم',
        descriptionEn:
            'Egyptian gold and commodity funds with live NAVs, trailing returns, management fees and minimum subscriptions. Updated twice daily from manager disclosures.',
        descriptionAr:
            'صناديق الذهب والسلع في مصر مع صافي قيمة الأصول والعوائد التاريخية ورسوم الإدارة والحد الأدنى للاشتراك. يتم التحديث مرتين يومياً من إفصاحات مديري الصناديق.',
        introEn:
            'Gold funds track the price of gold, either by holding bullion or through gold-linked instruments, so their net asset value moves with the international gold price and with the Egyptian pound exchange rate rather than with the local equity market. Every gold or commodity fund covered on this site is listed below with its reported NAV and trailing returns.',
        introAr:
            'تتبع صناديق الذهب سعر الذهب، إما بالاحتفاظ بالسبائك أو عبر أدوات مرتبطة بالذهب، لذا تتحرك صافي قيمة أصولها مع سعر الذهب العالمي ومع سعر صرف الجنيه المصري وليس مع سوق الأسهم المحلي. كل صناديق الذهب والسلع المغطاة على هذا الموقع مدرجة أدناه بصافي قيمة الأصول المعلنة والعوائد التاريخية.',
        match: (t) => /gold|commodit|ذهب|سلع|معادن/.test(t),
        marketplaceType: 'gold',
    },
    {
        key: 'index',
        nameEn: 'Index Funds',
        nameAr: 'صناديق المؤشرات',
        slugSourceAr: 'صناديق المؤشرات',
        titleEn: 'Index Funds in Egypt — EGX30, EGX33 & EGX70 Trackers',
        titleAr: 'صناديق المؤشرات في مصر — EGX30 وEGX33 وEGX70',
        descriptionEn:
            'Egyptian index funds tracking an EGX benchmark (EGX30, EGX33 Shariah, EGX35 LV, EGX70 EWI, EGX100) that publish a NAV, with trailing returns and fees. Updated twice daily.',
        descriptionAr:
            'صناديق المؤشرات المصرية التي تتبع مؤشرات البورصة (EGX30 وEGX33 الشرعي وEGX35 وEGX70 وEGX100) وتنشر صافي قيمة أصولها، مع العوائد والرسوم. تحديث مرتين يومياً.',
        introEn:
            'Index funds hold the constituents of a published Egyptian Exchange index — EGX30, EGX33 Shariah, EGX35 Low Volatility, EGX70 Equal-Weight or EGX100 — in the index’s own weights, so their net asset value follows the benchmark rather than a manager’s stock selection, typically at a lower management fee than an actively managed equity fund. The regulator counted 12 index funds by issuance at end-June 2026. Every index fund covered on this site is listed below with its reported NAV and trailing returns.',
        introAr:
            'تحتفظ صناديق المؤشرات بمكوّنات مؤشر معلن للبورصة المصرية — EGX30 أو EGX33 الشرعي أو EGX35 منخفض التقلب أو EGX70 متساوي الأوزان أو EGX100 — بأوزان المؤشر نفسها، فتتبع صافي قيمة أصولها المؤشر المرجعي لا اختيارات مدير الصندوق، وعادةً برسوم إدارة أقل من صناديق الأسهم المُدارة بنشاط. أحصت الهيئة 12 صندوق مؤشرات بإصداراتها في نهاية يونيو 2026. كل صناديق المؤشرات المغطاة على هذا الموقع مدرجة أدناه بصافي قيمة الأصول المعلنة والعوائد.',
        match: (t) => /\bindex\b|مؤشر/.test(t),
        marketplaceType: '',
    },
    {
        key: 'sector',
        nameEn: 'Sector & Thematic Funds',
        nameAr: 'الصناديق القطاعية والموضوعية',
        slugSourceAr: 'الصناديق القطاعية',
        titleEn: 'Sector & Thematic Funds in Egypt — NAVs, Returns & Fees',
        titleAr: 'الصناديق القطاعية والموضوعية في مصر — الأسعار والعوائد',
        descriptionEn:
            'Egyptian equity funds concentrated in one sector or theme — building materials, technology, exports, consumption, e-payment, real estate, IPOs — with NAVs, returns and fees.',
        descriptionAr:
            'صناديق الأسهم المصرية المركّزة في قطاع أو موضوع واحد — مواد البناء والتكنولوجيا والتصدير والاستهلاك والدفع الإلكتروني والعقارات والطروحات — مع الأسعار والعوائد والرسوم.',
        introEn:
            'Sector and thematic funds concentrate their equity holdings in a single sector or investment theme instead of the whole market — building materials, technology, exporters, consumption, electronic payments, real estate developers, financials, or a rules-based theme such as IPOs or high dividends. That concentration makes them more volatile than a broad equity fund and ties their returns to one part of the economy. The regulator counted 4 sector and 8 thematic funds by issuance at end-June 2026. Every such fund covered on this site is listed below.',
        introAr:
            'تركّز الصناديق القطاعية والموضوعية استثماراتها في قطاع أو موضوع واحد بدلاً من السوق كله — مواد البناء أو التكنولوجيا أو المصدّرين أو الاستهلاك أو الدفع الإلكتروني أو المطوّرين العقاريين أو الخدمات المالية، أو موضوع قائم على قواعد مثل الطروحات الجديدة أو التوزيعات المرتفعة. هذا التركيز يجعلها أكثر تقلباً من صندوق أسهم واسع ويربط عوائدها بجزء واحد من الاقتصاد. أحصت الهيئة 4 صناديق قطاعية و8 صناديق موضوعية بإصداراتها في نهاية يونيو 2026. كل صندوق من هذا النوع مغطى على هذا الموقع مدرج أدناه.',
        match: (t) => /\bsector\b|\bthematic\b|قطاعي|موضوعي/.test(t),
        marketplaceType: '',
    },
    {
        key: 'shariah',
        nameEn: 'Shariah-Compliant Funds',
        nameAr: 'الصناديق المتوافقة مع الشريعة',
        slugSourceAr: 'صناديق استثمار إسلامية',
        titleEn: 'Shariah-Compliant (Islamic) Funds in Egypt — NAVs & Returns',
        titleAr: 'صناديق الاستثمار الإسلامية في مصر — الأسعار والعوائد',
        descriptionEn:
            'Egyptian Shariah-compliant (Islamic) mutual funds with live NAVs, trailing returns, management fees and minimum subscriptions. Updated twice daily from manager disclosures.',
        descriptionAr:
            'صناديق الاستثمار الإسلامية المتوافقة مع أحكام الشريعة في مصر مع صافي قيمة الأصول والعوائد التاريخية ورسوم الإدارة والحد الأدنى للاشتراك. يتم التحديث مرتين يومياً من إفصاحات مديري الصناديق.',
        introEn:
            'Shariah-compliant funds follow an investment mandate screened against Islamic finance rules — no interest-bearing instruments and no prohibited business activities — supervised by the fund’s own Shariah board. Compliance is as declared by each fund manager; this site reports that declaration and does not verify it independently. Every fund flagged as Shariah-compliant in its own disclosures is listed below.',
        introAr:
            'تتبع الصناديق المتوافقة مع الشريعة لائحة استثمار مفحوصة وفق قواعد التمويل الإسلامي — دون أدوات قائمة على الفائدة ودون أنشطة محظورة — تحت إشراف هيئة الرقابة الشرعية الخاصة بالصندوق. التوافق كما يعلنه مدير كل صندوق؛ ويعرض هذا الموقع ذلك الإعلان دون التحقق منه بشكل مستقل. كل صندوق مُصنّف في إفصاحاته كمتوافق مع الشريعة مدرج أدناه.',
        match: (t, isShariah) => isShariah || /shariah|sharia|islamic|إسلام|شريعة/.test(t),
        marketplaceType: '',
    },
];

/** English URL slug = the stable key. */
export const categorySlugEn = (c: FundCategory): string => c.key;
/** Arabic URL slug, derived through the same arabicSlug() every AR route uses. */
export const categorySlugAr = (c: FundCategory): string => arabicSlug(c.slugSourceAr);

export const categoryPath = (c: FundCategory, lang: 'en' | 'ar' = 'en'): string =>
    lang === 'ar' ? `/ar/Funds/category/${categorySlugAr(c)}` : `/Funds/category/${categorySlugEn(c)}`;

/** Resolve a URL slug in EITHER language to its category (so an EN slug on an
 *  AR route still resolves and 308s to the Arabic canonical, and vice versa). */
export function findCategory(slug: string): FundCategory | null {
    const decoded = (() => {
        try {
            return decodeURIComponent(slug);
        } catch {
            return slug;
        }
    })();
    return (
        FUND_CATEGORIES.find((c) => categorySlugEn(c) === decoded || categorySlugAr(c) === decoded) ?? null
    );
}

/**
 * Assign a fund row to exactly ONE category. Order matters: Shariah is checked
 * FIRST because an Islamic equity fund belongs on the Shariah page (that is the
 * search intent), and a fund must never appear as the canonical member of two
 * categories or the pages cannibalise each other.
 */
export function categoryOfFund(row: {
    fund_id?: unknown;
    fund_type_en?: unknown;
    fund_type?: unknown;
    classification_en?: unknown;
    is_shariah?: unknown;
    fund_name?: unknown;
    fund_name_en?: unknown;
}): FundCategory | null {
    // NORMALISE SEPARATORS FIRST. The source values are snake_case
    // ("money_market", "fixed_income", "fixed_income_usd"), and a matcher
    // written as /money\s*market/ does NOT match an underscore — \s matches
    // whitespace only. That silently dropped every money-market and
    // fixed-income fund into "no category", which 404'd the two largest
    // category pages in the Egyptian market (verified against production:
    // 26 money-market and 20 fixed-income funds were being discarded).
    // Underscores, hyphens and dots all become spaces before any matcher runs.
    //
    // A DOCUMENTED OVERRIDE replaces the vendor's type text outright. The
    // vendor filed BANK NXT's money-market fund as "balanced" (its FRA
    // prospectus says «النقدي», 2026-09-05) and no matcher can repair a wrong
    // input — only evidence can (content/fund-taxonomy-overrides.json).
    const override = taxonomyOverrideFor(row.fund_id);
    const text = (override ? [override.primary_asset_class] : [row.fund_type_en, row.fund_type, row.classification_en])
        .map((v) => (typeof v === 'string' ? v : ''))
        .join(' ')
        .toLowerCase()
        .replace(/[_\-.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const isShariah = row.is_shariah === true || row.is_shariah === 'true' || row.is_shariah === 1;
    const shariah = FUND_CATEGORIES.find((c) => c.key === 'shariah') as FundCategory;
    if (shariah.match(text, isShariah)) return shariah;
    const byType = FUND_CATEGORIES.find((c) => c.key !== 'shariah' && c.match(text, isShariah)) ?? null;
    // The registered NAME is consulted in two cases, both mechanical and both
    // in the manager's own words:
    //  1. No disclosed type at all (106 of the 207 current funds on
    //     2026-09-05) — the name carries the type verbatim: "HSBC Money Market
    //     Fund Kol Youm", "Commercial International Bank Fixed Income Fund
    //     Thabat", "ABC Bank Equity Fund 1".
    //  2. A vendor type of plain "equity". FRA's own taxonomy separates index
    //     and sector/thematic funds from equity funds (Q2-2026: equity 39 ·
    //     index 12 · thematic 8 · sector 4) but the price vendor files all four
    //     as "equity" — verified 2026-09-05: every Beltone EGX100 / EGX70 /
    //     EGX33 index fund carried fund_type = 'equity', so the index and
    //     sector hubs 404'd on their data gate. "Equity" is the superclass; an
    //     index / sector / Shariah marker in the name names the sub-type.
    // A name that names no type stays with the vendor type, or uncategorised.
    const fromName = !byType || byType.key === 'equity'
        ? classifyFundByName(row as { fund_name?: unknown; fund_name_en?: unknown })
        : null;
    if (fromName?.shariah) return shariah;
    if (fromName && (fromName.type === 'index' || fromName.type === 'sector')) {
        return FUND_CATEGORIES.find((c) => c.key === fromName.type) ?? byType;
    }
    if (byType) return byType;
    return fromName?.type ? FUND_CATEGORIES.find((c) => c.marketplaceType === fromName.type) ?? null : null;
}

/**
 * NAME-BASED CLASSIFICATION — the fallback when the disclosure carries no
 * type. Patterns are the type WORDS Egyptian fund names actually use, in
 * both languages, checked with word boundaries and in a fixed precedence so a
 * name that mentions two asset classes resolves the same way every time:
 * gold → money market → fixed income → balanced → equity. Shariah is a flag
 * on top (the manager's own "Sharia compliant"/"Islamic"), never inferred
 * from a bank's name.
 */
export type FundTypeSlug = 'money_market' | 'fixed_income' | 'equity' | 'balanced' | 'gold' | 'index' | 'sector';
/**
 * Arabic word matcher. `\b` does not delimit Arabic letters in a JS regex, so
 * a bare token matches INSIDE other words — "فضة" (silver) matched
 * "منخفضة" (low) and filed an equity fund under gold. Each word is therefore
 * bounded by "no Arabic letter before/after", with the common proclitics
 * (و ب ل لل ال وال بال) allowed as a prefix.
 */
const AR_LETTER = '[\\u0600-\\u06FF]';
const arWord = (...words: string[]): string =>
    `(?<!${AR_LETTER})(?:و|ب|ل|لل|ال|وال|بال)?(?:${words.join('|')})(?!${AR_LETTER})`;
const NAME_TYPE_PATTERNS: Array<[FundTypeSlug, RegExp]> = [
    // Index trackers name their benchmark; sector/thematic funds name their
    // sector or a theme word. Both are checked BEFORE the asset class because
    // an index fund is also an equity fund — the more specific page wins.
    ['index', new RegExp(`\\bindex\\b|\\bEGX ?(?:30|33|35|70|100)\\b|\\bEFX ?35\\b|\\bEWI\\b|${arWord('مؤشر', 'مؤشرات', 'المؤشر')}`, 'i')],
    ['sector', new RegExp(`\\bsector\\b|\\bthematic\\b|\\bspecialized funds\\b|\\bspeciaized funds\\b|\\bctor specialized\\b|\\bctor speciaized\\b|\\b(?:building|technology|export|consumption|e[- ]?payment|consumer|industrial|financial|real estate) fund\\b|\\bIPO\\b|${arWord('قطاعي', 'قطاعية', 'القطاعية', 'موضوعي', 'موضوعية', 'الموضوعية')}`, 'i')],
    ['gold', new RegExp(`\\b(gold|precious\\s+metals?|silver|commodit\\w*)\\b|${arWord('ذهب', 'دهب', 'معادن\\s*نفيسة', 'فضة', 'سلع')}`, 'i')],
    // "Cash" alone (not only "cash fund") and the transliterated «كاش»: Egyptian
    // cash funds are named that way ("Cash Mubasher" / «كاش مباشر»).
    ['money_market', new RegExp(`\\bmoney\\s*market\\b|\\bliquidity\\b|\\bcash\\b|\\btreasury\\b|\\bt-?bills?\\b|${arWord('أسواق\\s*النقد', 'اسواق\\s*النقد', 'سوق\\s*النقد', 'نقدي', 'نقدية', 'سيولة', 'كاش')}`, 'i')],
    ['fixed_income', new RegExp(`\\bfixed\\s*income\\b|\\bbonds?\\b|\\bdebt\\b|\\bsukuk\\b|${arWord('دخل\\s*ثابت', 'الدخل\\s*الثابت', 'سندات', 'صكوك', 'أدوات\\s*الدين', 'ادوات\\s*الدين')}`, 'i')],
    ['balanced', new RegExp(`\\bbalanced\\b|\\bmixed\\b|\\basset\\s*allocation\\b|${arWord('متوازن', 'متوازنة', 'مختلط', 'مختلطة', 'توزيع\\s*الأصول')}`, 'i')],
    ['equity', new RegExp(`\\bequit(?:y|ies)\\b|\\bstocks?\\b|\\bshares?\\b|${arWord('أسهم', 'اسهم')}`, 'i')],
];
const NAME_SHARIAH = new RegExp(`\\b(shariah?|sharia|islamic|halal)\\b|${arWord('إسلامي', 'اسلامي', 'إسلامية', 'اسلامية', 'شريعة', 'حلال')}`, 'i');
export function classifyFundByName(row: { fund_name?: unknown; fund_name_en?: unknown }): { type: FundTypeSlug | null; shariah: boolean } {
    const hay = [row.fund_name_en, row.fund_name].map((v) => (typeof v === 'string' ? v : '')).join(' ');
    if (!hay.trim()) return { type: null, shariah: false };
    const hit = NAME_TYPE_PATTERNS.find(([, re]) => re.test(hay));
    return { type: hit ? hit[0] : null, shariah: NAME_SHARIAH.test(hay) };
}

/**
 * The marketplace-facing type slug for a fund: the disclosed `fund_type` when
 * present, else the name-derived one — so the visitor's type filter and the
 * server pre-render describe the same category. `source` says which.
 */
export function fundTypeSlug(row: { fund_id?: unknown; fund_type?: unknown; fund_name?: unknown; fund_name_en?: unknown }): { slug: string; source: 'disclosed' | 'name' | 'none' | 'override' } {
    // A documented override outranks the disclosure it corrects.
    const override = taxonomyOverrideFor(row.fund_id);
    if (override) return { slug: override.primary_asset_class, source: 'override' };
    const raw = typeof row.fund_type === 'string' ? row.fund_type.trim().toLowerCase() : '';
    if (raw) return { slug: raw, source: 'disclosed' };
    const { type } = classifyFundByName(row);
    // Index and sector funds are equity funds for the marketplace's type filter;
    // the category pages carry the finer distinction.
    const slug = type === 'index' || type === 'sector' ? 'equity' : type;
    return slug ? { slug, source: 'name' } : { slug: '', source: 'none' };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * ORTHOGONAL TAXONOMY + DOCUMENTED OVERRIDES (chief re-audit, 2026-09-05)
 *
 * The vendor's `fund_type` is one text field that mixes asset class, strategy
 * and Shariah status — and it is sometimes plainly wrong: BANK NXT's
 * money-market fund was filed as "balanced", two more daily-yield cash funds
 * as "fixed income". A wrong INPUT cannot be repaired by a matcher, only by
 * evidence, so:
 *
 *   · content/fund-taxonomy-overrides.json holds hand-verified dispositions
 *     (regulator/issuer documents, or two independent press records), each
 *     naming the vendor value it replaces. `override` replaces the type on
 *     every surface; `keep_vendor` records that a name-vs-type conflict was
 *     reviewed and the vendor is right.
 *   · applyFundTaxonomy() is the ONE place a fund row's type is resolved —
 *     fund page, hubs, rankings, categories, related funds, list + detail API
 *     and the CSV all read rows that went through it.
 *   · Dimensions are exposed separately: `primary_asset_class` (the asset
 *     class), `strategy_tags` (index, sector, daily_yield, capital_protected,
 *     periodic_income) and `sharia_compliant`. Category URLs keep their
 *     single-dimension contract (a Shariah equity fund's canonical hub is the
 *     Shariah page); the "same asset class" module and the API use the class.
 *   · nameTypeConflict() flags a disclosed type the registered name
 *     contradicts, so the live audit (FUND_TAXONOMY_CONFLICT) reports every
 *     unreviewed disagreement until it gets a disposition.
 */
export type PrimaryAssetClass = 'money_market' | 'fixed_income' | 'equity' | 'balanced' | 'gold';
export type StrategyTag = 'index' | 'sector' | 'daily_yield' | 'capital_protected' | 'periodic_income';
export type TaxonomyDisposition = 'override' | 'keep_vendor';
export type TaxonomyOverride = {
    fund_id: string;
    fund_name_en: string;
    fund_name: string;
    disposition: TaxonomyDisposition;
    vendor_type: string | null;
    vendor_classification: string | null;
    primary_asset_class: PrimaryAssetClass;
    strategy_tags: StrategyTag[];
    confidence: 'high' | 'medium';
    evidence: string[];
    note: string;
    verified_at: string;
};

const PRIMARY_CLASSES = new Set<string>(['money_market', 'fixed_income', 'equity', 'balanced', 'gold']);
export const FUND_TAXONOMY_OVERRIDES: readonly TaxonomyOverride[] = (taxonomyOverrides as unknown as { overrides: TaxonomyOverride[] }).overrides;
const DISPOSITION_BY_ID = new Map<string, TaxonomyOverride>();
for (const o of FUND_TAXONOMY_OVERRIDES) {
    // Validated at load: a disposition without a fund id, an override without
    // evidence, or an unknown class is a build error, never a quiet mislabel.
    if (!/^\d+$/.test(String(o.fund_id))) throw new Error(`[fund-taxonomy] override without a numeric fund_id: ${JSON.stringify(o.fund_id)}`);
    if (!PRIMARY_CLASSES.has(o.primary_asset_class)) throw new Error(`[fund-taxonomy] ${o.fund_id}: unknown primary_asset_class ${JSON.stringify(o.primary_asset_class)}`);
    if (o.disposition === 'override' && (!Array.isArray(o.evidence) || o.evidence.length === 0)) throw new Error(`[fund-taxonomy] ${o.fund_id}: an override needs evidence`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.verified_at)) throw new Error(`[fund-taxonomy] ${o.fund_id}: verified_at must be an ISO date`);
    if (DISPOSITION_BY_ID.has(String(o.fund_id))) throw new Error(`[fund-taxonomy] ${o.fund_id}: duplicate disposition`);
    DISPOSITION_BY_ID.set(String(o.fund_id), o);
}

/** Any recorded disposition (override or reviewed keep_vendor) for a fund, else null. */
export function taxonomyDispositionFor(fundId: unknown): TaxonomyOverride | null {
    if (fundId === null || fundId === undefined || fundId === '') return null;
    return DISPOSITION_BY_ID.get(String(fundId)) ?? null;
}
/** The documented override that REPLACES the vendor type for a fund, else null. */
export function taxonomyOverrideFor(fundId: unknown): TaxonomyOverride | null {
    const d = taxonomyDispositionFor(fundId);
    return d && d.disposition === 'override' ? d : null;
}

const VENDOR_TYPE_ALIASES: Record<string, PrimaryAssetClass> = {
    money_market: 'money_market', liquidity: 'money_market', cash: 'money_market',
    fixed_income: 'fixed_income', fixed_income_usd: 'fixed_income', bond: 'fixed_income', bonds: 'fixed_income', debt: 'fixed_income',
    equity: 'equity', equities: 'equity', stock: 'equity', stocks: 'equity',
    balanced: 'balanced', mixed: 'balanced', asset_allocation: 'balanced',
    gold: 'gold', commodities: 'gold', commodity: 'gold',
};
/** The vendor's type text ("money_market", "Fixed Income Fund", "fixed_income_usd") as an asset class, else null. */
export function normalizeVendorType(raw: unknown): PrimaryAssetClass | null {
    if (typeof raw !== 'string') return null;
    const k = raw.trim().toLowerCase().replace(/[\s\-.]+/g, '_').replace(/_?funds?$/, '');
    return k ? VENDOR_TYPE_ALIASES[k] ?? null : null;
}

type NameRow = { fund_name?: unknown; fund_name_en?: unknown };
const nameHay = (row: NameRow): string => [row.fund_name_en, row.fund_name].map((v) => (typeof v === 'string' ? v : '')).join(' ');
/** EVERY type word the registered name carries, in the classifier's precedence order. */
export function nameTypeHits(row: NameRow): FundTypeSlug[] {
    const hay = nameHay(row);
    if (!hay.trim()) return [];
    return NAME_TYPE_PATTERNS.filter(([, re]) => re.test(hay)).map(([t]) => t);
}
const toClass = (t: FundTypeSlug): PrimaryAssetClass => (t === 'index' || t === 'sector' ? 'equity' : t);

/**
 * A disclosed type the registered name contradicts, else null. Not a conflict:
 * a name that also names the vendor's class ("Granite Fixed Income Fund … النقدي
 * بالجنيه" is fixed income with an EGP cash class), an index/sector name on a
 * vendor "equity" (a refinement), a balanced fund naming both legs, or a fund
 * that already has a recorded disposition.
 */
export function nameTypeConflict(row: NameRow & { fund_id?: unknown; fund_type?: unknown }): PrimaryAssetClass | null {
    if (taxonomyDispositionFor(row.fund_id)) return null;
    const disclosed = normalizeVendorType(row.fund_type);
    if (!disclosed) return null;
    const classes = nameTypeHits(row).map(toClass);
    if (classes.length === 0 || classes.includes(disclosed)) return null;
    if (disclosed === 'balanced' && classes.includes('equity') && classes.includes('fixed_income')) return null;
    return classes[0];
}

/** The fund's asset class: override → disclosure (type, then classification text) → registered name → null. */
export function primaryAssetClassOf(row: NameRow & { fund_id?: unknown; fund_type?: unknown; fund_type_en?: unknown; classification_en?: unknown; classification?: unknown }): PrimaryAssetClass | null {
    const override = taxonomyOverrideFor(row.fund_id);
    if (override) return override.primary_asset_class;
    const disclosed =
        normalizeVendorType(row.fund_type) ?? normalizeVendorType(row.fund_type_en) ??
        normalizeVendorType(row.classification_en) ?? normalizeVendorType(row.classification);
    if (disclosed) return disclosed;
    const hit = nameTypeHits(row)[0];
    return hit ? toClass(hit) : null;
}

const STRATEGY_PATTERNS: Array<[StrategyTag, RegExp]> = [
    ['daily_yield', new RegExp(`\\bdaily\\b|\\bkol\\s*youm\\b|\\byoum\\s*b\\s*youm\\b|${arWord('يومي', 'اليومي', 'يومية', 'اليومية')}|كل\\s*يوم|يوم\\s*ب\\s*يوم|يوم\\s*بيوم`, 'i')],
    ['capital_protected', new RegExp(`\\bcapital\\s*(?:protect|guarant)\\w*|\\bprotected\\b|${arWord('حماية', 'ضمان', 'مضمون', 'المضمون', 'محمي')}`, 'i')],
    ['periodic_income', new RegExp(`\\bperiodic\\b|\\bincome\\s+distribut\\w*|${arWord('دوري', 'الدوري', 'دورية', 'الدورية', 'توزيعات')}`, 'i')],
];
/** Strategy properties, orthogonal to the asset class: from the registered name plus any disposition's tags. */
export function strategyTagsOf(row: NameRow & { fund_id?: unknown }): StrategyTag[] {
    const tags = new Set<StrategyTag>();
    for (const t of nameTypeHits(row)) if (t === 'index' || t === 'sector') tags.add(t);
    const hay = nameHay(row);
    if (hay.trim()) for (const [tag, re] of STRATEGY_PATTERNS) if (re.test(hay)) tags.add(tag);
    const d = taxonomyDispositionFor(row.fund_id);
    if (d) for (const t of d.strategy_tags) tags.add(t);
    return [...tags];
}
/** Shariah compliance as the manager declares it (flag or the registered name), separate from the class. */
export function shariaCompliantOf(row: NameRow & { is_shariah?: unknown }): boolean {
    return row.is_shariah === true || row.is_shariah === 'true' || row.is_shariah === 1 || classifyFundByName(row).shariah;
}

const CLASS_LABEL_EN: Record<PrimaryAssetClass, string> = {
    money_market: 'Money Market Fund', fixed_income: 'Fixed Income Fund', equity: 'Equity Fund', balanced: 'Balanced Fund', gold: 'Gold Fund',
};

/**
 * Resolve a fund row's taxonomy IN PLACE — the one entry point every loader
 * calls (getFund, getAllFundsRanked, /api/v1/funds, /api/v1/funds/{id}).
 * Sets `fund_type` (override → disclosed → name), `fund_type_source`
 * (override|disclosed|name|none), the orthogonal dimensions, and the audit
 * fields `taxonomy_conflict` / `taxonomy_reviewed`. Under an override the
 * vendor's contradicting classification text is replaced too, so no surface
 * can print the vendor's word beside the corrected type.
 */
export type FundTaxonomyFields = {
    fund_type: string | null;
    fund_type_source: 'override' | 'disclosed' | 'name' | 'none';
    primary_asset_class: PrimaryAssetClass | null;
    strategy_tags: StrategyTag[];
    sharia_compliant: boolean;
    /** A vendor type the registered name contradicts, with no recorded disposition — else null. */
    taxonomy_conflict: PrimaryAssetClass | null;
    taxonomy_reviewed: boolean;
    taxonomy_evidence?: string[];
};
export function applyFundTaxonomy<T extends Record<string, unknown>>(row: T): T & FundTaxonomyFields {
    const r = row as Record<string, unknown>;
    const override = taxonomyOverrideFor(r.fund_id);
    if (override) {
        r.fund_type = override.primary_asset_class;
        r.fund_type_source = 'override';
        for (const k of ['classification', 'classification_en'] as const) {
            if (typeof r[k] === 'string' && (r[k] as string).trim()) r[k] = CLASS_LABEL_EN[override.primary_asset_class];
        }
        if (typeof r.fund_type_en === 'string' && r.fund_type_en.trim()) r.fund_type_en = override.primary_asset_class;
        r.taxonomy_evidence = override.evidence;
    } else {
        const type = fundTypeSlug(r);
        if (type.source === 'name') r.fund_type = type.slug;
        r.fund_type_source = type.source;
    }
    r.primary_asset_class = primaryAssetClassOf(r);
    r.strategy_tags = strategyTagsOf(r);
    r.sharia_compliant = shariaCompliantOf(r);
    r.taxonomy_conflict = nameTypeConflict(r);
    r.taxonomy_reviewed = taxonomyDispositionFor(r.fund_id) !== null;
    return row as T & FundTaxonomyFields;
}
