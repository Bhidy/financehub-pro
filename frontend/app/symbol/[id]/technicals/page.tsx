import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTicker, getTechnicals } from '@/lib/public-data';
import { SITE_URL, symbolPath } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /symbol/{SYM}/technicals — server-rendered multi-timeframe technical
 * analysis (RSI, MACD, ADX, moving averages + TradingView-style buy/sell
 * signals). The parent layout already 404s unknown symbols; this page adds a
 * quality gate — no technicals rows means no thin page (notFound, not a
 * placeholder table).
 */

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

type TechnicalRow = Record<string, unknown>;

/** Finite number field, else null (rows arrive as Record<string, unknown>). */
function num(row: TechnicalRow, key: string): number | null {
    const v = row[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/** Trimmed non-empty string field, else null. */
function str(row: TechnicalRow, key: string): string | null {
    const v = row[key];
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
}

/** Timestamp-ish value (pg timestamps come back as Date or ISO string) → Date. */
function toDate(v: unknown): Date | null {
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    if (typeof v === 'string') {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

const TIMEFRAME_LABELS: Record<string, string> = {
    '60': '1 Hour',
    '240': '4 Hours',
    '1D': 'Daily',
    '1W': 'Weekly',
};

function timeframeLabel(row: TechnicalRow): string {
    const tf = str(row, 'timeframe');
    return (tf && TIMEFRAME_LABELS[tf]) || tf || '—';
}

type Signal = 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';

/** TradingView recommend_* score (-1..1) → human signal label. */
function signalLabel(r: number | null): Signal {
    if (r === null) return 'Neutral';
    if (r > 0.5) return 'Strong Buy';
    if (r > 0.1) return 'Buy';
    if (r < -0.5) return 'Strong Sell';
    if (r < -0.1) return 'Sell';
    return 'Neutral';
}

function signalClass(label: Signal): string {
    if (label === 'Strong Buy' || label === 'Buy') return 'text-emerald-600';
    if (label === 'Strong Sell' || label === 'Sell') return 'text-red-600';
    return 'text-muted';
}

function fmt2(n: number | null): string {
    return n === null ? '—' : n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();
    const ticker = symbol ? await getTicker(symbol) : null;
    if (!ticker) return {};
    const name = ticker.name_en || symbol;
    const path = `${symbolPath(symbol)}/technicals`;

    const rows = await getTechnicals(symbol);
    const daily = rows.find((r) => str(r, 'timeframe') === '1D');
    const dailySignal = daily ? signalLabel(num(daily, 'recommend_all')) : null;

    let description = `${name} (EGX: ${symbol}) technical analysis: RSI, MACD, ADX, moving averages & buy/sell signals across 4 timeframes.${
        dailySignal ? ` Daily signal: ${dailySignal}.` : ''
    }`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    const title = `${name} (${symbol}) Technical Analysis — RSI, MACD & Signals`;
    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: {
            type: 'website',
            title: `${title} | Starta Markets`,
            description,
            url: path,
        },
    };
}

export default async function TechnicalsPage({ params }: Props) {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();
    const ticker = await getTicker(symbol);
    if (!ticker) notFound();

    const rows = await getTechnicals(symbol);
    // Quality gate: no computed technicals → 404, never an empty shell page.
    if (rows.length === 0) notFound();

    const name = ticker.name_en || symbol;
    const overviewPath = symbolPath(symbol);

    const asOf = rows.reduce<Date | null>((mx, r) => {
        const d = toDate(r['updated_at']);
        return d && (!mx || d > mx) ? d : mx;
    }, null);
    const asOfHuman = asOf
        ? asOf.toLocaleString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Africa/Cairo',
          })
        : null;

    const siblings = [
        { href: overviewPath, label: 'Overview' },
        { href: `${overviewPath}/financials`, label: 'Financials' },
        { href: `${overviewPath}/dividends`, label: 'Dividends' },
        { href: `${overviewPath}/history`, label: 'Price History' },
    ];

    return (
        <PublicPageShell>
            <JsonLd
                data={breadcrumbJsonLd(
                    [
                        { url: '/', label: 'Home' },
                        { url: '/companies', label: 'EGX Companies' },
                        { url: overviewPath, label: name },
                        { label: 'Technicals' },
                    ],
                    SITE_URL
                )}
            />
            <Breadcrumbs
                items={[
                    { href: '/', label: 'Home' },
                    { href: '/companies', label: 'EGX Companies' },
                    { href: overviewPath, label: name },
                    { label: 'Technicals' },
                ]}
            />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                {name} ({symbol}) Technical Analysis
            </h1>

            <ul className="mt-4 space-y-1.5">
                {rows.map((r, i) => {
                    const overall = signalLabel(num(r, 'recommend_all'));
                    return (
                        <li key={str(r, 'timeframe') || i} className="text-sm text-muted">
                            <span className="font-semibold text-main">{timeframeLabel(r)}:</span>{' '}
                            <span className={`font-bold ${signalClass(overall)}`}>{overall}</span>
                        </li>
                    );
                })}
            </ul>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                            <th scope="col" className="px-4 py-3">Timeframe</th>
                            <th scope="col" className="px-4 py-3">Overall signal</th>
                            <th scope="col" className="px-4 py-3">Moving-averages signal</th>
                            <th scope="col" className="px-4 py-3">Oscillators signal</th>
                            <th scope="col" className="px-4 py-3 text-right">RSI(14)</th>
                            <th scope="col" className="px-4 py-3 text-right">MACD</th>
                            <th scope="col" className="px-4 py-3 text-right">ADX</th>
                            <th scope="col" className="px-4 py-3 text-right">SMA50</th>
                            <th scope="col" className="px-4 py-3 text-right">SMA200</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => {
                            const overall = signalLabel(num(r, 'recommend_all'));
                            const ma = signalLabel(num(r, 'recommend_ma'));
                            const osc = signalLabel(num(r, 'recommend_other'));
                            return (
                                <tr key={str(r, 'timeframe') || i} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                    <th scope="row" className="px-4 py-2.5 text-left font-semibold text-main">
                                        {timeframeLabel(r)}
                                    </th>
                                    <td className={`px-4 py-2.5 font-bold ${signalClass(overall)}`}>{overall}</td>
                                    <td className={`px-4 py-2.5 font-semibold ${signalClass(ma)}`}>{ma}</td>
                                    <td className={`px-4 py-2.5 font-semibold ${signalClass(osc)}`}>{osc}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-main">{fmt2(num(r, 'rsi'))}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-main">{fmt2(num(r, 'macd_macd'))}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-main">{fmt2(num(r, 'adx'))}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-main">{fmt2(num(r, 'sma50'))}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-main">{fmt2(num(r, 'sma200'))}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-xs text-muted">
                {asOfHuman && <>As of {asOfHuman} (Cairo time). </>}
                Computed from EGX price history via TradingView; refreshed with market data.
            </p>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
                Buy and sell signals summarize where indicators such as RSI, MACD and moving averages currently point
                for each timeframe — short-term readings (1 Hour, 4 Hours) react faster while Daily and Weekly reflect
                the broader trend. They describe recent price behaviour, not a prediction of where the stock will go.
            </p>
            <p className="mt-2 text-xs text-muted">Technical signals are informational, not investment advice.</p>

            <nav aria-label="Company pages" className="mt-8 border-t border-border pt-5">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                    {siblings.map((s) => (
                        <li key={s.href}>
                            <Link href={s.href} className="text-starta-teal hover:underline">
                                {s.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </PublicPageShell>
    );
}
