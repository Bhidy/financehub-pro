/**
 * COPY + METRIC SPEC FOR THE STOCK-VS-STOCK COMPARISON PAGES.
 *
 * The metric list is NOT a wish list — it is what production actually
 * publishes. Coverage was measured across a sample of the 113 symbols that
 * qualify for a comparison page (top 8 by market cap in each sector):
 *
 *   100%  last_price, market_cap
 *   94-97% beta_1y, revenue_fy, net_income_fy, total_assets,
 *          shares_outstanding, eps_fy, fcf_fy, revenue_growth
 *   79-85% total_debt, profit_growth, float_shares_percent, eps_growth
 *   44-59% dividend_yield, pb_ratio, book_value, bvps, profit_margin,
 *          operating_margin, roe, roa, dps, total_liabilities, operating_income
 *   26-32% pe_ratio, revenue_ttm, net_income_ttm, eps_ttm
 *
 * TTM columns are deliberately absent: their fiscal-year siblings are three
 * times better populated and mixing the two in one table would compare a
 * trailing-twelve-month figure against an annual one. Every row here is
 * fiscal-year or point-in-time, never a blend.
 *
 * YMYL: this page must never name a winner. It reports two sets of published
 * figures and the arithmetic difference between them. "Which is the better
 * buy" is not a question a table answers, and the copy says so explicitly.
 */

export type Lang = 'en' | 'ar';
type S = Record<Lang, string>;
const s = (en: string, ar: string): S => ({ en, ar });

/** How a value is rendered. */
export type Fmt = 'price' | 'money' | 'pct' | 'num' | 'ratio';
/** How the two values are contrasted — arithmetic only, never a verdict. */
export type DiffMode = 'ratio' | 'points' | 'none';

export type Metric = { key: string; label: S; fmt: Fmt; diff: DiffMode; note?: S };
export type MetricGroup = { id: string; title: S; blurb: S; metrics: Metric[] };

