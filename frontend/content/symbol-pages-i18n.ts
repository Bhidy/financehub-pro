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
    statistics: s('Key Statistics', 'أهم الإحصاءات'),
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
    titleWithYear: (name: string, symbol: string, since: string): S =>
        s(
            `${name} (${symbol}) Price History — Daily OHLC since ${since}`,
            `سجل أسعار سهم ${name} (${symbol}) — بيانات يومية منذ ${since}`
        ),
    sourceNote: s(
        'Daily OHLC from the Egyptian Exchange.',
        'أسعار الافتتاح والأعلى والأدنى والإغلاق اليومية من البورصة المصرية.'
    ),
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
    stats: {
        allTimeHigh: s('All-time high', 'أعلى سعر تاريخي'),
        allTimeLow: s('All-time low', 'أدنى سعر تاريخي'),
        dataSince: s('Data since', 'البيانات منذ'),
        tradingDays: s('Trading days recorded', 'عدد جلسات التداول المسجلة'),
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
    stats: {
        trailingYield: s('Trailing dividend yield', 'عائد التوزيعات التاريخي'),
        mostRecent: s('Most recent dividend', 'أحدث توزيع'),
        upcoming: s('Upcoming dividend', 'التوزيع القادم'),
        payout: s('Payout ratio (TTM)', 'نسبة التوزيع (آخر ١٢ شهراً)'),
        growthYears: s('Consecutive growth years', 'سنوات النمو المتتالية'),
    },
    perShare: s('Dividend per share (EGP)', 'التوزيع للسهم (جنيه مصري)'),
    sourceNote: s(
        'Source: Egyptian Exchange corporate actions; dividend summary via TradingView.',
        'المصدر: إجراءات الشركات بالبورصة المصرية، وملخص التوزيعات عبر TradingView.'
    ),
    noRecords: s(
        'Individual payment records are not yet available for this company.',
        'لا تتوفر بعد سجلات التوزيعات الفردية لهذه الشركة.'
    ),
    noneYet: s('No dividend payments recorded.', 'لا توجد توزيعات مسجلة.'),
    lede: (name: string, symbol: string): S =>
        s(
            `Dividend history for ${name} (${symbol}) on the Egyptian Exchange — per-share amounts in Egyptian pounds (EGP) with ex-dates, record dates and payment dates, alongside the trailing yield.`,
            `سجل توزيعات أرباح سهم ${name} (${symbol}) في البورصة المصرية — قيمة التوزيع للسهم بالجنيه المصري مع تواريخ نزول الحق والقيد والصرف، إلى جانب العائد التاريخي.`
        ),
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
    sourceNote: s(
        'All figures in EGP. Source: company disclosures to the Egyptian Exchange via TradingView; updated weekly.',
        'كل الأرقام بالجنيه المصري. المصدر: إفصاحات الشركة للبورصة المصرية عبر TradingView، ويتم التحديث أسبوعياً.'
    ),
    lede: (name: string, range: string): S =>
        s(
            `Annual financial statement highlights for ${name}${range}. Figures are updated weekly from EGX filings via TradingView.`,
            `أبرز بنود القوائم المالية السنوية لشركة ${name}${range}. يتم تحديث الأرقام أسبوعياً من إفصاحات البورصة المصرية عبر TradingView.`
        ),
    reportedIn: s(
        'Reported in Egyptian pounds as filed by the company.',
        'معروضة بالجنيه المصري كما أفصحت عنها الشركة.'
    ),
};

/* ── key statistics ──────────────────────────────────────────────────────── */

