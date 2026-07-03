import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /about — the entity anchor page: who Starta Markets is, exactly where the
 * data comes from, how fresh it is, and what the platform is not (advice).
 * This page is what search engines, AI engines and journalists resolve the
 * brand against — keep every claim factual.
 */

export const metadata: Metadata = {
    title: 'About Starta Markets — Data Sources & Methodology',
    description:
        'Starta Markets is a bilingual (Arabic/English) market-intelligence platform for the Egyptian Exchange: live EGX prices, 20 years of financials, mutual-fund NAVs, market news and an AI analyst. How our data works and where it comes from.',
    alternates: { canonical: '/about' },
};

const SOURCES: Array<[string, string]> = [
    ['EGX share prices & market data', 'Egyptian Exchange feed via TradingView — refreshed every 15 minutes during trading hours (Sunday–Thursday)'],
    ['Financial statements', 'Company disclosures aggregated via TradingView and Yahoo Finance — up to 20 years of annual statements, refreshed weekly'],
    ['Mutual-fund NAVs & profiles', 'Fund-manager disclosures — NAV history back to 2010, refreshed twice daily'],
    ['Market news', 'Licensed Egyptian financial press coverage in Arabic and English — refreshed throughout the day'],
    ['Technicals & statistics', 'Computed from primary price history (moving averages, RSI, seasonality, valuation ratios)'],
];

export default function AboutPage() {
    return (
        <PublicPageShell>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'AboutPage',
                    name: 'About Starta Markets',
                    url: `${SITE_URL}/about`,
                    mainEntity: { '@id': `${SITE_URL}/#organization` },
                }}
            />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'Home' }, { label: 'About' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'About' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">About Starta Markets</h1>

            <div className="mt-4 max-w-3xl space-y-4 leading-relaxed text-main">
                <p>
                    <strong>Starta Markets</strong> is a bilingual (Arabic/English) market-intelligence platform for
                    the <strong>Egyptian Exchange (EGX)</strong>. It brings together, in one place: live prices and
                    profiles for every listed company, up to 20 years of financial statements, dividend histories,
                    technical indicators and analyst estimates; NAV and performance data for Egyptian mutual funds;
                    Egyptian market news in both languages; a beginner-friendly investing academy; and an AI market
                    analyst you can ask about any EGX stock or fund.
                </p>
                <p dir="rtl" lang="ar" className="rounded-xl bg-surface p-4 text-main ring-1 ring-slate-200">
                    <strong>ستارتا ماركتس</strong> منصة ذكاء مالي ثنائية اللغة (عربي/إنجليزي) للبورصة المصرية: أسعار
                    مباشرة وبيانات مالية تمتد ٢٠ عامًا لكل الشركات المدرجة، وصافي قيمة أصول صناديق الاستثمار المصرية
                    وأداؤها، وأخبار السوق، وأكاديمية تعليمية للمبتدئين، ومحلل ذكي يجيب عن أسئلتك بالعربية أو الإنجليزية.
                </p>
            </div>

            <h2 className="mt-10 text-xl font-bold text-main">Where our data comes from</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[560px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">Dataset</th>
                            <th className="px-4 py-3">Source & freshness</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SOURCES.map(([k, v]) => (
                            <tr key={k} className="border-b border-border/60 last:border-0">
                                <td className="px-4 py-3 font-semibold text-main">{k}</td>
                                <td className="px-4 py-3 text-muted">{v}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h2 className="mt-10 text-xl font-bold text-main">Methodology notes</h2>
            <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 leading-relaxed text-main">
                <li>All figures are in Egyptian pounds (EGP) unless explicitly stated otherwise.</li>
                <li>Every data page carries an &ldquo;as of&rdquo; timestamp (Cairo time) and names its source.</li>
                <li>Fund NAVs shown in headlines are always derived live from the underlying NAV history — the headline can never drift from the chart.</li>
                <li>Derived metrics (returns, ratios, moving averages, RSI, seasonality) are computed from primary price and statement history; we do not hand-edit numbers.</li>
                <li>Automated pipelines monitor data freshness around the clock and alert on staleness or anomalies.</li>
            </ul>

            <h2 className="mt-10 text-xl font-bold text-main">What Starta Markets is not</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-main">
                Starta Markets is an information platform. Nothing on this site is investment advice, a recommendation
                to buy or sell any security, or an offer of brokerage services. Markets involve risk — always do your
                own research and consider consulting a licensed financial advisor regulated by the Egyptian Financial
                Regulatory Authority (FRA).
            </p>

            <h2 className="mt-10 text-xl font-bold text-main">Contact</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-main">
                Questions, corrections or partnerships: <Link href="/contact" className="font-semibold text-starta-teal hover:underline">contact us</Link>. Explore the{' '}
                <Link href="/companies" className="font-semibold text-starta-teal hover:underline">EGX companies directory</Link>,{' '}
                <Link href="/Funds" className="font-semibold text-starta-teal hover:underline">mutual funds</Link> or the{' '}
                <Link href="/Learn" className="font-semibold text-starta-teal hover:underline">investing academy</Link>.
            </p>
        </PublicPageShell>
    );
}
