import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFundsRanked } from '@/lib/public-data';
import { SITE_URL, absUrl, fundPath, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { buildProviders, fundBelongsToProvider, providerPath, MIN_FUNDS_PER_PROVIDER, type FundProvider } from '@/content/fund-providers';
import { categoryOfFund } from '@/content/fund-categories';
import { fundName, fundsAsOf } from '@/lib/funds-hub-render';
import { num, str, median, pctSigned, pct, type Row } from '@/lib/fund-stats';
import { HOME_PATH } from '@/lib/lang';

/**
 * /Funds/providers and /ar/Funds/providers — THE PROVIDER LEAGUE TABLE.
 *
 * Every bank and asset manager that offers or runs Egyptian mutual funds, on
 * one page: how many funds, which categories, the median trailing 1-year
 * return across its funds, its best-performing fund and its lowest management
 * fee. The 70 per-provider hubs existed; the node above them did not — a
 * reader (or a crawler) could reach "Banque Misr funds" only through a strip
 * of 24 chips on the marketplace. This is the index of that cluster and the
 * one dataset of its kind for this market: the nearest competitor's managers
 * page renders 94 words.
 *
 * Mechanical throughout: providers are the ones the fund data names, the
 * ordering is by fund count, and every statistic is a median/min/max over the
 * provider's own funds. Nothing ranks a provider as better.
 */

const PATH_EN = '/Funds/providers';
const PATH_AR = '/ar/Funds/providers';
/** A median over fewer funds than this is one fund wearing a statistic. */
const MIN_FOR_MEDIAN = 3;

type ProviderStats = {
    p: FundProvider;
    funds: Row[];
    categories: string[];
    median1y: number | null;
    best: Row | null;
    minFee: number | null;
};

export function providersMetadata(lang: 'en' | 'ar'): Metadata {
    const isAr = lang === 'ar';
    const canonical = isAr ? PATH_AR : PATH_EN;
    const title = isAr
        ? 'مديرو صناديق الاستثمار في مصر — جدول الترتيب'
        : 'Egyptian Fund Providers — League Table';
    const description = isAr
        ? 'كل بنك وشركة إدارة أصول تقدّم صناديق استثمار في مصر: عدد الصناديق، والفئات، ووسيط عائد سنة، وأفضل صندوق، وأقل رسوم إدارة — من الإفصاحات الرسمية.'
        : 'Every bank and asset manager offering Egyptian mutual funds: fund count, categories, median 1-year return, best fund and lowest fee — from disclosures.';
    return {
        title,
        description,
        alternates: { canonical, languages: { en: PATH_EN, ar: PATH_AR, 'x-default': PATH_AR } },
        openGraph: { ...OG_DEFAULTS, type: 'website', title: `${title} | Starta Markets`, description, url: canonical, locale: isAr ? 'ar_EG' : 'en_US' },
    };
}

export async function renderProvidersIndex(lang: 'en' | 'ar') {
    const isAr = lang === 'ar';
    let funds: Row[] = [];
    try {
        funds = await getAllFundsRanked();
    } catch (error) {
        console.error('[providers-index] query failed:', (error as Error).message);
    }
    const providers = buildProviders(funds);
    if (providers.length < 3) notFound();

    const stats: ProviderStats[] = providers.map((p) => {
        const pf = funds.filter((f) => fundBelongsToProvider(f, p));
        const returns = pf.map((f) => num(f, 'return_1y'));
        const withReturn = returns.filter((v): v is number => v !== null);
        const best = pf.filter((f) => num(f, 'return_1y') !== null).sort((a, b) => (num(b, 'return_1y') as number) - (num(a, 'return_1y') as number))[0] ?? null;
        const fees = pf.map((f) => num(f, 'fee_management')).filter((v): v is number => v !== null);
        const cats = [...new Set(pf.map((f) => categoryOfFund(f)).filter(Boolean).map((c) => (isAr ? c!.nameAr : c!.nameEn)))];
        return {
            p,
            funds: pf,
            categories: cats,
            median1y: withReturn.length >= MIN_FOR_MEDIAN ? median(withReturn) : null,
            best,
            minFee: fees.length ? Math.min(...fees) : null,
        };
    });
    const covered = new Set(stats.flatMap((s) => s.funds.map((f) => String(f.fund_id)))).size;
    const asOf = fundsAsOf(funds, lang);
    const owners = stats.filter((s) => s.p.role === 'owner').length;

    const title = isAr ? 'البنوك وشركات إدارة الأصول التي تقدّم صناديق استثمار في مصر' : 'Fund providers in Egypt: banks and asset managers';
    const roleLabel = (r: FundProvider['role']) => (isAr ? (r === 'owner' ? 'جهة مُصدِرة' : 'مدير استثمار') : r === 'owner' ? 'Sponsor' : 'Asset manager');

    const faq = isAr
        ? [
              { q: 'ما الفرق بين الجهة المُصدِرة ومدير الاستثمار؟', a: 'الجهة المُصدِرة (غالباً بنك) هي التي تطرح الصندوق وتبيع وثائقه وتستردّها، بينما مدير الاستثمار هو الشركة المرخّصة التي تتخذ قرارات الشراء والبيع داخل الصندوق. قد تكون المؤسسة نفسها هي الاثنين، وفي هذه الحالة تُحسب مرة واحدة.' },
              { q: 'كيف يُحسب وسيط عائد سنة؟', a: `هو القيمة الوسطى لعوائد الاثني عشر شهراً الماضية لصناديق المؤسسة التي يتوافر لها عائد، ولا يُعرض إلا عندما يتوافر العائد لثلاثة صناديق على الأقل. الوسيط لا المتوسط، حتى لا يجرّه صندوق واحد شاذ.` },
              { q: 'لماذا لا تظهر كل البنوك؟', a: `تظهر المؤسسة عندما تُسمّى في بيانات ${MIN_FUNDS_PER_PROVIDER} صناديق على الأقل؛ وما دون ذلك يظهر على صفحة الصندوق نفسه دون صفحة مستقلة.` },
          ]
        : [
              { q: 'What is the difference between a sponsor and an asset manager?', a: 'The sponsor (usually a bank) launches the fund and sells and redeems its units; the asset manager is the licensed firm that makes the buy and sell decisions inside it. One institution can be both, in which case it is counted once.' },
              { q: 'How is the median 1-year return computed?', a: `It is the middle value of the trailing 12-month returns of the institution's funds that have one, shown only when at least ${MIN_FOR_MEDIAN} funds have a return. A median, not a mean, so one outlier fund cannot drag it.` },
              { q: 'Why is a bank missing?', a: `An institution is listed when the fund data names it on at least ${MIN_FUNDS_PER_PROVIDER} funds; below that its funds appear on their own pages without a provider page.` },
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
            itemListOrder: 'https://schema.org/ItemListOrderDescending',
            itemListElement: stats.map((s, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: { '@type': 'Organization', name: isAr ? s.p.nameAr : s.p.nameEn, url: absUrl(providerPath(s.p, lang)) },
            })),
        },
    };
    const faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
    };
    const crumbs = [
        { href: HOME_PATH, url: HOME_PATH, label: isAr ? 'الرئيسية' : 'Home' },
        { href: isAr ? '/ar/Funds' : '/Funds', url: isAr ? '/ar/Funds' : '/Funds', label: isAr ? 'صناديق الاستثمار' : 'Mutual Funds' },
        { label: isAr ? 'مقدمو الصناديق' : 'Providers' },
    ];
    const th = `px-4 py-3 ${isAr ? 'text-right' : 'text-left'}`;
    const thNum = `px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`;
    const tdNum = `px-4 py-2.5 tabular-nums ${isAr ? 'text-left' : 'text-right'}`;
    const siblings = isAr
        ? [
              { href: '/ar/Funds/categories', label: 'فئات الصناديق مقارنةً' },
              { href: '/ar/Funds/prices-today', label: 'أسعار الوثائق اليوم' },
              { href: '/ar/Funds/best-mutual-funds-egypt-2026', label: 'أفضل الصناديق حسب العائد' },
              { href: '/ar/Funds/fees', label: 'مقارنة الرسوم' },
              { href: '/ar/Funds/risk', label: 'جدول المخاطر' },
          ]
        : [
              { href: '/Funds/categories', label: 'Fund categories compared' },
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
                    ? `${stats.length} مؤسسة — منها ${owners} جهة مُصدِرة — تقدّم أو تدير ${covered} صندوق استثمار مصري. الترتيب آلي حسب عدد الصناديق، وكل رقم هو وسيط أو حد أدنى أو أقصى محسوب على صناديق المؤسسة نفسها من إفصاحات مديري الصناديق`
                    : `${stats.length} institutions — ${owners} of them sponsors — offer or manage ${covered} Egyptian mutual funds. Ordering is mechanical by fund count, and every figure is a median, minimum or maximum computed over the institution's own funds from manager disclosures`}
                {asOf.iso && (
                    <>
                        {' '}
                        {isAr ? '— البيانات كما في' : '— data as of'} <time dateTime={asOf.iso}>{asOf.human}</time>
                    </>
                )}
                . {isAr ? 'هذه الصفحة معلوماتية وليست توصية.' : 'This page is informational, not a recommendation.'}
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[880px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted">
                            <th scope="col" className={th}>{isAr ? 'المؤسسة' : 'Provider'}</th>
                            <th scope="col" className={th}>{isAr ? 'الدور' : 'Role'}</th>
                            <th scope="col" className={thNum}>{isAr ? 'الصناديق' : 'Funds'}</th>
                            <th scope="col" className={th}>{isAr ? 'الفئات' : 'Categories'}</th>
                            <th scope="col" className={thNum}>{isAr ? 'وسيط عائد سنة' : 'Median 1Y'}</th>
                            <th scope="col" className={th}>{isAr ? 'أفضل صندوق (عائد سنة)' : 'Best fund (1Y)'}</th>
                            <th scope="col" className={thNum}>{isAr ? 'أقل رسوم إدارة' : 'Lowest mgmt fee'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((s) => (
                            <tr key={s.p.slug} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <th scope="row" className={`px-4 py-2.5 font-semibold ${isAr ? 'text-right' : 'text-left'}`}>
                                    <Link href={encodeURI(providerPath(s.p, lang))} prefetch={false} className="text-main hover:text-starta-darkTeal">
                                        {isAr ? s.p.nameAr : s.p.nameEn}
                                    </Link>
                                </th>
                                <td className={`px-4 py-2.5 text-muted ${isAr ? 'text-right' : 'text-left'}`}>{roleLabel(s.p.role)}</td>
                                <td className={`${tdNum} font-bold text-main`}>{s.funds.length}</td>
                                <td className={`px-4 py-2.5 text-xs text-muted ${isAr ? 'text-right' : 'text-left'}`}>{s.categories.length ? s.categories.join(isAr ? '، ' : ', ') : '—'}</td>
                                <td className={`${tdNum} font-semibold ${s.median1y === null ? 'text-muted' : s.median1y >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{pctSigned(s.median1y)}</td>
                                <td className={`px-4 py-2.5 text-xs ${isAr ? 'text-right' : 'text-left'}`}>
                                    {s.best ? (
                                        <>
                                            <Link href={encodeURI(fundPath(s.best.fund_id as number, str(s.best, 'fund_name_en'), str(s.best, 'fund_name'), lang))} prefetch={false} className="font-semibold text-main hover:text-starta-darkTeal">
                                                {fundName(s.best, lang)}
                                            </Link>{' '}
                                            <span className="text-muted">({pctSigned(num(s.best, 'return_1y'))})</span>
                                        </>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td className={`${tdNum} text-main`}>{pct(s.minFee)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
                    ? 'الأداء السابق لا يضمن النتائج المستقبلية. الترتيب حسب عدد الصناديق آلي ولا يعني تفضيل مؤسسة على أخرى، وهذه الصفحة ليست عرضاً للاشتراك ولا نصيحة استثمارية.'
                    : 'Past performance does not guarantee future results. Ordering by fund count is mechanical and implies no preference for one institution over another; this page is not an offer to subscribe and not investment advice.'}
            </p>
        </PublicPageShell>
    );
}
