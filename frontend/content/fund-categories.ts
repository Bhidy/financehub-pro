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
            'Every Egyptian money market (liquidity) fund with its live NAV, trailing returns, management fee and minimum subscription. Updated twice daily from manager disclosures.',
        descriptionAr:
            'كل صناديق أسواق النقد (السيولة النقدية) في مصر مع صافي قيمة الأصول والعوائد التاريخية ورسوم الإدارة والحد الأدنى للاشتراك. يتم التحديث مرتين يومياً من إفصاحات مديري الصناديق.',
        introEn:
            'Money market funds — also called liquidity funds — invest in short-dated instruments such as treasury bills, time deposits and short-term debt. They are the lowest-volatility category in the Egyptian market and are typically used for capital held for short periods. The table lists every money market fund covered on this site with its own reported NAV and trailing returns.',
        introAr:
            'صناديق أسواق النقد — وتُعرف أيضاً بصناديق السيولة النقدية — تستثمر في أدوات قصيرة الأجل مثل أذون الخزانة والودائع لأجل وأدوات الدين قصيرة الأجل. وهي الفئة الأقل تقلباً في السوق المصري وتُستخدم عادةً للأموال المحتفظ بها لفترات قصيرة. يعرض الجدول كل صناديق أسواق النقد المغطاة على هذا الموقع بصافي قيمة الأصول المعلنة والعوائد التاريخية.',
        match: (t) => /money\s*market|liquidity|cash|نقد|سيول/.test(t),
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
    fund_type_en?: unknown;
    fund_type?: unknown;
    classification_en?: unknown;
    is_shariah?: unknown;
}): FundCategory | null {
    // NORMALISE SEPARATORS FIRST. The source values are snake_case
    // ("money_market", "fixed_income", "fixed_income_usd"), and a matcher
    // written as /money\s*market/ does NOT match an underscore — \s matches
    // whitespace only. That silently dropped every money-market and
    // fixed-income fund into "no category", which 404'd the two largest
    // category pages in the Egyptian market (verified against production:
    // 26 money-market and 20 fixed-income funds were being discarded).
    // Underscores, hyphens and dots all become spaces before any matcher runs.
    const text = [row.fund_type_en, row.fund_type, row.classification_en]
        .map((v) => (typeof v === 'string' ? v : ''))
        .join(' ')
        .toLowerCase()
        .replace(/[_\-.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const isShariah = row.is_shariah === true || row.is_shariah === 'true' || row.is_shariah === 1;
    const shariah = FUND_CATEGORIES.find((c) => c.key === 'shariah') as FundCategory;
    if (shariah.match(text, isShariah)) return shariah;
    return FUND_CATEGORIES.find((c) => c.key !== 'shariah' && c.match(text, isShariah)) ?? null;
}
