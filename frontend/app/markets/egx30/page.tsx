import type { Metadata } from 'next';
import Link from 'next/link';
import { getEgx30Index, getEgx30Constituents, type Ticker } from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /markets/egx30 — the citable "EGX30 today" surface. The audit (2026-07-03)
 * found the index value existed nowhere in crawler-visible HTML (Market-Pulse
 * rendered "--"), so head queries like "EGX30 today" / "مؤشر البورصة المصرية
 * اليوم" had no quotable number. Force-dynamic so every crawl sees a fresh
 * value; degrades to definition + constituents if the feed is unavailable.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'EGX 30 Index Today — Live Value, Change & Constituents',
    description:
        'The EGX 30 — the Egyptian Exchange benchmark index — live value, daily change, 52-week range and its 30 constituent companies. Updated through the EGX trading day.',
    alternates: {
        canonical: '/markets/egx30',
        languages: { en: '/markets/egx30', ar: '/ar/markets/egx30', 'x-default': '/markets/egx30' },
    },
    openGraph: {
        type: 'website',
        title: 'EGX 30 Index Today — Live Value & Constituents | Starta Markets',
        description: 'Live EGX 30 benchmark value, daily change and its 30 constituent Egyptian stocks.',
        url: '/markets/egx30',
    },
};

