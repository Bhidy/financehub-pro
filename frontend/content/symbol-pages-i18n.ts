/**
 * COPY FOR THE COMPANY SUB-PAGES, BOTH LANGUAGES.
 *
 * The English sub-pages (/symbol/{SYM}/technicals, /financials, /dividends,
 * /history and the six per-metric pages) were written single-language, with
 * every label inline. The Arabic company tree therefore had exactly ONE page
 * type against English's eleven — on a site whose default language is Arabic.
 *
 * Rather than duplicate five templates, the copy lives here and each renderer
 * takes a `lang`. Financial terminology is the standard Egyptian-market
 * wording, not literal translation: التحليل الفني, صافي قيمة الأصول,
 * المتوسط المتحرك, توزيعات الأرباح.
 */

export type Lang = 'en' | 'ar';
type S = Record<Lang, string>;

const s = (en: string, ar: string): S => ({ en, ar });

/** Shared chrome — breadcrumbs and the sibling tab strip. */
export const NAV = {
    home: s('Home', 'الرئيسية'),
    companies: s('EGX Companies', 'شركات البورصة المصرية'),
    overview: s('Overview', 'نظرة عامة'),
    financials: s('Financials', 'القوائم المالية'),
    dividends: s('Dividends', 'التوزيعات'),
    technicals: s('Technicals', 'التحليل الفني'),
    history: s('Price History', 'سجل الأسعار'),
    companyPages: s('Company pages', 'صفحات الشركة'),
};

export const COMMON = {
    asOf: s('As of', 'البيانات حتى'),
    cairoTime: s('(Cairo time)', '(بتوقيت القاهرة)'),
    notAdvice: s(
        'Informational only, not investment advice.',
        'هذه البيانات معلوماتية فقط ولا تمثل توصية أو مشورة استثمارية.'
    ),
    source: s(
        'Source: the Egyptian Exchange via TradingView.',
        'المصدر: البورصة المصرية عبر TradingView.'
    ),
};

/* ── technicals ──────────────────────────────────────────────────────────── */

