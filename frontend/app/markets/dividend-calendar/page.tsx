import type { Metadata } from 'next';
import Link from 'next/link';
import { getDividendCalendar } from '@/lib/public-data';
import { SITE_URL, symbolPath, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /markets/dividend-calendar — market-wide EGX dividend calendar: announced
 * upcoming payouts (egx_dividends) plus payments from the last 90 days
 * (dividend_history). Server-rendered, force-dynamic so crawls always see the
 * current calendar.
 *
 * Date semantics (do not mix up — same split as /symbol/{SYM}/dividends):
 *   - upcoming (egx_dividends) ex/payment dates are UNIX SECONDS → new Date(n*1000)
 *   - recent (dividend_history) dates are ISO strings / pg Dates → isoDate()
 */

// force-dynamic: non-dynamic hub route — must NOT prerender at build
// (no DATABASE_URL at build). Vercel still edge-caches via next.config
// s-maxage header; freshness comes from per-request render.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'EGX Dividend Calendar — Ex-Dates & Payouts',
    description:
        'Upcoming and recent dividends on the Egyptian Exchange: ex-dividend dates, per-share amounts and payment dates for EGX companies. Updated with market data.',
    alternates: { canonical: '/markets/dividend-calendar', languages: { en: '/markets/dividend-calendar', ar: '/ar/markets/dividend-calendar', 'x-default': '/ar/markets/dividend-calendar' } },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'EGX Dividend Calendar — Ex-Dates & Payouts | Starta Markets',
        description:
            'Upcoming and recent dividends on the Egyptian Exchange: ex-dividend dates, per-share amounts and payment dates for EGX companies.',
        url: '/markets/dividend-calendar',
    },
};

type Row = Record<string, unknown>;

/** Trimmed non-empty string field, else null. */
function str(row: Row, key: string): string | null {
    const v = row[key];
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
}