export const STATISTICS = {
    h1: (name: string, symbol: string): S =>
        s(`${name} (${symbol}) Key Statistics`, `أهم إحصاءات سهم ${name} (${symbol})`),
    title: (name: string, symbol: string): S =>
        s(
            `${name} (${symbol}) Key Statistics — Valuation, Financials & Ratios`,
            `أهم إحصاءات سهم ${name} (${symbol}) — التقييم والقوائم المالية والنسب`
        ),
    description: (name: string, symbol: string): S =>
        s(
            `${name} (EGX: ${symbol}) key statistics: valuation multiples, fiscal-year revenue and profit, balance-sheet totals, growth rates and technical readings.`,
            `أهم إحصاءات سهم ${name} (${symbol}) في البورصة المصرية: مضاعفات التقييم وإيرادات وأرباح السنة المالية وإجماليات المركز المالي ومعدلات النمو والقراءات الفنية.`
        ),
    groups: {
        valuation: s('Valuation', 'التقييم'),
        income: s('Income (latest fiscal year)', 'الأداء (آخر سنة مالية)'),
        balance: s('Balance sheet', 'المركز المالي'),
        growth: s('Growth', 'النمو'),
        perShare: s('Per share', 'لكل سهم'),
        technical: s('Technical', 'مؤشرات فنية'),
        shares: s('Shares', 'الأسهم'),
    },
    rows: {
        marketCap: s('Market cap', 'القيمة السوقية'),
        pe: s('P/E (trailing)', 'مكرر الربحية'),
        forwardPe: s('Forward P/E', 'مكرر الربحية المتوقع'),
        pb: s('P/B', 'مكرر القيمة الدفترية'),
        divYield: s('Dividend yield', 'عائد التوزيعات'),
        revenueFy: s('Revenue', 'الإيرادات'),
        netIncomeFy: s('Net income', 'صافي الدخل'),
        ebitdaFy: s('EBITDA', 'الأرباح قبل الفوائد والضرائب والإهلاك'),
        fcfFy: s('Free cash flow', 'التدفق النقدي الحر'),
        profitMargin: s('Profit margin', 'هامش الربح'),
        totalAssets: s('Total assets', 'إجمالي الأصول'),
        totalDebt: s('Total debt', 'إجمالي الديون'),
        bookValue: s('Book value', 'القيمة الدفترية'),
        revenueGrowth: s('Revenue growth', 'نمو الإيرادات'),
        profitGrowth: s('Profit growth', 'نمو الأرباح'),
        epsGrowth: s('EPS growth', 'نمو ربحية السهم'),
        epsFy: s('EPS (fiscal year)', 'ربحية السهم (السنة المالية)'),
        bvps: s('Book value per share', 'القيمة الدفترية للسهم'),
        dps: s('Dividend per share', 'التوزيع للسهم'),
        roe: s('Return on equity', 'العائد على حقوق الملكية'),
        roa: s('Return on assets', 'العائد على الأصول'),
        rsi: s('RSI (14)', 'مؤشر القوة النسبية (١٤)'),
        ma50: s('50-day moving average', 'المتوسط المتحرك ٥٠ يوماً'),
        ma200: s('200-day moving average', 'المتوسط المتحرك ٢٠٠ يوم'),
        beta: s('Beta (1Y)', 'معامل بيتا (سنة)'),
        shares: s('Shares outstanding', 'الأسهم المصدرة'),
        float: s('Free float', 'الأسهم الحرة'),
    },
    lede: (name: string, n: number): S =>
        s(
            `${n} reported figures for ${name} — valuation multiples, the latest fiscal year's income statement, balance-sheet totals, growth rates and technical readings. Figures with no reported value are omitted rather than shown as zero.`,
            `${n} رقماً معلناً لسهم ${name} — مضاعفات التقييم وقائمة الدخل لآخر سنة مالية وإجماليات المركز المالي ومعدلات النمو والقراءات الفنية. تُحذف البنود غير المعلنة بدلاً من عرضها كصفر.`
        ),
    sourceNote: s(
        'Source: company disclosures to the Egyptian Exchange via TradingView. Fiscal-year figures are as last reported; technical readings refresh with market data.',
        'المصدر: إفصاحات الشركة للبورصة المصرية عبر TradingView. أرقام السنة المالية كما وردت في آخر إفصاح، وتتحدث القراءات الفنية مع بيانات السوق.'
    ),
};

/* ── fund NAV history ────────────────────────────────────────────────────── */

export const NAVHIST = {
    h1: (name: string): S => s(`${name} — NAV History`, `سجل صافي قيمة أصول ${name}`),
    title: (name: string): S =>
        s(
            `${name} NAV History — Annual and Monthly Net Asset Value`,
            `سجل صافي قيمة أصول ${name} — القيم السنوية والشهرية`
        ),
    description: (name: string, from: string, to: string, pts: number): S =>
        s(
            `Net asset value history for ${name} from ${from} to ${to} — ${pts} published NAV points, with annual closes and yearly change.`,
            `سجل صافي قيمة الأصول لصندوق ${name} من ${from} إلى ${to} — ${pts} قيمة منشورة، مع إغلاقات كل سنة ونسبة التغير السنوي.`
        ),
    lede: (name: string, pts: number, from: string, to: string): S =>
        s(
            `Every published net asset value for ${name} between ${from} and ${to} — ${pts} points in total. Annual closes and the change between them are computed from that series; nothing is interpolated for dates the manager did not publish.`,
            `كل قيم صافي الأصول المنشورة لصندوق ${name} بين ${from} و${to} — ${pts} قيمة إجمالاً. تُحسب إغلاقات كل سنة والتغير بينها من هذه السلسلة، ولا يتم استكمال أي تواريخ لم يُفصح عنها مدير الصندوق.`
        ),
    annual: s('Annual net asset value', 'صافي قيمة الأصول سنوياً'),
    recent: s('Recent published values', 'أحدث القيم المنشورة'),
    cols: {
        year: s('Year', 'السنة'),
        date: s('Date', 'التاريخ'),
        nav: s('NAV', 'صافي قيمة الأصول'),
        change: s('Change', 'التغير'),
        yearEnd: s('Year-end NAV', 'صافي قيمة الأصول في نهاية السنة'),
    },
    stats: {
        first: s('First published', 'أول قيمة منشورة'),
        latest: s('Latest', 'أحدث قيمة'),
        points: s('Published values', 'عدد القيم المنشورة'),
        high: s('Highest', 'الأعلى'),
        low: s('Lowest', 'الأدنى'),
    },
    sourceNote: s(
        'Net asset values as published by the fund manager. A fund does not publish a value every calendar day, so gaps in the series are the manager’s publication schedule, not missing data.',
        'صافي قيمة الأصول كما ينشرها مدير الصندوق. لا ينشر الصندوق قيمة كل يوم تقويمي، لذا فإن الفجوات في السلسلة تعود إلى جدول النشر لدى المدير وليست بيانات ناقصة.'
    ),
};

