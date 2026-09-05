import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTickers } from '@/lib/public-data';
import { SITE_URL, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/** Arabic twin of /markets/lowest-pe-stocks — "أرخص أسهم البورصة المصرية حسب مكرر الربحية". */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'أرخص أسهم البورصة المصرية حسب مكرر الربحية (P/E) — مرتبة',
    description:
        'أسهم البورصة المصرية (EGX) مرتبة حسب أقل مكرر ربحية (P/E) — فلترة آلية لأرخص الأسهم المصرية من حيث مضاعف الأرباح، بأسعارها المباشرة، محدَّثة يوميًا. معلوماتي وليس توصية.',
    alternates: {
        canonical: '/ar/markets/lowest-pe-stocks',
        languages: { en: '/markets/lowest-pe-stocks', ar: '/ar/markets/lowest-pe-stocks', 'x-default': '/ar/markets/lowest-pe-stocks' },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'أرخص أسهم البورصة المصرية حسب مكرر الربحية | ستارتا ماركتس',
        description: 'أسهم البورصة المصرية مرتبة حسب أقل مكرر ربحية، فلترة قيمة آلية محدَّثة يوميًا.',
        url: '/ar/markets/lowest-pe-stocks',
        locale: 'ar_EG',
    },
};

export default async function LowestPeStocksArPage() {
    const all = await getAllTickers();
    const ranked = all
        .filter((t) => t.pe_ratio !== null && Number.isFinite(t.pe_ratio) && (t.pe_ratio as number) > 0)
        .sort((a, b) => (a.pe_ratio as number) - (b.pe_ratio as number))
        .slice(0, 50);
    const asOf = ranked.reduce<string | null>((mx, t) => (t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx), null);
    const asOfHuman = asOf ? new Date(asOf).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }) : null;

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'أرخص أسهم البورصة المصرية حسب مكرر الربحية',
        numberOfItems: ranked.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: ranked.slice(0, 25).map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name_ar || t.name_en || t.symbol} (${t.symbol})`, url: `${SITE_URL}/ar/symbol/${t.symbol}` })),
    };
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            { '@type': 'Question', name: 'ما هو مكرر الربحية (P/E)؟', acceptedAnswer: { '@type': 'Answer', text: 'مكرر الربحية (سعر السهم إلى ربحيته) هو سعر السهم مقسومًا على ربحية السهم. ويوضح كم يدفع المستثمرون مقابل كل جنيه من أرباح الشركة السنوية — والمضاعف الأقل قد يعني تقييمًا أرخص.' } },
            { '@type': 'Question', name: 'هل انخفاض مكرر الربحية يعني أن السهم رخيص؟', acceptedAnswer: { '@type': 'Answer', text: 'ليس دائمًا. فقد يعكس المكرر المنخفض قيمة حقيقية، أو توقعات بتراجع الأرباح أو مخاطر خاصة بالشركة. ويجب قراءة المكرر مع النمو والديون والقطاع. هذه الصفحة فلترة آلية وليست نصيحة استثمارية.' } },
        ],
    };

    return (
        <PublicPageShell lang="ar" altHref="/markets/lowest-pe-stocks">
            <JsonLd data={itemList} />
            <JsonLd data={faqJsonLd} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { url: '/ar/companies', label: 'الشركات' }, { label: 'الأقل مكرر ربحية' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'الرئيسية' }, { href: '/ar/companies', label: 'الشركات' }, { label: 'الأقل مكرر ربحية' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">أرخص أسهم البورصة المصرية حسب مكرر الربحية</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {ranked.length} سهمًا في البورصة المصرية مرتبة حسب <strong>أقل مكرر ربحية (P/E)</strong> — فلترة قيمة آلية لأرخص الأسهم المصرية من حيث مضاعف الأرباح،
                بأسعارها المباشرة{asOfHuman && <>، بتاريخ {asOfHuman}</>}. تُعرض الشركات الرابحة فقط. الترتيب آلي (تصاعديًا حسب المكرر) — معلوماتي وليس توصية.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">الشركة</th>
                            <th className="px-4 py-3">القطاع</th>
                            <th className="px-4 py-3">السعر</th>
                            <th className="px-4 py-3">مكرر الربحية</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranked.map((t, i) => (
                            <tr key={t.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <td className="px-4 py-2.5 text-muted tabular-nums">{i + 1}</td>
                                <td className="px-4 py-2.5">
                                    <Link href={`/ar/symbol/${t.symbol}`} className="font-semibold text-main hover:text-starta-darkTeal">{t.name_ar || t.name_en || t.symbol}</Link>
                                    <span className="ml-1.5 font-mono text-xs text-muted" dir="ltr">{t.symbol}</span>
                                </td>
                                <td className="px-4 py-2.5 text-muted">{t.sector_name || '—'}</td>
                                <td className="px-4 py-2.5 font-semibold tabular-nums" dir="ltr">{t.last_price !== null ? `${t.last_price.toLocaleString('en-EG', { maximumFractionDigits: 2 })}${t.currency && t.currency !== 'EGP' ? ` ${t.currency}` : ''}` : '—'}</td>
                                <td className="px-4 py-2.5 font-bold tabular-nums text-starta-darkTeal" dir="ltr">{(t.pe_ratio as number).toLocaleString('en-EG', { maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-6 text-sm text-muted">
                اطّلع على <Link href="/ar/markets/largest-companies" className="font-semibold text-starta-darkTeal hover:underline">أكبر شركات البورصة المصرية</Link> أو <Link href="/ar/markets/top-dividend-yield" className="font-semibold text-starta-darkTeal hover:underline">أعلى الأسهم توزيعًا</Link> أو تصفّح <Link href="/ar/companies" className="font-semibold text-starta-darkTeal hover:underline">جميع الشركات</Link>.
            </p>
            <p className="mt-4 text-xs text-muted">المصدر: البورصة المصرية عبر TradingView. مكرر الربحية محسوب على آخر 12 شهرًا مقابل السعر الحالي. الأسعار بالجنيه المصري ما لم يُذكر رمز عملة آخر.</p>
        </PublicPageShell>
    );
}
