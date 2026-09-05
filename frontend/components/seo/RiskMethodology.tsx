import JsonLd from '@/components/seo/JsonLd';
import Link from 'next/link';
import { PROFILES, fundCategoriesFor, QUESTION_COUNT, POINTS_MIN, POINTS_MAX, SCORE_MIN, SCORE_MAX, type FundCategory } from '@/app/RiskAssessment/risk-engine';
import { RISK_I18N, type Lang } from '@/app/RiskAssessment/risk-i18n';
import { FUND_CATEGORIES, categoryPath } from '@/content/fund-categories';

/**
 * PUBLISHED METHODOLOGY for the risk assessment, rendered SERVER-SIDE beneath
 * the wizard.
 *
 * WHY. The whole assessment lived inside RiskAssessmentClient, so the server
 * sent 197 words (EN) / 176 (AR) and not one real content heading — the page
 * scored HIGH on the thin-content audit while carrying a genuinely rich model.
 * Two separate problems followed from that:
 *
 *  1. A tool that assigns you a risk profile and a model asset allocation
 *     published NO methodology. That is the disclosure a scoring tool owes a
 *     reader — how it scores, what the bands are, what each profile means —
 *     and it is a YMYL requirement, not an SEO nicety.
 *  2. A reader who wants to understand the model BEFORE answering seven
 *     questions had nowhere to go, and a crawler saw an empty page.
 *
 * NOTHING HERE IS AUTHORED PROSE ABOUT THE MODEL. Every number is read from
 * risk-engine.ts (the same module the wizard scores with) and every profile
 * description from risk-i18n.ts (the same copy the results screen shows). If
 * the bands or allocations change, this section changes with them — it cannot
 * drift into describing a model the tool no longer runs, which is the failure
 * mode a hand-written methodology page always ends in.
 *
 * This is deliberately NOT padding. The page needed the disclosure regardless
 * of what any audit said.
 */

const COPY = {
    en: {
        h2: 'How this assessment is scored',
        intro:
            'The result is deterministic: the same answers always produce the same profile. There is no model, no forecast and no judgement about you beyond the arithmetic below.',
        scoringH3: 'The scoring',
        scoring: (q: number, lo: number, hi: number, min: number, max: number) =>
            `Each of the ${q} questions is worth ${lo} to ${hi} points, so a completed assessment totals between ${min} and ${max}. That total falls into one of five contiguous bands, and the band is the profile. Nothing else is weighted, and no answer is worth more than any other.`,
        profilesH3: 'The five profiles',
        profilesIntro:
            'Allocations are a model starting point expressed in percentages that always sum to 100. They describe the shape of a portfolio for that profile — they are not a recommendation to buy anything.',
        band: 'Score band',
        allocation: 'Model allocation',
        volatility: 'Expected volatility',
        horizon: 'Typical horizon',
        matching: 'Fund categories that fit this profile',
        cash: 'Cash / money market',
        fixedIncome: 'Fixed income',
        equities: 'Equities',
        limitsH3: 'What this tool does not do',
        limits: [
            'It does not know your income, debts, dependants, tax position or existing holdings, so it cannot tell you what to buy.',
            'It does not measure your capacity to absorb a loss — only your stated willingness to accept one. Those are different, and the gap between them is where most investing mistakes happen.',
            'The volatility ranges shown are the profile’s expected behaviour, not a cap. A portfolio can and does fall further than its expected range in a bad year.',
        ],
        disclaimer:
            'This is a free educational tool. It is not investment advice, not a recommendation to buy or sell any security or fund, and it does not account for your personal circumstances. Past performance does not guarantee future results.',
    },
    ar: {
        h2: 'كيف يُحتسب هذا التقييم',
        intro:
            'النتيجة محسوبة بشكل حتمي: الإجابات نفسها تعطي الملف نفسه دائماً. لا يوجد نموذج تنبؤي ولا توقعات ولا حكم عليك خارج الحساب الموضح أدناه.',
        scoringH3: 'طريقة الاحتساب',
        scoring: (q: number, lo: number, hi: number, min: number, max: number) =>
            `كل سؤال من الأسئلة الـ${q} يمنح من ${lo} إلى ${hi} نقاط، فيتراوح مجموع التقييم المكتمل بين ${min} و${max}. يقع هذا المجموع ضمن واحد من خمسة نطاقات متصلة، والنطاق هو الملف. لا يوجد ترجيح آخر، ولا سؤال أثقل من غيره.`,
        profilesH3: 'الملفات الخمسة',
        profilesIntro:
            'التوزيعات نقطة بداية إرشادية بنسب مئوية مجموعها 100 دائماً. هي تصف شكل المحفظة لهذا الملف، وليست توصية بشراء أي أصل.',
        band: 'نطاق النقاط',
        allocation: 'التوزيع الإرشادي',
        volatility: 'التذبذب المتوقع',
        horizon: 'الأفق الزمني المعتاد',
        matching: 'فئات الصناديق المناسبة لهذا الملف',
        cash: 'النقد وأسواق النقد',
        fixedIncome: 'الدخل الثابت',
        equities: 'الأسهم',
        limitsH3: 'ما لا يفعله هذا التقييم',
        limits: [
            'لا يعرف دخلك ولا التزاماتك ولا من تعولهم ولا وضعك الضريبي ولا استثماراتك الحالية، لذلك لا يستطيع أن يخبرك بما تشتريه.',
            'لا يقيس قدرتك على تحمّل الخسارة، بل استعدادك المعلن لقبولها فقط. وهما أمران مختلفان، والفجوة بينهما هي مصدر معظم أخطاء الاستثمار.',
            'نطاقات التذبذب المعروضة هي السلوك المتوقع للملف وليست حداً أقصى. المحفظة قد تنخفض أكثر من نطاقها المتوقع في سنة سيئة.',
        ],
        disclaimer:
            'هذه أداة تعليمية مجانية. ليست مشورة استثمارية ولا توصية بشراء أو بيع أي ورقة مالية أو صندوق، ولا تأخذ ظروفك الشخصية في الاعتبار. الأداء السابق لا يضمن النتائج المستقبلية.',
    },
} as const;

