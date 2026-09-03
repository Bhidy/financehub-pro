import type { MarketListKey } from '@/lib/public-data';

/**
 * MARKET SCREEN DEFINITIONS — one page per search intent.
 *
 * /markets/movers already answers "what moved today" as a combined view. These
 * six answer DIFFERENT questions that each have their own query and their own
 * SERP: "أعلى الأسهم ارتفاعاً اليوم", "الأسهم الأكثر نشاطاً",
 * "أسهم في منطقة التشبع البيعي". The combined page keeps its intent and links
 * to these; each of these links back. One canonical destination per intent, so
 * they cannot cannibalise each other.
 *
 * TradingView ships roughly thirty such screens per country and
 * stockanalysis.com twenty-four; we had exactly one URL for all of it.
 *
 * Every screen is data-gated at render: a screen with too few qualifying rows
 * 404s rather than publishing an empty table.
 */

export type ScreenColumn = 'change' | 'volume' | 'rsi' | 'beta';

export type MarketScreen = {
    /** URL slug — the contract. */
    slug: string;
    key: MarketListKey;
    /** Extra column beyond price/change. */
    metric: ScreenColumn;
    titleEn: string;
    titleAr: string;
    h1En: string;
    h1Ar: string;
    descEn: string;
    descAr: string;
    introEn: string;
    introAr: string;
    /** Below this the screen is not published. */
    minRows: number;
};

