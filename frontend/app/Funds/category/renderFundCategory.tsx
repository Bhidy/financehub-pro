import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAllFundsRanked } from '@/lib/public-data';
import { SITE_URL, fundPath, absUrl, canonicalRedirectTarget } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import {
    FUND_CATEGORIES, MIN_FUNDS_TO_PUBLISH, categoryOfFund, categoryPath, findCategory,
    type FundCategory,
} from '@/content/fund-categories';
import { FundTable, fundsAsOf, num, str, fundDisplayName } from '@/components/seo/FundTable';

/**
 * FUND CATEGORY PAGES — /Funds/category/{key} and /ar/Funds/category/{arabic}.
 *
 * These serve the highest-intent uncovered queries in the Egyptian funds
 * market ("صناديق السيولة النقدية في مصر", "صناديق أسهم مصر", "صناديق
 * استثمار إسلامية"): the category IS the query, and before this the site had
 * no destination for any of them — the only funds pages were the whole-market
 * ranking and the per-fund profiles.
 *
 * Every page is data-gated: a category with fewer than MIN_FUNDS_TO_PUBLISH
 * funds 404s rather than publishing a thin or empty table, so the sitemap and
 * the 404 gate provably agree (the invariant the rest of this codebase holds).
 *
 * Rankings are mechanical (trailing 1-year return from published NAV history).
 * Nothing on these pages recommends a fund or scores suitability.
 */

type Lang = 'en' | 'ar';

/** Funds in a category, ranked. Shared by the page, its metadata and the gate. */
async function categoryFunds(cat: FundCategory) {
    const all = await getAllFundsRanked();
    return all.filter((f) => categoryOfFund(f)?.key === cat.key);
}

export async function fundCategoryMetadata(slug: string, lang: Lang): Promise<Metadata> {
    const cat = findCategory(slug);
    if (!cat) return { title: 'Not found', robots: { index: false, follow: false } };
    const canonicalEn = categoryPath(cat, 'en');
    const canonicalAr = categoryPath(cat, 'ar');
    const canonical = lang === 'ar' ? canonicalAr : canonicalEn;
    const funds = await categoryFunds(cat);
    const count = funds.length;
    // Counts are stated only when they are real — never a hardcoded number.
    const title = lang === 'ar' ? cat.titleAr : cat.titleEn;
    const description =
        count > 0
            ? lang === 'ar'
                ? `${count} من ${cat.nameAr} في مصر. ${cat.descriptionAr}`
                : `${count} ${cat.nameEn.toLowerCase()} in Egypt. ${cat.descriptionEn}`
            : lang === 'ar'
              ? cat.descriptionAr
              : cat.descriptionEn;
    return {
        title,
        description: description.slice(0, 300),
        alternates: {
            canonical: encodeURI(canonical),
            languages: {
                en: encodeURI(canonicalEn),
                ar: encodeURI(canonicalAr),
                'x-default': encodeURI(canonicalAr),
            },
        },
        openGraph: {
            type: 'article',
            title,
            description: description.slice(0, 200),
            url: encodeURI(canonical),
            locale: lang === 'ar' ? 'ar_EG' : 'en_US',
        },
    };
}

