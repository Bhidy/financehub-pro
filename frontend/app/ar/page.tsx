import type { Metadata } from 'next';
import Link from 'next/link';
import { getEgx30Index, getMovers, getAllFundsRanked, type Ticker } from '@/lib/public-data';
import { ltrNum } from '@/lib/bidi';
import { SITE_URL, absUrl, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /ar — the Arabic entry hub ("البورصة المصرية اليوم"). Audit: /ar was a live
 * 308→404 loop and the whole Arabic lane had no landing surface. This is the
 * root of the audit's single highest-leverage 90-day gap.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    // The Arabic brand leads: "ستارتا" had 16 impressions at position 6.6 and no
    // clicks in 28 days — the homepage was not being read as the brand entity.
    title: { absolute: 'ستارتا ماركتس | البورصة المصرية اليوم — الأسهم والصناديق والأخبار' },
    description:
        'تابع البورصة المصرية (EGX) اليوم: مؤشر EGX30 المباشر، أسعار الأسهم، الأكثر ارتفاعًا وانخفاضًا، صناديق الاستثمار، وأخبار السوق — بالعربية، محدَّث كل 15 دقيقة.',
    alternates: {
        canonical: '/ar',
        // ABSOLUTE, with the trailing slash: Next.js resolves the relative '/'
        // against metadataBase down to the bare origin ("https://startamarkets.com"),
        // while the static home page emits "https://startamarkets.com/". Two
        // different strings are two different URLs to a crawler, so the pair
        // was not reciprocal and the whole hreflang cluster could be ignored.
        languages: {
            en: 'https://startamarkets.com/',
            ar: 'https://startamarkets.com/ar',
            'x-default': 'https://startamarkets.com/',
        },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'البورصة المصرية اليوم — ستارتا ماركتس',
        description: 'مؤشر EGX30 المباشر وأسعار الأسهم والأكثر نشاطًا وأخبار البورصة المصرية بالعربية.',
        url: '/ar',
        locale: 'ar_EG',
    },
};