export const MARKET_SCREENS: MarketScreen[] = [
    {
        slug: 'top-gainers',
        key: 'gainers',
        metric: 'change',
        titleEn: 'EGX Top Gainers Today — Biggest Risers on the Egyptian Exchange',
        titleAr: 'أعلى الأسهم ارتفاعاً اليوم في البورصة المصرية',
        h1En: 'EGX top gainers today',
        h1Ar: 'أعلى الأسهم ارتفاعاً اليوم',
        descEn:
            'Egyptian Exchange stocks with the largest percentage gain in the current session, with price, change and sector. Refreshed through the trading day.',
        descAr:
            'أسهم البورصة المصرية الأكثر ارتفاعاً بالنسبة المئوية في جلسة اليوم، مع السعر والتغير والقطاع. يتم التحديث خلال جلسة التداول.',
        introEn:
            'Ranked by percentage change in the current session. A large single-day move often reflects a specific event — results, a disclosure or thin trading — so the size of a move says nothing on its own about the company behind it.',
        introAr:
            'مرتبة حسب نسبة التغير في جلسة اليوم. غالباً ما يعكس الارتفاع الكبير في جلسة واحدة حدثاً بعينه — نتائج أعمال أو إفصاح أو ضعف السيولة — ولذلك فإن حجم الحركة وحده لا يقول شيئاً عن الشركة.',
        minRows: 5,
    },
    {
        slug: 'top-losers',
        key: 'losers',
        metric: 'change',
        titleEn: 'EGX Top Losers Today — Biggest Fallers on the Egyptian Exchange',
        titleAr: 'أكثر الأسهم انخفاضاً اليوم في البورصة المصرية',
        h1En: 'EGX top losers today',
        h1Ar: 'أكثر الأسهم انخفاضاً اليوم',
        descEn:
            'Egyptian Exchange stocks with the largest percentage decline in the current session, with price, change and sector. Refreshed through the trading day.',
        descAr:
            'أسهم البورصة المصرية الأكثر انخفاضاً بالنسبة المئوية في جلسة اليوم، مع السعر والتغير والقطاع. يتم التحديث خلال جلسة التداول.',
        introEn:
            'Ranked by percentage decline in the current session. A fall can follow results, a dividend going ex, or simply a thin order book — the ranking describes price movement, not company quality.',
        introAr:
            'مرتبة حسب نسبة الانخفاض في جلسة اليوم. قد يأتي الانخفاض بعد نتائج أعمال أو نزول حق التوزيع أو ببساطة بسبب ضعف السيولة — والترتيب يصف حركة السعر وليس جودة الشركة.',
        minRows: 5,
    },
    {
        slug: 'most-active',
        key: 'active',
        metric: 'volume',
        titleEn: 'Most Active EGX Stocks Today — Highest Trading Volume',
        titleAr: 'الأسهم الأكثر نشاطاً اليوم في البورصة المصرية',
        h1En: 'Most active EGX stocks today',
        h1Ar: 'الأسهم الأكثر نشاطاً اليوم',
        descEn:
            'Egyptian Exchange stocks with the highest traded volume in the current session, with price, change and sector.',
        descAr:
            'أسهم البورصة المصرية الأعلى في حجم التداول خلال جلسة اليوم، مع السعر والتغير والقطاع.',
        introEn:
            'Ranked by shares traded in the current session. High volume marks where the market is transacting; it does not indicate direction, and lines with no recorded trades are excluded.',
        introAr:
            'مرتبة حسب عدد الأسهم المتداولة في جلسة اليوم. يشير حجم التداول المرتفع إلى المكان الذي يتركز فيه نشاط السوق، ولا يدل على الاتجاه، وتُستبعد الأسهم التي لم تُسجل عليها صفقات.',
        minRows: 5,
    },
    {
        slug: 'oversold-stocks',
        key: 'oversold',
        metric: 'rsi',
        titleEn: 'Oversold EGX Stocks — RSI Below 30',
        titleAr: 'أسهم البورصة المصرية في منطقة التشبع البيعي — مؤشر القوة النسبية أقل من ٣٠',
        h1En: 'Oversold EGX stocks (RSI below 30)',
        h1Ar: 'أسهم في منطقة التشبع البيعي (مؤشر القوة النسبية أقل من ٣٠)',
        descEn:
            'Egyptian Exchange stocks whose 14-day relative strength index has fallen to 30 or below — the conventional oversold band.',
        descAr:
            'أسهم البورصة المصرية التي انخفض مؤشر القوة النسبية لها (١٤ يوماً) إلى ٣٠ أو أقل — وهو النطاق المتعارف عليه للتشبع البيعي.',
        introEn:
            'The relative strength index compares recent gains with recent losses on a 0–100 scale. Readings at or below 30 are conventionally described as oversold. That is a description of recent price behaviour, not a signal that a stock is cheap or due to rise.',
        introAr:
            'يقارن مؤشر القوة النسبية المكاسب الأخيرة بالخسائر الأخيرة على مقياس من صفر إلى مئة. تُوصف القراءات عند ٣٠ أو أقل عادةً بأنها تشبع بيعي، وهو وصف لسلوك السعر الأخير وليس إشارة إلى أن السهم رخيص أو مرشح للارتفاع.',
        minRows: 3,
    },
    {
        slug: 'overbought-stocks',
        key: 'overbought',
        metric: 'rsi',
        titleEn: 'Overbought EGX Stocks — RSI Above 70',
        titleAr: 'أسهم البورصة المصرية في منطقة التشبع الشرائي — مؤشر القوة النسبية أعلى من ٧٠',
        h1En: 'Overbought EGX stocks (RSI above 70)',
        h1Ar: 'أسهم في منطقة التشبع الشرائي (مؤشر القوة النسبية أعلى من ٧٠)',
        descEn:
            'Egyptian Exchange stocks whose 14-day relative strength index has reached 70 or above — the conventional overbought band.',
        descAr:
            'أسهم البورصة المصرية التي بلغ مؤشر القوة النسبية لها (١٤ يوماً) ٧٠ أو أكثر — وهو النطاق المتعارف عليه للتشبع الشرائي.',
        introEn:
            'Readings at or above 70 on the 14-day relative strength index are conventionally described as overbought. A stock can stay in that band for a long stretch during a strong trend, so the reading is context, not a sell signal.',
        introAr:
            'تُوصف القراءات عند ٧٠ أو أكثر على مؤشر القوة النسبية (١٤ يوماً) عادةً بأنها تشبع شرائي. وقد يظل السهم في هذا النطاق فترة طويلة أثناء اتجاه صاعد قوي، لذا فالقراءة سياق وليست إشارة بيع.',
        minRows: 3,
    },
    {
        slug: 'most-volatile',
        key: 'volatile',
        metric: 'beta',
        titleEn: 'Most Volatile EGX Stocks — Highest Beta',
        titleAr: 'أسهم البورصة المصرية الأكثر تقلباً — أعلى معامل بيتا',
        h1En: 'Most volatile EGX stocks by beta',
        h1Ar: 'أسهم البورصة المصرية الأكثر تقلباً حسب بيتا',
        descEn:
            'Egyptian Exchange stocks with the highest one-year beta — those that have moved most relative to the wider market.',
        descAr:
            'أسهم البورصة المصرية الأعلى في معامل بيتا لسنة — أي الأكثر حركة مقارنةً بالسوق ككل.',
        introEn:
            'Beta measures how much a share has moved relative to the market over the past year. A beta above 1 means larger swings than the market in both directions; it measures past variability, not risk of loss.',
        introAr:
            'يقيس معامل بيتا مدى حركة السهم مقارنةً بالسوق خلال السنة الماضية. وبيتا أعلى من واحد تعني تذبذباً أكبر من السوق في الاتجاهين، وهو قياس للتقلب السابق وليس لاحتمال الخسارة.',
        minRows: 5,
    },
];

export const screenPath = (s: MarketScreen, lang: 'en' | 'ar'): string =>
    lang === 'ar' ? `/ar/markets/${s.slug}` : `/markets/${s.slug}`;

export const findScreen = (slug: string): MarketScreen | null =>
    MARKET_SCREENS.find((s) => s.slug === slug) ?? null;