export const METRIC_GROUPS: MetricGroup[] = [
    {
        id: 'market',
        title: s('Market', 'السوق'),
        blurb: s(
            'What the market currently says each company is worth, and how much of it is actually tradable.',
            'ما يقوله السوق حالياً عن قيمة كل شركة، وكم من أسهمها متاح فعلاً للتداول.'
        ),
        metrics: [
            { key: 'last_price', label: s('Share price', 'سعر السهم'), fmt: 'price', diff: 'none',
              note: s('Share prices are not comparable between companies on their own — a higher price does not mean a larger or more expensive company.',
                      'أسعار الأسهم وحدها غير قابلة للمقارنة بين الشركات — فارتفاع السعر لا يعني أن الشركة أكبر أو أغلى.') },
            { key: 'market_cap', label: s('Market capitalisation', 'القيمة السوقية'), fmt: 'money', diff: 'ratio' },
            { key: 'shares_outstanding', label: s('Shares outstanding', 'الأسهم المصدرة'), fmt: 'num', diff: 'ratio' },
            { key: 'float_shares_percent', label: s('Free float', 'نسبة الأسهم الحرة'), fmt: 'pct', diff: 'points' },
            { key: 'beta_1y', label: s('Beta (1 year)', 'معامل بيتا (سنة)'), fmt: 'ratio', diff: 'points',
              note: s('Beta above 1 means the share has moved more than the market over the past year, below 1 means less. It measures past co-movement, not risk of loss.',
                      'بيتا أعلى من ١ تعني أن السهم تحرك أكثر من السوق خلال العام الماضي، وأقل من ١ تعني أنه تحرك أقل. وهي تقيس تلازم الحركة في الماضي لا احتمال الخسارة.') },
        ],
    },
    {
        id: 'valuation',
        title: s('Valuation', 'التقييم'),
        blurb: s(
            'What you pay per unit of earnings, assets and income. These are the rows most often missing: a blank means the company has not published the figure, not that it is zero.',
            'ما تدفعه مقابل كل وحدة من الأرباح والأصول والدخل. وهذه أكثر البنود التي قد تكون فارغة: والفراغ يعني أن الشركة لم تفصح عن الرقم، لا أنه صفر.'
        ),
        metrics: [
            { key: 'pe_ratio', label: s('P/E ratio', 'مكرر الربحية'), fmt: 'ratio', diff: 'points',
              note: s('A lower P/E is not automatically cheaper — it can equally reflect earnings the market expects to fall.',
                      'انخفاض مكرر الربحية لا يعني الرخص تلقائياً — فقد يعكس بالقدر نفسه أرباحاً يتوقع السوق تراجعها.') },
            { key: 'pb_ratio', label: s('P/B ratio', 'مضاعف القيمة الدفترية'), fmt: 'ratio', diff: 'points' },
            { key: 'dividend_yield', label: s('Dividend yield', 'عائد التوزيعات'), fmt: 'pct', diff: 'points' },
            { key: 'dps', label: s('Dividend per share', 'التوزيع للسهم'), fmt: 'price', diff: 'ratio' },
        ],
    },
    {
        id: 'income',
        title: s('Income statement (fiscal year)', 'قائمة الدخل (السنة المالية)'),
        blurb: s(
            'The last full reported financial year for each company. Fiscal years do not always end in the same month, so treat a gap as a difference in scale rather than a like-for-like quarter comparison.',
            'آخر سنة مالية كاملة معلنة لكل شركة. ولا تنتهي السنوات المالية دائماً في الشهر نفسه، لذا اعتبر الفارق اختلافاً في الحجم لا مقارنة ربع بربع.'
        ),
        metrics: [
            { key: 'revenue_fy', label: s('Revenue', 'الإيرادات'), fmt: 'money', diff: 'ratio' },
            { key: 'operating_income', label: s('Operating income', 'الربح التشغيلي'), fmt: 'money', diff: 'ratio' },
            { key: 'net_income_fy', label: s('Net income', 'صافي الربح'), fmt: 'money', diff: 'ratio' },
            { key: 'eps_fy', label: s('Earnings per share', 'ربحية السهم'), fmt: 'price', diff: 'ratio' },
            { key: 'fcf_fy', label: s('Free cash flow', 'التدفق النقدي الحر'), fmt: 'money', diff: 'ratio' },
        ],
    },
    {
        id: 'balance',
        title: s('Balance sheet', 'المركز المالي'),
        blurb: s(
            'What each company owns and owes. Absolute size matters less than the relationship between the two, and banks carry balance sheets that are structurally far larger than an industrial company of similar market value.',
            'ما تملكه كل شركة وما عليها. وحجم الأرقام المطلق أقل أهمية من العلاقة بينها، كما أن البنوك تحمل ميزانيات أكبر هيكلياً بكثير من شركة صناعية مماثلة في القيمة السوقية.'
        ),
        metrics: [
            { key: 'total_assets', label: s('Total assets', 'إجمالي الأصول'), fmt: 'money', diff: 'ratio' },
            { key: 'total_liabilities', label: s('Total liabilities', 'إجمالي الالتزامات'), fmt: 'money', diff: 'ratio' },
            { key: 'total_debt', label: s('Total debt', 'إجمالي الديون'), fmt: 'money', diff: 'ratio' },
            { key: 'book_value', label: s('Book value', 'القيمة الدفترية'), fmt: 'money', diff: 'ratio' },
            { key: 'bvps', label: s('Book value per share', 'القيمة الدفترية للسهم'), fmt: 'price', diff: 'ratio' },
        ],
    },
    {
        id: 'profitability',
        title: s('Profitability', 'الربحية'),
        blurb: s(
            'How much of what comes in is kept, and how hard the company works its capital. These ratios are the fairest same-sector comparison on the page because they are already scaled to company size.',
            'كم يتبقى مما يدخل الشركة، وإلى أي مدى تُشغّل رأس مالها. وهذه النسب هي أعدل مقارنة داخل القطاع في هذه الصفحة لأنها معدّلة بالفعل وفق حجم الشركة.'
        ),
        metrics: [
            { key: 'profit_margin', label: s('Net profit margin', 'هامش صافي الربح'), fmt: 'pct', diff: 'points' },
            { key: 'operating_margin', label: s('Operating margin', 'هامش الربح التشغيلي'), fmt: 'pct', diff: 'points' },
            { key: 'roe', label: s('Return on equity', 'العائد على حقوق الملكية'), fmt: 'pct', diff: 'points' },
            { key: 'roa', label: s('Return on assets', 'العائد على الأصول'), fmt: 'pct', diff: 'points' },
        ],
    },
    {
        id: 'growth',
        title: s('Growth', 'النمو'),
        blurb: s(
            'Change against the prior reported period. In an economy that has seen high inflation, a positive revenue growth figure does not by itself mean the business grew in real terms.',
            'التغير مقارنة بالفترة المعلنة السابقة. وفي اقتصاد شهد تضخماً مرتفعاً، لا يعني نمو الإيرادات الموجب وحده أن النشاط نما بالقيمة الحقيقية.'
        ),
        metrics: [
            { key: 'revenue_growth', label: s('Revenue growth', 'نمو الإيرادات'), fmt: 'pct', diff: 'points' },
            { key: 'profit_growth', label: s('Profit growth', 'نمو الأرباح'), fmt: 'pct', diff: 'points' },
            { key: 'eps_growth', label: s('EPS growth', 'نمو ربحية السهم'), fmt: 'pct', diff: 'points' },
        ],
    },
];