const fmt = (n: number | null, d = 2): string =>
    n === null ? '—' : n.toLocaleString('en-EG', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n: number | null): string => (n === null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`);

const HUBS: Array<{ href: string; title: string; desc: string }> = [
    { href: '/ar/companies', title: 'أسهم البورصة المصرية', desc: 'أسعار جميع الشركات المدرجة مرتبة حسب القيمة السوقية' },
    { href: '/ar/markets/egx30', title: 'مؤشر EGX30', desc: 'القيمة المباشرة والتغير والشركات المكونة للمؤشر' },
    { href: '/ar/markets/movers', title: 'الأكثر ارتفاعًا وانخفاضًا', desc: 'أكبر الرابحين والخاسرين والأكثر نشاطًا اليوم' },
    { href: '/ar/sectors', title: 'القطاعات', desc: 'أداء قطاعات البورصة المصرية والشركات في كل قطاع' },
    { href: '/ar/markets/dividend-calendar', title: 'مواعيد توزيعات الأرباح', desc: 'التوزيعات القادمة والأخيرة وتواريخ الاستحقاق' },
    { href: '/ar/markets/top-dividend-yield', title: 'أعلى الأسهم توزيعًا', desc: 'أسهم البورصة المصرية مرتبة حسب عائد التوزيع' },
    { href: '/ar/markets/largest-companies', title: 'أكبر الشركات', desc: 'شركات البورصة المصرية مرتبة حسب القيمة السوقية' },
    { href: '/ar/markets/lowest-pe-stocks', title: 'الأقل مكرر ربحية', desc: 'أرخص أسهم البورصة المصرية حسب مضاعف الأرباح' },
    { href: '/ar/Funds/best-mutual-funds-egypt-2026', title: 'أفضل صناديق الاستثمار', desc: 'ترتيب صناديق الاستثمار المصرية حسب العائد السنوي' },
    { href: '/ar/Learn/glossary', title: 'قاموس المصطلحات', desc: 'شرح مصطلحات الاستثمار والبورصة بالعربية' },
    { href: '/ar/Learn', title: 'أكاديمية التعلم', desc: 'أدلة تعليمية عن الاستثمار والبورصة المصرية' },
];

export default async function ArHome() {
    const [egx30, movers, funds] = await Promise.all([
        getEgx30Index().catch(() => null),
        getMovers().catch(() => ({ gainers: [] as Ticker[], losers: [] as Ticker[], active: [] as Ticker[] })),
        getAllFundsRanked().catch(() => [] as Array<Record<string, unknown>>),
    ]);
    // The homepage's one funds sentence: today's 12-month leader and the size
    // of the ranked universe, from the same rows as the ranking page.
    const ranked = funds.filter((f) => typeof f.return_1y === 'number' && Number.isFinite(f.return_1y as number));
    const leadFund = ranked[0];
    const leadFundName = leadFund ? String(leadFund.fund_name || leadFund.fund_name_en || '') : '';
    const leadFundPct = leadFund ? `${(leadFund.return_1y as number) >= 0 ? '+' : ''}${(leadFund.return_1y as number).toFixed(2)}%` : '';
    const up = (egx30?.change ?? 0) >= 0;
    const topGainers = (movers?.gainers || []).slice(0, 5);

    return (
        <PublicPageShell lang="ar" altHref="/">
            <JsonLd data={breadcrumbJsonLd([{ label: 'البورصة المصرية اليوم' }], SITE_URL)} />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: 'البورصة المصرية اليوم',
                    url: absUrl('/ar'),
                    inLanguage: 'ar',
                    isPartOf: { '@id': `${SITE_URL}/#website` },
                }}
            />
            <Breadcrumbs lang="ar" items={[{ label: 'البورصة المصرية اليوم' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">البورصة المصرية اليوم</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                منصة ستارتا ماركتس لمتابعة <strong>البورصة المصرية (EGX)</strong> بالعربية: أسعار الأسهم المباشرة، ومؤشر EGX30،
                والأكثر ارتفاعًا وانخفاضًا، وصناديق الاستثمار، وأخبار السوق — محدَّثة كل 15 دقيقة خلال ساعات التداول.
            </p>
            {leadFund && leadFundName && (
                <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                    أفضل صندوق استثمار في مصر خلال آخر 12 شهرًا اليوم: <strong>{leadFundName}</strong> بعائد {ltrNum(leadFundPct)}، من بين {ltrNum(String(ranked.length))} صندوقًا مرتبة آليًا حسب العائد في{' '}
                    <Link href="/ar/Funds/best-mutual-funds-egypt-2026" className="font-semibold text-starta-teal hover:underline">أفضل صناديق الاستثمار في مصر 2026</Link>.
                </p>
            )}

            {egx30?.value != null && (
                <Link href="/ar/markets/egx30" className="mt-6 flex flex-wrap items-baseline gap-3 rounded-2xl border border-border bg-surface px-5 py-4 hover:border-starta-teal/50">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted">مؤشر EGX30</span>
                    <span className="text-2xl font-black tabular-nums tracking-tight" dir="ltr">{fmt(egx30.value)}</span>
                    <span className={`text-base font-bold tabular-nums ${up ? 'text-emerald-700' : 'text-rose-600'}`} dir="ltr">
                        {up ? '+' : ''}{fmt(egx30.change)} ({fmtPct(egx30.changePercent)})
                    </span>
                </Link>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {HUBS.map((h) => (
                    <Link key={h.href} href={h.href} className="group rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-starta-teal/50">
                        <div className="font-bold text-main group-hover:text-starta-teal">{h.title}</div>
                        <div className="mt-1 text-sm leading-relaxed text-muted">{h.desc}</div>
                    </Link>
                ))}
            </div>

            {topGainers.length > 0 && (
                <section className="mt-10">
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                        <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                        الأكثر ارتفاعًا اليوم
                    </h2>
                    <ul className="mt-3 flex flex-wrap gap-2">
                        {topGainers.map((t) => (
                            <li key={t.symbol}>
                                <Link href={`/ar/symbol/${t.symbol}`} className="inline-flex items-baseline gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-semibold hover:border-starta-teal/50">
                                    <span className="text-main">{t.name_ar || t.name_en || t.symbol}</span>
                                    <span className="tabular-nums text-emerald-700" dir="ltr">{t.change_percent !== null ? `+${t.change_percent.toFixed(2)}%` : ''}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 text-sm"><Link href="/ar/markets/movers" className="font-semibold text-starta-teal hover:underline">كل الأكثر نشاطًا ←</Link></p>
                </section>
            )}
        </PublicPageShell>
    );
}
