/**
 * Bilingual (EN/AR) label + value dictionaries for the fund-profile page.
 * The page is per-URL bilingual (SSR): /Funds/{slug} = English LTR,
 * /ar/Funds/{slug} = Arabic RTL. Content is shown in one language per URL —
 * never mixed. All UI strings and coded values (fund type, risk, frequency)
 * are localized here so the client component stays language-agnostic.
 */

export type Lang = 'en' | 'ar';

/** Labels for the analytics layer (Score / Suitability / Insights / Stress / Calculator).
 *  Namespaced under FundLabels.ax to keep the flat label set readable. Plain data only
 *  (no functions) so the whole object serializes across the server→client boundary.
 *  Strings with `{v}` / `{p}` are interpolated in the client. */
export type FundAxLabels = {
    higherBetter: string; methodology: string; estimated: string; noData: string;
    /** Honest limited-history empty states — shown in the section SHELLS when
     *  hasEnoughData is false (short NAV history or analytics_suppressed). */
    limitedHistory: string; limitedHistoryShort: string;
    scoreTitle: string; scoreSub: string; startaScore: string; overall: string;
    confidence: string; confHigh: string; confMed: string; confLow: string;
    dims: { performance: string; risk: string; cost: string; stability: string; diversification: string };
    dimDesc: { performance: string; risk: string; cost: string; stability: string; diversification: string };
    metricLabels: { annualizedReturn: string; volatility: string; positivePeriods: string; fee: string; category: string };
    tiers: { excellent: string; strong: string; average: string; weak: string; poor: string };
    /** Clickable "how it's calculated" tooltips for the derived numbers. */
    explainTitle: string; explainClose: string; explainApprox: string;
    explain: {
        overall: string; performance: string; risk: string; stability: string; cost: string;
        diversification: string; weightedReturn: string; stress: string;
    };
    partLabels: { r3ann: string; r5ann: string; r1y: string; cagr: string; incep: string };
    /** Fund-comparison picker modal (opened from the "Compare" CTA). */
    comparePicker: {
        title: string; hint: string; search: string; loading: string; error: string;
        noMatch: string; pickPrompt: string; selected: string; go: string; thisFund: string;
    };
    suitTitle: string; suitSub: string; horizonTitle: string; investorTitle: string;
    horizons: { short: string; medium: string; long: string };
    horizonHint: { short: string; medium: string; long: string };
    statuses: { suitable: string; caution: string; unsuitable: string };
    profiles: { conservative: string; balanced: string; aggressive: string };
    matchSuffix: string;
    insightsTitle: string; insightsSub: string; pro: string; con: string;
    impact: { high: string; medium: string; low: string };
    insightText: {
        strongPerformance: string; consistent: string; longTrack: string; deepData: string;
        highVolatility: string; deepDrawdown: string; highFee: string; shortTrack: string;
    };
    stressTitle: string; stressSub: string; estimate: string; historical: string; stressDisclaimer: string;
    scenarios: { marketDrop10: string; marketDrop20: string; adverse1y: string; worstDrawdown: string; worstPeriod: string };
    calcTitle: string; calcSub: string; calcAmount: string; calcMonthly: string; calcHorizon: string;
    calcYears1: string; calcYears2: string; calcYearsFew: string; calcYearsMany: string;
    calcInvested: string; calcProjected: string;
    calcGain: string; calcRange: string; calcCagrNote: string; calcCagrNoteWindow: string; calcDisclaimer: string;
    calcEnterAmounts: string;
    cagrTitle: string; cagrSinceInception: string; cagrOverYears: string;
    moveTitle: string; moveBest: string; moveWorst: string; moveAvgGain: string; moveAvgLoss: string;
    moveDaily: string; moveWeekly: string; movePeriod: string;
    gateTitle: string; gateBody: string; gateCta: string; gateSignin: string; gateCompact: string;
    fbTitle: string; fbSub: string; fbYes: string; fbNo: string; fbThanks: string;
    fbCommentPlaceholder: string; fbSubmit: string;
    compareCta: string;
};