export const TECHNICALS = {
    h1: (name: string, symbol: string): S =>
        s(`${name} (${symbol}) Technical Analysis`, `التحليل الفني لسهم ${name} (${symbol})`),
    title: (name: string, symbol: string): S =>
        s(
            `${name} (${symbol}) Technical Analysis — RSI, MACD & Signals`,
            `التحليل الفني لسهم ${name} (${symbol}) — مؤشر القوة النسبية والماكد والإشارات`
        ),
    description: (name: string, symbol: string, signal: string | null): S =>
        s(
            `${name} (EGX: ${symbol}) technical analysis: RSI, MACD, ADX, moving averages & buy/sell signals across 4 timeframes.${signal ? ` Daily signal: ${signal}.` : ''}`,
            `التحليل الفني لسهم ${name} (${symbol}) في البورصة المصرية: مؤشر القوة النسبية والماكد ومتوسطات الحركة وإشارات الشراء والبيع على أربعة أطر زمنية.${signal ? ` الإشارة اليومية: ${signal}.` : ''}`
        ),
    cols: {
        timeframe: s('Timeframe', 'الإطار الزمني'),
        overall: s('Overall signal', 'الإشارة الإجمالية'),
        ma: s('Moving-averages signal', 'إشارة المتوسطات المتحركة'),
        osc: s('Oscillators signal', 'إشارة المذبذبات'),
    },
    timeframes: {
        '60': s('1 Hour', 'ساعة'),
        '240': s('4 Hours', '٤ ساعات'),
        '1D': s('Daily', 'يومي'),
        '1W': s('Weekly', 'أسبوعي'),
    } as Record<string, S>,
    signals: {
        'Strong Buy': s('Strong Buy', 'شراء قوي'),
        Buy: s('Buy', 'شراء'),
        Neutral: s('Neutral', 'محايد'),
        Sell: s('Sell', 'بيع'),
        'Strong Sell': s('Strong Sell', 'بيع قوي'),
    } as Record<string, S>,
    computedFrom: s(
        'Computed from EGX price history via TradingView; refreshed with market data.',
        'محسوبة من سجل أسعار البورصة المصرية عبر TradingView، ويتم تحديثها مع بيانات السوق.'
    ),
    explainer: s(
        'Buy and sell signals summarize where indicators such as RSI, MACD and moving averages currently point for each timeframe — short-term readings (1 Hour, 4 Hours) react faster while Daily and Weekly reflect the broader trend. They describe recent price behaviour, not a prediction of where the stock will go.',
        'تلخّص إشارات الشراء والبيع الاتجاه الذي تشير إليه مؤشرات مثل القوة النسبية والماكد والمتوسطات المتحركة في كل إطار زمني — القراءات قصيرة الأجل (ساعة و٤ ساعات) أسرع استجابة، بينما يعكس الإطاران اليومي والأسبوعي الاتجاه الأوسع. وهي تصف سلوك السعر الأخير ولا تتنبأ باتجاه السهم مستقبلاً.'
    ),
    disclaimer: s(
        'Technical signals are informational, not investment advice.',
        'الإشارات الفنية معلوماتية ولا تمثل توصية استثمارية.'
    ),
    faq: (name: string, symbol: string, signal: string | null) => [
        {
            q: s(
                `What is the technical signal for ${name} (${symbol}) today?`,
                `ما هي الإشارة الفنية لسهم ${name} (${symbol}) اليوم؟`
            ),
            a: s(
                signal
                    ? `The daily technical signal for ${symbol} is ${signal}, computed from RSI, MACD, ADX and moving averages on the Egyptian Exchange price history. It describes recent price behaviour and is not a recommendation.`
                    : `A daily technical signal for ${symbol} is not currently available. Signals are computed from RSI, MACD, ADX and moving averages when enough price history exists.`,
                signal
                    ? `الإشارة الفنية اليومية لسهم ${symbol} هي ${signal}، وهي محسوبة من مؤشر القوة النسبية والماكد ومؤشر الاتجاه والمتوسطات المتحركة على سجل أسعار البورصة المصرية. وهي تصف سلوك السعر الأخير ولا تمثل توصية.`
                    : `لا تتوفر حالياً إشارة فنية يومية لسهم ${symbol}. تُحسب الإشارات من مؤشر القوة النسبية والماكد ومؤشر الاتجاه والمتوسطات المتحركة عند توفر سجل أسعار كافٍ.`
            ),
        },
        {
            q: s('Which timeframes are covered?', 'ما الأطر الزمنية المغطاة؟'),
            a: s(
                'Four: 1 hour, 4 hours, daily and weekly. Short timeframes react faster to price moves; the daily and weekly readings reflect the broader trend.',
                'أربعة أطر: ساعة و٤ ساعات ويومي وأسبوعي. الأطر القصيرة أسرع استجابة لحركة السعر، بينما يعكس الإطاران اليومي والأسبوعي الاتجاه الأوسع.'
            ),
        },
        {
            q: s(
                'Do technical signals predict the share price?',
                'هل تتنبأ الإشارات الفنية بسعر السهم؟'
            ),
            a: s(
                'No. They summarise how indicators read on recent price history. Past price behaviour does not determine future results, and nothing on this page is investment advice.',
                'لا. فهي تلخّص قراءة المؤشرات لسجل الأسعار الأخير. السلوك السعري السابق لا يحدد النتائج المستقبلية، ولا شيء في هذه الصفحة يمثل مشورة استثمارية.'
            ),
        },
    ],
};

/* ── price history ───────────────────────────────────────────────────────── */

