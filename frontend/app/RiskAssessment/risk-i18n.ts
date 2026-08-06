/**
 * Bilingual (EN/AR) dictionary for the Investment Risk Assessment.
 * Same per-URL pattern as the fund pages: /RiskAssessment = English LTR,
 * /ar/RiskAssessment = Arabic RTL — one language per URL, never mixed.
 * Plain data only (no functions inside the dict) so it serializes cleanly
 * across the server→client boundary. Numbers stay Western digits in both
 * languages; bidi-sensitive tokens (e.g. "+5%") are wrapped in FSI/PDI
 * isolates (⁦..⁩) inside the Arabic strings.
 */

import type { FundCategory, ProfileId } from './risk-engine';

export type Lang = 'en' | 'ar';

export type RiskQuestion = {
    title: string;
    /** Option i (0-based) is worth i+1 points — least to most risk-tolerant. */
    options: [string, string, string, string];
};

export type ProfileCopy = {
    name: string;
    description: string;
    volatility: string;
    horizon: string;
};

export type RiskLabels = {
    landing: {
        tagline: string;
        h1: string;
        subtitle: string;
        metaMinutes: string;
        metaQuestions: string;
        metaMpt: string;
        start: string;
        /** Interpolated with {profile}. */
        lastResult: string;
        lastResultRetake: string;
    };
    wizard: {
        /** Interpolated with {n} and {total}. */
        questionOf: string;
        progressAria: string;
        back: string;
        next: string;
        seeResults: string;
    };
    results: {
        kicker: string;
        /** Interpolated with {score} and {max}. */
        scoreLabel: string;
        gaugeTitle: string;
        volatilityLabel: string;
        horizonLabel: string;
        allocationTitle: string;
        allocationCenterCaption: string;
        legend: { cash: string; fixedIncome: string; equities: string };
        recommendationTitle: string;
        /** Interpolated with {equities} and {fixed}. */
        recommendation: string;
        fundsTitle: string;
        fundsSubtitle: string;
        /** Interpolated with {category}. */
        explore: string;
        retake: string;
        disclaimer: string;
    };
    profiles: Record<ProfileId, ProfileCopy>;
    fundCategories: Record<FundCategory, string>;
    questions: RiskQuestion[];
};