const fmt = (n: number | null, d = 2): string =>
    n === null ? '—' : n.toLocaleString('en-EG', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n: number | null): string => (n === null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`);
const fmtCap = (n: number | null): string => {
    if (n === null) return '—';
    if (n >= 1e9) return `EGP ${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `EGP ${(n / 1e6).toFixed(2)}M`;
    return `EGP ${n.toLocaleString('en-EG')}`;
};

export default async function Egx30Page() {
    const [quote, constituents] = await Promise.all([
        getEgx30Index().catch(() => null),
        getEgx30Constituents().catch(() => [] as Ticker[]),
    ]);

    const asOf = quote?.timestamp
        ? new Date(quote.timestamp).toLocaleString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
          })
        : null;

    const up = (quote?.change ?? 0) >= 0;

    const datasetJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'EGX 30 Index — value and constituents',
        description: 'Live value, daily change and constituent companies of the EGX 30 benchmark index of the Egyptian Exchange.',
        url: absUrl('/markets/egx30'),
        creator: { '@id': `${SITE_URL}/#organization`, '@type': 'Organization', name: 'Starta Markets' },
        ...(quote?.timestamp ? { dateModified: new Date(quote.timestamp).toISOString() } : {}),
        variableMeasured: 'EGX 30 index value (EGP)',
        license: `${SITE_URL}/terms`,
    };
    const faq = [
        {
            q: 'What is the EGX 30 index today?',
            a: quote?.value != null
                ? `The EGX 30 is at ${fmt(quote.value)} points${quote.changePercent != null ? `, ${up ? 'up' : 'down'} ${fmtPct(quote.changePercent)} on the day` : ''}${asOf ? ` (as of ${asOf}, Cairo time)` : ''}.`
                : 'The EGX 30 is the benchmark index of the Egyptian Exchange, tracking its 30 largest and most liquid listed companies.',
        },
        {
            q: 'What is the EGX 30?',
            a: 'The EGX 30 is the flagship index of the Egyptian Exchange (EGX), measuring the performance of the 30 most highly capitalised and actively traded companies listed in Cairo. It is weighted by free-float market capitalisation and quoted in Egyptian pounds (EGP).',
        },
        {
            q: 'Which companies are in the EGX 30?',
            a: `The index is reviewed periodically by the Egyptian Exchange. The largest constituents by market capitalisation include ${constituents.slice(0, 5).map((c) => c.name_en || c.symbol).join(', ')}.`,
        },
    ];
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    };

    return (
        <PublicPageShell>
            <JsonLd data={datasetJsonLd} />
            <JsonLd data={faqJsonLd} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'Home' }, { url: '/Market-Pulse', label: 'Markets' }, { label: 'EGX 30' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/Market-Pulse', label: 'Markets' }, { label: 'EGX 30' }]} />

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">EGX 30 Index Today</h1>

            {quote?.value != null ? (
                <div className="mt-4 flex flex-wrap items-baseline gap-4">
                    <span className="text-4xl font-black tabular-nums tracking-tight">{fmt(quote.value)}</span>
                    {quote.change != null && (
                        <span className={`text-xl font-bold tabular-nums ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {up ? '+' : ''}{fmt(quote.change)} ({fmtPct(quote.changePercent)})
                        </span>
                    )}
                </div>
            ) : (
                <p className="mt-4 text-muted">Live EGX 30 value is momentarily unavailable — see the constituents and methodology below.</p>
            )}
            {asOf && <p className="mt-1 text-xs text-muted">As of {asOf} (Cairo time). Delayed up to 15 minutes.</p>}

            <p className="mt-5 max-w-3xl leading-relaxed text-muted">
                The <strong>EGX 30</strong> is the benchmark index of the <strong>Egyptian Exchange (EGX)</strong>, tracking the 30 largest and
                most actively traded companies listed in Cairo, weighted by free-float market capitalisation and quoted in Egyptian pounds.
                {quote?.value != null && (
                    <> As of the latest reading it stands at <strong>{fmt(quote.value)} points</strong>{quote.ytdPct != null ? <>, {quote.ytdPct >= 0 ? 'up' : 'down'} <strong>{fmtPct(quote.ytdPct)}</strong> year-to-date</> : null}
                    {quote.high52 != null && quote.low52 != null ? <>, within a 52-week range of {fmt(quote.low52)} – {fmt(quote.high52)}</> : null}.</>
                )}
            </p>

            {(quote?.high52 != null || quote?.ytdPct != null) && (
                <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        ['Day change', quote?.changePercent != null ? fmtPct(quote.changePercent) : null],
                        ['YTD', quote?.ytdPct != null ? fmtPct(quote.ytdPct) : null],
                        ['52-week high', quote?.high52 != null ? fmt(quote.high52) : null],
                        ['52-week low', quote?.low52 != null ? fmt(quote.low52) : null],
                    ].filter(([, v]) => v !== null).map(([label, v]) => (
                        <div key={label as string} className="rounded-xl border border-border bg-surface p-3.5">
                            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{label}</dt>
                            <dd className="mt-1.5 text-[15px] font-extrabold tabular-nums text-main">{v}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {constituents.length > 0 && (
                <section className="mt-10">
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                        <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                        EGX 30 constituents by market capitalisation
                    </h2>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Company</th>
                                    <th className="px-4 py-3 text-right">Price</th>
                                    <th className="px-4 py-3 text-right">Change</th>
                                    <th className="px-4 py-3 text-right">Market cap</th>
                                </tr>
                            </thead>
                            <tbody>
                                {constituents.map((c, i) => (
                                    <tr key={c.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                        <td className="px-4 py-2.5 text-muted tabular-nums">{i + 1}</td>
                                        <td className="px-4 py-2.5">
                                            <Link href={symbolPath(c.symbol)} className="font-semibold text-main hover:text-starta-teal">
                                                {c.name_en || c.symbol} <span className="text-muted">({c.symbol})</span>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{c.last_price !== null ? `${c.currency || 'EGP'} ${fmt(c.last_price)}` : '—'}</td>
                                        <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${(c.change_percent ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{c.change_percent !== null ? fmtPct(c.change_percent) : '—'}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums text-muted">{fmtCap(c.market_cap)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-xs text-muted">Constituents shown are the 30 largest EGX companies by market capitalisation as a proxy for index membership; official membership is set by the Egyptian Exchange. Prices via TradingView, delayed up to 15 minutes.</p>
                </section>
            )}

            <section className="mt-10">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight"><span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />Frequently asked questions</h2>
                <dl className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
                    {faq.map((f) => (
                        <div key={f.q} className="px-5 py-4">
                            <dt className="text-[15px] font-bold tracking-tight text-main">{f.q}</dt>
                            <dd className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">{f.a}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <nav aria-label="Explore" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/companies" className="text-muted hover:text-starta-teal">All EGX companies</Link>
                <Link href="/markets/movers" className="text-muted hover:text-starta-teal">Top movers</Link>
                <Link href="/sectors" className="text-muted hover:text-starta-teal">Sectors</Link>
                <a href="/ar/markets/egx30" lang="ar" hrefLang="ar" className="text-muted hover:text-starta-teal">مؤشر EGX30 بالعربية</a>
            </nav>
        </PublicPageShell>
    );
}