export type FundLabels = {
    // sections
    performance: string;
    fundDetails: string;
    fundDetailsSub: string;
    investmentThesis: string;
    investmentStrategy: string;
    fundObjective: string;
    costOfOwnership: string;
    fees: string;
    riskFactors: string;
    riskVolatility: string;
    riskNote: string;
    aboutManager: string;
    managerProfile: string;
    purchaseChannels: string;
    whereToInvest: string;
    subRedemptionChannels: string;
    tradingSchedule: string;
    documents: string;
    prospectus: string;
    prospectusMeta: string;
    exploreMore: string;
    similarFunds: string;
    fundFaq: string;
    faqTitle: string;
    // hero
    latestNav: string;
    returnLabel: string;
    ytdReturn: string;
    totalNavReturn: string;
    managedByPrefix: string;
    asOf: string;
    delayed: string;
    week52Low: string;
    week52High: string;
    // fact labels
    issuer: string;
    fundManager: string;
    fundType: string;
    classification: string;
    riskLevel: string;
    currency: string;
    inceptionYear: string;
    navFrequency: string;
    minSubscription: string;
    benchmark: string;
    market: string;
    eligibility: string;
    isin: string;
    domicile: string;
    dividendPolicy: string;
    navObservations: string;
    purchaseFrequency: string;
    redemptionFrequency: string;
    // fee labels
    managementFee: string;
    subscriptionFee: string;
    redemptionFee: string;
    expenseRatio: string;
    performanceFee: string;
    custodianFee: string;
    adminFee: string;
    // risk stat labels
    maxDrawdown: string;
    volatility: string;
    downsideDeviation: string;
    // manager profile labels
    established: string;
    chairman: string;
    aum: string;
    fundsManaged: string;
    // misc
    shariah: string;
    channelsDisclaimer: string;
    allFunds: string;
    compare: string;
    unit: string;
    units: string;
    // graceful empty states — sections always render; missing data degrades to these
    dataPending: string;
    channelsPlaceholder: string;
    managerPending: string;
    similarFundsEmpty: string;
    // analytics layer (namespaced)
    ax: FundAxLabels;
};

