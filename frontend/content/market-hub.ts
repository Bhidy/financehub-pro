/**
 * /markets — THE MARKET-DATA HUB'S CONTENT.
 *
 * Twelve ranked and reference views of the EGX are published on this site and,
 * until now, they had no parent. /markets and /ar/markets both returned a hard
 * 404 while every one of the twelve sat in the sitemap; the only page gathering
 * any of them was the Arabic entry hub, which is not a hub for the English tree
 * and is not where a reader looks for market data.
 *
 * Grouping is by the QUESTION a reader arrives with, not by our data source:
 * what moved today, what is a company worth and what does it pay, and what do
 * the technical readings say. The technical group is deliberately last and
 * deliberately smaller — those screens describe past price behaviour and are
 * the least load-bearing of the three.
 *
 * Copy lives here rather than in the renderer so both language trees read from
 * one place and neither can drift.
 */

export type HubGroupKey = 'session' | 'value' | 'technical';

/** A destination that is NOT one of the dynamic MARKET_SCREENS. */
export type HubEntry = {
    /** Path without the language prefix; the renderer localises it. */
    path: string;
    group: HubGroupKey;
    en: { title: string; blurb: string };
    ar: { title: string; blurb: string };
};

export const HUB_GROUPS: Record<HubGroupKey, { en: string; ar: string }> = {
    session: { en: 'Today’s session', ar: 'جلسة اليوم' },
    value: { en: 'Value, size and income', ar: 'القيمة والحجم والتوزيعات' },
    technical: { en: 'Technical screens', ar: 'المؤشرات الفنية' },
};

export const HUB_ENTRIES: HubEntry[] = [
    {
        path: '/markets/movers',
        group: 'session',
        en: {
            title: 'Movers — gainers, losers and most active',
            blurb: 'The whole session in one view: what rose, what fell and where the volume went.',
        },
        ar: {
            title: 'الأكثر ارتفاعًا وانخفاضًا ونشاطًا',
            blurb: 'الجلسة كاملة في صفحة واحدة: ما ارتفع وما انخفض وأين تركّزت أحجام التداول.',
        },
    },
    {
        path: '/markets/largest-companies',
        group: 'value',
        en: {
            title: 'Largest companies by market cap',
            blurb: 'Every listed company ranked by the total market value of its shares.',
        },
        ar: {
            title: 'أكبر الشركات حسب القيمة السوقية',
            blurb: 'الشركات المقيدة مرتبة حسب إجمالي القيمة السوقية لأسهمها.',
        },
    },
    {
        path: '/markets/top-dividend-yield',
        group: 'value',
        en: {
            title: 'Highest dividend yield',
            blurb: 'Ranked by annual dividend per share against today’s price, with implausible yields excluded.',
        },
        ar: {
            title: 'أعلى عائد توزيعات',
            blurb: 'مرتبة حسب التوزيع السنوي للسهم منسوبًا إلى سعر اليوم، مع استبعاد العوائد غير المنطقية.',
        },
    },
    {
        path: '/markets/lowest-pe-stocks',
        group: 'value',
        en: {
            title: 'Lowest P/E ratio',
            blurb: 'A mechanical value screen: price against trailing earnings, loss-makers excluded.',
        },
        ar: {
            title: 'أقل مكرر ربحية',
            blurb: 'فرز آلي للقيمة: السعر منسوبًا إلى الأرباح المحققة، مع استبعاد الشركات الخاسرة.',
        },
    },
    {
        path: '/markets/dividend-calendar',
        group: 'value',
        en: {
            title: 'Dividend calendar',
            blurb: 'Upcoming and recent ex-dates and payout amounts across the exchange.',
        },
        ar: {
            title: 'مواعيد توزيعات الأرباح',
            blurb: 'تواريخ الاستحقاق القادمة والأخيرة وقيم التوزيعات في البورصة.',
        },
    },
];

/** Reference destinations offered after the ranked screens, as a pill row. */
export const HUB_BROWSE: Array<{ path: string; en: string; ar: string }> = [
    { path: '/companies', en: 'All EGX companies', ar: 'كل شركات البورصة' },
    { path: '/sectors', en: 'Sectors', ar: 'القطاعات' },
    { path: '/Market-Pulse', en: 'Market Pulse', ar: 'نبض السوق' },
    { path: '/Learn/glossary', en: 'Glossary', ar: 'قاموس المصطلحات' },
    { path: '/Funds', en: 'Mutual funds', ar: 'الصناديق الاستثمارية' },
];

export const HUB_COPY = {
    en: {
        crumb: 'Market Data',
        h1: 'Egyptian Exchange market data',
        indexLabel: 'EGX 30',
        indexLink: 'Index level and constituents',
        browse: 'Browse the market',
        methodology:
            'Every ranking on these pages is mechanical: the rule is stated on the page and applied to the same market data, with no editorial selection. Nothing here is a recommendation to buy or sell.',
        asOf: (d: string) => `Figures as of ${d}.`,
        empty: 'Market data is briefly unavailable. The pages below are unaffected.',
    },
    ar: {
        crumb: 'بيانات السوق',
        h1: 'بيانات البورصة المصرية',
        indexLabel: 'مؤشر EGX 30',
        indexLink: 'قيمة المؤشر والشركات المكونة له',
        browse: 'تصفّح السوق',
        methodology:
            'كل ترتيب في هذه الصفحات آلي: القاعدة معلنة على الصفحة وتُطبَّق على البيانات نفسها دون اختيار تحريري. ولا شيء هنا توصية بالشراء أو البيع.',
        asOf: (d: string) => `الأرقام كما في ${d}.`,
        empty: 'بيانات السوق غير متاحة مؤقتًا. الصفحات أدناه غير متأثرة.',
    },
} as const;
