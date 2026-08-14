import type { Metadata } from 'next';
import Link from 'next/link';
import { getEgx30Index, getEgx30Constituents, type Ticker } from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/** Arabic twin of /markets/egx30 — "مؤشر EGX30 اليوم". */

// force-dynamic: non-dynamic hub route — must NOT prerender at build
// (no DATABASE_URL at build). Vercel still edge-caches via next.config
// s-maxage header; freshness comes from per-request render.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'مؤشر EGX30 اليوم — القيمة المباشرة والتغير والشركات المكونة',
    description:
        'مؤشر EGX30 — المؤشر الرئيسي للبورصة المصرية — قيمته المباشرة والتغير اليومي والنطاق السنوي والشركات الثلاثين المكونة له، محدث خلال جلسة التداول.',
    alternates: {
        canonical: '/ar/markets/egx30',
        languages: { en: '/markets/egx30', ar: '/ar/markets/egx30', 'x-default': '/ar/markets/egx30' },
    },
    openGraph: {
        type: 'website',
        title: 'مؤشر EGX30 اليوم — القيمة المباشرة والشركات المكونة | ستارتا ماركتس',
        description: 'القيمة المباشرة لمؤشر EGX30 والتغير اليومي والشركات الثلاثين المكونة له.',
        url: '/ar/markets/egx30',
        locale: 'ar_EG',
    },
};

