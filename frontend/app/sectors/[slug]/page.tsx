import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllTickers, getSectors } from '@/lib/public-data';
import { SITE_URL, sectorPath, slugify, symbolPath, OG_DEFAULTS } from '@/lib/seo';
import { sectorAr } from '@/content/sector-names-ar';
import { sectorDescription } from '@/content/sector-descriptions';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /sectors/{slug} — one page per EGX sector: every listed company in the
 * sector with live prices and market caps. The slug is derived from the
 * sector_name via slugify() at runtime (same rule the /sectors index uses),
 * so the index links and these pages can never drift apart.
 */

// ISR: cache at the edge and revalidate in background — the audit found
// every SSR route shipped no-store (0% CDN hit, 1.0-1.5s TTFB). Pages are
// anonymous, so edge-caching is safe; value tuned to how fast the data moves.
export const revalidate = 900;

/** Route params arrive percent-encoded; canonical slugs carry raw unicode. */
function decodeSlug(raw: string): string {
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

/** Resolve a slug back to its sector row (getSectors is React.cache-shared). */
async function resolveSector(
    rawSlug: string
): Promise<{ sector_name: string; companies: number; market_cap: number | null } | null> {
    const slug = decodeSlug(rawSlug);
    const sectors = await getSectors();
    return sectors.find((s) => slugify(s.sector_name) === slug) || null;
}

const fmtCap = (n: number | null): string => {
    if (n === null || !Number.isFinite(n)) return '—';
    if (n >= 1e9) return `${(n / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 1 })}B`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 1 })}M`;
    return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
};

/** Clamp meta descriptions to 160 chars at a word boundary. */
function clampDescription(s: string, max = 160): string {
    if (s.length <= max) return s;
    const cut = s.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[,;—-]+$/g, '').trimEnd() + '…';
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const match = await resolveSector(slug);
    if (!match) {
        return { title: 'Sector Not Found', robots: { index: false, follow: false } };
    }

    const canonical = `/sectors/${slugify(match.sector_name)}`;
    const tickers = (await getAllTickers()).filter((t) => t.sector_name === match.sector_name);
    const names = tickers.slice(0, 2).map((t) => t.name_en || t.symbol);
    const lead =
        names.length === 0
            ? `${match.sector_name} companies on the Egyptian Exchange (EGX)`
            : names.length === 1
              ? `${match.sector_name} on the EGX: ${names[0]}`
              : tickers.length > 2
                ? `${match.sector_name} on the EGX: ${names[0]}, ${names[1]} and ${tickers.length - 2} more`
                : `${match.sector_name} on the EGX: ${names[0]} and ${names[1]}`;
    const description = clampDescription(`${lead} — live prices and market caps, updated daily.`);

    return {
        title: `${match.sector_name} Stocks on the EGX — Prices & Market Caps`,
        description,
        // AR canonical carries the Arabic-name slug; x-default = Arabic (site default).
        alternates: {
            canonical,
            languages: {
                en: canonical,
                ar: encodeURI(sectorPath(match.sector_name, sectorAr(match.sector_name), 'ar')),
                'x-default': encodeURI(sectorPath(match.sector_name, sectorAr(match.sector_name), 'ar')),
            },
        },
        openGraph: {
            ...OG_DEFAULTS,
            type: 'website',
            title: `${match.sector_name} Stocks on the EGX — Prices & Market Caps | Starta Markets`,
            description,
            url: canonical,
        },
    };
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const match = await resolveSector(slug);
    if (!match) notFound();

    const tickers = (await getAllTickers()).filter((t) => t.sector_name === match.sector_name);
    const asOf = tickers.reduce<string | null>((mx, t) => {
        return t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx;
    }, null);
    const asOfHuman = asOf
        ? new Date(asOf).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' })
        : null;

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${match.sector_name} — EGX listed companies by market cap`,
        numberOfItems: tickers.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: tickers.map((t, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `${t.name_en || t.symbol} (${t.symbol})`,
            url: SITE_URL + symbolPath(t.symbol),
        })),
    };

    return (
        <PublicPageShell altHref={encodeURI(sectorPath(match.sector_name, sectorAr(match.sector_name), 'ar'))}>
            <JsonLd data={itemListJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [
                        { url: '/', label: 'Home' },
                        { url: '/sectors', label: 'EGX Sectors' },
                        { label: match.sector_name },
                    ],
                    SITE_URL
                )}
            />
            <Breadcrumbs lang="en"
                items={[
                    { href: '/', label: 'Home' },
                    { href: '/sectors', label: 'EGX Sectors' },
                    { label: match.sector_name },
                ]}
            />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                {match.sector_name} — EGX Listed Companies
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {tickers.length} {match.sector_name} {tickers.length === 1 ? 'company' : 'companies'} listed on
                the Egyptian Exchange, sorted by market capitalization
                {match.market_cap !== null && Number.isFinite(match.market_cap) && (
                    <> — aggregate market cap EGP {fmtCap(match.market_cap)}</>
                )}
                . Click any company for its full profile: price chart, key statistics, financial statements,
                dividends, technicals and news. Updated daily{asOfHuman && <>; prices as of {asOfHuman}</>}.
            </p>
            {sectorDescription(match.sector_name, 'en') && (
                <section className="mt-5 max-w-3xl" aria-label="About this sector">
                    <h2 className="text-lg font-bold text-main">What the {match.sector_name} sector covers</h2>
                    <p className="mt-2 leading-relaxed text-muted">{sectorDescription(match.sector_name, 'en')}</p>
                </section>
            )}

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Company</th>
                            <th className="px-4 py-3">Symbol</th>
                            <th className="px-4 py-3 text-right">Price</th>
                            <th className="px-4 py-3 text-right">Change</th>
                            <th className="px-4 py-3 text-right">Market Cap (EGP)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickers.map((t, i) => (
                            <tr key={t.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                                <td className="px-4 py-2.5">
                                    <Link href={symbolPath(t.symbol)} className="font-semibold text-main hover:text-starta-darkTeal">
                                        {t.name_en || t.symbol}
                                    </Link>
                                    {t.name_ar && (
                                        <span className="block text-xs text-muted" dir="rtl" lang="ar">{t.name_ar}</span>
                                    )}
                                </td>
                                <td className="px-4 py-2.5 font-mono font-semibold text-muted">
                                    <Link href={symbolPath(t.symbol)} className="hover:text-starta-darkTeal">{t.symbol}</Link>
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold">
                                    {t.last_price !== null ? `${t.last_price.toLocaleString('en-EG', { maximumFractionDigits: 2 })}${t.currency && t.currency !== 'EGP' ? ` ${t.currency}` : ''}` : '—'}
                                </td>
                                <td className={`px-4 py-2.5 text-right font-semibold ${
                                    t.change_percent === null ? 'text-muted' : t.change_percent >= 0 ? 'text-emerald-700' : 'text-red-600'
                                }`}>
                                    {t.change_percent !== null ? `${t.change_percent >= 0 ? '+' : ''}${t.change_percent.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right">{fmtCap(t.market_cap)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-sm text-muted">
                Browse <Link href="/sectors" className="font-semibold text-starta-darkTeal hover:underline">all EGX sectors</Link> or
                the full <Link href="/companies" className="font-semibold text-starta-darkTeal hover:underline">EGX listed companies directory</Link>.
            </p>

            <p className="mt-4 text-xs text-muted">
                Source: Egyptian Exchange via TradingView. Prices refresh every 15 minutes during EGX trading hours
                (Sunday–Thursday). Market caps in Egyptian pounds.
            </p>
        </PublicPageShell>
    );
}
