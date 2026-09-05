import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTickers } from '@/lib/public-data';
import { SITE_URL, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/** Arabic twin of /markets/top-dividend-yield — "أعلى الأسهم توزيعًا للأرباح". */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'أعلى الأسهم توزيعًا للأرباح في البورصة المصرية — مرتبة',
    description:
        'أسهم البورصة المصرية (EGX) مرتبة حسب عائد التوزيع — أعلى الأسهم المصرية توزيعًا للأرباح بأسعارها المباشرة، محدَّثة يوميًا. الترتيب آلي وليس توصية.',
    alternates: {
        canonical: '/ar/markets/top-dividend-yield',
        languages: { en: '/markets/top-dividend-yield', ar: '/ar/markets/top-dividend-yield', 'x-default': '/ar/markets/top-dividend-yield' },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'أعلى الأسهم توزيعًا للأرباح في البورصة المصرية | ستارتا ماركتس',
        description: 'أسهم البورصة المصرية مرتبة حسب عائد التوزيع، محدَّثة يوميًا.',
        url: '/ar/markets/top-dividend-yield',
        locale: 'ar_EG',
    },
};

// عائد توزيع تجاوز 100% غير منطقي (يعني توزيع أكثر من كامل سعر السهم في سنة) —
// وهو أثر بيانات (توزيع خاص/عائد رأس مال أو سعر قديم)، لا عائد متكرر. استبعاده
// يحافظ على مصداقية الترتيب وبيانات ItemList. تدقيق 2026-07-04: SAIB=761%، SEIGA=215%.
const MAX_PLAUSIBLE_YIELD = 100;

export default async function TopDividendYieldArPage() {
    const all = await getAllTickers();
    const ranked = all
        .filter((t) => t.dividend_yield !== null && Number.isFinite(t.dividend_yield) && (t.dividend_yield as number) > 0 && (t.dividend_yield as number) <= MAX_PLAUSIBLE_YIELD)
        .sort((a, b) => (b.dividend_yield as number) - (a.dividend_yield as number))
        .slice(0, 50);
    const asOf = ranked.reduce<string | null>((mx, t) => (t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx), null);
    const asOfHuman = asOf ? new Date(asOf).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }) : null;

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'أعلى الأسهم توزيعًا للأرباح في البورصة المصرية',
        numberOfItems: ranked.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: ranked.slice(0, 25).map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name_ar || t.name_en || t.symbol} (${t.symbol})`, url: `${SITE_URL}/ar/symbol/${t.symbol}` })),
    };

    return (
        <PublicPageShell lang="ar" altHref="/markets/top-dividend-yield">
            <JsonLd data={itemList} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { label: 'أعلى توزيعات الأرباح' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'الرئيسية' }, { label: 'أعلى توزيعات الأرباح' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">أعلى الأسهم توزيعًا للأرباح في البورصة المصرية</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {ranked.length} سهمًا في البورصة المصرية مرتبة حسب <strong>عائد التوزيع</strong> — أعلى الأسهم المصرية توزيعًا للأرباح بأسعارها المباشرة{asOfHuman && <>، بتاريخ {asOfHuman}</>}. الترتيب آلي (تنازليًا حسب العائد) ويُحدَّث مع بيانات السوق. وهو معلوماتي وليس توصية.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">الشركة</th>
                            <th className="px-4 py-3">القطاع</th>
                            <th className="px-4 py-3">السعر</th>
                            <th className="px-4 py-3">عائد التوزيع</th>
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
                                <td className="px-4 py-2.5 font-bold tabular-nums text-emerald-700" dir="ltr">{(t.dividend_yield as number).toLocaleString('en-EG', { maximumFractionDigits: 2 })}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-6 text-sm text-muted">
                اطّلع على <Link href="/ar/markets/dividend-calendar" className="font-semibold text-starta-teal hover:underline">مواعيد توزيعات الأرباح</Link> أو <Link href="/ar/markets/largest-companies" className="font-semibold text-starta-teal hover:underline">أكبر الشركات حسب القيمة السوقية</Link> أو <Link href="/ar/markets/lowest-pe-stocks" className="font-semibold text-starta-teal hover:underline">الأقل مكرر ربحية</Link> أو تصفّح <Link href="/ar/companies" className="font-semibold text-starta-teal hover:underline">جميع الشركات</Link>.
            </p>
            <p className="mt-4 text-xs text-muted">المصدر: البورصة المصرية عبر TradingView. عائد التوزيع محسوب على آخر 12 شهرًا مقابل السعر الحالي. تُستبعد العوائد التي تتجاوز 100% باعتبارها غير متكررة أو أثر بيانات (كالتوزيعات الخاصة). الأسعار بالجنيه المصري ما لم يُذكر رمز عملة آخر.</p>
        </PublicPageShell>
    );
}
