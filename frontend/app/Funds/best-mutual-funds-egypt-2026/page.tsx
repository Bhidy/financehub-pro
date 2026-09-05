import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFundsRanked } from '@/lib/public-data';
import { SITE_URL, fundPath, absUrl, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import FundsGuide from '@/components/seo/FundsGuide';

/**
 * /Funds/best-mutual-funds-egypt-2026 — the master plan's first editorial
 * "money page" (competitor research: this SERP has no strong content player).
 * STRICTLY data-driven: rankings are trailing-1Y-return orderings of the live
 * funds_view data with the methodology stated inline — no editorial opinion,
 * no recommendations. (Static segment, so it wins over app/Funds/[id].)
 */

// force-dynamic: non-dynamic hub route — must NOT prerender at build
// (no DATABASE_URL at build). Vercel still edge-caches via next.config
// s-maxage header; freshness comes from per-request render.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    // absolute: the layout template appends " | Starta Markets" and pushed
    // this to 74 chars — the ranked-by clause was the part that truncated.
    title: { absolute: 'Best Mutual Funds in Egypt 2026 — Ranked by 1-Year Return' },
    description:
        'Egyptian mutual funds ranked by trailing 1-year return, by category: money market, fixed income, equity and balanced. Live NAVs, fees and minimums — updated twice daily.',
    alternates: {
        canonical: '/Funds/best-mutual-funds-egypt-2026',
        languages: {
            en: '/Funds/best-mutual-funds-egypt-2026',
            ar: '/ar/Funds/best-mutual-funds-egypt-2026',
            'x-default': '/ar/Funds/best-mutual-funds-egypt-2026',
        },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'article',
        title: 'Best Mutual Funds in Egypt 2026 | Starta Markets',
        description: 'Ranked by trailing 1-year return with live NAVs, fees and minimums.',
        url: '/Funds/best-mutual-funds-egypt-2026',
    },
};

type FundRow = Record<string, unknown>;

const num = (r: FundRow, k: string): number | null => (typeof r[k] === 'number' && Number.isFinite(r[k] as number) ? (r[k] as number) : null);
const str = (r: FundRow, k: string): string | null => (typeof r[k] === 'string' && (r[k] as string).trim() ? (r[k] as string).trim() : null);
const fmtPct = (v: number | null): string => (v === null ? '—' : `${v.toFixed(2)}%`);
const fmtNav = (v: number | null): string => (v === null ? '—' : v.toLocaleString('en-EG', { maximumFractionDigits: 4 }));
const shortName = (f: FundRow): string => str(f, 'fund_name_en') || str(f, 'fund_name') || `Fund ${f.fund_id}`;
const vsHref = (a: FundRow, b: FundRow): string => {
    const ia = Number(a.fund_id);
    const ib = Number(b.fund_id);
    const [lo, hi] = ia < ib ? [ia, ib] : [ib, ia];
    return `/Funds/vs/${lo}-vs-${hi}`;
};
const pairsOf = (arr: FundRow[]): Array<[FundRow, FundRow]> => {
    const out: Array<[FundRow, FundRow]> = [];
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]);
    return out;
};

/** Category buckets by fund_type_en keywords (fall back to 'Other'). */
function categoryOf(r: FundRow): string {
    const t = `${str(r, 'fund_type_en') || ''} ${str(r, 'classification_en') || ''}`.toLowerCase();
    if (/money\s*market|liquidity|cash/.test(t)) return 'Money Market Funds';
    if (/fixed\s*income|bond|debt/.test(t)) return 'Fixed Income Funds';
    if (/equit|stock|share/.test(t)) return 'Equity Funds';
    if (/balanced|mixed|asset\s*alloc/.test(t)) return 'Balanced Funds';
    if (/shariah|islamic/.test(t)) return 'Shariah-Compliant Funds';
    return 'Other Funds';
}

const CATEGORY_ORDER = ['Money Market Funds', 'Fixed Income Funds', 'Equity Funds', 'Balanced Funds', 'Shariah-Compliant Funds', 'Other Funds'];
const CATEGORY_AR: Record<string, string> = {
    'Money Market Funds': 'صناديق أسواق النقد',
    'Fixed Income Funds': 'صناديق الدخل الثابت',
    'Equity Funds': 'صناديق الأسهم',
    'Balanced Funds': 'الصناديق المتوازنة',
    'Shariah-Compliant Funds': 'الصناديق المتوافقة مع الشريعة',
    'Other Funds': 'صناديق أخرى',
};

