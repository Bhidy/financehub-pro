import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFundsRanked } from '@/lib/public-data';
import { SITE_URL, absUrl, fundPath, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import {
    FUND_CATEGORIES,
    MIN_FUNDS_TO_PUBLISH,
    categoryOfFund,
    categoryPath,
    type FundCategory,
} from '@/content/fund-categories';
import { fundName } from '@/lib/funds-hub-render';
import { FEES, t, type Lang } from '@/content/fund-fees';
import { ltrNum } from '@/lib/bidi';
import { HOME_PATH } from '@/lib/lang';

/**
 * /Funds/fees and /ar/Funds/fees
 *
 * The one comparison nobody publishes for this market: what each Egyptian
 * mutual fund charges to manage your money.
 *
 * DATA HONESTY — the whole reason this page is narrow. Of the cost columns the
 * dataset carries, only fee_management is populated (~103 of ~200 funds).
 * fee_subscription has a value for 3 funds, fee_redemption for 6, and
 * expense_ratio / fee_administration / fee_custodian / fee_performance for
 * none. Rendering those as "0%" would assert that a real charge does not
 * exist, so they are excluded and the exclusion is stated on the page.
 *
 * COMPARABILITY — funds are grouped by category and each is shown against its
 * OWN category median. A single market-wide fee ranking would put money market
 * funds at the top and equity funds at the bottom and call that a result; it
 * is just a restatement of what the two types do.
 */

type Row = Record<string, unknown>;

const feeOf = (f: Row): number | null => {
    const v = f.fee_management;
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
};

const str = (f: Row, k: string): string | null =>
    typeof f[k] === 'string' && (f[k] as string).trim() ? (f[k] as string).trim() : null;

const managerOf = (f: Row, lang: Lang): string | null =>
    lang === 'ar'
        ? str(f, 'manager_name') || str(f, 'owner_name') || str(f, 'manager_name_en') || str(f, 'owner_name_en')
        : str(f, 'manager_name_en') || str(f, 'owner_name_en') || str(f, 'manager_name') || str(f, 'owner_name');

const pctFee = (n: number): string => ltrNum(`${n.toFixed(2)}%`);

/** Difference in percentage POINTS — a fee gap is not a percentage change. */
const vsMedian = (fee: number, median: number): string => {
    const d = fee - median;
    if (Math.abs(d) < 0.005) return '—';
    return ltrNum(`${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(2)} pp`);
};

function median(values: number[]): number {
    const v = [...values].sort((a, b) => a - b);
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const PATH_EN = '/Funds/fees';
// Latin structural segment, per the URL contract: only CONTENT slugs (fund
// names, category names) are Arabic. The Arabic targeting is in the title,
// H1 and body.
const PATH_AR = '/ar/Funds/fees';

type Group = { category: FundCategory | null; funds: Row[]; med: number | null };

/** Funds that publish a fee, grouped by category, largest category first. */
function buildGroups(funds: Row[]): { groups: Group[]; other: Row[]; withFee: Row[] } {
    const withFee = funds.filter((f) => feeOf(f) !== null);
    const byKey = new Map<string, Row[]>();
    const other: Row[] = [];

    for (const f of withFee) {
        const c = categoryOfFund(f as Parameters<typeof categoryOfFund>[0]);
        if (!c) { other.push(f); continue; }
        const list = byKey.get(c.key);
        if (list) list.push(f); else byKey.set(c.key, [f]);
    }

    const groups: Group[] = [];
    for (const c of FUND_CATEGORIES) {
        const list = byKey.get(c.key);
        if (!list) continue;
        // A "median" over one or two funds is not a median. Small categories
        // fall through to the ungrouped table rather than getting a headline
        // statistic that means nothing.
        if (list.length < MIN_FUNDS_TO_PUBLISH) { other.push(...list); continue; }
        list.sort((a, b) => (feeOf(a) as number) - (feeOf(b) as number));
        groups.push({ category: c, funds: list, med: median(list.map((f) => feeOf(f) as number)) });
    }
    groups.sort((a, b) => b.funds.length - a.funds.length);
    other.sort((a, b) => (feeOf(a) as number) - (feeOf(b) as number));
    return { groups, other, withFee };
}

export async function fundFeesMetadata(lang: Lang): Promise<Metadata> {
    const canonical = encodeURI(lang === 'ar' ? PATH_AR : PATH_EN);
    const title = t(FEES.title, lang);
    const description = t(FEES.description, lang);
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
            locale: lang === 'ar' ? 'ar_EG' : 'en_US',
        },
    };
}