export const STOCKVS = {
    h1: (a: string, b: string): S => s(`${a} vs ${b}`, `${a} مقابل ${b}`),
    subhead: (sector: string): S =>
        s(`Side-by-side comparison — ${sector}, Egyptian Exchange`, `مقارنة جنباً إلى جنب — ${sector}، البورصة المصرية`),
    title: (a: string, b: string, sa: string, sb: string): S =>
        s(
            `${a} vs ${b} (${sa} vs ${sb}) — Compare EGX Stocks`,
            `${a} مقابل ${b} (${sa} و${sb}) — مقارنة أسهم البورصة المصرية`
        ),
    description: (a: string, b: string, sa: string, sb: string): S =>
        s(
            `Compare ${a} (${sa}) and ${b} (${sb}) on the Egyptian Exchange: market cap, valuation, revenue, profit, margins, returns and growth, side by side.`,
            `قارن بين ${a} (${sa}) و${b} (${sb}) في البورصة المصرية: القيمة السوقية والتقييم والإيرادات والأرباح والهوامش والعوائد والنمو جنباً إلى جنب.`
        ),
    intro: (a: string, b: string, sector: string, rows: number): S =>
        s(
            `${a} and ${b} both trade on the Egyptian Exchange in the ${sector} sector. This page sets ${rows} published figures for the two companies side by side, with the arithmetic difference between them. It reports what each company disclosed — it does not rank them.`,
            `يُتداول كل من ${a} و${b} في البورصة المصرية ضمن قطاع ${sector}. تضع هذه الصفحة ${rows} رقماً معلناً للشركتين جنباً إلى جنب، مع الفارق الحسابي بينهما. وهي تعرض ما أفصحت عنه كل شركة — ولا ترتّبهما.`
        ),
    cols: {
        metric: s('Metric', 'المؤشر'),
        diff: s('Difference', 'الفارق'),
    },
    larger: s('larger', 'أكبر'),
    notPublished: s('Not published', 'غير مفصح عنه'),

    howToReadH2: s('How to read this comparison', 'كيف تقرأ هذه المقارنة'),
    howToRead: s(
        'Read the ratios before the absolute numbers. Revenue, assets and market capitalisation tell you how big each company is, and the larger one is not thereby the better one — size is a fact about scale, not about quality. The rows that actually compare two businesses are the ones already scaled to size: net and operating margin, return on equity and on assets, and the growth figures. Those say how much of each pound of revenue is kept and how productively capital is used, which is a question a small company can win. Where a row shows a dash, the company has not published that figure in the data we receive; it is never a zero, and a company with more blanks is not necessarily performing worse.',
        'اقرأ النسب قبل الأرقام المطلقة. فالإيرادات والأصول والقيمة السوقية تخبرك بحجم كل شركة، والأكبر ليست بذلك هي الأفضل — فالحجم حقيقة عن السعة لا عن الجودة. أما البنود التي تقارن نشاطين فعلاً فهي المعدّلة بالفعل وفق الحجم: هامش صافي الربح والهامش التشغيلي والعائد على حقوق الملكية وعلى الأصول وأرقام النمو. فهذه تبيّن كم يتبقى من كل جنيه إيراد ومدى إنتاجية استخدام رأس المال، وهو سؤال يمكن لشركة صغيرة أن تتفوق فيه. وحين يظهر شرطة في أحد البنود فإن الشركة لم تفصح عن ذلك الرقم في البيانات التي تصلنا؛ وهو ليس صفراً أبداً، والشركة الأكثر فراغات ليست بالضرورة الأسوأ أداءً.'
    ),

    sameSectorH2: s('Why both companies are from the same sector', 'لماذا الشركتان من القطاع نفسه'),
    sameSector: s(
        'Comparison pages here pair companies within one sector, because most of these rows are only meaningful against a peer doing the same thing. A bank carries a balance sheet many times larger than an industrial company of the same market value, and its return on assets is correspondingly a fraction of the industrial firm’s — that gap says nothing about which is the stronger business. Margins differ structurally between retail, pharmaceuticals and real estate for the same reason. Held within a sector, the same numbers become a real question: of two companies facing the same customers, costs and regulator, which one converts revenue into profit more effectively.',
        'تُقرن صفحات المقارنة هنا بين شركات داخل قطاع واحد، لأن معظم هذه البنود لا يكون ذا معنى إلا في مواجهة نظير يمارس النشاط نفسه. فالبنك يحمل ميزانية أكبر بأضعاف من شركة صناعية بالقيمة السوقية نفسها، ويكون عائده على الأصول تبعاً لذلك جزءاً يسيراً من عائد الشركة الصناعية — ولا يقول هذا الفارق شيئاً عن أيهما النشاط الأقوى. وتختلف الهوامش هيكلياً بين التجزئة والأدوية والعقارات للسبب نفسه. أما داخل القطاع الواحد فتتحول الأرقام ذاتها إلى سؤال حقيقي: من بين شركتين تواجهان العملاء والتكاليف والجهة الرقابية ذاتها، أيهما أقدر على تحويل الإيراد إلى ربح.'
    ),

    limitsH2: s('What this page cannot tell you', 'ما لا تستطيع هذه الصفحة إخبارك به'),
    limits: s(
        'A table of reported figures describes what has already happened. It does not contain the things that most often decide which of two companies is the better holding: the quality of management, the durability of a competitive position, pending litigation, customer concentration, currency exposure, a change of strategy, or anything the company will do next. Two firms with near-identical rows here can diverge sharply afterwards. Nothing on this page is a recommendation to buy, sell or hold either share, and no figure here should be relied on as the basis of a decision without reading the companies’ own filings.',
        'جدول الأرقام المعلنة يصف ما حدث بالفعل. وهو لا يتضمن ما يحسم غالباً أي الشركتين أفضل للاقتناء: جودة الإدارة، ومتانة الموقع التنافسي، والدعاوى القضائية القائمة، وتركّز العملاء، والانكشاف على تقلبات العملة، وتغيّر الاستراتيجية، وأي شيء ستفعله الشركة لاحقاً. وقد تتباعد شركتان متطابقتان تقريباً في هذه البنود تبايناً حاداً بعد ذلك. ولا شيء في هذه الصفحة يمثل توصية بشراء أي من السهمين أو بيعه أو الاحتفاظ به، ولا ينبغي الاعتماد على أي رقم هنا كأساس لقرار دون الرجوع إلى إفصاحات الشركتين ذاتهما.'
    ),

    sourceNote: s(
        'Figures are as published by each company via the Egyptian Exchange and refreshed with market data. A dash means the figure is not published, never zero.',
        'الأرقام كما تفصح عنها كل شركة عبر البورصة المصرية ويتم تحديثها مع بيانات السوق. والشرطة تعني أن الرقم غير مفصح عنه، لا أنه صفر.'
    ),
    disclaimer: s(
        'Informational only. This comparison is not investment advice and does not recommend either share.',
        'لأغراض المعلومات فقط. هذه المقارنة ليست مشورة استثمارية ولا توصي بأي من السهمين.'
    ),
    otherPairs: s('Other comparisons in this sector', 'مقارنات أخرى في هذا القطاع'),
    companyPages: s('Company pages', 'صفحات الشركتين'),

    faq: (a: string, b: string, sector: string) => [
        {
            q: s(`Which is bigger, ${a} or ${b}?`, `أيهما أكبر، ${a} أم ${b}؟`),
            a: s(
                `The market capitalisation row above answers this directly, along with the multiple between the two. Market cap is share price times shares outstanding, so it reflects what the market currently values each company at, not what either is worth on its books — the total assets and book value rows cover that.`,
                `يجيب بند القيمة السوقية أعلاه عن هذا مباشرة، إلى جانب المضاعف بين الشركتين. والقيمة السوقية هي سعر السهم مضروباً في عدد الأسهم المصدرة، فهي تعكس ما يقيّم به السوق كل شركة حالياً لا قيمتها الدفترية — وهذا ما يغطيه بندا إجمالي الأصول والقيمة الدفترية.`
            ),
        },
        {
            q: s(
                `Which is the better investment, ${a} or ${b}?`,
                `أيهما استثمار أفضل، ${a} أم ${b}؟`
            ),
            a: s(
                'This page does not answer that and no comparison table can. It reports published figures and the difference between them; whether either share suits you depends on your objectives, your time horizon and your tolerance for loss, none of which are inputs to a table. Consider a licensed financial adviser before acting.',
                'لا تجيب هذه الصفحة عن ذلك ولا يستطيعه أي جدول مقارنة. فهي تعرض أرقاماً معلنة والفارق بينها؛ أما ملاءمة أي من السهمين لك فتتوقف على أهدافك وأفقك الزمني وقدرتك على تحمل الخسارة، وليس أي منها مُدخلاً في جدول. استشر مستشاراً مالياً مرخصاً قبل التصرف.'
            ),
        },
        {
            q: s('Why are some rows empty?', 'لماذا بعض البنود فارغة؟'),
            a: s(
                'Because the company has not published that figure. Egyptian issuers disclose to different levels of detail, and ratios such as P/E and return on equity are among the least consistently reported. We leave the cell blank rather than substituting a zero or an estimate.',
                'لأن الشركة لم تفصح عن ذلك الرقم. فالشركات المصرية تفصح بمستويات تفصيل متفاوتة، ونسب مثل مكرر الربحية والعائد على حقوق الملكية من أقلها انتظاماً في الإفصاح. ونترك الخانة فارغة بدل وضع صفر أو تقدير.'
            ),
        },
        {
            q: s(
                `Are ${a} and ${b} in the same sector?`,
                `هل ${a} و${b} في القطاع نفسه؟`
            ),
            a: s(
                `Yes — both are classified under ${sector} on the Egyptian Exchange, which is why they are paired. Comparing companies across different sectors produces gaps that reflect the industries rather than the businesses.`,
                `نعم — كلتاهما مصنفة ضمن قطاع ${sector} في البورصة المصرية، ولهذا تم إقرانهما. فمقارنة شركات من قطاعات مختلفة تنتج فوارق تعكس طبيعة الصناعات لا أداء الشركتين.`
            ),
        },
    ],
};

export const t = (v: S, lang: Lang): string => v[lang];
