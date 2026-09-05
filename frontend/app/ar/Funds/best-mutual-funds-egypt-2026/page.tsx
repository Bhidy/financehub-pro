import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFundsRanked } from '@/lib/public-data';
import { categoryOfFund } from '@/content/fund-categories';
import { SITE_URL, fundPath, absUrl, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import FundsGuide from '@/components/seo/FundsGuide';
import FundsNarrativeSections from '@/components/seo/FundsNarrative';
import { buildFundsNarrative } from '@/lib/funds-narrative';
import RankingEligibility from '@/components/seo/RankingEligibility';
import { rankingEligibility, fundCurrency } from '@/lib/fund-stats';

/**
 * Arabic twin of /Funds/best-mutual-funds-egypt-2026 — "أفضل صناديق الاستثمار
 * في مصر". Audit High: the #1 Arabic money query had no Arabic page. Same
 * strictly-data-driven ranking (trailing 1Y return), Arabic copy.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    // absolute: بدون لاحقة القالب (" | Starta Markets") التي رفعت العنوان إلى 76 حرفًا.
    title: { absolute: 'أفضل صناديق الاستثمار في مصر 2026 — مرتبة حسب العائد السنوي' },
    description:
        'صناديق الاستثمار المصرية مرتبة حسب عائد آخر 12 شهرًا حسب الفئة: أسواق النقد والدخل الثابت والأسهم والمتوازنة — مع الأسعار والرسوم، محدَّث مرتين يوميًا.',
    alternates: {
        canonical: '/ar/Funds/best-mutual-funds-egypt-2026',
        languages: {
            en: '/Funds/best-mutual-funds-egypt-2026',
            ar: '/ar/Funds/best-mutual-funds-egypt-2026',
            'x-default': '/ar/Funds/best-mutual-funds-egypt-2026',
        },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'article',
        title: 'أفضل صناديق الاستثمار في مصر 2026 | ستارتا ماركتس',
        description: 'ترتيب حسب عائد آخر 12 شهرًا مع صافي قيمة الأصول والرسوم والحد الأدنى للاشتراك.',
        url: '/ar/Funds/best-mutual-funds-egypt-2026',
        locale: 'ar_EG',
    },
};

type FundRow = Record<string, unknown>;

const num = (r: FundRow, k: string): number | null => (typeof r[k] === 'number' && Number.isFinite(r[k] as number) ? (r[k] as number) : null);
const str = (r: FundRow, k: string): string | null => (typeof r[k] === 'string' && (r[k] as string).trim() ? (r[k] as string).trim() : null);
const fmtPct = (v: number | null): string => (v === null ? '—' : `${v.toFixed(2)}%`);
const fmtNav = (v: number | null): string => (v === null ? '—' : v.toLocaleString('en-EG', { maximumFractionDigits: 4 }));
const arName = (f: FundRow): string => str(f, 'fund_name') || str(f, 'fund_name_en') || `صندوق ${f.fund_id}`;

function categoryOf(r: FundRow): string {
    // The shared matcher reads the snake_case `fund_type` codes the data
    // actually carries; the English text columns this used to read are empty,
    // which put every fund in "Other" and hid the category sections (2026-09-05).
    const c = categoryOfFund(r as { fund_type?: unknown; fund_type_en?: unknown; classification_en?: unknown; is_shariah?: unknown });
    return (c && CATEGORY_KEY_TO_NAME[c.key]) || 'Other Funds';
}

const CATEGORY_KEY_TO_NAME: Record<string, string> = {
    // The shared matcher's keys are HYPHENATED ('money-market', 'fixed-income').
    'money-market': 'Money Market Funds',
    'fixed-income': 'Fixed Income Funds',
    'equity': 'Equity Funds',
    'balanced': 'Balanced Funds',
    'shariah': 'Shariah-Compliant Funds',
    'index': 'Index Funds',
    'sector': 'Sector & Thematic Funds',
};
const CATEGORY_ORDER = ['Money Market Funds', 'Fixed Income Funds', 'Equity Funds', 'Index Funds', 'Sector & Thematic Funds', 'Balanced Funds', 'Shariah-Compliant Funds', 'Other Funds'];
const CATEGORY_AR: Record<string, string> = {
    'Money Market Funds': 'صناديق أسواق النقد',
    'Fixed Income Funds': 'صناديق الدخل الثابت',
    'Equity Funds': 'صناديق الأسهم',
    'Balanced Funds': 'الصناديق المتوازنة',
    'Shariah-Compliant Funds': 'الصناديق المتوافقة مع الشريعة',
    'Index Funds': 'صناديق المؤشرات',
    'Sector & Thematic Funds': 'الصناديق القطاعية والموضوعية',
    'Other Funds': 'صناديق أخرى',
};

export default async function BestFundsArPage() {
    const funds = await getAllFundsRanked();
    // RANKED = the audited engine stands behind the 12-month figure (lib/fund-stats.ts).
    // Every other current fund is counted and explained in <RankingEligibility>.
    const withReturn = funds.filter((f) => rankingEligibility(f).eligible);
    if (withReturn.length < 3) notFound();
    const asOfMs = funds.reduce<number | null>((mx, f) => {
        const t = f.last_nav_date ? Date.parse(String(f.last_nav_date)) : NaN;
        return Number.isFinite(t) && (mx === null || t > mx) ? t : mx;
    }, null);
    const asOf = asOfMs !== null ? new Date(asOfMs).toISOString().slice(0, 10) : null;
    const asOfHuman = asOfMs !== null ? new Date(asOfMs).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

    const buckets = new Map<string, FundRow[]>();
    for (const f of withReturn) {
        const c = categoryOf(f);
        if (!buckets.has(c)) buckets.set(c, []);
        (buckets.get(c) as FundRow[]).push(f);
    }
    const sections = CATEGORY_ORDER
        .filter((c) => (buckets.get(c) || []).length >= 3)
        .map((c) => ({ name: c, funds: (buckets.get(c) as FundRow[]).slice(0, 5) }));

    const top10 = withReturn.slice(0, 10);
    const narrative = buildFundsNarrative(withReturn as Array<Record<string, unknown>>, 'ar', asOfHuman);

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'أفضل صناديق الاستثمار المصرية حسب عائد آخر 12 شهرًا',
        numberOfItems: top10.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: top10.map((f, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: arName(f),
            url: absUrl(fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), 'ar')),
        })),
    };
    const faq = [
        ...narrative.faq,
        {
            q: 'كيف تُرتَّب هذه الصناديق؟',
            a: `تُرتَّب حصريًا حسب عائد آخر 12 شهرًا الذي يحسبه محرّكنا المُدقَّق يوميًا من سجل صافي قيمة الأصول المنشور لكل صندوق، مجمّعة حسب الفئة. يُرتَّب ${withReturn.length} من ${funds.length} صندوقًا؛ ويُدرَج الباقي دون ترتيب لسبب معلن (سجل أقل من 12 شهرًا، أو غياب إفصاح قريب من تاريخ الإسناد، أو تحذير جودة على السلسلة). لا يُطبَّق أي حكم تحريري — تُعاد الجداول تلقائيًا مع تحديث صافي قيمة الأصول (مرتين يوميًا). البيانات بتاريخ ${asOfHuman ?? 'آخر إفصاح'}.`,
        },
        {
            q: 'هل يعني ارتفاع العائد السابق أن الصندوق هو الخيار الأفضل؟',
            a: 'لا. الأداء السابق لا يضمن النتائج المستقبلية، ويجب موازنة العوائد بالرسوم ومستوى المخاطرة وشروط السيولة وأهدافك الخاصة. هذه الصفحة معلوماتية وليست توصية استثمارية.',
        },
        {
            q: 'ما مصدر البيانات؟',
            a: 'تأتي صافي قيمة الأصول والعوائد والرسوم من الإفصاحات الرسمية لمديري الصناديق، وتُحدَّث مرتين يوميًا على ستارتا ماركتس.',
        },
    ];

    return (
        <PublicPageShell lang="ar" altHref="/Funds/best-mutual-funds-egypt-2026">
            <JsonLd data={itemList} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { label: 'أفضل صناديق الاستثمار في مصر' }], SITE_URL)} />
            <Breadcrumbs lang="ar" items={[{ href: '/', label: 'الرئيسية' }, { label: 'أفضل صناديق الاستثمار في مصر' }]} />

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">أفضل صناديق الاستثمار في مصر 2026</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                <span data-metric="ranked_fund_count">{withReturn.length}</span> من <span data-metric="current_fund_count">{funds.length}</span> صندوق استثمار مصري مؤهل للترتيب، مرتبة <strong>حصريًا حسب عائد آخر 12 شهرًا</strong> المحسوب من سجل صافي قيمة الأصول المنشور، حسب الفئة. تأتي صافي قيمة الأصول والعوائد من الإفصاحات الرسمية لمديري الصناديق وتُحدَّث مرتين يوميًا
                {asOfHuman && <> — البيانات بتاريخ <time dateTime={asOf as string}>{asOfHuman}</time></>}. الترتيب آلي وليس توصية.
            </p>

            <FundsNarrativeSections lang="ar" n={narrative} />

            <section className="mt-8">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    أفضل 10 صناديق حسب عائد آخر 12 شهرًا
                </h2>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
                    <table className="w-full min-w-[680px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">الصندوق</th>
                                <th className="px-4 py-3">الفئة</th>
                                <th className="px-4 py-3">عائد سنة</th>
                                <th className="px-4 py-3">منذ بداية العام</th>
                                <th className="px-4 py-3">صافي قيمة الأصول</th>
                            </tr>
                        </thead>
                        <tbody>
                            {top10.map((f, i) => {
                                const r1y = num(f, 'return_1y');
                                return (
                                    <tr key={String(f.fund_id)} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                        <td className="px-4 py-2.5 text-muted tabular-nums">{i + 1}</td>
                                        <td className="px-4 py-2.5">
                                            <Link href={fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), 'ar')} className="font-semibold text-main hover:text-starta-darkTeal">
                                                {arName(f)}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2.5 text-muted">{CATEGORY_AR[categoryOf(f)]}</td>
                                        <td className={`px-4 py-2.5 font-bold tabular-nums ${r1y !== null && r1y >= 0 ? 'text-emerald-700' : 'text-red-600'}`} dir="ltr">{fmtPct(r1y)}</td>
                                        <td className="px-4 py-2.5 tabular-nums" dir="ltr">{fmtPct(num(f, 'return_ytd'))}</td>
                                        <td className="px-4 py-2.5 tabular-nums" dir="ltr">{fmtNav(num(f, 'latest_nav'))} {fundCurrency(f)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {sections.map((sec) => (
                <section key={sec.name} className="mt-10">
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                        <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                        {CATEGORY_AR[sec.name]}
                    </h2>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                                    <th className="px-4 py-3">الصندوق</th>
                                    <th className="px-4 py-3">عائد سنة</th>
                                    <th className="px-4 py-3">3 سنوات</th>
                                    <th className="px-4 py-3">رسوم الإدارة</th>
                                    <th className="px-4 py-3">الحد الأدنى</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sec.funds.map((f) => {
                                    const fee = num(f, 'fee_management');
                                    const minSub = num(f, 'min_subscription');
                                    return (
                                        <tr key={String(f.fund_id)} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                            <td className="px-4 py-2.5">
                                                <Link href={fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), 'ar')} className="font-semibold text-main hover:text-starta-darkTeal">{arName(f)}</Link>
                                            </td>
                                            <td className="px-4 py-2.5 font-bold text-emerald-700 tabular-nums" dir="ltr">{fmtPct(num(f, 'return_1y'))}</td>
                                            <td className="px-4 py-2.5 tabular-nums" dir="ltr">{fmtPct(num(f, 'return_3y'))}</td>
                                            <td className="px-4 py-2.5 tabular-nums" dir="ltr">{fee !== null ? `${fee.toFixed(2)}%` : '—'}</td>
                                            <td className="px-4 py-2.5 tabular-nums" dir="ltr">{minSub !== null ? minSub.toLocaleString('en-EG') : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}

            <section className="mt-10 max-w-3xl">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    المنهجية
                </h2>
                <p className="mt-3 leading-relaxed text-muted">
                    تُجمَّع الصناديق حسب نوعها المُفصَح عنه (أو حسب النوع الوارد في اسمها الرسمي عندما لا يحمل الإفصاح نوعًا)، ثم تُرتَّب حسب عائد آخر 12 شهرًا الذي يحسبه محرّكنا المُدقَّق من سجل صافي قيمة الأصول — الرقم نفسه المعروض على صفحة كل صندوق. تُحذف الفئات التي تضم أقل من ثلاثة صناديق مُرتَّبة. تأتي الرسوم والحدود الدنيا ومستويات المخاطرة من الإفصاحات نفسها المعروضة على صفحة كل صندوق. تُعاد الجداول تلقائيًا مع تحديث صافي قيمة الأصول — لا شيء على هذه الصفحة مُنتقى يدويًا.
                </p>
            </section>

            <RankingEligibility rows={funds} lang="ar" />

            <section className="mt-10 max-w-3xl">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight"><span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />الأسئلة الشائعة</h2>
                <dl className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface">
                    {faq.map((f) => (
                        <div key={f.q} className="px-5 py-4">
                            <dt className="text-[15px] font-bold tracking-tight text-main">{f.q}</dt>
                            <dd className="mt-1.5 text-sm leading-6 text-muted">{f.a}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <nav aria-label="استكشف" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/ar/Funds" className="text-muted hover:text-starta-darkTeal">كل صناديق الاستثمار</Link>
                <Link href="/ar/companies" className="text-muted hover:text-starta-darkTeal">أسهم البورصة المصرية</Link>
                <a href="/Funds/best-mutual-funds-egypt-2026" hrefLang="en" className="text-muted hover:text-starta-darkTeal">Best funds in English</a>
            </nav>
            <FundsGuide lang="ar" extraFaq={faq} />
        </PublicPageShell>
    );
}