const EN: FundLabels = {
    performance: 'Performance',
    fundDetails: 'Fund details',
    fundDetailsSub: 'Research-grade fund profile',
    investmentThesis: 'Investment thesis',
    investmentStrategy: 'Investment strategy',
    fundObjective: 'Fund objective',
    costOfOwnership: 'Cost of ownership',
    fees: 'Fees',
    riskFactors: 'Risk factors',
    riskVolatility: 'Risk & Volatility',
    riskNote:
        "Computed from our full NAV history. Max drawdown is the worst peak-to-trough decline; volatility is annualized by the fund's NAV reporting frequency.",
    aboutManager: 'Fund manager',
    managerProfile: 'About the manager',
    purchaseChannels: 'Purchase channels',
    whereToInvest: 'Where to Invest',
    subRedemptionChannels: 'Subscription & redemption channels',
    tradingSchedule: 'Trading schedule',
    documents: 'Documents',
    prospectus: 'Fund prospectus',
    prospectusMeta: 'PDF · opens in a new tab',
    exploreMore: 'Explore more',
    similarFunds: 'Similar funds in the same universe',
    fundFaq: 'Fund FAQ',
    faqTitle: 'Frequently asked questions',
    latestNav: 'Latest NAV',
    returnLabel: 'Return',
    ytdReturn: 'YTD return',
    totalNavReturn: 'Total NAV return',
    managedByPrefix: 'Managed by',
    asOf: 'as of',
    delayed: 'Delayed',
    week52Low: '52-week low',
    week52High: '52-week high',
    issuer: 'Issuer',
    fundManager: 'Fund manager',
    fundType: 'Fund type',
    classification: 'Classification',
    riskLevel: 'Risk level',
    currency: 'Currency',
    inceptionYear: 'Inception year',
    navFrequency: 'NAV frequency',
    minSubscription: 'Minimum subscription',
    benchmark: 'Benchmark',
    market: 'Market',
    eligibility: 'Eligibility',
    isin: 'ISIN',
    domicile: 'Domicile',
    dividendPolicy: 'Dividend policy',
    navObservations: 'NAV observations',
    purchaseFrequency: 'Purchase frequency',
    redemptionFrequency: 'Redemption frequency',
    managementFee: 'Management fee',
    subscriptionFee: 'Subscription fee',
    redemptionFee: 'Redemption fee',
    expenseRatio: 'Expense ratio',
    performanceFee: 'Performance fee',
    custodianFee: 'Custodian fee',
    adminFee: 'Administration fee',
    maxDrawdown: 'Max drawdown (all-time, peak-to-trough)',
    volatility: 'Volatility (annualized, full history)',
    downsideDeviation: 'Downside deviation (annualized)',
    established: 'Established',
    chairman: 'Chairman',
    aum: 'Assets under management',
    fundsManaged: 'Funds managed',
    shariah: 'Shariah-compliant',
    channelsDisclaimer: 'Channels & prospectus as published by the fund manager. Verify terms before investing.',
    allFunds: 'All Egyptian mutual funds',
    compare: 'Compare',
    unit: 'unit',
    units: 'units',
    dataPending: 'Data for this section is not yet available.',
    channelsPlaceholder: 'Channels information is being collected for this fund.',
    managerPending: 'Detailed information about this manager is being collected.',
    similarFundsEmpty: 'No similar funds identified yet — explore the full universe below.',
    ax: {
        higherBetter: 'Higher is better',
        methodology: 'How we score',
        estimated: 'Estimate',
        noData: 'Not enough history yet',
        limitedHistory:
            "This fund's track record is still too short for reliable analytics — metrics unlock as NAV history accumulates.",
        limitedHistoryShort: 'Unlocks as this fund accumulates NAV history.',
        scoreTitle: 'Fund scorecard',
        scoreSub: 'Five dimensions, each scored 0–100 from our own NAV history. Higher is better on every axis — and we show the real number behind each score.',
        startaScore: 'Starta Score',
        overall: 'Overall',
        confidence: 'Confidence',
        confHigh: 'High confidence',
        confMed: 'Medium confidence',
        confLow: 'Low confidence',
        dims: { performance: 'Performance', risk: 'Risk', cost: 'Cost', stability: 'Stability', diversification: 'Diversification' },
        dimDesc: {
            performance: 'Score from recent growth, adjusted for drawdown risk',
            risk: 'Lower volatility & shallower drawdowns score higher',
            cost: 'Lower ongoing fees score higher',
            stability: 'Steadier, more consistent returns score higher',
            diversification: 'Estimated from the fund’s mandate & asset class',
        },
        metricLabels: { annualizedReturn: 'Weighted annual return', volatility: 'Volatility', positivePeriods: 'Positive periods', fee: 'Ongoing fee', category: 'Category-based' },
        tiers: { excellent: 'Excellent', strong: 'Strong', average: 'Average', weak: 'Weak', poor: 'Poor' },
        explainTitle: 'How this is calculated',
        explainClose: 'Close',
        explainApprox: 'weighted average',
        explain: {
            overall: 'The Starta Score is a weighted average of the five dimensions — Performance 30%, Risk 22%, Stability 20%, Cost 16%, Diversification 12%. Any dimension we can’t compute is skipped and the rest re-weighted.',
            performance: 'The score maps the weighted annual return (below) onto 0–100 (about −5%→5, 50%→95), then nudges it by the Calmar ratio (return ÷ worst drawdown) so a strong return earned through a deep crash doesn’t score as high as one that wasn’t.',
            risk: 'Higher = safer. A blend of annualized volatility (55%) and the worst peak-to-trough drawdown (45%) — lower values score higher. This uses the full NAV history, so an old crash still counts.',
            stability: 'A blend of the share of positive periods (60%) and volatility (40%) — steadier, more consistent returns score higher.',
            cost: 'From the ongoing fee (the greater of management fee / expense ratio): ~0.25%→98, 1%→78, 2%→46, 3%→15. Cheaper scores higher.',
            diversification: 'An estimate from the fund’s asset class (underlying holdings aren’t published yet): money-market ~82, fixed income ~74, balanced ~72, equity ~50, single-sector ~34; a broader international mandate adds a little.',
            weightedReturn: 'A blend that reflects the current regime rather than any single year: 50% the 3-year return annualized, 25% the 1-year return, 25% the since-inception CAGR.',
            stress: 'Model estimates scale a broad-market shock by the fund’s asset-class sensitivity, and the adverse-year band is 1.65× its annualized volatility — approximations, not predictions. Historical figures are real events from this fund’s own NAV record.',
        },
        partLabels: { r3ann: '3-year return, annualized', r5ann: '5-year return, annualized', r1y: '1-year return', cagr: 'CAGR since inception', incep: 'Since inception, annualized' },
        comparePicker: {
            title: 'Compare with…',
            hint: 'Pick up to {n} funds to see them side by side.',
            search: 'Search by fund or manager',
            loading: 'Loading funds…',
            error: 'Couldn’t load funds — please try again.',
            noMatch: 'No funds match your search.',
            pickPrompt: 'Select at least one fund',
            selected: '{n} selected',
            go: 'Compare now',
            thisFund: 'This fund',
        },
        suitTitle: 'Is this fund right for you?',
        suitSub: 'How this fund maps to holding periods and investor risk profiles.',
        horizonTitle: 'Investment horizon',
        investorTitle: 'Investor profile match',
        horizons: { short: 'Short term', medium: 'Medium term', long: 'Long term' },
        horizonHint: { short: 'under 1 year', medium: '1–4 years', long: '5+ years' },
        statuses: { suitable: 'Suitable', caution: 'With caution', unsuitable: 'Not suitable' },
        profiles: { conservative: 'Conservative', balanced: 'Balanced', aggressive: 'Aggressive' },
        matchSuffix: 'match',
        insightsTitle: 'What stands out',
        insightsSub: 'Auto-generated from this fund’s own metrics.',
        pro: 'Strength',
        con: 'Watch-out',
        impact: { high: 'High impact', medium: 'Medium impact', low: 'Low impact' },
        insightText: {
            strongPerformance: 'Consistently strong — about {v}% annualized in the current regime',
            consistent: '{v}% of periods have been positive — steady, not lumpy',
            longTrack: 'Long track record — {v} years of NAV history to judge',
            deepData: 'Deep data — {v} NAV observations behind every metric',
            highVolatility: 'Elevated volatility ({v}% annualized) — expect larger swings',
            deepDrawdown: 'Has fallen {v}% peak-to-trough historically',
            highFee: 'Above-average ongoing fee ({v}%)',
            shortTrack: 'Short track record ({v} years) — metrics are less settled',
        },
        stressTitle: 'How it might behave under stress',
        stressSub: 'Estimated impact on the current NAV, alongside what actually happened historically.',
        estimate: 'Model estimate',
        historical: 'Historical fact',
        stressDisclaimer: 'Estimates scale a broad-market shock by this fund’s asset-class sensitivity and volatility — approximations, not predictions. Historical figures are drawn from the fund’s own NAV record.',
        scenarios: { marketDrop10: 'Broad market −10%', marketDrop20: 'Broad market −20%', adverse1y: 'Adverse year (95% band)', worstDrawdown: 'Worst historical drawdown', worstPeriod: 'Worst single period' },
        calcTitle: 'Project an investment',
        calcSub: 'Illustrative growth using the fund’s realized annualized return (geometric mean over its full history) — auto-filled, not a promise.',
        calcAmount: 'One-time amount',
        calcMonthly: 'Monthly contribution',
        calcHorizon: 'Holding period',
        calcYears1: '1 year', calcYears2: '2 years', calcYearsFew: 'years', calcYearsMany: 'years',
        calcInvested: 'Invested', calcProjected: 'Projected value', calcGain: 'Projected gain', calcRange: 'Likely range',
        calcCagrNote: 'Based on the fund’s realized {v}% annualized return over its full history',
        calcCagrNoteWindow: 'Based on the fund’s realized {v}% annualized return over its last {w}',
        calcDisclaimer: 'Illustration only, based on past performance. Not a promise of future returns — funds can lose value. Monthly contributions compound monthly.',
        calcEnterAmounts: 'Enter an amount to project.',
        cagrTitle: 'CAGR since inception',
        cagrSinceInception: 'Total since inception',
        cagrOverYears: 'over {v} years',
        moveTitle: 'Return distribution',
        moveBest: 'Best {p}', moveWorst: 'Worst {p}', moveAvgGain: 'Average up {p}', moveAvgLoss: 'Average down {p}',
        moveDaily: 'day', moveWeekly: 'week', movePeriod: 'period',
        gateTitle: 'Unlock the full analysis',
        gateBody: 'Create a free account to see the scorecard, suitability, stress tests and the investment calculator for every Egyptian fund.',
        gateCta: 'Create free account',
        gateSignin: 'Sign in',
        gateCompact: 'Free account to unlock these tools',
        fbTitle: 'Was this helpful?',
        fbSub: 'Help us improve this page.',
        fbYes: 'Yes, helpful', fbNo: 'Not really', fbThanks: 'Thanks for the feedback!',
        fbCommentPlaceholder: 'Anything we could add? (optional)', fbSubmit: 'Send',
        compareCta: 'Compare',
    },
};

