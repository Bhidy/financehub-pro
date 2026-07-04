import type { Metadata } from 'next';
import Link from 'next/link';
import { getDividendCalendar } from '@/lib/public-data';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/** Arabic twin of /markets/dividend-calendar — "مواعيد توزيعات الأرباح". */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'مواعيد توزيعات الأرباح في البورصة المصرية — التواريخ والمبالغ',
    description:
        'توزيعات الأرباح القادمة والأخيرة في البورصة المصرية (EGX): تواريخ عدم الأحقية والمبالغ لكل سهم وتواريخ الصرف لشركات البورصة. محدَّث مع بيانات السوق.',
    alternates: {
        canonical: '/ar/markets/dividend-calendar',
        languages: { en: '/markets/dividend-calendar', ar: '/ar/markets/dividend-calendar', 'x-default': '/markets/dividend-calendar' },
    },
    openGraph: {
        type: 'website',
        title: 'مواعيد توزيعات الأرباح في البورصة المصرية | ستارتا ماركتس',
        description: 'توزيعات الأرباح القادمة والأخيرة في البورصة المصرية بتواريخ عدم الأحقية والمبالغ.',
        url: '/ar/markets/dividend-calendar',
        locale: 'ar_EG',
    },
};

type Row = Record<string, unknown>;
const str = (row: Row, key: string): string | null => {
    const v = row[key];
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
};
const num = (row: Row, key: string): number | null => {
    const v = row[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') { const n = Number(v); return Number.isFinite(n) ? n : null; }
    return null;
};
const unixDate = (row: Row, key: string): string | null => {
    const n = num(row, key);
    if (n === null || n <= 0) return null;
    const d = new Date(n * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const isoDate = (v: unknown): string | null => {
    if (v instanceof Date) { if (Number.isNaN(v.getTime())) return null; return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`; }
    if (typeof v === 'string') { const m = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim()); if (m) return m[1]; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); }
    return null;
};
const fmtAmount = (n: number | null): string => (n === null || !Number.isFinite(n) ? '—' : n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 4 }));

type CalendarRow = { key: string; symbol: string; nameAr: string | null; nameEn: string | null; exDate: string | null; amount: number | null; currency: string | null; payDate: string | null };

function CalendarTable({ rows, emptyText }: { rows: CalendarRow[]; emptyText: string }) {
    if (rows.length === 0) return <p className="mt-3 text-sm text-muted">{emptyText}</p>;
    return (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[560px] text-sm">
                <thead>
                    <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                        <th className="px-4 py-3">تاريخ عدم الأحقية</th>
                        <th className="px-4 py-3">الشركة</th>
                        <th className="px-4 py-3">القيمة / سهم</th>
                        <th className="px-4 py-3">تاريخ الصرف</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.key} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                            <td className="px-4 py-2.5 font-semibold text-main tabular-nums" dir="ltr">{r.exDate ?? '—'}</td>
                            <td className="px-4 py-2.5">
                                <Link href={`/ar/symbol/${r.symbol}`} className="font-semibold text-main hover:text-starta-teal">{r.nameAr || r.nameEn || r.symbol}</Link>
                            </td>
                            <td className="px-4 py-2.5 font-semibold tabular-nums text-main" dir="ltr">{fmtAmount(r.amount)}{r.amount !== null && r.currency ? ` ${r.currency}` : ''}</td>
                            <td className="px-4 py-2.5 text-muted tabular-nums" dir="ltr">{r.payDate ?? '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const FAQS: Array<{ q: string; a: string }> = [
    { q: 'ما هو تاريخ عدم الأحقية (تاريخ التوزيع)؟', a: 'تاريخ عدم الأحقية هو أول يوم تداول يُتداول فيه السهم دون حق التوزيع المعلن. لتحصل على التوزيع يجب أن تمتلك السهم قبل هذا التاريخ؛ ومن يشتري في هذا اليوم أو بعده لا يستحق ذلك التوزيع.' },
    { q: 'كم مرة توزّع شركات البورصة المصرية أرباحًا؟', a: 'توزّع معظم الشركات المقيدة في البورصة المصرية أرباحًا مرة واحدة سنويًا بعد اعتماد نتائج السنة المالية في الجمعية العمومية. وتجري بعض الشركات توزيعات نصف سنوية أو مرحلية، لذا يختلف التواتر من شركة لأخرى.' },
    { q: 'من أين تأتي مبالغ التوزيعات؟', a: 'تأتي المبالغ وتواريخ عدم الأحقية وتواريخ الصرف من إفصاحات الإجراءات المؤسسية للبورصة المصرية عبر تغذيات بيانات EGX وTradingView، وتُحدَّث مع بيانات السوق.' },
];

export default async function DividendCalendarArPage() {
    const { upcoming, recent } = await getDividendCalendar();
    const upcomingRows: CalendarRow[] = upcoming.map((r, i): CalendarRow | null => {
        const symbol = str(r, 'symbol')?.toUpperCase() ?? null;
        if (!symbol) return null;
        return { key: `${symbol}-${i}`, symbol, nameAr: str(r, 'name_ar'), nameEn: str(r, 'name_en'), exDate: unixDate(r, 'ex_date_upcoming'), amount: num(r, 'amount_upcoming'), currency: str(r, 'currency'), payDate: unixDate(r, 'payment_date_upcoming') };
    }).filter((r): r is CalendarRow => r !== null);
    const recentRows: CalendarRow[] = recent.map((r, i): CalendarRow | null => {
        const symbol = str(r, 'symbol')?.toUpperCase() ?? null;
        if (!symbol) return null;
        return { key: `${symbol}-${isoDate(r['ex_date']) ?? 'row'}-${i}`, symbol, nameAr: str(r, 'name_ar'), nameEn: str(r, 'name_en'), exDate: isoDate(r['ex_date']), amount: num(r, 'dividend_amount'), currency: str(r, 'div_currency'), payDate: isoDate(r['pay_date']) };
    }).filter((r): r is CalendarRow => r !== null);

    const asOfHuman = new Date().toLocaleString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Cairo' });

    return (
        <PublicPageShell lang="ar" altHref="/markets/dividend-calendar">
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { label: 'مواعيد التوزيعات' }], SITE_URL)} />
            <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }} />
            <Breadcrumbs items={[{ href: '/', label: 'الرئيسية' }, { label: 'مواعيد التوزيعات' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">مواعيد توزيعات الأرباح في البورصة المصرية — القادمة والأخيرة</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                أحداث توزيعات الأرباح في البورصة المصرية في مكان واحد: {upcomingRows.length} توزيع مُعلن قادم و{recentRows.length} توزيع خلال آخر 90 يومًا، بتواريخ عدم الأحقية والمبالغ لكل سهم وتواريخ الصرف. اضغط على أي شركة لعرض سجل توزيعاتها الكامل.
            </p>
            <p className="mt-2 text-sm text-muted">آخر تحديث {asOfHuman} (بتوقيت القاهرة). يُحدَّث التقويم مع بيانات السوق عند الإفصاح عن إجراءات مؤسسية جديدة.</p>

            <section className="mt-8">
                <h2 className="text-xl font-bold text-main">التوزيعات القادمة</h2>
                <CalendarTable rows={upcomingRows} emptyText="لا توجد توزيعات قادمة معلنة في البورصة المصرية حاليًا — تظهر الإجراءات الجديدة هنا فور الإفصاح عنها." />
            </section>
            <section className="mt-8">
                <h2 className="text-xl font-bold text-main">التوزيعات الأخيرة (آخر 90 يومًا)</h2>
                <CalendarTable rows={recentRows} emptyText="لم تُسجَّل توزيعات في البورصة المصرية خلال آخر 90 يومًا." />
            </section>

            <p className="mt-6 text-sm text-muted">
                تصفح <Link href="/ar/companies" className="font-semibold text-starta-teal hover:underline">دليل أسهم البورصة المصرية</Link> أو <Link href="/ar/markets/movers" className="font-semibold text-starta-teal hover:underline">الأكثر نشاطًا</Link> اليوم.
            </p>

            <section className="mt-10 border-t border-border pt-6">
                <h2 className="text-lg font-bold text-main">الأسئلة الشائعة</h2>
                <dl className="mt-3 space-y-5">
                    {FAQS.map((f) => (
                        <div key={f.q}>
                            <dt className="font-semibold text-main">{f.q}</dt>
                            <dd className="mt-1 text-sm leading-relaxed text-main">{f.a}</dd>
                        </div>
                    ))}
                </dl>
            </section>
        </PublicPageShell>
    );
}
