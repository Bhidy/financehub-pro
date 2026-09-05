import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFundsRanked } from '@/lib/public-data';
import { SITE_URL, absUrl, fundPath, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { FUND_CATEGORIES, MIN_FUNDS_TO_PUBLISH, categoryOfFund, categoryPath, type FundCategory } from '@/content/fund-categories';
import { fundName, fundsAsOf } from '@/lib/funds-hub-render';
import { num, str, median, pctSigned, pct, type Row } from '@/lib/fund-stats';

/**
 * /Funds/categories and /ar/Funds/categories — CATEGORY PERFORMANCE, COMPARED.
 *
 * The six category hubs each describe one type of fund. This is the page
 * above them that answers the question a first-time investor actually asks —
 * "what types of fund exist here, and how have they behaved" — with the fund
 * count, the median trailing 1-year and YTD return, the best and worst fund,
 * and the median management fee, per category, side by side.
 *
 * Medians throughout: a category's number must describe the category, not
 * its single most extreme member. Definitions are the category taxonomy's own
 * intro text, so this page and the hubs cannot describe a category differently.
 */

const PATH_EN = '/Funds/categories';
const PATH_AR = '/ar/Funds/categories';

type CategoryStats = {
    c: FundCategory;
    funds: Row[];
    median1y: number | null;
    medianYtd: number | null;
    best: Row | null;
    worst: Row | null;
    medianFee: number | null;
};

export function categoriesMetadata(lang: 'en' | 'ar'): Metadata {
    const isAr = lang === 'ar';
    const canonical = isAr ? PATH_AR : PATH_EN;
    const title = isAr ? 'فئات صناديق الاستثمار في مصر — العوائد حسب النوع' : 'Fund Categories in Egypt — Returns by Type';
    const description = isAr
        ? 'أسواق النقد والدخل الثابت والأسهم والذهب والمتوازنة والإسلامية: عدد الصناديق ووسيط عائد سنة ومنذ بداية العام وأفضل وأسوأ صندوق ووسيط رسوم الإدارة لكل فئة.'
        : 'Money market, fixed income, equity, gold, balanced and Shariah-compliant: fund count, median 1-year and YTD return, best and worst fund and median management fee per category.';
    return {
        title,
        description,
        alternates: { canonical, languages: { en: PATH_EN, ar: PATH_AR, 'x-default': PATH_AR } },
        openGraph: { ...OG_DEFAULTS, type: 'website', title: `${title} | Starta Markets`, description, url: canonical, locale: isAr ? 'ar_EG' : 'en_US' },
    };
}

export async function renderCategoriesIndex(lang: 'en' | 'ar') {
    const isAr = lang === 'ar';
    let funds: Row[] = [];
    try {
        funds = await getAllFundsRanked();
    } catch (error) {
        console.error('[categories-index] query failed:', (error as Error).message);
    }
    const byKey = new Map<string, Row[]>();
    for (const f of funds) {
        const c = categoryOfFund(f);
        if (!c) continue;
        if (!byKey.has(c.key)) byKey.set(c.key, []);
        (byKey.get(c.key) as Row[]).push(f);
    }
    const stats: CategoryStats[] = FUND_CATEGORIES.filter((c) => (byKey.get(c.key)?.length ?? 0) >= MIN_FUNDS_TO_PUBLISH).map((c) => {
        const cf = byKey.get(c.key) as Row[];
        const ranked = cf.filter((f) => num(f, 'return_1y') !== null).sort((a, b) => (num(b, 'return_1y') as number) - (num(a, 'return_1y') as number));
        return {
            c,
            funds: cf,
            median1y: median(cf.map((f) => num(f, 'return_1y'))),
            medianYtd: median(cf.map((f) => num(f, 'return_ytd'))),
            best: ranked[0] ?? null,
            worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
            medianFee: median(cf.map((f) => num(f, 'fee_management'))),
        };
    });
    if (stats.length < 2) notFound();
    const asOf = fundsAsOf(funds, lang);
    const categorised = stats.reduce((n, s) => n + s.funds.length, 0);
    const topMedian = [...stats].filter((s) => s.median1y !== null).sort((a, b) => (b.median1y as number) - (a.median1y as number))[0] ?? null;

    const title = isAr ? 'مقارنة فئات صناديق الاستثمار في مصر' : 'Egyptian mutual fund categories compared';
    const nameOf = (c: FundCategory) => (isAr ? c.nameAr : c.nameEn);

    const faq = isAr
        ? [
              {
                  q: 'أي فئة حققت أعلى وسيط عائد خلال آخر 12 شهراً؟',
                  a: topMedian
                      ? `كما في ${asOf.human || 'آخر إفصاح'}، أعلى وسيط عائد سنة بين الفئات كان لفئة ${nameOf(topMedian.c)} (${pctSigned(topMedian.median1y)}). هذا سجل لما مضى ولا يقول شيئاً عن العام القادم؛ الفئات تختلف في المخاطر والأفق الزمني ولا تُقارن برقم واحد.`
                      : 'لا يتوافر عائد سنة كافٍ لتحديد ذلك حالياً.',
              },
              { q: 'لماذا الوسيط وليس المتوسط؟', a: 'الوسيط هو القيمة الوسطى بين صناديق الفئة؛ لا يجرّه صندوق واحد ذو عائد شاذ لأعلى أو لأسفل، لذلك يصف الفئة لا أطرافها. ويظهر فقط عندما يتوافر العائد لثلاثة صناديق على الأقل.' },
              { q: 'هل الفئة ذات العائد الأعلى هي الأفضل؟', a: 'لا. صندوق أسواق النقد وصندوق الأسهم لا يتنافسان على الدور نفسه في المحفظة: يختلفان في الأدوات والتقلب والأفق الزمني. المقارنة المفيدة تكون داخل الفئة الواحدة وأمام أفقك الزمني ومدى تحمّلك لانخفاض صافي قيمة الأصول.' },
          ]
        : [
              {
                  q: 'Which category had the highest median 1-year return?',
                  a: topMedian
                      ? `As of ${asOf.human || 'the latest disclosure'}, the highest median trailing 1-year return among the categories was ${nameOf(topMedian.c)} (${pctSigned(topMedian.median1y)}). That is a record of the past year, not a statement about the next one; categories differ in risk and horizon and are not comparable on one number.`
                      : 'Not enough 1-year returns are available to say at the moment.',
              },
              { q: 'Why medians and not averages?', a: 'The median is the middle fund in the category. One fund with an extreme return cannot drag it up or down, so it describes the category rather than its outliers. It is shown only when at least three funds have a return.' },
              { q: 'Is the category with the highest return the best one?', a: 'No. A money market fund and an equity fund do not compete for the same role in a portfolio: they hold different instruments, carry different volatility and are used over different horizons. The useful comparison is within a category, and against your own horizon and tolerance for a falling net asset value.' },
          ];

    const collection = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': absUrl(isAr ? PATH_AR : PATH_EN),
        name: title,
        inLanguage: isAr ? 'ar-EG' : 'en',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        ...(asOf.iso ? { dateModified: asOf.iso } : {}),
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: stats.length,
            itemListElement: stats.map((s, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: { '@type': 'CollectionPage', name: nameOf(s.c), url: absUrl(categoryPath(s.c, lang)) },
            })),
        },
    };
    const faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
    };
    const crumbs = [
        { href: isAr ? '/ar' : '/', url: isAr ? '/ar' : '/', label: isAr ? 'الرئيسية' : 'Home' },
        { href: isAr ? '/ar/Funds' : '/Funds', url: isAr ? '/ar/Funds' : '/Funds', label: isAr ? 'صناديق الاستثمار' : 'Mutual Funds' },
        { label: isAr ? 'الفئات' : 'Categories' },
    ];
    const th = `px-4 py-3 ${isAr ? 'text-right' : 'text-left'}`;
    const thNum = `px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`;
    const tdNum = `px-4 py-2.5 tabular-nums ${isAr ? 'text-left' : 'text-right'}`;
    const tone = (v: number | null) => (v === null ? 'text-muted' : v >= 0 ? 'text-emerald-700' : 'text-red-600');
    const fundCell = (f: Row | null) =>
        f ? (
            <>
                <Link href={encodeURI(fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), lang))} prefetch={false} className="font-semibold text-main hover:text-starta-darkTeal">
                    {fundName(f, lang)}
                </Link>{' '}
                <span className="text-muted">({pctSigned(num(f, 'return_1y'))})</span>
            </>
        ) : (
            '—'
        );
    const siblings = isAr
        ? [
              { href: '/ar/Funds/providers', label: 'البنوك وشركات إدارة الأصول' },
              { href: '/ar/Funds/prices-today', label: 'أسعار الوثائق اليوم' },
              { href: '/ar/Funds/best-mutual-funds-egypt-2026', label: 'أفضل الصناديق حسب العائد' },
              { href: '/ar/Funds/fees', label: 'مقارنة الرسوم' },
              { href: '/ar/Funds/risk', label: 'جدول المخاطر' },
          ]
        : [
              { href: '/Funds/providers', label: 'Banks and asset managers' },
              { href: '/Funds/prices-today', label: 'Fund prices today' },
              { href: '/Funds/best-mutual-funds-egypt-2026', label: 'Best funds by return' },
              { href: '/Funds/fees', label: 'Fee comparison' },
              { href: '/Funds/risk', label: 'Risk league table' },
          ];

    return (
        <PublicPageShell lang={lang} altHref={isAr ? PATH_EN : PATH_AR} persistLang>
            <JsonLd data={collection} />
            <JsonLd data={faqLd} />
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <Breadcrumbs lang={lang} items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold tracking-tight text-main sm:text-3xl">{title}</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {isAr
                    ? `${categorised} صندوق استثمار مصري في ${stats.length} فئات. لكل فئة: عدد الصناديق، ووسيط عائد آخر 12 شهراً ومنذ بداية العام، وأفضل وأسوأ صندوق بعائد السنة، ووسيط رسوم الإدارة — كلها محسوبة آلياً من إفصاحات مديري الصناديق`
                    : `${categorised} Egyptian mutual funds in ${stats.length} categories. For each: the number of funds, the median trailing 12-month and year-to-date return, the best and worst fund by 1-year return, and the median management fee — all computed mechanically from manager disclosures`}
                {asOf.iso && (
                    <>
                        {' '}
                        {isAr ? '— البيانات كما في' : '— data as of'} <time dateTime={asOf.iso}>{asOf.human}</time>
                    </>
                )}
                . {isAr ? 'التصنيف يقرأ نوع كل صندوق كما أفصح عنه مديره.' : 'Classification reads each fund’s own disclosed type.'}
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[960px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted">
                            <th scope="col" className={th}>{isAr ? 'الفئة' : 'Category'}</th>
                            <th scope="col" className={thNum}>{isAr ? 'الصناديق' : 'Funds'}</th>
                            <th scope="col" className={thNum}>{isAr ? 'وسيط عائد سنة' : 'Median 1Y'}</th>
                            <th scope="col" className={thNum}>{isAr ? 'وسيط منذ بداية العام' : 'Median YTD'}</th>
                            <th scope="col" className={th}>{isAr ? 'أفضل صندوق (سنة)' : 'Best fund (1Y)'}</th>
                            <th scope="col" className={th}>{isAr ? 'أسوأ صندوق (سنة)' : 'Worst fund (1Y)'}</th>
                            <th scope="col" className={thNum}>{isAr ? 'وسيط رسوم الإدارة' : 'Median mgmt fee'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((s) => (
                            <tr key={s.c.key} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <th scope="row" className={`px-4 py-2.5 font-semibold ${isAr ? 'text-right' : 'text-left'}`}>
                                    <Link href={encodeURI(categoryPath(s.c, lang))} prefetch={false} className="text-main hover:text-starta-darkTeal">
                                        {nameOf(s.c)}
                                    </Link>
                                </th>
                                <td className={`${tdNum} font-bold text-main`}>{s.funds.length}</td>
                                <td className={`${tdNum} font-semibold ${tone(s.median1y)}`}>{pctSigned(s.median1y)}</td>
                                <td className={`${tdNum} ${tone(s.medianYtd)}`}>{pctSigned(s.medianYtd)}</td>
                                <td className={`px-4 py-2.5 text-xs ${isAr ? 'text-right' : 'text-left'}`}>{fundCell(s.best)}</td>
                                <td className={`px-4 py-2.5 text-xs ${isAr ? 'text-right' : 'text-left'}`}>{fundCell(s.worst)}</td>
                                <td className={`${tdNum} text-main`}>{pct(s.medianFee)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <section className="mt-10 max-w-3xl">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? 'ما الذي تحتفظ به كل فئة' : 'What each category holds'}
                </h2>
                <dl className="mt-4 space-y-4">
                    {stats.map((s) => (
                        <div key={s.c.key} className="rounded-2xl border border-border bg-surface p-4">
                            <dt className="font-bold text-main">
                                <Link href={encodeURI(categoryPath(s.c, lang))} prefetch={false} className="hover:text-starta-darkTeal">
                                    {nameOf(s.c)}
                                </Link>
                            </dt>
                            <dd className="mt-1.5 leading-relaxed text-muted">{isAr ? s.c.introAr : s.c.introEn}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="mt-10 max-w-3xl">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? 'كيف تقرأ هذا الجدول' : 'How to read this table'}
                </h2>
                <dl className="mt-4 space-y-4">
                    {faq.map((x) => (
                        <div key={x.q} className="rounded-2xl border border-border bg-surface p-4">
                            <dt className="font-bold text-main">{x.q}</dt>
                            <dd className="mt-1.5 leading-relaxed text-muted">{x.a}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-4 text-sm">
                    <Link href={isAr ? '/ar/methodology' : '/methodology'} prefetch={false} className="font-semibold text-starta-darkTeal hover:underline">
                        {isAr ? 'المنهجية: مصادر البيانات وطريقة حساب العوائد ←' : 'Methodology: data sources and how returns are computed →'}
                    </Link>
                </p>
            </section>

            <nav aria-label={isAr ? 'صفحات ذات صلة' : 'Related'} className="mt-10">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? 'المزيد عن صناديق الاستثمار' : 'More on Egyptian funds'}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                    {siblings.map((s) => (
                        <li key={s.href}>
                            <Link href={s.href} prefetch={false} className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-main transition-colors hover:border-starta-teal hover:text-starta-darkTeal">
                                {s.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            <p className="mt-10 text-xs leading-relaxed text-muted">
                {isAr
                    ? 'الأداء السابق لا يضمن النتائج المستقبلية. هذه الصفحة تصف الفئات وتلخّص بياناتها آلياً ولا تفاضل بينها؛ وهي ليست نصيحة استثمارية ولا عرضاً للاشتراك في أي صندوق.'
                    : 'Past performance does not guarantee future results. This page describes the categories and summarises their data mechanically; it does not rank one over another, and it is not investment advice or an offer to subscribe to any fund.'}
            </p>
        </PublicPageShell>
    );
}
