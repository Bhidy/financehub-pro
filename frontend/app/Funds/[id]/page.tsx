import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAllFundsRanked, getFund, getFundPeers, type Fund } from '@/lib/public-data';
import { SITE_URL, fundPath, idFromParam, canonicalRedirectTarget, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * Server-rendered fund profile at /Funds/{fund_id}-{slug}.
 * Bare /Funds/{fund_id} (or a stale slug) 308s to the slugged canonical;
 * unknown ids are real 404s. /Funds/Compare is intercepted by a rewrite
 * before the filesystem, so non-numeric params here are simply 404s.
 *
 * Every field from funds_view may be null — blocks and rows are omitted
 * when data is missing rather than rendering placeholders (financial data:
 * a wrong or fabricated value is worse than no value).
 */

type Props = { params: Promise<{ id: string }> };

/** Trimmed non-empty string field, else null. */
function str(fund: Fund, key: string): string | null {
    const v = fund[key];
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
}

/** Finite number field (funds_view numerics are pre-coerced by getFund), else null. */
function num(fund: Fund, key: string): number | null {
    const v = fund[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/** Strict true only — never renders a badge off a truthy string like "false". */
function isTrue(fund: Fund, key: string): boolean {
    const v = fund[key];
    return v === true || v === 'true' || v === 't' || v === 1;
}

/**
 * Normalize a date-ish value (pg DATE comes back as a Date at local midnight,
 * timestamps/ISO come back as strings) to a plain YYYY-MM-DD, or null.
 * Extracting components directly avoids UTC off-by-one shifts.
 */
function isoDate(v: unknown): string | null {
    if (v instanceof Date) {
        if (Number.isNaN(v.getTime())) return null;
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    if (typeof v === 'string') {
        const m = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim());
        if (m) return m[1];
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    return null;
}

/** Human date ("2 July 2026") from a YYYY-MM-DD string, timezone-stable. */
function humanDate(iso: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

function fmtNav(v: number): string {
    return v.toLocaleString('en-EG', { maximumFractionDigits: 4 });
}

function fmtPct(v: number): string {
    return `${v.toFixed(2)}%`;
}

async function resolveFund(idParam: string): Promise<Fund> {
    const id = idFromParam(idParam);
    if (!id) notFound();
    const fund = await getFund(id);
    if (!fund) notFound();
    return fund;
}

/** Shared derivations for generateMetadata + the page body. */
function fundBasics(fund: Fund) {
    const nameEn = str(fund, 'fund_name_en');
    const nameAr = str(fund, 'fund_name');
    const name = nameEn || nameAr || `Fund ${fund.fund_id}`;
    const canonicalPath = fundPath(fund.fund_id, nameEn, nameAr);
    const nav = num(fund, 'latest_nav');
    const navDateIso = isoDate(fund['last_nav_date']);
    const manager = str(fund, 'manager_name_en') || str(fund, 'manager_name');
    return { nameEn, nameAr, name, canonicalPath, nav, navDateIso, manager };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id: idParam } = await params;
    const id = idFromParam(idParam);
    if (!id) return {};
    const fund = await getFund(id);
    if (!fund) return {};
    const { name, canonicalPath, nav, navDateIso, manager } = fundBasics(fund);
    const ytd = num(fund, 'return_ytd');

    const bits: string[] = [];
    if (nav !== null) bits.push(`latest NAV ${fmtNav(nav)} EGP${navDateIso ? ` (as of ${navDateIso})` : ''}`);
    if (ytd !== null) bits.push(`YTD return ${fmtPct(ytd)}`);
    if (manager) bits.push(`managed by ${manager}`);
    let description = bits.length
        ? `${name}: ${bits.join(', ')}. Full fees, performance and strategy.`
        : `${name} — NAV history, returns, fees and strategy on Starta Markets.`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    const title = `${name} — NAV, Returns & Fees`;
    return {
        title,
        description,
        alternates: { canonical: encodeURI(canonicalPath) },
        openGraph: {
            type: 'website',
            title,
            description,
            url: encodeURI(canonicalPath),
        },
    };
}

export default async function FundPage({ params }: Props) {
    const { id: idParam } = await params;
    const fund = await resolveFund(idParam);
    const { nameEn, nameAr, name, canonicalPath, nav, navDateIso, manager } = fundBasics(fund);

    // 308 any non-canonical form (bare id, stale/wrong slug) to the canonical.
    // Encoding-aware: params arrive percent-encoded (Arabic-named funds), and
    // the Location header must be encoded — raw unicode there 500s.
    const redirectTarget = canonicalRedirectTarget(`/Funds/${idParam}`, canonicalPath);
    if (redirectTarget) {
        permanentRedirect(redirectTarget);
    }

    const navHigh = num(fund, 'nav_52w_high');
    const navLow = num(fund, 'nav_52w_low');
    const currency = str(fund, 'currency');
    const fundTypeEn = str(fund, 'fund_type_en');
    const minSubscription = num(fund, 'min_subscription');
    const inceptionYear = isoDate(fund['inception_date'])?.slice(0, 4) ?? null;

    const returns = (
        [
            ['YTD', num(fund, 'return_ytd')],
            ['1 Month', num(fund, 'return_1m')],
            ['3 Months', num(fund, 'return_3m')],
            ['1 Year', num(fund, 'return_1y')],
            ['3 Years', num(fund, 'return_3y')],
            ['5 Years', num(fund, 'return_5y')],
        ] as Array<[string, number | null]>
    ).filter((r): r is [string, number] => r[1] !== null);

    const facts = (
        [
            ['Issuer', str(fund, 'issuer_en')],
            ['Manager', manager],
            ['Fund type', fundTypeEn],
            ['Classification', str(fund, 'classification_en')],
            ['Risk level', str(fund, 'risk_level_en')],
            ['Currency', currency],
            ['Inception year', inceptionYear],
            ['NAV frequency', str(fund, 'nav_frequency_en')],
            [
                'Minimum subscription',
                minSubscription !== null
                    ? `${minSubscription.toLocaleString('en-EG')}${currency ? ` ${currency}` : ''}`
                    : null,
            ],
            ['Benchmark', str(fund, 'benchmark_en')],
        ] as Array<[string, string | null]>
    ).filter((f): f is [string, string] => f[1] !== null);

    const fees = (
        [
            ['Management fee', num(fund, 'fee_management')],
            ['Subscription fee', num(fund, 'fee_subscription')],
            ['Redemption fee', num(fund, 'fee_redemption')],
            ['Expense ratio', num(fund, 'expense_ratio')],
        ] as Array<[string, number | null]>
    ).filter((f): f is [string, number] => f[1] !== null);

    const strategyEn = str(fund, 'investment_strategy_en');
    const objectiveEn = str(fund, 'objective_en');
    const strategyAr = str(fund, 'investment_strategy');
    const objectiveAr = str(fund, 'objective');

    let peers = (await getFundPeers(fund.fund_id))
        .map((p) => {
            const peerId = typeof p.peer_fund_id === 'number' ? p.peer_fund_id : Number(p.peer_fund_id);
            if (!Number.isInteger(peerId) || peerId <= 0 || peerId === fund.fund_id) return null;
            const en = typeof p.peer_fund_name_en === 'string' && p.peer_fund_name_en.trim() ? p.peer_fund_name_en.trim() : null;
            const ar = typeof p.peer_fund_name === 'string' && p.peer_fund_name.trim() ? p.peer_fund_name.trim() : null;
            if (!en && !ar) return null;
            return { id: peerId, label: en || ar!, href: fundPath(peerId, en, ar) };
        })
        .filter((p): p is { id: number; label: string; href: string } => p !== null);
    if (peers.length === 0) {
        // fund_peers is empty on production (2026-07-03 audit follow-up):
        // fall back to the best same-type funds so "Similar Funds" and its
        // head-to-head links never render as an empty section.
        const myType = str(fund, 'fund_type_en');
        peers = (await getAllFundsRanked())
            .filter((f) => Number(f.fund_id) !== fund.fund_id && (!myType || f.fund_type_en === myType))
            .slice(0, 4)
            .map((f) => {
                const id = Number(f.fund_id);
                const en = typeof f.fund_name_en === 'string' && f.fund_name_en.trim() ? f.fund_name_en.trim() : null;
                const ar = typeof f.fund_name === 'string' && f.fund_name.trim() ? f.fund_name.trim() : null;
                if (!Number.isInteger(id) || id <= 0 || (!en && !ar)) return null;
                return { id, label: en || ar!, href: fundPath(id, en, ar) };
            })
            .filter((p): p is { id: number; label: string; href: string } => p !== null);
    }

    // FAQ: visible text and JSON-LD are rendered from this one array so they
    // can never drift apart. Entries exist only where the data does.
    const faqs: Array<{ q: string; a: string }> = [];
    if (nav !== null && navDateIso) {
        faqs.push({
            q: `What is the latest NAV of ${name}?`,
            a: `The latest NAV of ${name} is ${fmtNav(nav)} EGP as of ${humanDate(navDateIso)}.`,
        });
    }
    if (manager) {
        faqs.push({ q: `Who manages ${name}?`, a: `${name} is managed by ${manager}.` });
    }
    if (fundTypeEn) {
        faqs.push({ q: `What type of fund is ${name}?`, a: `${name} is a ${fundTypeEn}.` });
    }
    if (minSubscription !== null) {
        faqs.push({
            q: 'What is the minimum investment?',
            a: `The minimum subscription for ${name} is ${minSubscription.toLocaleString('en-EG')}${currency ? ` ${currency}` : ''}.`,
        });
    }

    const fundJsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'InvestmentFund',
        name,
        ...(nameAr && nameAr !== name ? { alternateName: nameAr } : {}),
        url: absUrl(canonicalPath),
        ...(str(fund, 'issuer_en') ? { provider: { '@type': 'Organization', name: str(fund, 'issuer_en') } } : {}),
        ...(currency ? { currency } : {}),
    };

    return (
        <PublicPageShell>
            <JsonLd data={fundJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [{ url: '/', label: 'Home' }, { url: '/Funds', label: 'Mutual Funds' }, { label: name }],
                    SITE_URL
                )}
            />
            {faqs.length > 0 && (
                <JsonLd
                    data={{
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: faqs.map((f) => ({
                            '@type': 'Question',
                            name: f.q,
                            acceptedAnswer: { '@type': 'Answer', text: f.a },
                        })),
                    }}
                />
            )}
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/Funds', label: 'Mutual Funds' }, { label: name }]} />

            <article>
                <header>
                    <h1
                        className="text-2xl font-extrabold leading-snug text-main sm:text-3xl"
                        {...(!nameEn && nameAr ? { dir: 'rtl' as const, lang: 'ar' } : {})}
                    >
                        {name}
                    </h1>
                    {nameEn && nameAr && nameAr !== nameEn && (
                        <p dir="rtl" lang="ar" className="mt-1 text-lg font-semibold text-muted">
                            {nameAr}
                        </p>
                    )}
                </header>

                {nav !== null && (
                    <section className="mt-6 rounded-xl border border-border bg-surface p-5">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Net Asset Value</h2>
                        <p className="mt-1 text-3xl font-extrabold text-main">
                            {fmtNav(nav)} <span className="text-base font-semibold text-muted">EGP</span>
                        </p>
                        {navDateIso && (
                            <p className="mt-1 text-sm text-muted">
                                as of <time dateTime={navDateIso}>{humanDate(navDateIso)}</time>
                            </p>
                        )}
                        {(navHigh !== null || navLow !== null) && (
                            <p className="mt-2 text-sm text-muted">
                                {navLow !== null && (
                                    <>
                                        52-week low: <span className="font-semibold">{fmtNav(navLow)}</span>
                                    </>
                                )}
                                {navLow !== null && navHigh !== null && ' · '}
                                {navHigh !== null && (
                                    <>
                                        52-week high: <span className="font-semibold">{fmtNav(navHigh)}</span>
                                    </>
                                )}
                            </p>
                        )}
                        <p className="mt-3 border-t border-border/60 pt-2 text-xs text-muted">
                            Source: fund manager disclosures · Updated twice daily
                        </p>
                    </section>
                )}

                {returns.length > 0 && (
                    <section className="mt-8">
                        <h2 className="text-lg font-bold text-main">Performance</h2>
                        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                                        <th scope="col" className="px-4 py-2.5 font-semibold">Period</th>
                                        <th scope="col" className="px-4 py-2.5 font-semibold">Return</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {returns.map(([label, value]) => (
                                        <tr key={label} className="border-b border-border/60 last:border-b-0">
                                            <th scope="row" className="px-4 py-2.5 text-left font-medium text-main">
                                                {label}
                                            </th>
                                            <td
                                                className={`px-4 py-2.5 font-semibold tabular-nums ${
                                                    value < 0 ? 'text-red-600' : value > 0 ? 'text-emerald-600' : 'text-main'
                                                }`}
                                            >
                                                {fmtPct(value)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {(facts.length > 0 || isTrue(fund, 'is_shariah')) && (
                    <section className="mt-8">
                        <h2 className="text-lg font-bold text-main">Key Facts</h2>
                        <dl className="mt-3 grid gap-x-6 gap-y-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3">
                            {facts.map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
                                    <dd className="mt-0.5 text-sm font-medium text-main">{value}</dd>
                                </div>
                            ))}
                            {isTrue(fund, 'is_shariah') && (
                                <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Compliance</dt>
                                    <dd className="mt-0.5">
                                        <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                            Shariah-compliant
                                        </span>
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </section>
                )}

                {fees.length > 0 && (
                    <section className="mt-8">
                        <h2 className="text-lg font-bold text-main">Fees</h2>
                        <dl className="mt-3 grid gap-x-6 gap-y-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
                            {fees.map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
                                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-main">{fmtPct(value)}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}

                {(strategyEn || objectiveEn || strategyAr || objectiveAr) && (
                    <section className="mt-8">
                        <h2 className="text-lg font-bold text-main">Strategy &amp; Objective</h2>
                        {strategyEn && <p className="mt-3 leading-relaxed text-main">{strategyEn}</p>}
                        {objectiveEn && <p className="mt-3 leading-relaxed text-main">{objectiveEn}</p>}
                        {(strategyAr || objectiveAr) && (
                            <div dir="rtl" lang="ar" className="mt-4 rounded-xl border border-border bg-surface p-5 leading-relaxed text-main">
                                {strategyAr && <p>{strategyAr}</p>}
                                {objectiveAr && <p className={strategyAr ? 'mt-3' : ''}>{objectiveAr}</p>}
                            </div>
                        )}
                    </section>
                )}

                <section className="mt-10 border-t border-border pt-6">
                    <h2 className="text-lg font-bold text-main">Similar Funds</h2>
                    {peers.length > 0 && (
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                            {peers.map((p) => (
                                <li key={p.id} className="flex items-baseline gap-2">
                                    <Link href={p.href} className="text-sm font-medium text-main hover:text-starta-teal">
                                        {p.label}
                                    </Link>
                                    <Link
                                        href={`/Funds/vs/${Math.min(fund.fund_id, p.id)}-vs-${Math.max(fund.fund_id, p.id)}`}
                                        className="shrink-0 text-xs font-semibold text-starta-teal hover:underline"
                                    >
                                        Compare →
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="mt-4 text-sm">
                        <Link href="/Funds" className="font-semibold text-starta-teal hover:underline">
                            All Egyptian mutual funds →
                        </Link>
                    </p>
                </section>

                {faqs.length > 0 && (
                    <section className="mt-10 border-t border-border pt-6">
                        <h2 className="text-lg font-bold text-main">FAQ</h2>
                        <dl className="mt-3 space-y-5">
                            {faqs.map((f) => (
                                <div key={f.q}>
                                    <dt className="font-semibold text-main">{f.q}</dt>
                                    <dd className="mt-1 text-sm leading-relaxed text-main">{f.a}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}
            </article>
        </PublicPageShell>
    );
}