export async function renderFundCategory(slug: string, lang: Lang) {
    const cat = findCategory(slug);
    if (!cat) notFound();
    const isAr = lang === 'ar';

    // Canonicalise: an EN slug requested on the AR route (or a stale slug)
    // 308s to the canonical for the tree it was requested in.
    const requestPath = isAr ? `/ar/Funds/category/${slug}` : `/Funds/category/${slug}`;
    const canonicalPath = categoryPath(cat, lang);
    const redirectTarget = canonicalRedirectTarget(requestPath, canonicalPath);
    if (redirectTarget) redirect(redirectTarget);

    const funds = await categoryFunds(cat);
    // Data gate: never publish a category page that would be thin or empty —
    // a "0 funds" page is a soft 404 and a misleading financial display.
    if (funds.length < MIN_FUNDS_TO_PUBLISH) notFound();

    const withReturn = funds.filter((f) => num(f, 'return_1y') !== null);
    const { iso: asOfIso, human: asOfHuman } = fundsAsOf(funds, lang);
    const siblings = FUND_CATEGORIES.filter((c) => c.key !== cat.key);

    // ItemList carries every fund with its URL — the crawl path into all of
    // them — plus the numeric facts. Competing Egyptian fund sites publish
    // name-only lists, so machine-readable NAV/return data is uncontested.
    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: isAr ? cat.titleAr : cat.titleEn,
        numberOfItems: funds.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: funds.map((f, i) => {
            const nav = num(f, 'latest_nav');
            const item: Record<string, unknown> = {
                '@type': 'InvestmentFund',
                name: fundDisplayName(f, lang),
                url: absUrl(fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), lang)),
                category: isAr ? cat.nameAr : cat.nameEn,
            };
            const provider = str(f, 'manager_name_en') || str(f, 'issuer_en');
            if (provider) item.provider = { '@type': 'Organization', name: provider };
            // Numeric properties only when the value is real — schema must
            // never assert a NAV the page does not display.
            if (nav !== null) {
                item.currency = str(f, 'currency') || 'EGP';
                item.amount = { '@type': 'MonetaryAmount', currency: str(f, 'currency') || 'EGP', value: nav };
            }
            const fee = num(f, 'fee_management') ?? num(f, 'expense_ratio');
            if (fee !== null) item.annualPercentageRate = fee;
            return { '@type': 'ListItem', position: i + 1, item };
        }),
    };

    const faq = isAr
        ? [
              {
                  q: `ما هي ${cat.nameAr}؟`,
                  a: cat.introAr,
              },
              {
                  q: `كم عدد ${cat.nameAr} المتاحة في مصر؟`,
                  a: `يغطي هذا الموقع ${funds.length} من ${cat.nameAr}${asOfHuman ? ` وفقاً لأحدث صافي قيمة أصول منشور بتاريخ ${asOfHuman}` : ''}. القائمة تشمل الصناديق التي يتم نشر بياناتها من مديري الصناديق ويتم تحديثها مرتين يومياً.`,
              },
              {
                  q: 'هل العائد التاريخي المرتفع يعني أن الصندوق هو الخيار الأفضل؟',
                  a: 'لا. الأداء السابق لا يضمن النتائج المستقبلية، ويجب تقييم العوائد مقابل الرسوم ومستوى المخاطر وشروط الاسترداد وأهدافك الشخصية. هذه الصفحة معلوماتية وليست توصية استثمارية.',
              },
          ]
        : [
              { q: `What are ${cat.nameEn.toLowerCase()}?`, a: cat.introEn },
              {
                  q: `How many ${cat.nameEn.toLowerCase()} are available in Egypt?`,
                  a: `This site covers ${funds.length} ${cat.nameEn.toLowerCase()}${asOfHuman ? `, as of the latest published NAV on ${asOfHuman}` : ''}. The list includes every fund whose manager publishes NAV data, refreshed twice daily.`,
              },
              {
                  q: 'Does a high past return mean a fund is the best choice?',
                  a: 'No. Past performance does not guarantee future results, and returns should be weighed against fees, risk level, redemption terms and your own objectives. This page is information, not investment advice.',
              },
          ];

    const crumbs = isAr
        ? [{ href: '/ar', label: 'الرئيسية' }, { href: '/ar/Funds', label: 'صناديق الاستثمار' }, { label: cat.nameAr }]
        : [{ href: '/', label: 'Home' }, { href: '/Funds', label: 'Mutual Funds' }, { label: cat.nameEn }];

    return (
        <PublicPageShell lang={lang} altHref={encodeURI(categoryPath(cat, isAr ? 'en' : 'ar'))} persistLang>
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

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{isAr ? cat.nameAr : cat.nameEn}{isAr ? ' في مصر' : ' in Egypt'}</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">{isAr ? cat.introAr : cat.introEn}</p>
            <p className="mt-3 text-sm text-muted">
                {isAr
                    ? `${funds.length} صندوقاً في هذه الفئة${withReturn.length ? ` — منها ${withReturn.length} لديها عائد سنة كامل` : ''}.`
                    : `${funds.length} funds in this category${withReturn.length ? `, ${withReturn.length} of them with a full one-year return history` : ''}.`}
                {asOfIso && (
                    <>
                        {' '}
                        {isAr ? 'البيانات كما في' : 'Data as of'}{' '}
                        <time dateTime={asOfIso}>{asOfHuman}</time>.
                    </>
                )}
            </p>

            <section className="mt-8">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? `${cat.nameAr} مرتبة حسب عائد سنة` : `${cat.nameEn} ranked by 1-year return`}
                </h2>
                <FundTable funds={funds} lang={lang} showCategory={false} />
            </section>

            <section className="mt-10">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? 'أسئلة شائعة' : 'Frequently asked'}
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
                    {isAr ? 'فئات الصناديق الأخرى' : 'Other fund categories'}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                    {siblings.map((c) => (
                        <li key={c.key}>
                            <Link
                                href={encodeURI(categoryPath(c, lang))}
                                prefetch={false}
                                className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-main transition-colors hover:border-starta-teal hover:text-starta-teal"
                            >
                                {isAr ? c.nameAr : c.nameEn}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <Link
                            href={isAr ? '/ar/Funds/best-mutual-funds-egypt-2026' : '/Funds/best-mutual-funds-egypt-2026'}
                            prefetch={false}
                            className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-main transition-colors hover:border-starta-teal hover:text-starta-teal"
                        >
                            {isAr ? 'أفضل صناديق الاستثمار في مصر' : 'Best-performing funds in Egypt'}
                        </Link>
                    </li>
                </ul>
            </section>

            <p className="mt-10 text-xs leading-relaxed text-muted">
                {isAr
                    ? 'البيانات من الإفصاحات الرسمية لمديري الصناديق. الترتيب آلي بالكامل حسب العائد التاريخي ولا يمثل توصية أو مشورة استثمارية. الأداء السابق لا يضمن النتائج المستقبلية.'
                    : 'Data comes from official fund-manager disclosures. Ordering is entirely mechanical by trailing return and is not a recommendation or investment advice. Past performance does not guarantee future results.'}
            </p>
        </PublicPageShell>
    );
}
