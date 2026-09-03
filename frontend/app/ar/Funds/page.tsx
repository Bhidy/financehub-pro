import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllFundsRanked } from '@/lib/public-data';
import { SITE_URL, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { FUND_CATEGORIES, MIN_FUNDS_TO_PUBLISH, categoryOfFund, categoryPath } from '@/content/fund-categories';
import { FundTable, fundsAsOf, num, str } from '@/components/seo/FundTable';

/**
 * /ar/Funds — THE ARABIC FUNDS HUB.
 *
 * This URL previously 308'd to the English /Funds marketplace, so the site had
 * no Arabic funds page at all: the query this hub exists to serve
 * ("صناديق الاستثمار في مصر", "افضل صناديق الاستثمار في مصر") resolved to a
 * document that declared itself English, carried no hreflang, and contained
 * zero fund names in its HTML because the list is built client-side.
 * Competitors ranking above us serve exactly this page, in Arabic, server-side.
 *
 * The English /Funds marketplace is unchanged — it is the designed interactive
 * product and this page is its hreflang twin, not its replacement.
 *
 * force-dynamic: hub route, must not prerender at build (no DATABASE_URL);
 * the CDN TTL in next.config supplies the edge caching.
 */
export const dynamic = 'force-dynamic';

const PATH_AR = '/ar/Funds';
const PATH_EN = '/Funds';

export const metadata: Metadata = {
    title: 'صناديق الاستثمار في مصر — الأسعار والعوائد والرسوم',
    description:
        'كل صناديق الاستثمار في مصر في مكان واحد: صافي قيمة الأصول والعوائد التاريخية ورسوم الإدارة والحد الأدنى للاشتراك لكل صندوق، مصنّفة حسب الفئة ومحدثة مرتين يومياً من إفصاحات مديري الصناديق.',
    alternates: {
        canonical: PATH_AR,
        languages: { ar: PATH_AR, en: PATH_EN, 'x-default': PATH_AR },
    },
    openGraph: {
        type: 'website',
        title: 'صناديق الاستثمار في مصر — الأسعار والعوائد والرسوم | Starta Markets',
        description: 'صافي قيمة الأصول والعوائد والرسوم لكل صناديق الاستثمار المصرية، مصنّفة حسب الفئة.',
        url: PATH_AR,
        locale: 'ar_EG',
    },
};

export default async function ArabicFundsHub() {
    const funds = await getAllFundsRanked();
    const withReturn = funds.filter((f) => num(f, 'return_1y') !== null);
    const { iso: asOfIso, human: asOfHuman } = fundsAsOf(funds, 'ar');

    // Category counts drive the navigation cards AND the gate: a category is
    // only linked when its page will actually render (>= MIN_FUNDS_TO_PUBLISH),
    // so the hub can never link to a 404.
    const counts = new Map<string, number>();
    for (const f of funds) {
        const c = categoryOfFund(f);
        if (c) counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
    }
    const liveCategories = FUND_CATEGORIES.filter((c) => (counts.get(c.key) ?? 0) >= MIN_FUNDS_TO_PUBLISH);

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'صناديق الاستثمار في مصر',
        numberOfItems: funds.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: liveCategories.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.nameAr,
            url: absUrl(categoryPath(c, 'ar')),
        })),
    };

    const faq = [
        {
            q: 'كم عدد صناديق الاستثمار المتاحة في مصر؟',
            a: `يغطي هذا الموقع ${funds.length} صندوق استثمار مصري${asOfHuman ? ` وفقاً لأحدث صافي قيمة أصول منشور بتاريخ ${asOfHuman}` : ''}، موزعة على ${liveCategories.length} فئات: ${liveCategories.map((c) => c.nameAr).join('، ')}.`,
        },
        {
            q: 'ما الفرق بين صناديق أسواق النقد وصناديق الأسهم؟',
            a: 'صناديق أسواق النقد تستثمر في أدوات قصيرة الأجل مثل أذون الخزانة والودائع، وهي الأقل تقلباً. صناديق الأسهم تستثمر في الأسهم المقيدة بالبورصة المصرية وتتحرك قيمتها مع السوق، لذا تحمل تقلباً أعلى على المدى القصير. لكل فئة صفحة مستقلة بكل صناديقها وعوائدها.',
        },
        {
            q: 'من أين تأتي بيانات صافي قيمة الأصول والعوائد؟',
            a: 'من الإفصاحات الرسمية لمديري الصناديق، ويتم تحديثها مرتين يومياً. العوائد محسوبة من تاريخ صافي قيمة الأصول المنشور لكل صندوق. راجع سياسة التحرير لمعرفة منهجية البيانات.',
        },
    ];

    const crumbs = [{ href: '/ar', label: 'الرئيسية' }, { label: 'صناديق الاستثمار' }];

    return (
        <PublicPageShell lang="ar" altHref={PATH_EN} persistLang>
            <JsonLd data={itemList} />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: faq.map((x) => ({
                        '@type': 'Question',
                        name: x.q,
                        acceptedAnswer: { '@type': 'Answer', text: x.a },
                    })),
                }}
            />
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.href, label: c.label })), SITE_URL)} />
            <Breadcrumbs items={crumbs} />

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">صناديق الاستثمار في مصر</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {funds.length} صندوق استثمار مصري في مكان واحد — صافي قيمة الأصول والعوائد التاريخية ورسوم الإدارة
                ومدير كل صندوق، مأخوذة من الإفصاحات الرسمية لمديري الصناديق ومحدثة مرتين يومياً.
                {asOfIso && (
                    <>
                        {' '}
                        البيانات كما في <time dateTime={asOfIso}>{asOfHuman}</time>.
                    </>
                )}
            </p>

            <section className="mt-8">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    تصفح حسب الفئة
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {liveCategories.map((c) => (
                        <li key={c.key}>
                            <Link
                                href={encodeURI(categoryPath(c, 'ar'))}
                                prefetch={false}
                                className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-starta-teal"
                            >
                                <span className="block font-bold text-main">{c.nameAr}</span>
                                <span className="mt-1 block text-sm text-muted">{counts.get(c.key)} صندوق</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mt-10">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    كل الصناديق مرتبة حسب عائد سنة
                </h2>
                <p className="mt-2 text-sm text-muted">
                    الترتيب آلي بالكامل حسب عائد آخر ١٢ شهراً المحسوب من صافي قيمة الأصول المنشورة
                    {withReturn.length ? ` (${withReturn.length} صندوقاً لديها سجل عائد سنة كاملة)` : ''} — وهو ترتيب
                    معلوماتي وليس توصية.
                </p>
                <FundTable funds={funds} lang="ar" />
            </section>

            <section className="mt-10">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    أسئلة شائعة
                </h2>
                <dl className="mt-4 space-y-4">
                    {faq.map((x) => (
                        <div key={x.q} className="rounded-2xl border border-border bg-surface p-4">
                            <dt className="font-bold text-main">{x.q}</dt>
                            <dd className="mt-1.5 leading-relaxed text-muted">{x.a}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="mt-10">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    روابط ذات صلة
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                    {[
                        { href: '/ar/Funds/best-mutual-funds-egypt-2026', label: 'أفضل صناديق الاستثمار في مصر' },
                        { href: '/ar/Calculators', label: 'حاسبات الاستثمار' },
                        { href: '/ar/RiskAssessment', label: 'تقييم مستوى المخاطر' },
                        { href: '/ar/Learn/glossary', label: 'المصطلحات المالية' },
                        { href: '/ar/companies', label: 'شركات البورصة المصرية' },
                        { href: '/ar/markets/egx30', label: 'مؤشر EGX 30' },
                    ].map((l) => (
                        <li key={l.href}>
                            <Link
                                href={l.href}
                                prefetch={false}
                                className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-main transition-colors hover:border-starta-teal hover:text-starta-teal"
                            >
                                {l.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <p className="mt-10 text-xs leading-relaxed text-muted">
                البيانات من الإفصاحات الرسمية لمديري الصناديق. الترتيب آلي حسب العائد التاريخي ولا يمثل توصية أو مشورة
                استثمارية. الأداء السابق لا يضمن النتائج المستقبلية. {str(funds[0] ?? {}, 'currency') || 'EGP'} هي عملة
                التقييم ما لم يُذكر خلاف ذلك.
            </p>
        </PublicPageShell>
    );
}