export async function renderFundFees(lang: Lang) {
    const isAr = lang === 'ar';
    let funds: Row[] = [];
    try {
        funds = await getAllFundsRanked();
    } catch (error) {
        console.error('[fund-fees] query failed:', (error as Error).message);
    }

    const { groups, other, withFee } = buildGroups(funds);
    // Quality gate: without a real body of published fees this is not a
    // comparison page, and an almost-empty table is worse than no page.
    if (withFee.length < 20) notFound();

    const crumbs = [
        { href: HOME_PATH, url: HOME_PATH, label: isAr ? 'الرئيسية' : 'Home' },
        {
            href: isAr ? '/ar/Funds' : '/Funds',
            url: isAr ? '/ar/Funds' : '/Funds',
            label: isAr ? 'صناديق الاستثمار' : 'Mutual Funds',
        },
        { label: t(FEES.h1, lang) },
    ];

    const faq = FEES.faq(withFee.length);
    const C = FEES.cols;
    const headCls = `border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted ${isAr ? 'text-right' : 'text-left'}`;
    const numCls = `px-4 py-2.5 tabular-nums ${isAr ? 'text-left' : 'text-right'}`;

    const feeTable = (rows: Row[], med: number | null) => (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[600px] text-sm">
                <thead>
                    <tr className={headCls}>
                        <th scope="col" className="px-4 py-3">{t(C.fund, lang)}</th>
                        <th scope="col" className="px-4 py-3">{t(C.manager, lang)}</th>
                        <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>{t(C.fee, lang)}</th>
                        {med !== null && (
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>
                                {t(C.vsMedian, lang)}
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((f) => {
                        const fee = feeOf(f) as number;
                        const name = fundName(f, lang);
                        const href = encodeURI(
                            fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), lang)
                        );
                        const mgr = managerOf(f, lang);
                        return (
                            <tr key={String(f.fund_id)} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <th scope="row" className={`px-4 py-2.5 font-semibold ${isAr ? 'text-right' : 'text-left'}`}>
                                    <Link href={href} prefetch={false} className="text-starta-darkTeal hover:underline">
                                        {name}
                                    </Link>
                                </th>
                                <td className={`px-4 py-2.5 text-muted ${isAr ? 'text-right' : 'text-left'}`}>{mgr || '—'}</td>
                                <td className={`${numCls} font-bold text-main`}>{pctFee(fee)}</td>
                                {med !== null && (
                                    <td className={`${numCls} text-muted`}>{vsMedian(fee, med)}</td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <PublicPageShell lang={lang} altHref={encodeURI(isAr ? PATH_EN : PATH_AR)} persistLang>
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: faq.map((x) => ({
                        '@type': 'Question',
                        name: t(x.q, lang),
                        acceptedAnswer: { '@type': 'Answer', text: t(x.a, lang) },
                    })),
                }}
            />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'Dataset',
                    name: t(FEES.title, lang),
                    description: t(FEES.description, lang),
                    url: absUrl(isAr ? PATH_AR : PATH_EN),
                    creator: { '@type': 'Organization', name: 'Starta Markets', url: SITE_URL },
                    isAccessibleForFree: true,
                    variableMeasured: t(C.fee, lang),
                }}
            />
            <Breadcrumbs lang={lang} items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">{t(FEES.h1, lang)}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
                {t(FEES.intro(withFee.length, groups.length), lang)}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {groups.slice(0, 3).map((g) => (
                    <div key={g.category!.key} className="rounded-xl border border-border bg-surface p-4">
                        <div className="text-xs font-bold uppercase tracking-wide text-muted">
                            {isAr ? g.category!.nameAr : g.category!.nameEn}
                        </div>
                        <div className="mt-1.5 text-lg font-extrabold tabular-nums text-main">
                            {pctFee(g.med as number)}
                        </div>
                        <div className="text-xs text-muted">
                            {t(FEES.categoryMedian, lang)} · {t(FEES.fundsCounted(g.funds.length), lang)}
                        </div>
                    </div>
                ))}
            </div>

            {groups.map((g) => {
                const c = g.category as FundCategory;
                const lo = g.funds[0];
                const hi = g.funds[g.funds.length - 1];
                return (
                    <section key={c.key} className="mt-10">
                        <h2 className="text-lg font-extrabold tracking-tight text-main">
                            {isAr ? c.nameAr : c.nameEn}
                        </h2>
                        <p className="mt-1.5 text-sm text-muted">
                            {t(FEES.fundsCounted(g.funds.length), lang)} · {t(FEES.categoryMedian, lang)}{' '}
                            <span className="font-semibold tabular-nums text-main">{pctFee(g.med as number)}</span> ·{' '}
                            {t(FEES.lowest, lang)}{' '}
                            <span className="font-semibold tabular-nums text-main">{pctFee(feeOf(lo) as number)}</span> ·{' '}
                            {t(FEES.highest, lang)}{' '}
                            <span className="font-semibold tabular-nums text-main">{pctFee(feeOf(hi) as number)}</span>
                        </p>
                        {feeTable(g.funds, g.med)}
                        <p className="mt-2 text-xs">
                            <Link
                                href={encodeURI(categoryPath(c, lang))}
                                prefetch={false}
                                className="text-starta-darkTeal hover:underline"
                            >
                                {isAr ? `كل ${c.nameAr}` : `All ${c.nameEn}`}
                            </Link>
                        </p>
                    </section>
                );
            })}

            {other.length > 0 && (
                <section className="mt-10">
                    <h2 className="text-lg font-extrabold tracking-tight text-main">
                        {isAr ? 'صناديق أخرى' : 'Other funds'}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted">
                        {isAr
                            ? 'صناديق تفصح عن رسوم إدارة لكن فئتها أصغر من أن يكون لها وسيط ذو معنى.'
                            : 'Funds that publish a management fee but sit in a category too small for a meaningful median.'}
                    </p>
                    {feeTable(other, null)}
                </section>
            )}

            <p className="mt-6 text-xs text-muted">{t(FEES.coverageNote(withFee.length, funds.length), lang)}</p>

            <section className="mt-10 max-w-3xl space-y-4">
                <h2 className="text-lg font-extrabold tracking-tight text-main">{t(FEES.whatIsH2, lang)}</h2>
                <p className="text-sm leading-relaxed text-muted">{t(FEES.whatIs, lang)}</p>

                <h2 className="pt-2 text-lg font-extrabold tracking-tight text-main">{t(FEES.notIncludedH2, lang)}</h2>
                <p className="text-sm leading-relaxed text-muted">{t(FEES.notIncluded, lang)}</p>

                <h2 className="pt-2 text-lg font-extrabold tracking-tight text-main">{t(FEES.comparabilityH2, lang)}</h2>
                <p className="text-sm leading-relaxed text-muted">{t(FEES.comparability, lang)}</p>

                <h2 className="pt-2 text-lg font-extrabold tracking-tight text-main">{t(FEES.arithmeticH2, lang)}</h2>
                <p className="text-sm leading-relaxed text-muted">{t(FEES.arithmetic, lang)}</p>

                <h2 className="pt-2 text-lg font-extrabold tracking-tight text-main">{t(FEES.verifyH2, lang)}</h2>
                <p className="text-sm leading-relaxed text-muted">{t(FEES.verify, lang)}</p>
            </section>

            <section className="mt-10">
                <h2 className="text-lg font-extrabold tracking-tight text-main">
                    {isAr ? 'أسئلة شائعة' : 'Frequently asked'}
                </h2>
                <dl className="mt-3 space-y-3">
                    {faq.map((x) => (
                        <div key={t(x.q, lang)} className="rounded-xl border border-border bg-surface p-4">
                            <dt className="font-bold text-main">{t(x.q, lang)}</dt>
                            <dd className="mt-1.5 text-sm leading-relaxed text-muted">{t(x.a, lang)}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <p className="mt-6 rounded-xl border border-border bg-panel/40 p-4 text-xs leading-relaxed text-muted">
                {t(FEES.disclaimer, lang)}
            </p>

            <nav aria-label={isAr ? 'روابط ذات صلة' : 'Related'} className="mt-8 border-t border-border pt-5">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                    <li>
                        <Link href={isAr ? '/ar/Funds' : '/Funds'} prefetch={false} className="text-starta-darkTeal hover:underline">
                            {isAr ? 'كل صناديق الاستثمار' : 'All mutual funds'}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={isAr ? '/ar/Funds/prices-today' : '/Funds/prices-today'}
                            prefetch={false}
                            className="text-starta-darkTeal hover:underline"
                        >
                            {isAr ? 'أسعار الوثائق اليوم' : 'Fund prices today'}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={isAr ? '/ar/Funds/best-mutual-funds-egypt-2026' : '/Funds/best-mutual-funds-egypt-2026'}
                            prefetch={false}
                            className="text-starta-darkTeal hover:underline"
                        >
                            {isAr ? 'أفضل صناديق الاستثمار' : 'Best performing funds'}
                        </Link>
                    </li>
                </ul>
            </nav>
        </PublicPageShell>
    );
}
