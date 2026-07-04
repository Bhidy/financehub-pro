/**
 * Bilingual (EN/AR) label + value dictionaries for the fund-profile page.
 * The page is per-URL bilingual (SSR): /Funds/{slug} = English LTR,
 * /ar/Funds/{slug} = Arabic RTL. Content is shown in one language per URL —
 * never mixed. All UI strings and coded values (fund type, risk, frequency)
 * are localized here so the client component stays language-agnostic.
 */

export type Lang = 'en' | 'ar';

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
