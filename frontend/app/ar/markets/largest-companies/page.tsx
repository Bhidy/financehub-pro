import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTickers } from '@/lib/public-data';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/** Arabic twin of /markets/largest-companies — "أكبر الشركات في البورصة المصرية". */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'أكبر الشركات في البورصة المصرية حسب القيمة السوقية — مرتبة',
    description:
        'أكبر الشركات المدرجة في البورصة المصرية (EGX) مرتبة حسب القيمة السوقية — أضخم الأسهم المصرية بأسعارها المباشرة، محدَّثة يوميًا. الترتيب آلي وليس توصية.',
    alternates: {
        canonical: '/ar/markets/largest-companies',
        languages: { en: '/markets/largest-companies', ar: '/ar/markets/largest-companies', 'x-default': '/markets/largest-companies' },
    },
    openGraph: {
        type: 'website',
        title: 'أكبر الشركات في البورصة المصرية حسب القيمة السوقية | ستارتا ماركتس',
        description: 'أكبر الشركات المدرجة في البورصة المصرية مرتبة حسب القيمة السوقية، محدَّثة يوميًا.',
        url: '/ar/markets/largest-companies',
        locale: 'ar_EG',
    },
};

const fmtCap = (n: number | null): string => {
    if (n === null || !Number.isFinite(n)) return '—';
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)} مليار ج.م`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)} مليون ج.م`;
    return `${n.toLocaleString('en-EG')} ج.م`;
};

export default async function LargestCompaniesArPage() {
    const all = await getAllTickers();
    const ranked = all
        .filter((t) => t.market_cap !== null && Number.isFinite(t.market_cap) && (t.market_cap as number) > 0)
        .sort((a, b) => (b.market_cap as number) - (a.market_cap as number))
        .slice(0, 50);
    const asOf = ranked.reduce<string | null>((mx, t) => (t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx), null);
    const asOfHuman = asOf ? new Date(asOf).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }) : null;

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'أكبر الشركات في البورصة المصرية حسب القيمة السوقية',
        numberOfItems: ranked.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: ranked.slice(0, 25).map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name_ar || t.name_en || t.symbol} (${t.symbol})`, url: `${SITE_URL}/ar/symbol/${t.symbol}` })),
    };
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            { '@type': 'Question', name: 'ما هي أكبر شركة في البورصة المصرية؟', acceptedAnswer: { '@type': 'Answer', text: ranked[0] ? `من حيث القيمة السوقية، أكبر شركة مدرجة في البورصة المصرية هي ${ranked[0].name_ar || ranked[0].name_en || ranked[0].symbol} (${ranked[0].symbol})، بقيمة سوقية نحو ${fmtCap(ranked[0].market_cap)}${asOfHuman ? ` بتاريخ ${asOfHuman}` : ''}.` : 'تُرتَّب أكبر شركات البورصة المصرية حسب القيمة السوقية في هذه الصفحة، وتُحدَّث مع بيانات السوق.' } },
            { '@type': 'Question', name: 'ما هي القيمة السوقية؟', acceptedAnswer: { '@type': 'Answer', text: 'القيمة السوقية هي إجمالي القيمة السوقية لأسهم الشركة المدرجة — أي سعر السهم مضروبًا في عدد الأسهم المصدرة. وهي المقياس الأكثر شيوعًا لحجم الشركة المدرجة.' } },
        ],
    };

    return (
        <PublicPageShell lang="ar" altHref="/markets/largest-companies">
            <JsonLd data={itemList} />
            <JsonLd data={faqJsonLd} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { url: '/ar/companies', label: 'الشركات' }, { label: 'الأكبر حسب القيمة السوقية' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'الرئيسية' }, { href: '/ar/companies', label: 'الشركات' }, { label: 'الأكبر حسب القيمة السوقية' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">أكبر الشركات في البورصة المصرية حسب القيمة السوقية</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                أكبر {ranked.length} شركة مدرجة في <strong>البورصة المصرية (EGX)</strong> مرتبة حسب <strong>القيمة السوقية</strong> —
                أضخم الأسهم المصرية بأسعارها المباشرة{asOfHuman && <>، بتاريخ {asOfHuman}</>}. الترتيب آلي (تنازليًا حسب القيمة السوقية) ويُحدَّث مع بيانات السوق. وهو معلوماتي وليس توصية.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">الشركة</th>
                            <th className="px-4 py-3">القطاع</th>
                            <th className="px-4 py-3">السعر</th>
                            <th className="px-4 py-3">القيمة السوقية</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranked.map((t, i) => (
                            <tr key={t.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <td className="px-4 py-2.5 text-muted tabular-nums">{i + 1}</td>
                                <td className="px-4 py-2.5">
                                    <Link href={`/ar/symbol/${t.symbol}`} className="font-semibold text-main hover:text-starta-teal">{t.name_ar || t.name_en || t.symbol}</Link>
                                    <span className="ml-1.5 font-mono text-xs text-muted" dir="ltr">{t.symbol}</span>
                                </td>
                                <td className="px-4 py-2.5 text-muted">{t.sector_name || '—'}</td>
                                <td className="px-4 py-2.5 font-semibold tabular-nums" dir="ltr">{t.last_price !== null ? `${t.last_price.toLocaleString('en-EG', { maximumFractionDigits: 2 })}${t.currency && t.currency !== 'EGP' ? ` ${t.currency}` : ''}` : '—'}</td>
                                <td className="px-4 py-2.5 font-bold tabular-nums" dir="ltr">{fmtCap(t.market_cap)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-6 text-sm text-muted">
                تصفّح <Link href="/ar/companies" className="font-semibold text-starta-teal hover:underline">جميع شركات البورصة المصرية</Link> أو <Link href="/ar/markets/egx30" className="font-semibold text-starta-teal hover:underline">مؤشر EGX30</Link> أو <Link href="/ar/markets/top-dividend-yield" className="font-semibold text-starta-teal hover:underline">أعلى الأسهم توزيعًا</Link>.
            </p>
            <p className="mt-4 text-xs text-muted">المصدر: البورصة المصرية عبر TradingView. القيمة السوقية بالجنيه المصري. الأسعار بالجنيه المصري ما لم يُذكر رمز عملة آخر.</p>
        </PublicPageShell>
    );
}
