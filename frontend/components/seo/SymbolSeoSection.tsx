import Link from 'next/link';
import { SITE_URL, symbolPath } from '@/lib/seo';
import type { Ticker, CompanyProfile } from '@/lib/public-data';
import JsonLd from '@/components/seo/JsonLd';
import { breadcrumbJsonLd } from '@/components/seo/PublicPageShell';

/**
 * Server-rendered SEO/GEO content for /symbol/[id], mounted BELOW the
 * interactive client app: the crawler-visible About / key statistics / peers /
 * FAQ layer (the client app renders nothing server-side). Every number is
 * real data with an as-of date + source line — never fabricated.
 */

type Stats = Record<string, number | string | null>;

const fmtNum = (n: number | null | undefined, digits = 2): string | null =>
    n === null || n === undefined || !Number.isFinite(n)
        ? null
        : n.toLocaleString('en-EG', { maximumFractionDigits: digits });

const fmtEgp = (n: number | null | undefined): string | null => {
    if (n === null || n === undefined || !Number.isFinite(n)) return null;
    if (Math.abs(n) >= 1e9) return `EGP ${(n / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 2 })}B`;
    if (Math.abs(n) >= 1e6) return `EGP ${(n / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 2 })}M`;
    return `EGP ${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })}`;
};

const fmtPct = (n: number | null | undefined): string | null =>
    n === null || n === undefined || !Number.isFinite(n)
        ? null
        : `${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%`;

