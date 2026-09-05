import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTickers } from '@/lib/public-data';
import { SITE_URL, symbolPath, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { sectorAr } from '@/content/sector-names-ar';

/** Arabic twin of /companies — "أسهم البورصة المصرية". Audit #1 gap: the AR lane. */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'أسهم البورصة المصرية — أسعار جميع الشركات المدرجة اليوم',
    description:
        'دليل كامل لجميع الشركات المدرجة في البورصة المصرية (EGX) مرتبة حسب القيمة السوقية — الأسعار المباشرة والقطاعات والقيمة السوقية، محدَّث يوميًا.',
    alternates: {
        canonical: '/ar/companies',
        languages: { en: '/companies', ar: '/ar/companies', 'x-default': '/ar/companies' },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'أسهم البورصة المصرية — أسعار جميع الشركات المدرجة | ستارتا ماركتس',
        description: 'دليل كامل لأسهم البورصة المصرية مع الأسعار المباشرة والقطاعات والقيمة السوقية.',
        url: '/ar/companies',
        locale: 'ar_EG',
    },
};

const fmtCap = (n: number | null): string => {
    if (n === null || !Number.isFinite(n)) return '—';
    if (n >= 1e9) return `${(n / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 1 })} مليار`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 1 })} مليون`;
    return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
};

export default async function CompaniesArPage() {
    const tickers = await getAllTickers();
    const asOf = tickers.reduce<string | null>((mx, t) => (t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx), null);
    const asOfHuman = asOf ? new Date(asOf).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }) : null;

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'الشركات المدرجة في البورصة المصرية — أكبر 100 شركة بالقيمة السوقية',
        numberOfItems: Math.min(tickers.length, 100),
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: tickers.slice(0, 100).map((t, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `${t.name_ar || t.name_en || t.symbol} (${t.symbol})`,
            url: `${SITE_URL}/ar/symbol/${t.symbol}`,
        })),
    };

    return (
        <PublicPageShell lang="ar" altHref="/companies">
            <JsonLd data={itemListJsonLd} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { label: 'أسهم البورصة المصرية' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'الرئيسية' }, { label: 'أسهم البورصة المصرية' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">أسهم البورصة المصرية (EGX)</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                جميع الشركات الـ{tickers.length} المدرجة في البورصة المصرية بأسعارها المباشرة، مرتبة حسب القيمة السوقية. اضغط على أي شركة
                لعرض ملفها الكامل: الرسم البياني للسعر، وأهم الإحصاءات، والقوائم المالية، والتوزيعات، والتحليل الفني، والأخبار — بالعربية والإنجليزية.
                {asOfHuman && <> محدَّث يوميًا؛ الأسعار بتاريخ {asOfHuman}.</>}
            </p>

            <nav aria-label="تصنيفات البورصة المصرية" className="mt-5 flex flex-wrap gap-2 text-sm">
                <Link href="/ar/markets/largest-companies" className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">الأكبر حسب القيمة السوقية</Link>
                <Link href="/ar/markets/top-dividend-yield" className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">أعلى توزيعات الأرباح</Link>
                <Link href="/ar/markets/lowest-pe-stocks" className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">الأقل مكرر ربحية</Link>
                <Link href="/ar/markets/movers" className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">الأكثر نشاطًا</Link>
                <Link href="/ar/markets/egx30" className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">مؤشر EGX30</Link>
            </nav>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">الشركة</th>
                            <th className="px-4 py-3">الرمز</th>
                            <th className="px-4 py-3">القطاع</th>
                            <th className="px-4 py-3">السعر</th>
                            <th className="px-4 py-3">التغير</th>
                            <th className="px-4 py-3">القيمة السوقية (ج.م)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickers.map((t, i) => (
                            <tr key={t.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <td className="px-4 py-2.5 text-muted tabular-nums">{i + 1}</td>
                                <td className="px-4 py-2.5">
                                    <Link href={`/ar/symbol/${t.symbol}`} className="font-semibold text-main hover:text-starta-darkTeal">
                                        {t.name_ar || t.name_en || t.symbol}
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5 font-mono font-semibold text-muted" dir="ltr">
                                    <Link href={`/ar/symbol/${t.symbol}`} className="hover:text-starta-darkTeal">{t.symbol}</Link>
                                </td>
                                <td className="px-4 py-2.5 text-muted">{sectorAr(t.sector_name) || '—'}</td>
                                <td className="px-4 py-2.5 font-semibold tabular-nums" dir="ltr">
                                    {t.last_price !== null ? `${t.last_price.toLocaleString('en-EG', { maximumFractionDigits: 2 })}${t.currency && t.currency !== 'EGP' ? ` ${t.currency}` : ''}` : '—'}
                                </td>
                                <td className={`px-4 py-2.5 font-semibold tabular-nums ${t.change_percent === null ? 'text-muted' : t.change_percent >= 0 ? 'text-emerald-700' : 'text-red-600'}`} dir="ltr">
                                    {t.change_percent !== null ? `${t.change_percent >= 0 ? '+' : ''}${t.change_percent.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%` : '—'}
                                </td>
                                <td className="px-4 py-2.5 tabular-nums" dir="ltr">{fmtCap(t.market_cap)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-xs text-muted">
                المصدر: البورصة المصرية عبر TradingView. تُحدَّث الأسعار كل 15 دقيقة خلال ساعات التداول (الأحد–الخميس). القيم السوقية بالجنيه المصري.
            </p>

            <nav aria-label="استكشف" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/ar/sectors" className="text-muted hover:text-starta-darkTeal">القطاعات</Link>
                <Link href="/ar/markets/movers" className="text-muted hover:text-starta-darkTeal">الأكثر ارتفاعًا وانخفاضًا</Link>
                <Link href="/ar/markets/egx30" className="text-muted hover:text-starta-darkTeal">مؤشر EGX30</Link>
                <a href="/companies" hrefLang="en" className="text-muted hover:text-starta-darkTeal">EGX companies in English</a>
            </nav>
        </PublicPageShell>
    );
}