const fmt = (n: number | null, d = 2): string =>
    n === null ? '—' : n.toLocaleString('en-EG', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n: number | null): string => (n === null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`);
const fmtCap = (n: number | null): string => {
    if (n === null) return '—';
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)} مليار ج.م`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)} مليون ج.م`;
    return `${n.toLocaleString('en-EG')} ج.م`;
};

export default async function Egx30ArPage() {
    const [quote, constituents] = await Promise.all([
        getEgx30Index().catch(() => null),
        getEgx30Constituents().catch(() => [] as Ticker[]),
    ]);

    const asOf = quote?.timestamp
        ? new Date(quote.timestamp).toLocaleString('ar-EG-u-nu-latn', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
          })
        : null;
    const up = (quote?.change ?? 0) >= 0;

    const datasetJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'مؤشر EGX30 — القيمة والشركات المكونة',
        description: 'القيمة المباشرة والتغير اليومي والشركات المكونة لمؤشر EGX30 الرئيسي للبورصة المصرية.',
        url: absUrl('/ar/markets/egx30'),
        creator: { '@id': `${SITE_URL}/#organization`, '@type': 'Organization', name: 'Starta Markets' },
        ...(quote?.timestamp ? { dateModified: new Date(quote.timestamp).toISOString() } : {}),
        inLanguage: 'ar',
        license: `${SITE_URL}/terms`,
    };
    const faq = [
        {
            q: 'كم يبلغ مؤشر EGX30 اليوم؟',
            a: quote?.value != null
                ? `يبلغ مؤشر EGX30 نحو ${fmt(quote.value)} نقطة${quote.changePercent != null ? `، ${up ? 'مرتفعًا' : 'منخفضًا'} بنسبة ${fmtPct(quote.changePercent)} خلال الجلسة` : ''}${asOf ? ` (بتاريخ ${asOf} بتوقيت القاهرة)` : ''}.`
                : 'مؤشر EGX30 هو المؤشر الرئيسي للبورصة المصرية ويقيس أداء أكبر 30 شركة مدرجة من حيث القيمة السوقية والسيولة.',
        },
        {
            q: 'ما هو مؤشر EGX30؟',
            a: 'مؤشر EGX30 هو المؤشر الرئيسي للبورصة المصرية، ويقيس أداء أكبر 30 شركة من حيث القيمة السوقية والأكثر تداولًا في بورصة القاهرة، مرجحًا بالقيمة السوقية للأسهم الحرة ومقومًا بالجنيه المصري.',
        },
    ];
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    };

    return (
        <PublicPageShell lang="ar" altHref="/markets/egx30">
            <JsonLd data={datasetJsonLd} />
            <JsonLd data={faqJsonLd} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { label: 'مؤشر EGX30' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'الرئيسية' }, { label: 'مؤشر EGX30' }]} />

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">مؤشر EGX30 اليوم</h1>

            {quote?.value != null ? (
                <div className="mt-4 flex flex-wrap items-baseline gap-4" dir="ltr">
                    <span className="text-4xl font-black tabular-nums tracking-tight">{fmt(quote.value)}</span>
                    {quote.change != null && (
                        <span className={`text-xl font-bold tabular-nums ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {up ? '+' : ''}{fmt(quote.change)} ({fmtPct(quote.changePercent)})
                        </span>
                    )}
                </div>
            ) : (
                <p className="mt-4 text-muted">قيمة المؤشر المباشرة غير متاحة حاليًا — اطّلع على الشركات المكونة والمنهجية أدناه.</p>
            )}
            {asOf && <p className="mt-1 text-xs text-muted">آخر تحديث {asOf} (بتوقيت القاهرة). التأخير حتى 15 دقيقة.</p>}

            <p className="mt-5 max-w-3xl leading-relaxed text-muted">
                <strong>مؤشر EGX30</strong> هو المؤشر الرئيسي لـ<strong>البورصة المصرية</strong>، ويتتبع أكبر 30 شركة وأكثرها تداولًا في بورصة القاهرة،
                مرجحًا بالقيمة السوقية للأسهم الحرة ومقومًا بالجنيه المصري
                {quote?.value != null && (
                    <>. ويبلغ حاليًا <strong>{fmt(quote.value)} نقطة</strong>{quote.ytdPct != null ? <>، {quote.ytdPct >= 0 ? 'مرتفعًا' : 'منخفضًا'} بنسبة <strong>{fmtPct(quote.ytdPct)}</strong> منذ بداية العام</> : null}</>
                )}.
            </p>

            {constituents.length > 0 && (
                <section className="mt-10">
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                        <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                        الشركات المكونة لمؤشر EGX30 حسب القيمة السوقية
                    </h2>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">الشركة</th>
                                    <th className="px-4 py-3">السعر</th>
                                    <th className="px-4 py-3">التغير</th>
                                    <th className="px-4 py-3">القيمة السوقية</th>
                                </tr>
                            </thead>
                            <tbody>
                                {constituents.map((c, i) => (
                                    <tr key={c.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                        <td className="px-4 py-2.5 text-muted tabular-nums">{i + 1}</td>
                                        <td className="px-4 py-2.5">
                                            <Link href={`/ar/symbol/${c.symbol}`} className="font-semibold text-main hover:text-starta-teal">
                                                {c.name_ar || c.name_en || c.symbol} <span dir="ltr" className="text-muted">({c.symbol})</span>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2.5 tabular-nums" dir="ltr">{c.last_price !== null ? `${c.currency || 'EGP'} ${fmt(c.last_price)}` : '—'}</td>
                                        <td className={`px-4 py-2.5 tabular-nums font-semibold ${(c.change_percent ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">{c.change_percent !== null ? fmtPct(c.change_percent) : '—'}</td>
                                        <td className="px-4 py-2.5 tabular-nums text-muted" dir="ltr">{fmtCap(c.market_cap)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-xs text-muted">الشركات المعروضة هي أكبر 30 شركة بالقيمة السوقية كمؤشر تقريبي لعضوية المؤشر؛ العضوية الرسمية تحددها البورصة المصرية. الأسعار عبر TradingView بتأخير حتى 15 دقيقة.</p>
                </section>
            )}

            <section className="mt-10">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight"><span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />الأسئلة الشائعة</h2>
                <dl className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
                    {faq.map((f) => (
                        <div key={f.q} className="px-5 py-4">
                            <dt className="text-[15px] font-bold tracking-tight text-main">{f.q}</dt>
                            <dd className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">{f.a}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <nav aria-label="استكشف" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/ar/companies" className="text-muted hover:text-starta-teal">جميع شركات البورصة المصرية</Link>
                <Link href="/ar/markets/movers" className="text-muted hover:text-starta-teal">الأكثر ارتفاعًا وانخفاضًا</Link>
                <a href="/markets/egx30" hrefLang="en" className="text-muted hover:text-starta-teal">EGX 30 in English</a>
            </nav>
        </PublicPageShell>
    );
}
