import type { Metadata } from 'next';
import Link from 'next/link';
import { getMovers, type Ticker } from '@/lib/public-data';
import { SITE_URL, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/** Arabic twin of /markets/movers — "الأكثر ارتفاعًا وانخفاضًا". */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'الأكثر ارتفاعًا وانخفاضًا في البورصة المصرية اليوم',
    description:
        'أكبر الرابحين والخاسرين والأسهم الأكثر نشاطًا في البورصة المصرية (EGX) اليوم حسب نسبة التغير وحجم التداول — محدَّث كل 15 دقيقة.',
    alternates: {
        canonical: '/ar/markets/movers',
        languages: { en: '/markets/movers', ar: '/ar/markets/movers', 'x-default': '/ar/markets/movers' },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'الأكثر ارتفاعًا وانخفاضًا في البورصة المصرية | ستارتا ماركتس',
        description: 'أكبر الرابحين والخاسرين والأكثر نشاطًا في البورصة المصرية اليوم.',
        url: '/ar/markets/movers',
        locale: 'ar_EG',
    },
};

const fmtPrice = (n: number | null): string => (n !== null && Number.isFinite(n) ? n.toLocaleString('en-EG', { maximumFractionDigits: 2 }) : '—');
const fmtChange = (n: number | null): string => (n !== null && Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%` : '—');
const fmtVolume = (n: number | null): string => (n !== null && Number.isFinite(n) ? n.toLocaleString('en-EG', { maximumFractionDigits: 0 }) : '—');

function MoversTable({ rows, showVolume = false }: { rows: Ticker[]; showVolume?: boolean }) {
    if (rows.length === 0) return <p className="mt-3 text-sm text-muted">لا توجد بيانات متاحة حاليًا.</p>;
    return (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className={`w-full ${showVolume ? 'min-w-[600px]' : 'min-w-[520px]'} text-sm`}>
                <thead>
                    <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                        <th className="px-4 py-3">الشركة</th>
                        <th className="px-4 py-3">الرمز</th>
                        <th className="px-4 py-3">السعر</th>
                        <th className="px-4 py-3">التغير %</th>
                        {showVolume && <th className="px-4 py-3">الحجم</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((t) => (
                        <tr key={t.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                            <td className="px-4 py-2.5">
                                <Link href={`/ar/symbol/${t.symbol}`} className="font-semibold text-main hover:text-starta-darkTeal">{t.name_ar || t.name_en || t.symbol}</Link>
                            </td>
                            <td className="px-4 py-2.5 font-mono font-semibold text-muted" dir="ltr">
                                <Link href={`/ar/symbol/${t.symbol}`} className="hover:text-starta-darkTeal">{t.symbol}</Link>
                            </td>
                            <td className="px-4 py-2.5 font-semibold tabular-nums" dir="ltr">{fmtPrice(t.last_price)}{t.last_price !== null && t.currency && t.currency !== 'EGP' ? ` ${t.currency}` : ''}</td>
                            <td className={`px-4 py-2.5 font-semibold tabular-nums ${t.change_percent === null ? 'text-muted' : t.change_percent >= 0 ? 'text-emerald-700' : 'text-red-600'}`} dir="ltr">{fmtChange(t.change_percent)}</td>
                            {showVolume && <td className="px-4 py-2.5 tabular-nums" dir="ltr">{fmtVolume(t.volume)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default async function MoversArPage() {
    const { gainers, losers, active } = await getMovers(10);
    const asOf = [...gainers, ...losers, ...active].reduce<string | null>((mx, t) => (t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx), null);
    const asOfHuman = asOf ? new Date(asOf).toLocaleString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Cairo' }) : null;

    return (
        <PublicPageShell lang="ar" altHref="/markets/movers">
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { url: '/ar/markets', label: 'بيانات السوق' }, { label: 'الأكثر نشاطًا' }], SITE_URL)} />
            <Breadcrumbs lang="ar" items={[{ href: '/', label: 'الرئيسية' }, { href: '/ar/markets', label: 'بيانات السوق' }, { label: 'الأكثر نشاطًا' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">الأكثر ارتفاعًا وانخفاضًا في البورصة المصرية اليوم</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                أكبر التحركات في البورصة المصرية اليوم: الأسهم الأكثر ارتفاعًا وانخفاضًا حسب نسبة التغير، والأكثر تداولًا حسب الحجم. اضغط على أي شركة لعرض ملفها الكامل.
            </p>
            <p className="mt-2 text-sm text-muted">{asOfHuman && <>آخر تحديث {asOfHuman} (بتوقيت القاهرة). </>}تُحدَّث الأسعار كل 15 دقيقة خلال ساعات التداول (الأحد–الخميس).</p>

            <section className="mt-8"><h2 className="text-xl font-bold text-main">الأكثر ارتفاعًا</h2><MoversTable rows={gainers} /></section>
            <section className="mt-8"><h2 className="text-xl font-bold text-main">الأكثر انخفاضًا</h2><MoversTable rows={losers} /></section>
            <section className="mt-8"><h2 className="text-xl font-bold text-main">الأكثر نشاطًا حسب الحجم</h2><MoversTable rows={active} showVolume /></section>

            <p className="mt-6 text-sm text-muted">
                تصفح <Link href="/ar/companies" className="font-semibold text-starta-darkTeal hover:underline">دليل أسهم البورصة المصرية</Link> أو الشركات <Link href="/ar/sectors" className="font-semibold text-starta-darkTeal hover:underline">حسب القطاع</Link>.
            </p>
        </PublicPageShell>
    );
}