const AR: FundLabels = {
    performance: 'الأداء',
    fundDetails: 'بيانات الصندوق',
    fundDetailsSub: 'ملف تعريفي متكامل للصندوق',
    investmentThesis: 'الرؤية الاستثمارية',
    investmentStrategy: 'استراتيجية الاستثمار',
    fundObjective: 'هدف الصندوق',
    costOfOwnership: 'التكاليف والرسوم',
    fees: 'الرسوم',
    riskFactors: 'عوامل المخاطر',
    riskVolatility: 'المخاطر والتذبذب',
    riskNote:
        'محسوبة من كامل سجل صافي قيمة الأصول لدينا. أقصى تراجع هو أكبر هبوط من القمة إلى القاع؛ ويُحتسب التذبذب سنويًا وفق دورية إعلان صافي قيمة الأصول للصندوق.',
    aboutManager: 'مدير الصندوق',
    managerProfile: 'عن مدير الصندوق',
    purchaseChannels: 'قنوات الشراء',
    whereToInvest: 'أين تستثمر',
    subRedemptionChannels: 'قنوات الاشتراك والاسترداد',
    tradingSchedule: 'جدول التداول',
    documents: 'المستندات',
    prospectus: 'نشرة الاكتتاب',
    prospectusMeta: 'PDF · يفتح في نافذة جديدة',
    exploreMore: 'استكشف المزيد',
    similarFunds: 'صناديق مشابهة في نفس الفئة',
    fundFaq: 'الأسئلة الشائعة',
    faqTitle: 'الأسئلة الأكثر شيوعًا',
    latestNav: 'أحدث صافي قيمة الأصول',
    returnLabel: 'العائد',
    ytdReturn: 'العائد منذ بداية العام',
    totalNavReturn: 'إجمالي عائد صافي قيمة الأصول',
    managedByPrefix: 'تُدار بواسطة',
    asOf: 'كما في',
    delayed: 'متأخر',
    week52Low: 'أدنى 52 أسبوعًا',
    week52High: 'أعلى 52 أسبوعًا',
    issuer: 'جهة الإصدار',
    fundManager: 'مدير الصندوق',
    fundType: 'نوع الصندوق',
    classification: 'التصنيف',
    riskLevel: 'مستوى المخاطر',
    currency: 'العملة',
    inceptionYear: 'سنة التأسيس',
    navFrequency: 'دورية صافي قيمة الأصول',
    minSubscription: 'الحد الأدنى للاشتراك',
    benchmark: 'المؤشر الاسترشادي',
    market: 'السوق',
    eligibility: 'الفئات المؤهلة',
    isin: 'رقم ISIN',
    domicile: 'بلد التأسيس',
    dividendPolicy: 'سياسة التوزيعات',
    navObservations: 'عدد نقاط صافي قيمة الأصول',
    purchaseFrequency: 'دورية الشراء',
    redemptionFrequency: 'دورية الاسترداد',
    managementFee: 'رسوم الإدارة',
    subscriptionFee: 'رسوم الاشتراك',
    redemptionFee: 'رسوم الاسترداد',
    expenseRatio: 'نسبة المصروفات',
    performanceFee: 'رسوم الأداء',
    custodianFee: 'رسوم أمين الحفظ',
    adminFee: 'رسوم إدارية',
    maxDrawdown: 'أقصى تراجع (منذ النشأة، من القمة إلى القاع)',
    volatility: 'التذبذب (سنوي، كامل السجل)',
    downsideDeviation: 'انحراف الهبوط (سنوي)',
    established: 'تأسست',
    chairman: 'رئيس مجلس الإدارة',
    aum: 'الأصول تحت الإدارة',
    fundsManaged: 'عدد الصناديق المُدارة',
    shariah: 'متوافق مع الشريعة',
    channelsDisclaimer: 'القنوات والنشرة كما ينشرها مدير الصندوق. يرجى التحقق من الشروط قبل الاستثمار.',
    allFunds: 'جميع صناديق الاستثمار المصرية',
    compare: 'قارن',
    unit: 'وثيقة',
    units: 'وثيقة',
    dataPending: 'بيانات هذا القسم غير متوفرة بعد.',
    channelsPlaceholder: 'جاري تجميع قنوات الاكتتاب لهذا الصندوق.',
    managerPending: 'جاري تجميع بيانات تفصيلية عن مدير الصندوق.',
    similarFundsEmpty: 'لم نحدد صناديق مشابهة بعد — استكشف جميع الصناديق أدناه.',
    ax: {
        higherBetter: 'كلما ارتفع كان أفضل',
        methodology: 'كيف نحتسب الدرجة',
        estimated: 'تقديري',
        noData: 'لا يوجد سجل كافٍ بعد',
        limitedHistory:
            'سجل هذا الصندوق لا يزال قصيراً لتحليلات موثوقة — ستتوفر المؤشرات مع تراكم تاريخ صافي قيمة الأصول.',
        limitedHistoryShort: 'ستتوفر مع تراكم سجل صافي قيمة الأصول للصندوق.',
        scoreTitle: 'بطاقة تقييم الصندوق',
        scoreSub: 'خمسة أبعاد، كل منها بدرجة من 0 إلى 100 محسوبة من سجل صافي قيمة الأصول لدينا. كلما ارتفعت الدرجة كان أفضل في كل بُعد — ونعرض الرقم الحقيقي خلف كل درجة.',
        startaScore: 'درجة ستارتا',
        overall: 'الإجمالي',
        confidence: 'مستوى الثقة',
        confHigh: 'ثقة عالية',
        confMed: 'ثقة متوسطة',
        confLow: 'ثقة منخفضة',
        dims: { performance: 'الأداء', risk: 'المخاطر', cost: 'التكلفة', stability: 'الاستقرار', diversification: 'التنويع' },
        dimDesc: {
            performance: 'درجة من النمو الحديث، معدّلة حسب مخاطر التراجع',
            risk: 'كلما قل التذبذب والتراجع ارتفعت الدرجة',
            cost: 'كلما قلت الرسوم المستمرة ارتفعت الدرجة',
            stability: 'كلما كانت العوائد أكثر ثباتًا ارتفعت الدرجة',
            diversification: 'تقديري من تفويض الصندوق وفئة أصوله',
        },
        metricLabels: { annualizedReturn: 'العائد السنوي المُرجّح', volatility: 'التذبذب', positivePeriods: 'الفترات الرابحة', fee: 'الرسوم المستمرة', category: 'حسب الفئة' },
        tiers: { excellent: 'ممتاز', strong: 'قوي', average: 'متوسط', weak: 'ضعيف', poor: 'ضعيف جدًا' },
        explainTitle: 'كيف تُحسب هذه الدرجة',
        explainClose: 'إغلاق',
        explainApprox: 'متوسط مرجّح',
        explain: {
            overall: 'درجة ستارتا متوسط مرجّح للأبعاد الخمسة — الأداء 30٪، المخاطر 22٪، الاستقرار 20٪، التكلفة 16٪، التنويع 12٪. يُستبعَد أي بُعد يتعذّر حسابه ويُعاد ترجيح الباقي.',
            performance: 'تُحوّل الدرجة العائد السنوي المُرجّح (بالأسفل) إلى مقياس 0–100 (نحو −5٪ ← 5، و50٪ ← 95)، ثم تُعدّل بنسبة كالمار (العائد ÷ أعمق تراجع) حتى لا يحصل عائد قوي تحقّق عبر انهيار حاد على درجة مماثلة لعائد تحقّق دون انهيار.',
            risk: 'أعلى = أكثر أمانًا. مزيج من التذبذب السنوي (55٪) وأعمق تراجع من القمة إلى القاع (45٪) — القيم الأقل تحصل على درجة أعلى. يعتمد على كامل سجل صافي قيمة الأصول، لذا يظل أي انهيار قديم محتسبًا.',
            stability: 'مزيج من نسبة الفترات الرابحة (60٪) والتذبذب (40٪) — العوائد الأكثر ثباتًا وانتظامًا تحصل على درجة أعلى.',
            cost: 'من الرسوم المستمرة (الأكبر بين رسوم الإدارة / نسبة المصروفات): نحو 0.25٪ ← 98، 1٪ ← 78، 2٪ ← 46، 3٪ ← 15. الأرخص يحصل على درجة أعلى.',
            diversification: 'تقدير من فئة أصول الصندوق (لم تُنشر المكوّنات الأساسية بعد): أسواق نقد ~82، دخل ثابت ~74، متوازن ~72، أسهم ~50، قطاع واحد ~34؛ ويُضاف قليلاً للتفويض الدولي الأوسع.',
            weightedReturn: 'مزيج يعكس الوضع الحالي بدلاً من سنة واحدة: 50٪ عائد 3 سنوات محوّلاً إلى سنوي، 25٪ عائد سنة، 25٪ معدل النمو المركب منذ التأسيس.',
            stress: 'التقديرات النموذجية تضرب صدمة سوقية عامة في حساسية فئة أصول الصندوق، ونطاق السنة السيئة هو 1.65× تذبذبها السنوي — تقريبات وليست تنبؤات. الأرقام التاريخية وقائع فعلية من سجل صافي قيمة أصول الصندوق نفسه.',
        },
        partLabels: { r3ann: 'عائد 3 سنوات (سنويًا)', r5ann: 'عائد 5 سنوات (سنويًا)', r1y: 'عائد سنة', cagr: 'النمو المركب منذ التأسيس', incep: 'منذ التأسيس (سنويًا)' },
        comparePicker: {
            title: 'قارن مع…',
            hint: 'اختر حتى {n} صناديق لعرضها جنبًا إلى جنب.',
            search: 'ابحث بالاسم أو مدير الصندوق',
            loading: 'جارٍ تحميل الصناديق…',
            error: 'تعذّر تحميل الصناديق — يرجى المحاولة مجددًا.',
            noMatch: 'لا توجد صناديق مطابقة لبحثك.',
            pickPrompt: 'اختر صندوقًا واحدًا على الأقل',
            selected: 'المحدد: {n}',
            go: 'قارن الآن',
            thisFund: 'هذا الصندوق',
        },
        suitTitle: 'هل هذا الصندوق مناسب لك؟',
        suitSub: 'كيف يتوافق هذا الصندوق مع مدد الاستثمار وملفات مخاطر المستثمرين.',
        horizonTitle: 'مدة الاستثمار',
        investorTitle: 'مطابقة ملف المستثمر',
        horizons: { short: 'قصير الأجل', medium: 'متوسط الأجل', long: 'طويل الأجل' },
        horizonHint: { short: 'أقل من سنة', medium: '1–4 سنوات', long: '5 سنوات فأكثر' },
        statuses: { suitable: 'مناسب', caution: 'بحذر', unsuitable: 'غير مناسب' },
        profiles: { conservative: 'محافظ', balanced: 'متوازن', aggressive: 'جريء' },
        matchSuffix: 'تطابق',
        insightsTitle: 'ما الذي يميّز الصندوق',
        insightsSub: 'مولّدة تلقائيًا من مقاييس الصندوق نفسه.',
        pro: 'نقطة قوة',
        con: 'نقطة انتباه',
        impact: { high: 'تأثير عالٍ', medium: 'تأثير متوسط', low: 'تأثير منخفض' },
        insightText: {
            strongPerformance: 'أداء قوي ومتسق — نحو {v}% سنويًا في الوضع الحالي',
            consistent: '{v}% من الفترات كانت موجبة — ثبات لا تذبذب حاد',
            longTrack: 'سجل طويل — {v} سنة من بيانات صافي قيمة الأصول للتقييم',
            deepData: 'بيانات عميقة — {v} نقطة صافي قيمة أصول خلف كل مقياس',
            highVolatility: 'تذبذب مرتفع ({v}% سنويًا) — توقّع تقلبات أكبر',
            deepDrawdown: 'تراجع {v}% من القمة إلى القاع تاريخيًا',
            highFee: 'رسوم مستمرة أعلى من المتوسط ({v}%)',
            shortTrack: 'سجل قصير ({v} سنة) — المقاييس أقل استقرارًا',
        },
        stressTitle: 'كيف قد يتصرف تحت الضغط',
        stressSub: 'أثر تقديري على صافي قيمة الأصول الحالي، إلى جانب ما حدث فعليًا تاريخيًا.',
        estimate: 'تقدير نموذجي',
        historical: 'واقعة تاريخية',
        stressDisclaimer: 'التقديرات تضرب صدمة سوقية عامة في حساسية فئة أصول الصندوق وتذبذبه — تقريبات وليست تنبؤات. الأرقام التاريخية مستمدة من سجل صافي قيمة أصول الصندوق نفسه.',
        scenarios: { marketDrop10: 'هبوط السوق ٪−10', marketDrop20: 'هبوط السوق ٪−20', adverse1y: 'سنة سيئة (نطاق 95٪)', worstDrawdown: 'أسوأ تراجع تاريخي', worstPeriod: 'أسوأ فترة منفردة' },
        calcTitle: 'احسب توقّع استثمارك',
        calcSub: 'نمو توضيحي باستخدام العائد السنوي المحقق للصندوق (المتوسط الهندسي عبر كامل تاريخه) — يُملأ تلقائياً وليس وعداً.',
        calcAmount: 'مبلغ لمرة واحدة',
        calcMonthly: 'استثمار شهري',
        calcHorizon: 'مدة الاحتفاظ',
        calcYears1: 'سنة واحدة', calcYears2: 'سنتان', calcYearsFew: 'سنوات', calcYearsMany: 'سنة',
        calcInvested: 'المستثمر', calcProjected: 'القيمة المتوقعة', calcGain: 'الربح المتوقع', calcRange: 'النطاق المرجّح',
        calcCagrNote: 'بناءً على العائد السنوي المحقق {v}% عبر كامل تاريخ الصندوق',
        calcCagrNoteWindow: 'بناءً على العائد السنوي المحقق {v}% خلال آخر {w}',
        calcDisclaimer: 'توضيحي فقط بناءً على الأداء السابق. ليس وعدًا بعوائد مستقبلية — قد تنخفض قيمة الصناديق. تتراكم المساهمات الشهرية بمعدل شهري مركب.',
        calcEnterAmounts: 'أدخل مبلغاً لعرض التوقع.',
        cagrTitle: 'معدل النمو المركب منذ التأسيس',
        cagrSinceInception: 'الإجمالي منذ التأسيس',
        cagrOverYears: 'على مدى {v} سنة',
        moveTitle: 'توزيع العوائد',
        moveBest: 'أفضل {p}', moveWorst: 'أسوأ {p}', moveAvgGain: 'متوسط الصعود {p}', moveAvgLoss: 'متوسط الهبوط {p}',
        moveDaily: 'يوم', moveWeekly: 'أسبوع', movePeriod: 'فترة',
        gateTitle: 'افتح التحليل الكامل',
        gateBody: 'أنشئ حسابًا مجانيًا لعرض بطاقة التقييم والملاءمة واختبارات الضغط وحاسبة الاستثمار لكل صندوق مصري.',
        gateCta: 'أنشئ حسابًا مجانيًا',
        gateSignin: 'تسجيل الدخول',
        gateCompact: 'أنشئ حسابًا مجانيًا لفتح هذه الأدوات',
        fbTitle: 'هل كانت هذه المعلومات مفيدة؟',
        fbSub: 'ساعدنا في تحسين هذه الصفحة.',
        fbYes: 'نعم، مفيدة', fbNo: 'غير مفيدة', fbThanks: 'شكرًا على رأيك!',
        fbCommentPlaceholder: 'هل من شيء نضيفه؟ (اختياري)', fbSubmit: 'إرسال',
        compareCta: 'قارن',
    },
};

