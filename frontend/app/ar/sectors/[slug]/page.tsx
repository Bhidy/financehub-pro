import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllTickers, getSectors } from '@/lib/public-data';
import { SITE_URL, slugify } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { sectorAr } from '@/content/sector-names-ar';

/** Arabic twin of /sectors/{slug}. Slug is derived from the English
 * sector_name (same rule as EN), so both trees resolve identically. */

export const dynamic = 'force-dynamic';

function decodeSlug(raw: string): string {
    try { return decodeURIComponent(raw); } catch { return raw; }
}

async function resolveSector(rawSlug: string): Promise<{ sector_name: string; companies: number; market_cap: number | null } | null> {
    const slug = decodeSlug(rawSlug);
    const sectors = await getSectors();
    return sectors.find((s) => slugify(s.sector_name) === slug) || null;
}

const fmtCap = (n: number | null): string => {
    if (n === null || !Number.isFinite(n)) return '—';
    if (n >= 1e9) return `${(n / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 1 })} مليار`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 1 })} مليون`;
    return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const match = await resolveSector(slug);
    if (!match) return { title: 'القطاع غير موجود', robots: { index: false, follow: false } };
    const ar = sectorAr(match.sector_name) || match.sector_name;
    const canonical = `/ar/sectors/${slugify(match.sector_name)}`;
    const description = `شركات قطاع ${ar} المدرجة في البورصة المصرية (EGX) — الأسعار المباشرة والقيمة السوقية، محدَّثة يوميًا.`.slice(0, 160);
    return {
        title: `أسهم قطاع ${ar} في البورصة المصرية — الأسعار والقيمة السوقية`,
        description,
        alternates: {
            canonical,
            languages: { en: `/sectors/${slugify(match.sector_name)}`, ar: canonical, 'x-default': `/sectors/${slugify(match.sector_name)}` },
        },
        openGraph: { type: 'website', title: `أسهم قطاع ${ar} في البورصة المصرية | ستارتا ماركتس`, description, url: canonical, locale: 'ar_EG' },
    };
}

export default async function SectorArPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const match = await resolveSector(slug);
    if (!match) notFound();
    const ar = sectorAr(match.sector_name) || match.sector_name;
    const tickers = (await getAllTickers()).filter((t) => t.sector_name === match.sector_name);
    const asOf = tickers.reduce<string | null>((mx, t) => (t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx), null);
    const asOfHuman = asOf ? new Date(asOf).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }) : null;

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `قطاع ${ar} — شركات البورصة المصرية حسب القيمة السوقية`,
        numberOfItems: tickers.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: tickers.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name_ar || t.name_en || t.symbol} (${t.symbol})`, url: `${SITE_URL}/ar/symbol/${t.symbol}` })),
    };

    return (
        <PublicPageShell lang="ar" altHref={`/sectors/${slugify(match.sector_name)}`}>
            <JsonLd data={itemListJsonLd} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { url: '/ar/sectors', label: 'القطاعات' }, { label: ar }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'الرئيسية' }, { href: '/ar/sectors', label: 'القطاعات' }, { label: ar }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">قطاع {ar} — الشركات المدرجة في البورصة المصرية</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {tickers.length} شركة في قطاع {ar} مدرجة في البورصة المصرية، مرتبة حسب القيمة السوقية
                {match.market_cap !== null && Number.isFinite(match.market_cap) && (<> — بإجمالي قيمة سوقية {fmtCap(match.market_cap)} ج.م</>)}.
                اضغط على أي شركة لعرض ملفها الكامل. محدَّث يوميًا{asOfHuman && <>؛ الأسعار بتاريخ {asOfHuman}</>}.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">الشركة</th>
                            <th className="px-4 py-3">الرمز</th>
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
                                    <Link href={`/ar/symbol/${t.symbol}`} className="font-semibold text-main hover:text-starta-teal">{t.name_ar || t.name_en || t.symbol}</Link>
                                </td>
                                <td className="px-4 py-2.5 font-mono font-semibold text-muted" dir="ltr">
                                    <Link href={`/ar/symbol/${t.symbol}`} className="hover:text-starta-teal">{t.symbol}</Link>
                                </td>
                                <td className="px-4 py-2.5 font-semibold tabular-nums" dir="ltr">{t.last_price !== null ? `${t.last_price.toLocaleString('en-EG', { maximumFractionDigits: 2 })}${t.currency && t.currency !== 'EGP' ? ` ${t.currency}` : ''}` : '—'}</td>
                                <td className={`px-4 py-2.5 font-semibold tabular-nums ${t.change_percent === null ? 'text-muted' : t.change_percent >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">{t.change_percent !== null ? `${t.change_percent >= 0 ? '+' : ''}${t.change_percent.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%` : '—'}</td>
                                <td className="px-4 py-2.5 tabular-nums" dir="ltr">{fmtCap(t.market_cap)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <nav aria-label="استكشف" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/ar/sectors" className="text-muted hover:text-starta-teal">كل القطاعات</Link>
                <Link href="/ar/companies" className="text-muted hover:text-starta-teal">جميع الشركات</Link>
                <a href={`/sectors/${slugify(match.sector_name)}`} hrefLang="en" className="text-muted hover:text-starta-teal">This sector in English</a>
            </nav>
        </PublicPageShell>
    );
}
