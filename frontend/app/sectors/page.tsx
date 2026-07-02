import type { Metadata } from 'next';
import Link from 'next/link';
import { getSectors } from '@/lib/public-data';
import { SITE_URL, absUrl, slugify } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /sectors — the EGX sector index hub. Server-rendered list of every sector
 * with company counts and aggregate market caps: the parent hub that makes
 * every /sectors/{slug} page reachable and targets "EGX sectors" queries.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'EGX Sectors — Egyptian Exchange Companies by Sector',
    description:
        'Browse Egyptian Exchange (EGX) companies by sector — company counts and aggregate market caps for every EGX sector, updated daily. قطاعات البورصة المصرية.',
    alternates: { canonical: '/sectors' },
    openGraph: {
        type: 'website',
        title: 'EGX Sectors — Egyptian Exchange Companies by Sector | Starta Markets',
        description:
            'Browse Egyptian Exchange (EGX) companies by sector — company counts and aggregate market caps for every sector.',
        url: '/sectors',
    },
};

const fmtCap = (n: number | null): string => {
    if (n === null || !Number.isFinite(n)) return '—';
    if (n >= 1e9) return `${(n / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 1 })}B`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 1 })}M`;
    return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
};

export default async function SectorsPage() {
    const sectors = await getSectors();
    const totalCompanies = sectors.reduce((sum, s) => sum + (s.companies || 0), 0);

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Egyptian Exchange (EGX) sectors by aggregate market cap',
        numberOfItems: sectors.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: sectors.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: s.sector_name,
            url: absUrl(`/sectors/${slugify(s.sector_name)}`),
        })),
    };

    return (
        <PublicPageShell>
            <JsonLd data={itemListJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [{ url: '/', label: 'Home' }, { label: 'EGX Sectors' }],
                    SITE_URL
                )}
            />
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'EGX Sectors' }]} />

            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Egyptian Exchange (EGX) Sectors</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
                {sectors.length} sectors covering {totalCompanies} companies listed on the Egyptian Exchange,
                ranked by aggregate market capitalization. Click any sector for its full list of companies with
                live prices and market caps. Updated daily.
            </p>
            <p className="mt-1 text-sm text-slate-500" dir="rtl" lang="ar">
                قطاعات البورصة المصرية — عدد الشركات والقيمة السوقية لكل قطاع.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[480px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">Sector</th>
                            <th className="px-4 py-3 text-right">Companies</th>
                            <th className="px-4 py-3 text-right">Market Cap (EGP)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sectors.map((s) => (
                            <tr key={s.sector_name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="px-4 py-2.5">
                                    <Link
                                        href={`/sectors/${slugify(s.sector_name)}`}
                                        className="font-semibold text-slate-800 hover:text-teal-600"
                                    >
                                        {s.sector_name}
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-600">{s.companies}</td>
                                <td className="px-4 py-2.5 text-right">{fmtCap(s.market_cap)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-xs text-slate-500">
                Source: Egyptian Exchange via TradingView, updated daily. Market caps in Egyptian pounds. See also
                the full <Link href="/companies" className="text-teal-600 hover:underline">EGX listed companies directory</Link>.
            </p>
        </PublicPageShell>
    );
}