const num = (stats: Stats | null, key: string): number | null => {
    const v = stats?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

export function buildSymbolFaq(ticker: Ticker, stats: Stats | null, asOf: string | null): Array<{ q: string; a: string }> {
    const symbol = ticker.symbol.toUpperCase();
    const name = ticker.name_en || symbol;
    const faq: Array<{ q: string; a: string }> = [];

    const price = ticker.last_price ?? num(stats, 'last_price');
    if (price !== null) {
        faq.push({
            q: `What is ${name} (${symbol}) share price today?`,
            a: `${name} last traded at EGP ${fmtNum(price)} on the Egyptian Exchange${asOf ? ` (as of ${asOf}, Cairo time)` : ''}. Prices update every 15 minutes during EGX trading hours.`,
        });
    }
    const mcap = ticker.market_cap ?? num(stats, 'market_cap');
    if (mcap !== null) {
        faq.push({ q: `What is ${symbol}'s market capitalization?`, a: `${name} has a market capitalization of about ${fmtEgp(mcap)}.` });
    }
    const dy = ticker.dividend_yield ?? num(stats, 'dividend_yield');
    const dps = num(stats, 'dps');
    if (dy !== null && dy > 0) {
        faq.push({
            q: `Does ${symbol} pay dividends?`,
            a: `Yes — ${name} has a trailing dividend yield of ${fmtPct(dy)}${dps !== null ? ` (EGP ${fmtNum(dps)} per share)` : ''}.`,
        });
    }
    const pe = ticker.pe_ratio ?? num(stats, 'pe_ratio');
    if (pe !== null) {
        faq.push({ q: `What is ${symbol}'s P/E ratio?`, a: `${name} trades at a trailing price-to-earnings ratio of ${fmtNum(pe)}.` });
    }
    if (ticker.sector_name) {
        faq.push({ q: `What sector is ${name} in?`, a: `${name} is listed on the Egyptian Exchange (EGX) in the ${ticker.sector_name} sector.` });
    }
    faq.push({
        q: `Where can I track ${symbol}?`,
        a: `This Starta Markets page shows ${name}'s live EGX quote, key statistics, financial statements, dividends, technicals and news — or ask the Starta AI analyst about ${symbol} in Arabic or English.`,
    });
    return faq;
}

export default function SymbolSeoSection({
    ticker,
    stats,
    profile,
    peers,
}: {
    ticker: Ticker;
    stats: Stats | null;
    profile: CompanyProfile | null;
    peers: Ticker[];
}) {
    const symbol = ticker.symbol.toUpperCase();
    const name = ticker.name_en || symbol;
    const asOf = ticker.last_updated
        ? new Date(ticker.last_updated).toLocaleString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
          })
        : null;
    const faq = buildSymbolFaq(ticker, stats, asOf);

    const statRows: Array<[string, string | null]> = [
        ['Last price', ticker.last_price !== null ? `EGP ${fmtNum(ticker.last_price)}` : null],
        ['Market cap', fmtEgp(ticker.market_cap ?? num(stats, 'market_cap'))],
        ['P/E (trailing)', fmtNum(ticker.pe_ratio ?? num(stats, 'pe_ratio'))],
        ['Forward P/E', fmtNum(num(stats, 'forward_pe'))],
        ['P/B', fmtNum(ticker.pb_ratio ?? num(stats, 'pb_ratio'))],
        ['Dividend yield', fmtPct(ticker.dividend_yield ?? num(stats, 'dividend_yield'))],
        ['EPS (TTM)', num(stats, 'eps_ttm') !== null ? `EGP ${fmtNum(num(stats, 'eps_ttm'))}` : null],
        ['Revenue (TTM)', fmtEgp(num(stats, 'revenue_ttm'))],
        ['Net income (TTM)', fmtEgp(num(stats, 'net_income_ttm'))],
        ['ROE', fmtPct(num(stats, 'roe'))],
        ['Book value / share', num(stats, 'bvps') !== null ? `EGP ${fmtNum(num(stats, 'bvps'))}` : null],
        ['Beta (1Y)', fmtNum(num(stats, 'beta_1y'))],
        ['50-day MA', num(stats, 'ma_50d') !== null ? `EGP ${fmtNum(num(stats, 'ma_50d'))}` : null],
        ['200-day MA', num(stats, 'ma_200d') !== null ? `EGP ${fmtNum(num(stats, 'ma_200d'))}` : null],
        ['RSI (14)', fmtNum(num(stats, 'rsi_14'))],
    ];
    const presentRows = statRows.filter(([, v]) => v !== null) as Array<[string, string]>;

    const corporationJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Corporation',
        name,
        ...(ticker.name_ar ? { alternateName: ticker.name_ar } : {}),
        tickerSymbol: symbol,
        url: SITE_URL + symbolPath(symbol),
        ...(profile?.description ? { description: profile.description.slice(0, 500) } : {}),
        ...(profile?.website ? { sameAs: [`https://${profile.website.replace(/^https?:\/\//, '')}`] } : {}),
    };

    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    };

    return (
        <section className="bg-[#f4f7fb] text-[#10182d] dark:bg-[#0b0f19] dark:text-[#f1f5f9]">
            <JsonLd data={corporationJsonLd} />
            <JsonLd data={faqJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [
                        { url: '/', label: 'Home' },
                        { url: '/Market-Pulse', label: 'EGX Market' },
                        { label: `${name} (${symbol})` },
                    ],
                    SITE_URL
                )}
            />
            <div className="mx-auto max-w-6xl px-4 py-10">
                {profile?.description && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold">About {name}</h2>
                        <p className="mt-3 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300">{profile.description}</p>
                        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                            {profile.industry && (
                                <div><dt className="inline font-semibold">Industry: </dt><dd className="inline">{profile.industry}</dd></div>
                            )}
                            {profile.employees != null && (
                                <div><dt className="inline font-semibold">Employees: </dt><dd className="inline">{Number(profile.employees).toLocaleString('en-EG')}</dd></div>
                            )}
                            {profile.ceo && (
                                <div><dt className="inline font-semibold">CEO: </dt><dd className="inline">{profile.ceo}</dd></div>
                            )}
                            {ticker.isin && (
                                <div><dt className="inline font-semibold">ISIN: </dt><dd className="inline">{ticker.isin}</dd></div>
                            )}
                            {profile.website && (
                                <div>
                                    <dt className="inline font-semibold">Website: </dt>
                                    <dd className="inline">
                                        <a href={`https://${profile.website.replace(/^https?:\/\//, '')}`} rel="noopener nofollow" target="_blank" className="text-teal-600 hover:underline dark:text-teal-400">
                                            {profile.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>
                )}

                {presentRows.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold">{symbol} key statistics</h2>
                        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                            {presentRows.map(([label, value]) => (
                                <div key={label} className="rounded-xl border border-slate-200/60 bg-white p-3 dark:border-slate-800/60 dark:bg-slate-900">
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
                                    <dd className="mt-1 font-bold">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                            {asOf ? `Data as of ${asOf} (Cairo time). ` : ''}Source: Egyptian Exchange via TradingView; financial statements via Yahoo Finance. Prices refresh every 15 minutes during EGX trading hours (Sun–Thu).
                        </p>
                    </div>
                )}

                {peers.length > 0 && ticker.sector_name && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold">Compare with other {ticker.sector_name} stocks</h2>
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {peers.map((p) => (
                                <li key={p.symbol}>
                                    <Link
                                        href={symbolPath(p.symbol)}
                                        className="inline-block rounded-full border border-slate-200/60 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-teal-400 hover:text-teal-600 dark:border-slate-800/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-teal-400"
                                    >
                                        {p.name_en || p.symbol} ({p.symbol.toUpperCase()})
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div>
                    <h2 className="text-xl font-bold">Frequently asked questions</h2>
                    <dl className="mt-3 space-y-4">
                        {faq.map((f) => (
                            <div key={f.q}>
                                <dt className="font-semibold">{f.q}</dt>
                                <dd className="mt-1 max-w-3xl text-slate-600 dark:text-slate-300">{f.a}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    );
}
