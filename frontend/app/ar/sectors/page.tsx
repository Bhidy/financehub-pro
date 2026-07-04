import type { Metadata } from 'next';
import Link from 'next/link';
import { getSectors } from '@/lib/public-data';
import { SITE_URL, absUrl, slugify } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { sectorAr } from '@/content/sector-names-ar';

/** Arabic twin of /sectors — "قطاعات البورصة المصرية". */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'قطاعات البورصة المصرية — الشركات المدرجة حسب القطاع',
    description:
        'تصفح شركات البورصة المصرية (EGX) حسب القطاع — عدد الشركات والقيمة السوقية الإجمالية لكل قطاع، محدَّث يوميًا.',
    alternates: {
        canonical: '/ar/sectors',
        languages: { en: '/sectors', ar: '/ar/sectors', 'x-default': '/sectors' },
    },
    openGraph: {
        type: 'website',
        title: 'قطاعات البورصة المصرية — الشركات حسب القطاع | ستارتا ماركتس',
        description: 'شركات البورصة المصرية حسب القطاع مع عدد الشركات والقيمة السوقية.',
        url: '/ar/sectors',
        locale: 'ar_EG',
    },
};

const fmtCap = (n: number | null): string => {
    if (n === null || !Number.isFinite(n)) return '—';
    if (n >= 1e9) return `${(n / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 1 })} مليار`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 1 })} مليون`;
    return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
};

export default async function SectorsArPage() {
    const sectors = await getSectors();
    const totalCompanies = sectors.reduce((sum, s) => sum + (s.companies || 0), 0);

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'قطاعات البورصة المصرية حسب القيمة السوقية الإجمالية',
        numberOfItems: sectors.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: sectors.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: sectorAr(s.sector_name) || s.sector_name,
            url: absUrl(`/sectors/${slugify(s.sector_name)}`),
        })),
    };

    return (
        <PublicPageShell lang="ar" altHref="/sectors">
            <JsonLd data={itemListJsonLd} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { label: 'القطاعات' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'الرئيسية' }, { label: 'القطاعات' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">قطاعات البورصة المصرية (EGX)</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {sectors.length} قطاعًا تغطي {totalCompanies} شركة مدرجة في البورصة المصرية، مرتبة حسب القيمة السوقية الإجمالية.
                اضغط على أي قطاع لعرض قائمته الكاملة من الشركات بأسعارها المباشرة وقيمها السوقية. محدَّث يوميًا.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[480px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">القطاع</th>
                            <th className="px-4 py-3">عدد الشركات</th>
                            <th className="px-4 py-3">القيمة السوقية (ج.م)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sectors.map((s) => (
                            <tr key={s.sector_name} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <td className="px-4 py-2.5">
                                    <Link href={`/sectors/${slugify(s.sector_name)}`} className="font-semibold text-main hover:text-starta-teal">
                                        {sectorAr(s.sector_name) || s.sector_name}
                                    </Link>
                                </td>
                                <td className="px-4 py-2.5 tabular-nums text-muted" dir="ltr">{s.companies}</td>
                                <td className="px-4 py-2.5 tabular-nums" dir="ltr">{fmtCap(s.market_cap)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <nav aria-label="استكشف" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/ar/companies" className="text-muted hover:text-starta-teal">جميع الشركات</Link>
                <Link href="/ar/markets/movers" className="text-muted hover:text-starta-teal">الأكثر نشاطًا</Link>
                <a href="/sectors" hrefLang="en" className="text-muted hover:text-starta-teal">EGX sectors in English</a>
            </nav>
        </PublicPageShell>
    );
}