/** risk-engine's category ids → the real category hubs, so a profile links into
 *  the Arabic tree on the Arabic page rather than an English `?type=` param. */
const CATEGORY_KEY: Record<FundCategory, string> = {
    money_market: 'money-market',
    fixed_income: 'fixed-income',
    balanced: 'balanced',
    equity: 'equity',
    gold: 'gold',
};

export default function RiskMethodology({ lang }: { lang: Lang }) {
    const isAr = lang === 'ar';
    const t = COPY[lang];
    const labels = RISK_I18N[lang];

    const hubFor = (c: FundCategory) => {
        const cat = FUND_CATEGORIES.find((x) => x.key === CATEGORY_KEY[c]);
        return cat ? { href: categoryPath(cat, lang), label: isAr ? cat.nameAr : cat.nameEn } : null;
    };

    // Q&A pairs an answer engine can quote. Each profile's question is the one a
    // reader actually asks ("what does Balanced mean?"), answered with the same
    // description the results screen shows.
    const faq = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: lang,
        mainEntity: [
            {
                '@type': 'Question',
                name: t.h2,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `${t.intro} ${t.scoring(QUESTION_COUNT, POINTS_MIN, POINTS_MAX, SCORE_MIN, SCORE_MAX)}`,
                },
            },
            ...PROFILES.map((p) => {
                const c = labels.profiles[p.id];
                return {
                    '@type': 'Question',
                    name: isAr ? `ماذا يعني ملف "${c.name}"؟` : `What does the ${c.name} profile mean?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `${c.description} ${t.band}: ${p.minScore}–${p.maxScore}. ${t.allocation}: ${t.cash} ${p.allocation.cash}%, ${t.fixedIncome} ${p.allocation.fixedIncome}%, ${t.equities} ${p.allocation.equities}%.`,
                    },
                };
            }),
        ],
    };

    return (
        <>
            <JsonLd data={faq} />
            <section className="mt-14 max-w-3xl" dir={isAr ? 'rtl' : 'ltr'}>
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {t.h2}
                </h2>
                <p className="mt-3 leading-relaxed text-muted">{t.intro}</p>

                <h3 id="scoring" className="mt-8 scroll-mt-24 text-base font-extrabold text-main">
                    {t.scoringH3}
                </h3>
                <p className="mt-2.5 leading-relaxed text-muted">
                    {t.scoring(QUESTION_COUNT, POINTS_MIN, POINTS_MAX, SCORE_MIN, SCORE_MAX)}
                </p>

                <h3 id="profiles" className="mt-8 scroll-mt-24 text-base font-extrabold text-main">
                    {t.profilesH3}
                </h3>
                <p className="mt-2.5 leading-relaxed text-muted">{t.profilesIntro}</p>

                <div className="mt-5 space-y-4">
                    {PROFILES.map((p) => {
                        const c = labels.profiles[p.id];
                        const cats = fundCategoriesFor(p.id).map(hubFor).filter(Boolean) as Array<{ href: string; label: string }>;
                        return (
                            <div key={p.id} className="rounded-2xl border border-border bg-surface p-5">
                                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                    <h4 className="text-base font-bold text-main">{c.name}</h4>
                                    <span className="text-xs font-semibold text-muted">
                                        {t.band} {p.minScore}–{p.maxScore}
                                    </span>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-muted">{c.description}</p>

                                <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                                    <div className="flex justify-between gap-3 sm:contents">
                                        <dt className="text-muted">{t.allocation}</dt>
                                        <dd className="font-medium text-main">
                                            {t.cash} {p.allocation.cash}% · {t.fixedIncome} {p.allocation.fixedIncome}% ·{' '}
                                            {t.equities} {p.allocation.equities}%
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-3 sm:contents">
                                        <dt className="text-muted">{t.volatility}</dt>
                                        <dd className="font-medium text-main">{c.volatility}</dd>
                                    </div>
                                    <div className="flex justify-between gap-3 sm:contents">
                                        <dt className="text-muted">{t.horizon}</dt>
                                        <dd className="font-medium text-main">{c.horizon}</dd>
                                    </div>
                                </dl>

                                {cats.length > 0 && (
                                    <p className="mt-3 text-sm text-muted">
                                        {t.matching}:{' '}
                                        {cats.map((x, i) => (
                                            <span key={x.href}>
                                                {i > 0 && '، '}
                                                <Link className="font-medium text-starta-darkTeal hover:underline" href={x.href}>
                                                    {x.label}
                                                </Link>
                                            </span>
                                        ))}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                <h3 id="limits" className="mt-8 scroll-mt-24 text-base font-extrabold text-main">
                    {t.limitsH3}
                </h3>
                <ul className="mt-2.5 space-y-2">
                    {t.limits.map((l, i) => (
                        <li key={i} className="leading-relaxed text-muted">
                            {l}
                        </li>
                    ))}
                </ul>

                <p className="mt-8 text-xs leading-relaxed text-muted">{t.disclaimer}</p>
            </section>
        </>
    );
}
