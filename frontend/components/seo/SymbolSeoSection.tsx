import Link from 'next/link';
import { SITE_URL, symbolPath, slugify, newsPath } from '@/lib/seo';
import type { Ticker, CompanyProfile, NewsArticle, SymbolPerformance } from '@/lib/public-data';
import JsonLd from '@/components/seo/JsonLd';
import KeyTerms from '@/components/seo/KeyTerms';
import { breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import { canonicalNewsPath } from '@/lib/news-display';

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
        // normalize -0 → 0 (audit: FAITA beta rendered as "-0")
        : (Object.is(n, -0) ? 0 : n).toLocaleString('en-EG', { maximumFractionDigits: digits });

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
    // Per-line TRADING currency: most EGX lines are EGP but some (FAITA, EGBE,
    // VLMRA...) trade in USD — labeling those EGP is a misleading price.
    const cur = ticker.currency || 'EGP';
    const faq: Array<{ q: string; a: string }> = [];

    const price = ticker.last_price ?? num(stats, 'last_price');
    if (price !== null) {
        faq.push({
            q: `What is ${name} (${symbol}) share price today?`,
            a: `${name} last traded at ${cur} ${fmtNum(price)} on the Egyptian Exchange${asOf ? ` (as of ${asOf}, Cairo time)` : ''}. Prices update every 15 minutes during EGX trading hours.`,
        });
    }
    const mcap = ticker.market_cap ?? num(stats, 'market_cap');
    if (mcap !== null) {
        faq.push({ q: `What is ${symbol}'s market capitalization?`, a: `${name} has a market capitalization of about ${fmtEgp(mcap)}.` });
    }
    // A trailing yield > 100% is a data artifact (special/return-of-capital
    // distribution or stale-price mismatch), not a repeatable yield — suppress
    // it rather than claim an absurd figure (audit 2026-07-04: SAIB rendered 761%).
    const dyRaw = ticker.dividend_yield ?? num(stats, 'dividend_yield');
    const dy = dyRaw !== null && dyRaw <= 100 ? dyRaw : null;
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

/** TradingView recommend_all convention: [-1..1] → five-step verdict. */
function techVerdict(technicals: Array<Record<string, unknown>> | null): string | null {
    const daily = technicals?.find((t) => t.timeframe === '1D') ?? technicals?.[0];
    const v = daily?.recommend_all;
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    if (v >= 0.5) return 'Strong Buy';
    if (v >= 0.1) return 'Buy';
    if (v > -0.1) return 'Neutral';
    if (v > -0.5) return 'Sell';
    return 'Strong Sell';
}

export default function SymbolSeoSection({
    ticker,
    stats,
    profile,
    peers,
    perf = null,
    technicals = null,
    news = [],
}: {
    ticker: Ticker;
    stats: Stats | null;
    profile: CompanyProfile | null;
    peers: Ticker[];
    perf?: SymbolPerformance | null;
    technicals?: Array<Record<string, unknown>> | null;
    news?: NewsArticle[];
}) {
    const symbol = ticker.symbol.toUpperCase();
    const name = ticker.name_en || symbol;
    const asOf = ticker.last_updated
        ? new Date(ticker.last_updated).toLocaleString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
          })
        : null;
    const faq = buildSymbolFaq(ticker, stats, asOf);

    const cur = ticker.currency || 'EGP';
    const verdict = techVerdict(technicals);
    const statRows: Array<[string, string | null]> = [
        ['Last price', ticker.last_price !== null ? `${cur} ${fmtNum(ticker.last_price)}` : null],
        ['Previous close', perf?.prev_close != null ? `${cur} ${fmtNum(perf.prev_close)}` : null],
        ['Day change', fmtPct(ticker.change_percent)],
        [
            '52-week range',
            perf?.low_52w != null && perf?.high_52w != null
                ? `${cur} ${fmtNum(perf.low_52w)} – ${fmtNum(perf.high_52w)}`
                : null,
        ],
        ['Volume', ticker.volume !== null ? Number(ticker.volume).toLocaleString('en-EG') : null],
        [
            'Shares outstanding',
            num(stats, 'shares_outstanding') !== null
                ? Number(num(stats, 'shares_outstanding')).toLocaleString('en-EG', { notation: 'compact', maximumFractionDigits: 2 })
                : null,
        ],
        ['Free float', fmtPct(num(stats, 'float_shares_percent'))],
        ['Market cap', fmtEgp(ticker.market_cap ?? num(stats, 'market_cap'))],
        ['P/E (trailing)', fmtNum(ticker.pe_ratio ?? num(stats, 'pe_ratio'))],
        ['Forward P/E', fmtNum(num(stats, 'forward_pe'))],
        ['P/B', fmtNum(ticker.pb_ratio ?? num(stats, 'pb_ratio'))],
        ['Dividend yield', ((y) => (y !== null && y <= 100 ? fmtPct(y) : null))(ticker.dividend_yield ?? num(stats, 'dividend_yield'))],
        ['EPS (TTM)', num(stats, 'eps_ttm') !== null ? `EGP ${fmtNum(num(stats, 'eps_ttm'))}` : null],
        ['Revenue (TTM)', fmtEgp(num(stats, 'revenue_ttm'))],
        ['Net income (TTM)', fmtEgp(num(stats, 'net_income_ttm'))],
        ['ROE', fmtPct(num(stats, 'roe'))],
        ['Book value / share', num(stats, 'bvps') !== null ? `EGP ${fmtNum(num(stats, 'bvps'))}` : null],
        ['Beta (1Y)', fmtNum(num(stats, 'beta_1y'))],
        ['50-day MA', num(stats, 'ma_50d') !== null ? `${cur} ${fmtNum(num(stats, 'ma_50d'))}` : null],
        ['200-day MA', num(stats, 'ma_200d') !== null ? `${cur} ${fmtNum(num(stats, 'ma_200d'))}` : null],
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
            <div className="mx-auto max-w-6xl border-t border-slate-200/60 px-4 py-14 dark:border-slate-800/60">
                <nav aria-label={`${symbol} data pages`} className="mb-8 flex flex-wrap gap-2 text-sm font-semibold">
                    {(
                        [
                            [`${symbolPath(symbol)}/financials`, 'Financial Statements'],
                            [`${symbolPath(symbol)}/dividends`, 'Dividends'],
                            [`${symbolPath(symbol)}/technicals`, 'Technical Analysis'],
                            [`${symbolPath(symbol)}/history`, 'Price History'],
                        ] as Array<[string, string]>
                    ).map(([href, label]) => (
                        <Link
                            key={href}
                            href={href}
                            className="rounded-full border border-slate-200/70 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[#14B8A6]/50 hover:text-[#0D9488] dark:border-slate-800/70 dark:bg-[#0F172A] dark:text-slate-300 dark:hover:text-[#2DD4BF]"
                        >
                            {symbol} {label}
                        </Link>
                    ))}
                </nav>

                {/* Hero: the H1 + price the EN template was missing entirely
                    (2026-07-03 competitor audit — every top-3 ranker leads with
                    name + live price in crawler-visible HTML). */}
                <div className="mb-9">
                    <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                        {name} ({symbol}) Share Price — EGX
                    </h1>
                    {ticker.last_price !== null && (
                        <div className="mt-2 flex flex-wrap items-baseline gap-3">
                            <span className="text-3xl font-black tracking-tight tabular-nums">
                                {cur} {fmtNum(ticker.last_price)}
                            </span>
                            {ticker.change_percent !== null && (
                                <span
                                    className={`text-lg font-bold tabular-nums ${
                                        ticker.change_percent >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                >
                                    {ticker.change_percent >= 0 ? '+' : ''}
                                    {fmtNum(ticker.change_percent)}%
                                </span>
                            )}
                            {verdict && (
                                <span className="rounded-full bg-[#14B8A6]/12 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0D9488] dark:text-[#2DD4BF]">
                                    Technicals: {verdict}
                                </span>
                            )}
                        </div>
                    )}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {name} ({symbol}) trades on the Egyptian Exchange (EGX){ticker.sector_name ? ` in the ${ticker.sector_name} sector` : ''}
                        {asOf ? `. Last updated ${asOf} (Cairo time).` : '.'}
                    </p>
                </div>

                {/* Multi-horizon performance — a block every ranker carries. */}
                {perf && perf.horizons.some((h) => h.pct !== null) && (
                    <div className="mb-9">
                        <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight"><span aria-hidden className="inline-block h-4 w-1 rounded-full bg-[#14B8A6]" />{symbol} price performance</h2>
                        <dl className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                            {perf.horizons.map((h) => (
                                <div key={h.label} className="rounded-xl border border-slate-200/70 bg-white p-2.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-slate-800/70 dark:bg-[#0F172A]">
                                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{h.label}</dt>
                                    <dd className={`mt-1 text-[13px] font-extrabold tabular-nums ${h.pct === null ? 'text-slate-400' : h.pct >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {h.pct === null ? '—' : `${h.pct >= 0 ? '+' : ''}${h.pct.toFixed(1)}%`}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Total return based on EGX closing prices. Past performance does not indicate future results.</p>
                    </div>
                )}

                {profile?.description && (
                    <div className="mb-8">
                        <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight"><span aria-hidden className="inline-block h-4 w-1 rounded-full bg-[#14B8A6]" />About {name}</h2>
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
                        <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight"><span aria-hidden className="inline-block h-4 w-1 rounded-full bg-[#14B8A6]" />{symbol} key statistics</h2>
                        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                            {presentRows.map(([label, value]) => (
                                <div key={label} className="rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-slate-800/70 dark:bg-[#0F172A]">
                                    <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{label}</dt>
                                    <dd className="mt-1.5 text-[15px] font-extrabold tracking-tight">{value}</dd>
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
                        <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                            <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-[#14B8A6]" />
                            Compare with other{' '}
                            <Link href={`/sectors/${slugify(ticker.sector_name)}`} className="text-teal-600 hover:underline dark:text-teal-400">
                                {ticker.sector_name}
                            </Link>{' '}
                            stocks
                        </h2>
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {peers.map((p) => (
                                <li key={p.symbol}>
                                    <Link
                                        href={symbolPath(p.symbol)}
                                        className="inline-block rounded-full border border-slate-200/70 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[#14B8A6]/50 hover:text-[#0D9488] dark:border-slate-800/70 dark:bg-[#0F172A] dark:text-slate-300 dark:hover:text-[#2DD4BF]"
                                    >
                                        {p.name_en || p.symbol} ({p.symbol.toUpperCase()})
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Latest news — surfaces the news corpus on the page type that
                    needs it (competitor audit: rankers show a news feed; we ran
                    a 3,184-article system and never linked it here). */}
                {news.length > 0 && (
                    <div className="mb-8">
                        <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight"><span aria-hidden className="inline-block h-4 w-1 rounded-full bg-[#14B8A6]" />Latest {name} news</h2>
                        <ul className="mt-3 divide-y divide-slate-200/70 rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:divide-slate-800/70 dark:border-slate-800/70 dark:bg-[#0F172A]">
                            {news.map((a) => (
                                <li key={String(a.id)} className="px-5 py-3.5">
                                    <Link href={encodeURI(canonicalNewsPath(a.id, a.headline, (a as { source_section?: string | null }).source_section))} className="text-[15px] font-semibold leading-snug tracking-tight hover:text-[#0D9488] dark:hover:text-[#2DD4BF]">
                                        {a.headline}
                                    </Link>
                                    {a.published_at && (
                                        <time dateTime={new Date(a.published_at).toISOString()} className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                                            {new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </time>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <KeyTerms slugs={['market-cap', 'pe-ratio', 'pb-ratio', 'dividend-yield']} lang="en" heading={`Key terms behind the ${symbol} figures`} />

                <div className="mb-8 mt-8">
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight"><span aria-hidden className="inline-block h-4 w-1 rounded-full bg-[#14B8A6]" />Frequently asked questions</h2>
                    <dl className="mt-4 divide-y divide-slate-200/70 rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:divide-slate-800/70 dark:border-slate-800/70 dark:bg-[#0F172A]">
                        {faq.map((f) => (
                            <div key={f.q} className="px-5 py-4">
                                <dt className="text-[15px] font-bold tracking-tight">{f.q}</dt>
                                <dd className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{f.a}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* Hub links — the EN symbol template dead-ended PageRank
                    (no footer/hub links). This routes equity to the directory,
                    the sector, the Arabic twin and the metric pages. */}
                <nav aria-label="Explore EGX" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200/60 pt-6 text-sm font-semibold dark:border-slate-800/60">
                    <Link href="/companies" className="text-slate-500 hover:text-[#0D9488] dark:text-slate-400 dark:hover:text-[#2DD4BF]">All EGX companies</Link>
                    {ticker.sector_name && (
                        <Link href={`/sectors/${slugify(ticker.sector_name)}`} className="text-slate-500 hover:text-[#0D9488] dark:text-slate-400 dark:hover:text-[#2DD4BF]">{ticker.sector_name} sector</Link>
                    )}
                    <Link href="/markets/movers" className="text-slate-500 hover:text-[#0D9488] dark:text-slate-400 dark:hover:text-[#2DD4BF]">Top movers</Link>
                    <Link href="/markets/largest-companies" className="text-slate-500 hover:text-[#0D9488] dark:text-slate-400 dark:hover:text-[#2DD4BF]">Largest by market cap</Link>
                    <Link href="/markets/dividend-calendar" className="text-slate-500 hover:text-[#0D9488] dark:text-slate-400 dark:hover:text-[#2DD4BF]">Dividend calendar</Link>
                    <Link href="/editorial-policy" className="text-slate-500 hover:text-[#0D9488] dark:text-slate-400 dark:hover:text-[#2DD4BF]">Editorial policy</Link>
                    <a href={`/ar/symbol/${symbol}`} lang="ar" hrefLang="ar" className="text-slate-500 hover:text-[#0D9488] dark:text-slate-400 dark:hover:text-[#2DD4BF]">صفحة السهم بالعربية</a>
                </nav>
            </div>
        </section>
    );
}