/** Tiny `{key}` interpolator shared by server and client. */
export function fmt(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

const EN: RiskLabels = {
    landing: {
        tagline: 'RISK PROFILER',
        h1: 'Investment Risk Assessment',
        subtitle: 'Find out your investor profile and get a personalized asset allocation recommendation',
        metaMinutes: 'Takes about 2 minutes',
        metaQuestions: '7 quick questions',
        metaMpt: 'Based on Modern Portfolio Theory',
        start: 'Start the assessment',
        lastResult: 'You last scored: {profile}',
        lastResultRetake: 'Retake',
    },
    wizard: {
        questionOf: 'QUESTION {n} OF {total}',
        progressAria: 'Assessment progress',
        back: 'Back',
        next: 'Next',
        seeResults: 'See my results',
    },
    results: {
        kicker: 'Your investor profile',
        scoreLabel: 'Score {score} / {max}',
        gaugeTitle: 'Risk spectrum',
        volatilityLabel: 'Expected volatility',
        horizonLabel: 'Investment horizon',
        allocationTitle: 'Recommended asset allocation',
        allocationCenterCaption: 'equities',
        legend: { cash: 'Cash / Money market', fixedIncome: 'Fixed income', equities: 'Equities' },
        recommendationTitle: 'Recommendation',
        recommendation: 'Based on your score, aim for a portfolio around {equities}% equities and {fixed}% fixed income.',
        fundsTitle: 'Matching fund categories',
        fundsSubtitle: 'Egyptian mutual-fund categories that typically fit this profile',
        explore: 'Explore {category} funds',
        retake: 'Retake the assessment',
        disclaimer:
            'This assessment is educational guidance based only on your answers. It is not personalized investment advice and does not account for your full financial situation. Consider consulting a licensed financial advisor before investing.',
    },
    profiles: {
        very_conservative: {
            name: 'Very Conservative',
            description:
                'Capital preservation comes first. You prefer stable, predictable value over growth, and even small losses feel uncomfortable. A portfolio dominated by money-market instruments and fixed income keeps volatility to a minimum while still earning a modest return.',
            volatility: 'Very low (roughly 2–4% a year)',
            horizon: 'Under 2 years',
        },
        conservative: {
            name: 'Conservative',
            description:
                'You want your money to grow ahead of inflation, but with strong downside protection. Most of the portfolio sits in income-generating assets, while a measured slice of equities adds long-term growth without dramatic swings.',
            volatility: 'Low (roughly 4–7% a year)',
            horizon: '2–4 years',
        },
        balanced: {
            name: 'Balanced',
            description:
                'You accept meaningful ups and downs in exchange for meaningful growth. A near-even split between growth and income assets aims to capture most of the equity market’s upside while cushioning the falls.',
            volatility: 'Moderate (roughly 8–12% a year)',
            horizon: '4–7 years',
        },
        growth: {
            name: 'Growth',
            description:
                'Long-term growth is the priority, and you can stomach sharp drawdowns along the way. Equities drive the portfolio, with a fixed-income buffer that softens the worst of the market’s swings.',
            volatility: 'High (roughly 12–18% a year)',
            horizon: '7–10 years',
        },
        aggressive: {
            name: 'Aggressive',
            description:
                'You aim for maximum long-term returns and treat downturns as buying opportunities. The portfolio is almost fully invested in equities, so large temporary losses are expected — and tolerated — on the way to higher expected growth.',
            volatility: 'Very high (can exceed 18% a year)',
            horizon: '10+ years',
        },
    },
    fundCategories: {
        money_market: 'Money Market',
        fixed_income: 'Fixed Income',
        balanced: 'Balanced',
        equity: 'Equity',
        gold: 'Gold',
    },
    questions: [
        {
            title: 'What is your age group?',
            options: ['Above 60', '45–60', '30–45', 'Under 30'],
        },
        {
            title: 'What is your primary goal for this money?',
            options: [
                'Preserve my money — safety first',
                'Generate steady income',
                'Grow responsibly — a balance of growth and safety',
                'Maximize growth aggressively',
            ],
        },
        {
            title: 'When will you need to withdraw a significant portion of it?',
            options: ['In less than a year', 'In 1–3 years', 'In 3–7 years', 'In 7+ years'],
        },
        {
            title: 'If the market drops 20% in a month, what would you do?',
            options: [
                'Sell everything',
                'Sell some of my holdings',
                'Do nothing — wait it out',
                'Buy more — it’s a discount',
            ],
        },
        {
            title: 'How would you rate your investment knowledge?',
            options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        },
        {
            title: 'Which one-year outcome scenario appeals to you most?',
            options: [
                'Best case +5% | Worst case 0%',
                'Best case +15% | Worst case −5%',
                'Best case +25% | Worst case −15%',
                'Best case +45% | Worst case −25%',
            ],
        },
        {
            title: 'How stable is your income?',
            options: [
                'My income barely covers my expenses',
                'Stable, but savings are limited',
                'Stable, with regular savings',
                'High and secure — I can invest a large share',
            ],
        },
    ],
};

const AR: RiskLabels = {
    landing: {
        tagline: 'ملف المخاطر',
        h1: 'تقييم ملف المخاطر الاستثماري',
        subtitle: 'اكتشف ملفك الاستثماري واحصل على توصية مخصصة لتوزيع أصول محفظتك',
        metaMinutes: 'يستغرق نحو دقيقتين',
        metaQuestions: '7 أسئلة سريعة',
        metaMpt: 'مبني على نظرية المحفظة الحديثة',
        start: 'ابدأ التقييم',
        lastResult: 'نتيجتك السابقة: {profile}',
        lastResultRetake: 'أعد التقييم',
    },
    wizard: {
        questionOf: 'السؤال {n} من {total}',
        progressAria: 'تقدّم التقييم',
        back: 'السابق',
        next: 'التالي',
        seeResults: 'اعرض نتيجتي',
    },
    results: {
        kicker: 'ملفك الاستثماري',
        scoreLabel: 'النتيجة {score} / {max}',
        gaugeTitle: 'مقياس المخاطر',
        volatilityLabel: 'التقلبات المتوقعة',
        horizonLabel: 'الأفق الاستثماري',
        allocationTitle: 'التوزيع المقترح للأصول',
        allocationCenterCaption: 'أسهم',
        legend: { cash: 'نقد / أسواق النقد', fixedIncome: 'أدوات الدخل الثابت', equities: 'الأسهم' },
        recommendationTitle: 'التوصية',
        recommendation: 'بناءً على نتيجتك، استهدف محفظة تخصص نحو {equities}% للأسهم و{fixed}% لأدوات الدخل الثابت.',
        fundsTitle: 'فئات الصناديق المناسبة لك',
        fundsSubtitle: 'فئات صناديق الاستثمار المصرية التي تناسب هذا الملف عادةً',
        explore: 'استكشف {category}',
        retake: 'أعد التقييم',
        disclaimer:
            'هذا التقييم إرشاد تعليمي مبني على إجاباتك فقط، وليس نصيحة استثمارية مخصصة، ولا يأخذ وضعك المالي الكامل في الاعتبار. يُنصح باستشارة مستشار مالي مرخّص قبل اتخاذ أي قرار استثماري.',
    },
    profiles: {
        very_conservative: {
            name: 'متحفظ جداً',
            description:
                'الحفاظ على رأس المال أولويتك المطلقة. تفضّل الاستقرار والقيمة المتوقعة على النمو، وحتى الخسائر الصغيرة تسبب لك القلق. محفظة تهيمن عليها أدوات أسواق النقد والدخل الثابت تُبقي التقلبات عند أدنى حد مع تحقيق عائد معتدل.',
            volatility: 'منخفضة جداً (نحو 2–4% سنوياً)',
            horizon: 'أقل من سنتين',
        },
        conservative: {
            name: 'متحفظ',
            description:
                'تريد أن تنمو أموالك بوتيرة تسبق التضخم مع حماية قوية من الخسائر. معظم المحفظة في أصول مدرّة للدخل، مع حصة محسوبة من الأسهم تضيف نمواً طويل الأجل دون تقلبات حادة.',
            volatility: 'منخفضة (نحو 4–7% سنوياً)',
            horizon: 'من سنتين إلى 4 سنوات',
        },
        balanced: {
            name: 'متوازن',
            description:
                'تتقبّل صعوداً وهبوطاً ملموساً مقابل نموٍ ملموس. التوزيع شبه المتساوي بين أصول النمو وأصول الدخل يستهدف التقاط معظم صعود سوق الأسهم مع تخفيف أثر موجات الهبوط.',
            volatility: 'متوسطة (نحو 8–12% سنوياً)',
            horizon: 'من 4 إلى 7 سنوات',
        },
        growth: {
            name: 'نمو',
            description:
                'النمو طويل الأجل هو الأولوية، ويمكنك تحمّل موجات هبوط حادة في الطريق. الأسهم تقود المحفظة، مع حاجزٍ من أدوات الدخل الثابت يخفف أسوأ تقلبات السوق.',
            volatility: 'مرتفعة (نحو 12–18% سنوياً)',
            horizon: 'من 7 إلى 10 سنوات',
        },
        aggressive: {
            name: 'جريء',
            description:
                'تستهدف أقصى عائد طويل الأجل وتتعامل مع موجات الهبوط باعتبارها فرصاً للشراء. المحفظة مستثمرة بالكامل تقريباً في الأسهم، لذا فإن الخسائر المؤقتة الكبيرة متوقعة — ومقبولة — في الطريق نحو نموٍ أعلى.',
            volatility: 'مرتفعة جداً (قد تتجاوز 18% سنوياً)',
            horizon: '10 سنوات أو أكثر',
        },
    },
    fundCategories: {
        money_market: 'صناديق أسواق النقد',
        fixed_income: 'صناديق أدوات الدخل الثابت',
        balanced: 'الصناديق المتوازنة',
        equity: 'صناديق الأسهم',
        gold: 'صناديق الذهب',
    },
    questions: [
        {
            title: 'ما هي فئتك العمرية؟',
            options: ['أكبر من 60 عاماً', 'من 45 إلى 60 عاماً', 'من 30 إلى 45 عاماً', 'أقل من 30 عاماً'],
        },
        {
            title: 'ما هدفك الأساسي من هذه الأموال؟',
            options: [
                'الحفاظ على أموالي — الأمان أولاً',
                'تحقيق دخل ثابت ومنتظم',
                'النمو بمسؤولية — توازن بين النمو والأمان',
                'تحقيق أقصى نمو ممكن بجرأة',
            ],
        },
        {
            title: 'متى ستحتاج إلى سحب جزء كبير من هذه الأموال؟',
            options: ['خلال أقل من سنة', 'خلال سنة إلى 3 سنوات', 'خلال 3 إلى 7 سنوات', 'بعد 7 سنوات أو أكثر'],
        },
        {
            title: 'لو انخفض السوق ⁦20%⁩ في شهر واحد، ماذا ستفعل؟',
            options: [
                'أبيع كل استثماراتي',
                'أبيع جزءاً منها',
                'لا أفعل شيئاً — أنتظر حتى يتعافى السوق',
                'أشتري المزيد — إنها فرصة بسعر مخفَّض',
            ],
        },
        {
            title: 'كيف تقيّم معرفتك الاستثمارية؟',
            options: ['مبتدئ', 'متوسط', 'متقدم', 'خبير'],
        },
        {
            title: 'أي سيناريو سنوي يناسبك أكثر؟',
            options: [
                'أفضل حالة ⁦+5%⁩ | أسوأ حالة ⁦0%⁩',
                'أفضل حالة ⁦+15%⁩ | أسوأ حالة ⁦−5%⁩',
                'أفضل حالة ⁦+25%⁩ | أسوأ حالة ⁦−15%⁩',
                'أفضل حالة ⁦+45%⁩ | أسوأ حالة ⁦−25%⁩',
            ],
        },
        {
            title: 'ما مدى استقرار دخلك؟',
            options: [
                'دخلي يكاد يغطي مصاريفي',
                'مستقر، لكن مدخراتي محدودة',
                'مستقر، مع ادخار منتظم',
                'مرتفع وآمن — أستطيع استثمار جزء كبير منه',
            ],
        },
    ],
};

export const RISK_I18N: Record<Lang, RiskLabels> = { en: EN, ar: AR };