export function fundLabels(lang: Lang): FundLabels {
    return lang === 'ar' ? AR : EN;
}

const FUND_TYPE_AR: Record<string, string> = {
    equity: 'صندوق أسهم',
    money_market: 'صندوق أسواق نقدية',
    fixed_income: 'صندوق دخل ثابت',
    balanced: 'صندوق متوازن',
    mixed: 'صندوق متوازن',
    bond: 'صندوق سندات',
    real_estate: 'صندوق عقاري',
    'equity fund': 'صندوق أسهم',
    'money market fund': 'صندوق أسواق نقدية',
    'fixed income fund': 'صندوق دخل ثابت',
    'balanced fund': 'صندوق متوازن',
};

const FUND_TYPE_EN: Record<string, string> = {
    equity: 'Equity Fund',
    money_market: 'Money Market Fund',
    fixed_income: 'Fixed Income Fund',
    balanced: 'Balanced Fund',
    mixed: 'Balanced Fund',
    bond: 'Fixed Income Fund',
    real_estate: 'Real Estate Fund',
};

const RISK_AR: Record<string, string> = {
    high: 'مرتفع',
    'very high': 'مرتفع جدًا',
    medium: 'متوسط',
    moderate: 'متوسط',
    low: 'منخفض',
    'low to medium': 'منخفض إلى متوسط',
    'medium to high': 'متوسط إلى مرتفع',
};