/* ── fund comparison ─────────────────────────────────────────────────────── */

export const FUNDVS = {
    h1: (a: string, b: string): S => s(`${a} vs ${b}`, `${a} مقابل ${b}`),
    title: (a: string, b: string): S =>
        s(
            `${a} vs ${b} — NAV, Returns & Fees Compared`,
            `${a} مقابل ${b} — مقارنة صافي قيمة الأصول والعوائد والرسوم`
        ),
    description: (a: string, b: string): S =>
        s(
            `Side-by-side comparison of ${a} and ${b}: latest NAV, trailing returns, management fee, minimum subscription and risk level.`,
            `مقارنة جنباً إلى جنب بين ${a} و${b}: صافي قيمة الأصول والعوائد التاريخية ورسوم الإدارة والحد الأدنى للاشتراك ومستوى المخاطر.`
        ),
    intro: (a: string, b: string): S =>
        s(
            `Every reported figure for ${a} and ${b} side by side. Both funds are shown with the same fields from the same source, so the comparison is like-for-like; a field neither manager publishes is omitted rather than shown as zero.`,
            `كل رقم معلن عن ${a} و${b} جنباً إلى جنب. يُعرض الصندوقان بالحقول نفسها ومن المصدر نفسه لتكون المقارنة متكافئة، ويُحذف أي حقل لا ينشره أي من المديرين بدلاً من عرضه كصفر.`
        ),
    heading: s('Egyptian mutual fund comparison', 'مقارنة صناديق الاستثمار المصرية'),
    metric: s('Metric', 'البند'),
    allFunds: s('All Egyptian mutual funds', 'كل صناديق الاستثمار المصرية'),
    crumb: s('Mutual Funds', 'صناديق الاستثمار'),
    rows: {
        latestNav: s('Latest NAV', 'صافي قيمة الأصول'),
        fundType: s('Fund type', 'نوع الصندوق'),
        classification: s('Classification', 'التصنيف'),
        riskLevel: s('Risk level', 'مستوى المخاطر'),
        managementFee: s('Management fee', 'رسوم الإدارة'),
        expenseRatio: s('Expense ratio', 'نسبة المصروفات'),
        minSubscription: s('Minimum subscription', 'الحد الأدنى للاشتراك'),
        shariah: s('Shariah-compliant', 'متوافق مع الشريعة'),
        inception: s('Inception year', 'سنة التأسيس'),
    },
    summary: {
        bothReturns: (a: string, ra: string, b: string, rb: string, asOf: string): S =>
            s(
                `Over the last year, ${a} returned ${ra} against ${rb} for ${b}${asOf ? ` (data as of ${asOf})` : ''}`,
                `خلال آخر سنة، حقق ${a} عائداً قدره ${ra} مقابل ${rb} لصندوق ${b}${asOf ? ` (البيانات كما في ${asOf})` : ''}`
            ),
        oneReturn: (withName: string, r: string, withoutName: string): S =>
            s(
                `Over the last year, ${withName} returned ${r}; a one-year figure for ${withoutName} is not published`,
                `خلال آخر سنة، حقق ${withName} عائداً قدره ${r}؛ ولا يتوفر رقم سنة كاملة لصندوق ${withoutName}`
            ),
        navs: (a: string, na: string, ca: string, da: string, b: string, nb: string, cb: string, db: string): S =>
            s(
                `The latest reported NAV is ${na} ${ca} for ${a}${da ? ` (as of ${da})` : ''} and ${nb} ${cb} for ${b}${db ? ` (as of ${db})` : ''}`,
                `أحدث صافي قيمة أصول معلن هو ${na} ${ca} لصندوق ${a}${da ? ` (كما في ${da})` : ''} و${nb} ${cb} لصندوق ${b}${db ? ` (كما في ${db})` : ''}`
            ),
    },
    note: s(
        'Both funds are compared on figures their managers publish. A difference in one field does not make either fund better suited to you — the categories, horizons and fee structures differ, and nothing here is a recommendation.',
        'تُقارن الصناديق بالأرقام التي ينشرها مديروها. واختلاف حقل واحد لا يجعل أياً منهما أنسب لك — فالفئات والآفاق الزمنية وهياكل الرسوم مختلفة، ولا شيء هنا يمثل توصية.'
    ),
};

/** Pick the string for a language. */
export const t = (v: S, lang: Lang): string => v[lang];