export default async function BestFundsPage() {
    const funds = await getAllFundsRanked();
    const withReturn = funds.filter((f) => num(f, 'return_1y') !== null);
    // A ranking page with (almost) nothing ranked is a misleading financial
    // display — 404 rather than publish an empty "best funds" table.
    if (withReturn.length < 3) notFound();
    // Compare as timestamps: pg returns Date objects here, and String(Date)
    // ("Wed May 14 2025...") compares alphabetically, not chronologically.
    const asOfMs = funds.reduce<number | null>((mx, f) => {
        const t = f.last_nav_date ? Date.parse(String(f.last_nav_date)) : NaN;
        return Number.isFinite(t) && (mx === null || t > mx) ? t : mx;
    }, null);
    const asOf = asOfMs !== null ? new Date(asOfMs).toISOString().slice(0, 10) : null;
    const asOfHuman = asOfMs !== null ? new Date(asOfMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

    const buckets = new Map<string, FundRow[]>();
    for (const f of withReturn) {
        const c = categoryOf(f);
        if (!buckets.has(c)) buckets.set(c, []);
        (buckets.get(c) as FundRow[]).push(f);
    }
    const sections = CATEGORY_ORDER
        .filter((c) => (buckets.get(c) || []).length >= 3)
        .map((c) => ({ name: c, funds: (buckets.get(c) as FundRow[]).slice(0, 5) }));

    const top10 = withReturn.slice(0, 10);

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Best-performing Egyptian mutual funds by trailing 1-year return',
        numberOfItems: top10.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: top10.map((f, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: str(f, 'fund_name_en') || str(f, 'fund_name') || `Fund ${f.fund_id}`,
            url: absUrl(fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'))),
        })),
    };

    const faq = [
        {
            q: 'How are these funds ranked?',
            a: `Purely by trailing 1-year return computed from each fund's published NAV history, grouped by category. No editorial judgment is applied — the tables re-rank automatically as NAVs update (twice daily). Data as of ${asOfHuman ?? 'the latest NAV publication'}.`,
        },
        {
            q: 'Does a high past return mean a fund is the best choice?',
            a: 'No. Past performance does not guarantee future results, and returns should be weighed against fees, risk level, liquidity terms and your own objectives. This page is information, not investment advice.',
        },
        {
            q: 'Where does the data come from?',
            a: 'Fund NAVs, returns and fees come from the fund managers’ official disclosures, refreshed twice daily on Starta Markets.',
        },
    ];

    return (
        <PublicPageShell altHref="/ar/Funds/best-mutual-funds-egypt-2026">
            <JsonLd data={itemList} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'Home' }, { url: '/Funds', label: 'Mutual Funds' }, { label: 'Best Funds in Egypt 2026' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/Funds', label: 'Mutual Funds' }, { label: 'Best Funds in Egypt 2026' }]} />

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Best-Performing Mutual Funds in Egypt (2026)</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {withReturn.length} Egyptian mutual funds ranked <strong>purely by trailing 1-year return</strong>, by
                category. NAVs and returns come from official fund-manager disclosures and refresh twice daily
                {asOfHuman && <> — data as of <time dateTime={asOf as string}>{asOfHuman}</time></>}. Rankings are
                mechanical, not recommendations.
            </p>
            <p className="mt-1 text-sm text-muted" dir="rtl" lang="ar">
                أفضل صناديق الاستثمار في مصر ٢٠٢٦ — ترتيب آلي حسب عائد آخر ١٢ شهرًا لكل فئة، ببيانات محدثة مرتين يوميًا من إفصاحات مديري الصناديق. الترتيب معلوماتي وليس توصية استثمارية.
            </p>

            <section className="mt-8">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    Top 10 overall by 1-year return
                </h2>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                    <table className="w-full min-w-[680px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Fund</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3 text-right">1Y Return</th>
                                <th className="px-4 py-3 text-right">YTD</th>
                                <th className="px-4 py-3 text-right">Latest NAV</th>
                            </tr>
                        </thead>
                        <tbody>
                            {top10.map((f, i) => {
                                const name = str(f, 'fund_name_en') || str(f, 'fund_name') || `Fund ${f.fund_id}`;
                                const r1y = num(f, 'return_1y');
                                return (
                                    <tr key={String(f.fund_id)} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                        <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                                        <td className="px-4 py-2.5">
                                            <Link href={fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'))} className="font-semibold text-main hover:text-starta-darkTeal">
                                                {name}
                                            </Link>
                                            {str(f, 'fund_name') && str(f, 'fund_name_en') && (
                                                <span className="block text-xs text-muted" dir="rtl" lang="ar">{str(f, 'fund_name')}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-muted">{categoryOf(f)}</td>
                                        <td className={`px-4 py-2.5 text-right font-bold ${r1y !== null && r1y >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtPct(r1y)}</td>
                                        <td className="px-4 py-2.5 text-right">{fmtPct(num(f, 'return_ytd'))}</td>
                                        <td className="px-4 py-2.5 text-right">{fmtNav(num(f, 'latest_nav'))} {str(f, 'currency') || 'EGP'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-sm text-muted">
                    Want a side-by-side view? Open the interactive{' '}
                    <Link href="/Funds/Compare" className="font-semibold text-starta-darkTeal hover:underline">fund comparison tool</Link>
                    {top10.length >= 2 && (
                        <>
                            {' '}or jump straight to a head-to-head:{' '}
                            <Link href={vsHref(top10[0], top10[1])} className="font-semibold text-starta-darkTeal hover:underline">
                                {shortName(top10[0])} vs {shortName(top10[1])}
                            </Link>
                        </>
                    )}.
                </p>
            </section>

            {sections.map((sec) => (
                <section key={sec.name} className="mt-10">
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                        <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                        {sec.name}
                        <span className="text-sm font-semibold text-muted" dir="rtl" lang="ar">{CATEGORY_AR[sec.name]}</span>
                    </h2>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                        <table className="w-full min-w-[680px] text-sm">
                            <thead>
                                <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                                    <th className="px-4 py-3">Fund</th>
                                    <th className="px-4 py-3 text-right">1Y</th>
                                    <th className="px-4 py-3 text-right">3Y</th>
                                    <th className="px-4 py-3 text-right">Mgmt Fee</th>
                                    <th className="px-4 py-3 text-right">Min. Subscription</th>
                                    <th className="px-4 py-3">Risk</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sec.funds.map((f) => {
                                    const name = str(f, 'fund_name_en') || str(f, 'fund_name') || `Fund ${f.fund_id}`;
                                    const fee = num(f, 'fee_management');
                                    const minSub = num(f, 'min_subscription');
                                    return (
                                        <tr key={String(f.fund_id)} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                            <td className="px-4 py-2.5">
                                                <Link href={fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'))} className="font-semibold text-main hover:text-starta-darkTeal">
                                                    {name}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{fmtPct(num(f, 'return_1y'))}</td>
                                            <td className="px-4 py-2.5 text-right">{fmtPct(num(f, 'return_3y'))}</td>
                                            <td className="px-4 py-2.5 text-right">{fee !== null ? `${fee.toFixed(2)}%` : '—'}</td>
                                            <td className="px-4 py-2.5 text-right">{minSub !== null ? minSub.toLocaleString('en-EG') : '—'}</td>
                                            <td className="px-4 py-2.5 text-muted">{str(f, 'risk_level_en') || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {sec.funds.length >= 2 && (
                        <p className="mt-3 text-sm text-muted">
                            Head-to-head:{' '}
                            {pairsOf(sec.funds.slice(0, 3)).map(([a, b], i) => (
                                <span key={vsHref(a, b)}>
                                    {i > 0 && <span aria-hidden> · </span>}
                                    <Link href={vsHref(a, b)} className="font-medium text-starta-darkTeal hover:underline">
                                        {shortName(a)} vs {shortName(b)}
                                    </Link>
                                </span>
                            ))}
                        </p>
                    )}
                </section>
            ))}

            <section className="mt-10 max-w-3xl">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    Methodology
                </h2>
                <p className="mt-3 leading-relaxed text-muted">
                    Funds are grouped by their disclosed type and classification, then ordered by trailing 1-year return
                    derived from published NAV history. Categories with fewer than three ranked funds are omitted. Fees,
                    minimums and risk levels come from the same manager disclosures shown on each fund&rsquo;s page. The
                    tables regenerate automatically as NAVs update — nothing on this page is hand-picked.
                </p>
                <p className="mt-3 text-sm text-muted">
                    Past performance does not guarantee future results. This page is informational and is not investment
                    advice or an offer of any security. Consider consulting a licensed financial advisor regulated by the
                    Egyptian Financial Regulatory Authority (FRA).
                </p>
            </section>

            <section className="mt-10">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    Frequently asked questions
                </h2>
                <dl className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                    {faq.map((f) => (
                        <div key={f.q} className="px-5 py-4">
                            <dt className="text-[15px] font-bold tracking-tight">{f.q}</dt>
                            <dd className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">{f.a}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-6 text-sm">
                    <Link href="/Funds" className="font-semibold text-starta-darkTeal hover:underline">Browse all Egyptian mutual funds →</Link>
                    {' · '}
                    <Link href="/Learn/glossary/nav" className="font-semibold text-starta-darkTeal hover:underline">What is NAV?</Link>
                </p>
            </section>
            <FundsGuide lang="en" extraFaq={faq} />
        </PublicPageShell>
    );
}