const FREQ_AR: Record<string, string> = {
    daily: 'يومي',
    weekly: 'أسبوعي',
    'bi-weekly': 'كل أسبوعين',
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    'semi-annual': 'نصف سنوي',
    'semi-annually': 'نصف سنوي',
    annual: 'سنوي',
    annually: 'سنوي',
};

/** Humanise a fund-type code/text into the requested language. */
export function fundTypeLabel(raw: string | null, classificationEn: string | null, lang: Lang): string | null {
    const source = (raw || classificationEn || '').trim();
    if (!source) return null;
    const key = source.toLowerCase();
    if (lang === 'ar') return FUND_TYPE_AR[key] ?? classificationEn ?? source;
    return FUND_TYPE_EN[key] ?? classificationEn ?? source;
}

export function riskLabel(raw: string | null, lang: Lang): string | null {
    if (!raw) return null;
    const key = raw.trim().toLowerCase();
    if (lang === 'ar') return RISK_AR[key] ?? raw;
    return key.charAt(0).toUpperCase() + key.slice(1);
}

export function freqLabel(raw: string | null, lang: Lang): string | null {
    if (!raw) return null;
    const key = raw.trim().toLowerCase();
    if (lang === 'ar') return FREQ_AR[key] ?? raw;
    return key.charAt(0).toUpperCase() + key.slice(1);
}