/** Finite number field, else null (rows arrive as Record<string, unknown>). */
function num(row: Row, key: string): number | null {
    const v = row[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/** UNIX-SECONDS field (egx_dividends) → YYYY-MM-DD, or null. */
function unixDate(row: Row, key: string): string | null {
    const n = num(row, key);
    if (n === null || n <= 0) return null;
    const d = new Date(n * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Normalize a date-ish value (pg DATE → Date at local midnight, timestamps/ISO
 * → strings) to plain YYYY-MM-DD, or null. Component extraction avoids UTC
 * off-by-one shifts on local-midnight Dates.
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

/** Per-share amount, 2–4dp, null → '—' (never 'null'/'NaN'/0-for-null). */
function fmtAmount(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return '—';
    return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

type CalendarRow = {
    key: string;
    symbol: string;
    nameEn: string | null;
    nameAr: string | null;
    exDate: string | null;
    amount: number | null;
    currency: string | null;
    payDate: string | null;
};

function CalendarTable({ rows, emptyText }: { rows: CalendarRow[]; emptyText: string }) {
    if (rows.length === 0) {
        return <p className="mt-3 text-sm text-muted">{emptyText}</p>;
    }
    return (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[560px] text-sm">
                <thead>
                    <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                        <th className="px-4 py-3">Ex-date</th>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3 text-right">Amount / share</th>
                        <th className="px-4 py-3">Payment date</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.key} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                            <td className="px-4 py-2.5 font-semibold text-main">{r.exDate ?? '—'}</td>
                            <td className="px-4 py-2.5">
                                <Link href={symbolPath(r.symbol)} className="font-semibold text-main hover:text-starta-darkTeal">
                                    {r.nameEn || r.symbol}
                                </Link>
                                {r.nameAr && (
                                    <span className="block text-xs text-muted" dir="rtl" lang="ar">{r.nameAr}</span>
                                )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-main">
                                {fmtAmount(r.amount)}
                                {r.amount !== null && r.currency ? ` ${r.currency}` : ''}
                            </td>
                            <td className="px-4 py-2.5 text-muted">{r.payDate ?? '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// FAQ: visible text and JSON-LD render from this one array so they can never
// drift apart (same discipline as the fund pages).
const FAQS: Array<{ q: string; a: string }> = [
    {
        q: 'What is an ex-dividend date?',
        a: 'The ex-dividend date is the first trading day on which a stock trades without the right to the announced dividend. To receive the payout you must own the shares before the ex-date; buyers on or after it are not entitled to that dividend.',
    },
    {
        q: 'How often do EGX companies pay dividends?',
        a: 'Most companies listed on the Egyptian Exchange pay dividends once a year, after the fiscal-year results are approved at the general assembly. Some companies also make semi-annual or interim distributions, so frequency varies by company.',
    },
    {
        q: 'Where do these dividend amounts come from?',
        a: 'The amounts, ex-dates and payment dates on this page come from Egyptian Exchange corporate-action disclosures, sourced via EGX and TradingView data feeds, and they refresh together with our market data.',
    },
];

export default async function DividendCalendarPage() {
    const { upcoming, recent } = await getDividendCalendar();

    const upcomingRows: CalendarRow[] = upcoming
        .map((r, i): CalendarRow | null => {
            const symbol = str(r, 'symbol')?.toUpperCase() ?? null;
            if (!symbol) return null;
            return {
                key: `${symbol}-${i}`,
                symbol,
                nameEn: str(r, 'name_en'),
                nameAr: str(r, 'name_ar'),
                exDate: unixDate(r, 'ex_date_upcoming'),
                amount: num(r, 'amount_upcoming'),
                currency: str(r, 'currency'),
                payDate: unixDate(r, 'payment_date_upcoming'),
            };
        })
        .filter((r): r is CalendarRow => r !== null);

    const recentRows: CalendarRow[] = recent
        .map((r, i): CalendarRow | null => {
            const symbol = str(r, 'symbol')?.toUpperCase() ?? null;
            if (!symbol) return null;
            return {
                key: `${symbol}-${isoDate(r['ex_date']) ?? 'row'}-${i}`,
                symbol,
                nameEn: str(r, 'name_en'),
                nameAr: str(r, 'name_ar'),
                exDate: isoDate(r['ex_date']),
                amount: num(r, 'dividend_amount'),
                currency: str(r, 'div_currency'),
                payDate: isoDate(r['pay_date']),
            };
        })
        .filter((r): r is CalendarRow => r !== null);

    // As-of = render time: the page is force-dynamic, so every request reads
    // the current calendar tables.
    const asOfHuman = new Date().toLocaleString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'Africa/Cairo',
    });

    return (
        <PublicPageShell altHref="/ar/markets/dividend-calendar">
            <JsonLd
                data={breadcrumbJsonLd(
                    [{ url: '/', label: 'Home' }, { label: 'Dividend Calendar' }],
                    SITE_URL
                )}
            />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: FAQS.map((f) => ({
                        '@type': 'Question',
                        name: f.q,
                        acceptedAnswer: { '@type': 'Answer', text: f.a },
                    })),
                }}
            />
            <Breadcrumbs lang="en" items={[{ href: '/', label: 'Home' }, { label: 'Dividend Calendar' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                EGX Dividend Calendar — Upcoming &amp; Recent Payouts
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                Dividend events across the Egyptian Exchange in one place: {upcomingRows.length} announced
                upcoming {upcomingRows.length === 1 ? 'payout' : 'payouts'} and {recentRows.length} dividend{' '}
                {recentRows.length === 1 ? 'payment' : 'payments'} from the last 90 days, with ex-dividend
                dates, per-share amounts and payment dates. Click any company for its full dividend history.
            </p>
            <p className="mt-2 text-sm text-muted">
                As of {asOfHuman} (Africa/Cairo time). The calendar updates together with our market data
                as new corporate actions are disclosed.
            </p>
            <p className="mt-1 text-sm text-muted" dir="rtl" lang="ar">
                مواعيد توزيعات الأرباح في البورصة المصرية — القادمة والأخيرة.
            </p>

            <section className="mt-8">
                <h2 className="text-xl font-bold text-main">Upcoming dividends</h2>
                <CalendarTable
                    rows={upcomingRows}
                    emptyText="No upcoming dividends have been announced on the EGX right now — new corporate actions appear here as soon as they are disclosed."
                />
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-bold text-main">Recent dividends (last 90 days)</h2>
                <CalendarTable
                    rows={recentRows}
                    emptyText="No dividend payments were recorded on the EGX in the last 90 days."
                />
            </section>

            <p className="mt-6 text-sm text-muted">
                Browse the full <Link href="/companies" className="font-semibold text-starta-darkTeal hover:underline">EGX listed companies directory</Link> or
                today&apos;s <Link href="/markets/movers" className="font-semibold text-starta-darkTeal hover:underline">EGX movers</Link> and the <Link href="/markets/top-dividend-yield" className="font-semibold text-starta-darkTeal hover:underline">highest dividend-yield stocks</Link>.
            </p>

            <section className="mt-10 border-t border-border pt-6">
                <h2 className="text-lg font-bold text-main">FAQ</h2>
                <dl className="mt-3 space-y-5">
                    {FAQS.map((f) => (
                        <div key={f.q}>
                            <dt className="font-semibold text-main">{f.q}</dt>
                            <dd className="mt-1 text-sm leading-relaxed text-main">{f.a}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <p className="mt-6 text-xs text-muted">
                Source: Egyptian Exchange corporate actions via EGX and TradingView. Amounts are per share
                in the currency shown per row (Egyptian pounds unless marked otherwise).
            </p>
        </PublicPageShell>
    );
}