export const HISTORY = {
    h1: (name: string, symbol: string): S =>
        s(`${name} (${symbol}) Price History`, `سجل أسعار سهم ${name} (${symbol})`),
    title: (name: string, symbol: string): S =>
        s(
            `${name} (${symbol}) Stock Price History — EGX Daily Data`,
            `سجل سعر سهم ${name} (${symbol}) — بيانات البورصة المصرية اليومية`
        ),
    description: (name: string, symbol: string, range: string | null): S =>
        s(
            `Daily open, high, low, close and volume for ${name} (EGX: ${symbol})${range ? `, ${range}` : ''}. Performance across 1 week to 5 years.`,
            `أسعار الافتتاح والأعلى والأدنى والإغلاق وأحجام التداول اليومية لسهم ${name} (${symbol}) في البورصة المصرية${range ? `، ${range}` : ''}. الأداء من أسبوع حتى خمس سنوات.`
        ),
    perf: s('Performance', 'الأداء'),
    recent: s('Recent daily prices', 'أحدث الأسعار اليومية'),
    cols: {
        date: s('Date', 'التاريخ'),
        open: s('Open', 'الافتتاح'),
        high: s('High', 'الأعلى'),
        low: s('Low', 'الأدنى'),
        close: s('Close', 'الإغلاق'),
        volume: s('Volume', 'حجم التداول'),
        change: s('Change', 'التغير'),
    },
    periods: {
        '1W': s('1 week', 'أسبوع'),
        '1M': s('1 month', 'شهر'),
        '3M': s('3 months', '٣ أشهر'),
        '6M': s('6 months', '٦ أشهر'),
        YTD: s('Year to date', 'من بداية العام'),
        '1Y': s('1 year', 'سنة'),
        '5Y': s('5 years', '٥ سنوات'),
    } as Record<string, S>,
};

/* ── dividends ───────────────────────────────────────────────────────────── */

export const DIVIDENDS = {
    h1: (name: string, symbol: string): S =>
        s(`${name} (${symbol}) Dividends`, `توزيعات أرباح سهم ${name} (${symbol})`),
    title: (name: string, symbol: string): S =>
        s(
            `${name} (${symbol}) Dividend History & Yield — EGX`,
            `توزيعات أرباح سهم ${name} (${symbol}) والعائد — البورصة المصرية`
        ),
    description: (name: string, symbol: string, y: string | null): S =>
        s(
            `${name} (EGX: ${symbol}) dividend history, ex-dates and payment dates${y ? `. Trailing dividend yield ${y}` : ''}.`,
            `سجل توزيعات أرباح سهم ${name} (${symbol}) وتواريخ نزول الحق والصرف${y ? `. عائد التوزيعات ${y}` : ''}.`
        ),
    cols: {
        exDate: s('Ex-date', 'تاريخ نزول الحق'),
        amount: s('Amount', 'قيمة التوزيع'),
        recordDate: s('Record date', 'تاريخ القيد'),
        payDate: s('Payment date', 'تاريخ الصرف'),
    },
    yieldLabel: s('Dividend yield', 'عائد التوزيعات'),
    noneYet: s('No dividend payments recorded.', 'لا توجد توزيعات مسجلة.'),
};

/* ── financials ──────────────────────────────────────────────────────────── */

export const FINANCIALS = {
    h1: (name: string, symbol: string): S =>
        s(`${name} (${symbol}) Financials`, `القوائم المالية لشركة ${name} (${symbol})`),
    title: (name: string, symbol: string): S =>
        s(
            `${name} (${symbol}) Financials — Revenue, Net Income & EPS`,
            `القوائم المالية لشركة ${name} (${symbol}) — الإيرادات وصافي الدخل وربحية السهم`
        ),
    description: (name: string, symbol: string, years: number): S =>
        s(
            `${name} (EGX: ${symbol}) annual financials: revenue, net income, EPS, assets and debt across ${years} fiscal years.`,
            `القوائم المالية السنوية لشركة ${name} (${symbol}): الإيرادات وصافي الدخل وربحية السهم والأصول والديون على مدى ${years} سنة مالية.`
        ),
    cols: {
        year: s('Fiscal year', 'السنة المالية'),
        revenue: s('Revenue', 'الإيرادات'),
        grossProfit: s('Gross profit', 'إجمالي الربح'),
        ebitda: s('EBITDA', 'الأرباح قبل الفوائد والضرائب والإهلاك'),
        netIncome: s('Net income', 'صافي الدخل'),
        eps: s('EPS (diluted)', 'ربحية السهم المخففة'),
        fcf: s('Free cash flow', 'التدفق النقدي الحر'),
        assets: s('Total assets', 'إجمالي الأصول'),
        debt: s('Total debt', 'إجمالي الديون'),
        dps: s('Dividend per share', 'التوزيع للسهم'),
    },
    reportedIn: s(
        'Reported in Egyptian pounds as filed by the company.',
        'معروضة بالجنيه المصري كما أفصحت عنها الشركة.'
    ),
};

/** Pick the string for a language. */
export const t = (v: S, lang: Lang): string => v[lang];
