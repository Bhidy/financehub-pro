import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFundsRanked } from '@/lib/public-data';
import { SITE_URL, absUrl, fundPath, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { FUND_CATEGORIES, MIN_FUNDS_TO_PUBLISH, categoryOfFund, categoryPath } from '@/content/fund-categories';
import { buildProviders, providerPath } from '@/content/fund-providers';
import { fundName, fundsAsOf } from '@/lib/funds-hub-render';
import { ltrNum } from '@/lib/bidi';

/**
 * /Funds/prices-today and /ar/Funds/أسعار-الوثائق-اليوم
 *
 * The single highest-intent fund query in this market is the PRICE one —
 * "أسعار وثائق صناديق الاستثمار اليوم". Competitive forensics found the one
 * page of its kind on the Egyptian web is the strongest asset the leading
 * competitor has (~3,800 words, 165 rows, fully server-rendered), and we had
 * nothing pointed at that intent at all.
 *
 * This is a PRICE TABLE first: every fund, its published unit price, and the
 * date that price is as of — sorted by name so a reader can find their own
 * fund, which is what someone typing this query is doing. Ranked views live on
 * the money page; this one answers "what is my fund worth today".
 *
 * Honesty: the as-of date is shown per row, not just once at the top, because
 * managers publish on different schedules and a single global timestamp would
 * imply every row is equally fresh. Funds flagged stale by the pipeline are
 * labelled rather than hidden.
 */

const num = (r: Record<string, unknown>, k: string): number | null =>
    typeof r[k] === 'number' && Number.isFinite(r[k] as number) ? (r[k] as number) : null;
const str = (r: Record<string, unknown>, k: string): string | null =>
    typeof r[k] === 'string' && (r[k] as string).trim() ? (r[k] as string).trim() : null;

const PATH_EN = '/Funds/prices-today';
// Latin path segment, per the URL contract: only CONTENT slugs (fund names,
// learn topics, sector names) are Arabic; structural segments stay Latin so
// middleware case-canonicalisation and the route contracts keep working. The
// Arabic targeting lives in the title, H1 and body.
const PATH_AR = '/ar/Funds/prices-today';

export async function pricesTodayMetadata(lang: 'en' | 'ar'): Promise<Metadata> {
    const isAr = lang === 'ar';
    const canonical = encodeURI(isAr ? PATH_AR : PATH_EN);
    const title = isAr
        ? 'أسعار وثائق صناديق الاستثمار اليوم في مصر'
        : 'Egyptian Mutual Fund Prices Today — Unit NAVs';
    const description = isAr
        ? 'سعر وثيقة كل صندوق استثمار مصري اليوم مع تاريخ آخر إفصاح، مرتبة أبجدياً — صناديق أسواق النقد والدخل الثابت والأسهم والذهب والصناديق المتوافقة مع الشريعة.'
        : 'Today’s published unit price for every Egyptian mutual fund with the date each price is as of — money market, fixed income, equity, gold, balanced and Shariah-compliant funds.';
    return {
        title,
        description,
        alternates: {
            canonical,
            languages: { en: PATH_EN, ar: encodeURI(PATH_AR), 'x-default': encodeURI(PATH_AR) },
        },
        openGraph: {
            ...OG_DEFAULTS,
            type: 'website',
            title: `${title} | Starta Markets`,
            description,
            url: canonical,
            locale: isAr ? 'ar_EG' : 'en_US',
        },
    };
}

export async function renderPricesToday(lang: 'en' | 'ar') {
    const isAr = lang === 'ar';
    let funds: Array<Record<string, unknown>> = [];
    try {
        funds = await getAllFundsRanked();
    } catch (error) {
        console.error('[prices-today] query failed:', (error as Error).message);
    }
    if (funds.length < 20) notFound();

    // Alphabetical by the displayed name: this page is a lookup, not a ranking.
    const rows = [...funds].sort((a, b) =>
        fundName(a, lang).localeCompare(fundName(b, lang), isAr ? 'ar-EG' : 'en')
    );
    const { iso: asOfIso, human: asOfHuman } = fundsAsOf(funds, lang);

    const priced = rows.filter((f) => num(f, 'latest_nav') !== null).length;
    const counts = new Map<string, number>();
    for (const f of funds) {
        const c = categoryOfFund(f);
        if (c) counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
    }
    const liveCategories = FUND_CATEGORIES.filter((c) => (counts.get(c.key) ?? 0) >= MIN_FUNDS_TO_PUBLISH);
    const providers = buildProviders(funds).slice(0, 12);

    const fmtNav = (v: number | null) =>
        v === null ? '—' : v.toLocaleString(isAr ? 'ar-EG' : 'en-EG', { maximumFractionDigits: 4 });
    const fmtPct = (v: number | null) => (v === null ? '—' : ltrNum(`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`));
    const dayOf = (v: unknown): { iso: string; human: string } => {
        const t = v ? Date.parse(String(v)) : NaN;
        if (!Number.isFinite(t)) return { iso: '', human: '—' };
        const d = new Date(t);
        return {
            iso: d.toISOString().slice(0, 10),
            human: d.toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' }),
        };
    };

    const title = isAr ? 'أسعار وثائق صناديق الاستثمار اليوم' : 'Egyptian mutual fund prices today';

    const faq = isAr
        ? [
              {
                  q: 'ما هو سعر وثيقة صندوق الاستثمار؟',
                  a: 'سعر الوثيقة هو صافي قيمة أصول الصندوق مقسومة على عدد الوثائق القائمة. وهو السعر الذي يُشترى ويُسترد به، ولا يتحدد بالعرض والطلب كسعر السهم بل يُحسب من قيمة ما يملكه الصندوق بعد خصم مصروفاته.',
              },
              {
                  q: 'كل كم يتم تحديث الأسعار؟',
                  a: 'يحدد كل صندوق دورية إعلان صافي قيمة أصوله — يومية أو أسبوعية أو غير ذلك — ولذلك يظهر تاريخ الإفصاح بجوار كل سعر في الجدول بدلاً من تاريخ واحد لكل الصفحة. نحدّث البيانات مرتين يومياً من إفصاحات مديري الصناديق.',
              },
              {
                  q: 'لماذا يختلف سعر الوثيقة بشكل كبير بين صندوق وآخر؟',
                  a: 'لأن سعر الوثيقة يعتمد على القيمة الاسمية عند التأسيس وعلى ما تراكم منذ ذلك الحين، لا على حجم الصندوق أو جودته. فصندوق سعر وثيقته 800 جنيه ليس «أغلى» من آخر سعره 20 جنيهاً — المقارنة المفيدة هي نسبة التغير وليست السعر المطلق.',
              },
          ]
        : [
              {
                  q: 'What is a mutual fund unit price?',
                  a: 'The unit price is the fund’s net asset value divided by the number of units in issue. It is the price at which units are bought and redeemed, and unlike a share price it is not set by supply and demand — it is computed from what the fund holds, after its expenses.',
              },
              {
                  q: 'How often are these prices updated?',
                  a: 'Each fund sets its own NAV publication schedule — daily, weekly or otherwise — which is why the table shows a date beside every price rather than one timestamp for the page. Data refreshes twice daily from manager disclosures.',
              },
              {
                  q: 'Why do unit prices differ so much between funds?',
                  a: 'A unit price reflects the par value set at launch and everything accumulated since, not the size or quality of the fund. A fund priced at EGP 800 is not "more expensive" than one at EGP 20 — the useful comparison is percentage change, not the absolute price.',
              },
          ];

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': absUrl(isAr ? PATH_AR : PATH_EN),
        name: title,
        inLanguage: isAr ? 'ar-EG' : 'en',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        ...(asOfIso ? { dateModified: asOfIso } : {}),
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: rows.length,
            itemListElement: rows.map((f, i) => {
                const nav = num(f, 'latest_nav');
                const item: Record<string, unknown> = {
                    '@type': 'InvestmentFund',
                    name: fundName(f, lang),
                    url: absUrl(fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), lang)),
                };
                if (nav !== null) {
                    const cur = str(f, 'currency') || 'EGP';
                    item.currency = cur;
                    item.amount = { '@type': 'MonetaryAmount', currency: cur, value: nav };
                }
                return { '@type': 'ListItem', position: i + 1, item };
            }),
        },
    };

    const crumbs = [
        { href: isAr ? '/ar' : '/', url: isAr ? '/ar' : '/', label: isAr ? 'الرئيسية' : 'Home' },
        { href: isAr ? '/ar/Funds' : '/Funds', url: isAr ? '/ar/Funds' : '/Funds', label: isAr ? 'صناديق الاستثمار' : 'Mutual Funds' },
        { label: title },
    ];

    const th = `px-4 py-3 ${isAr ? 'text-right' : 'text-left'}`;
    const thNum = `px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`;

    return (
        <PublicPageShell lang={lang} altHref={encodeURI(isAr ? PATH_EN : PATH_AR)} persistLang>
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
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <Breadcrumbs items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold tracking-tight text-main sm:text-3xl">
                {isAr ? 'أسعار وثائق صناديق الاستثمار اليوم' : 'Egyptian mutual fund prices today'}
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {isAr
                    ? `سعر الوثيقة لكل صندوق استثمار مصري مع تاريخ آخر إفصاح لكل صندوق على حدة، مرتبة أبجدياً حتى تجد صندوقك مباشرة. ${priced} من ${rows.length} صندوقاً لديها سعر منشور`
                    : `The published unit price for every Egyptian mutual fund, each with its own as-of date, sorted alphabetically so you can find your fund directly. ${priced} of ${rows.length} funds have a published price`}
                {asOfIso && (
                    <>
                        {' '}
                        {isAr ? '— وأحدث إفصاح في هذه القائمة بتاريخ' : '— the most recent disclosure in this list is'}{' '}
                        <time dateTime={asOfIso}>{asOfHuman}</time>.
                    </>
                )}
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted">
                            <th scope="col" className={th}>{isAr ? 'الصندوق' : 'Fund'}</th>
                            <th scope="col" className={th}>{isAr ? 'الفئة' : 'Category'}</th>
                            <th scope="col" className={thNum}>{isAr ? 'سعر الوثيقة' : 'Unit price'}</th>
                            <th scope="col" className={thNum}>{isAr ? 'كما في' : 'As of'}</th>
                            <th scope="col" className={thNum}>{isAr ? 'عائد سنة' : '1Y'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((f) => {
                            const cat = categoryOfFund(f);
                            const d = dayOf(f.last_nav_date);
                            const stale = f.is_stale === true;
                            const r1y = num(f, 'return_1y');
                            return (
                                <tr key={String(f.fund_id)} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                    <th scope="row" className={`px-4 py-2.5 font-semibold ${isAr ? 'text-right' : 'text-left'}`}>
                                        <Link
                                            href={encodeURI(fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), lang))}
                                            prefetch={false}
                                            className="text-main hover:text-starta-darkTeal"
                                        >
                                            {fundName(f, lang)}
                                        </Link>
                                    </th>
                                    <td className={`px-4 py-2.5 text-muted ${isAr ? 'text-right' : 'text-left'}`}>
                                        {cat ? (isAr ? cat.nameAr : cat.nameEn) : '—'}
                                    </td>
                                    <td className={`px-4 py-2.5 font-bold tabular-nums text-main ${isAr ? 'text-left' : 'text-right'}`}>
                                        {fmtNav(num(f, 'latest_nav'))}{' '}
                                        <span className="text-xs font-normal text-muted">{str(f, 'currency') || 'EGP'}</span>
                                    </td>
                                    <td className={`px-4 py-2.5 text-xs text-muted ${isAr ? 'text-left' : 'text-right'}`}>
                                        {d.iso ? <time dateTime={d.iso}>{d.human}</time> : '—'}
                                        {stale && (
                                            <span className="ms-1.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                                                {isAr ? 'غير محدث' : 'stale'}
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-4 py-2.5 font-semibold tabular-nums ${isAr ? 'text-left' : 'text-right'} ${r1y === null ? 'text-muted' : r1y >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {fmtPct(r1y)}
                                    </td>
                                </tr>
                            );
                        })}
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
            </section>

            <section className="mt-10">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? 'تصفح حسب الفئة أو البنك' : 'Browse by category or provider'}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                    {liveCategories.map((c) => (
                        <li key={c.key}>
                            <Link href={encodeURI(categoryPath(c, lang))} prefetch={false} className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-main transition-colors hover:border-starta-teal hover:text-starta-darkTeal">
                                {isAr ? c.nameAr : c.nameEn}
                            </Link>
                        </li>
                    ))}
                    {providers.map((p) => (
                        <li key={p.slug}>
                            <Link href={encodeURI(providerPath(p, lang))} prefetch={false} className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-main transition-colors hover:border-starta-teal hover:text-starta-darkTeal">
                                {isAr ? p.nameAr : p.nameEn}
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <p className="mt-10 text-xs leading-relaxed text-muted">
                {isAr
                    ? 'الأسعار كما ينشرها مديرو الصناديق، ويظهر تاريخ الإفصاح بجوار كل سعر. هذه الصفحة معلوماتية ولا تمثل عرضاً للاشتراك ولا توصية استثمارية.'
                    : 'Prices are as published by the fund managers, with the disclosure date shown beside each one. This page is informational; it is not an offer to subscribe and not investment advice.'}
            </p>
        </PublicPageShell>
    );
}
