import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFundsRanked, getFundRiskTable, type FundRiskRow } from '@/lib/public-data';
import { SITE_URL, absUrl, fundPath, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { FUND_CATEGORIES, categoryOfFund, categoryPath } from '@/content/fund-categories';
import { fundName, investmentFundNode } from '@/lib/funds-hub-render';
import { str, median, pctSigned, pct, dayOf, riskEligible, MIN_RISK_ROWS, MIN_RISK_POINTS, type Row } from '@/lib/fund-stats';

/**
 * /Funds/risk and /ar/Funds/risk — THE FUND RISK LEAGUE TABLE.
 *
 * The backend recomputes annualized volatility, maximum drawdown, downside
 * deviation and CAGR for every fund from its own NAV history every trading
 * day (backend-core/data_pipeline/fund_metrics.py — cadence-aware, with
 * redenomination and spike guards). Until now those figures lived only on
 * each fund's page: no URL answered "which Egyptian funds are least
 * volatile", which the nearest competitor answers with a drawdown of 0 on
 * funds that visibly fell. This page is that dataset, least volatile first,
 * with a per-category median so a reader can see what "normal" is for the
 * type of fund they hold.
 *
 * Eligibility is shared with the sitemap (lib/fund-stats riskEligible) so the
 * page and the sitemap cannot disagree about whether the page exists.
 */

const PATH_EN = '/Funds/risk';
const PATH_AR = '/ar/Funds/risk';

export function fundRiskMetadata(lang: 'en' | 'ar'): Metadata {
    const isAr = lang === 'ar';
    const canonical = isAr ? PATH_AR : PATH_EN;
    const title = isAr ? 'صناديق الاستثمار الأقل تقلباً في مصر — جدول المخاطر' : 'Lowest-Volatility Funds in Egypt — Risk Table';
    const description = isAr
        ? 'التقلب السنوي وأقصى انخفاض والانحراف السلبي ومعدل النمو السنوي المركّب لكل صندوق استثمار مصري لديه تاريخ كافٍ من صافي قيمة الأصول، مرتبة من الأقل تقلباً — محسوبة من بيانات الصندوق نفسه.'
        : 'Annualized volatility, maximum drawdown, downside deviation and CAGR for every Egyptian mutual fund with enough NAV history, least volatile first — computed from each fund’s own published NAVs.';
    return {
        title,
        description,
        alternates: { canonical, languages: { en: PATH_EN, ar: PATH_AR, 'x-default': PATH_AR } },
        openGraph: { ...OG_DEFAULTS, type: 'website', title: `${title} | Starta Markets`, description, url: canonical, locale: isAr ? 'ar_EG' : 'en_US' },
    };
}

type RiskLine = { f: Row; r: FundRiskRow };

export async function renderFundRisk(lang: 'en' | 'ar') {
    const isAr = lang === 'ar';
    let funds: Row[] = [];
    let risk: FundRiskRow[] = [];
    try {
        [funds, risk] = await Promise.all([getAllFundsRanked(), getFundRiskTable()]);
    } catch (error) {
        console.error('[fund-risk] query failed:', (error as Error).message);
    }
    const byId = new Map(funds.map((f) => [Number(f.fund_id), f]));
    const lines: RiskLine[] = risk
        .filter(riskEligible)
        .map((r) => ({ f: byId.get(r.fund_id) as Row | undefined, r }))
        .filter((x): x is RiskLine => !!x.f)
        .sort((a, b) => (a.r.volatility_annual as number) - (b.r.volatility_annual as number));
    if (lines.length < MIN_RISK_ROWS) notFound();

    const latest = lines.map((x) => x.r.latest_date).filter(Boolean).sort().at(-1) ?? '';
    const asOf = dayOf(latest, lang);
    const nameOf = (x: RiskLine) => fundName(x.f, lang);

    // Per-category medians: what "normal" volatility is for each type of fund.
    const perCategory = FUND_CATEGORIES.map((c) => {
        const inCat = lines.filter((x) => categoryOfFund(x.f)?.key === c.key);
        return {
            c,
            n: inCat.length,
            vol: median(inCat.map((x) => x.r.volatility_annual)),
            dd: median(inCat.map((x) => x.r.max_drawdown)),
            cagr: median(inCat.map((x) => x.r.cagr)),
        };
    }).filter((x) => x.n >= 3);

    const title = isAr ? 'صناديق الاستثمار الأقل تقلباً في مصر' : 'Lowest-volatility mutual funds in Egypt';

    const faq = isAr
        ? [
              { q: 'ما معنى التقلب السنوي؟', a: 'هو الانحراف المعياري لعوائد الفترات المتتالية لصافي قيمة الأصول (يومية أو أسبوعية بحسب ما ينشره الصندوق) مضروباً في الجذر التربيعي لعدد الفترات في السنة. تقلب 2% يعني أن السعر تحرّك عادةً في نطاق ضيق؛ وتقلب 25% يعني تحرّكات كبيرة في الاتجاهين. يُحسب من تاريخ الصندوق نفسه ولا يتنبأ بالمستقبل.' },
              { q: 'هل انخفاض التقلب يعني انخفاض المخاطر؟', a: 'يعني انخفاض تذبذب السعر التاريخي فقط. لا يقيس مخاطر الائتمان أو السيولة أو التضخم؛ فصندوق نقدي بتقلب شبه معدوم قد يخسر قوة شرائية أمام التضخم. أقصى الانخفاض يكمّل الصورة: أسوأ هبوط من قمة إلى قاع مرّ به الصندوق فعلاً.' },
              { q: 'لماذا لا يظهر صندوقي؟', a: `يُدرج الصندوق عندما يتوافر له ${MIN_RISK_POINTS} ملاحظة على الأقل لصافي قيمة الأصول تكفي لحساب التقلب وأقصى الانخفاض معاً، وعندما لا تكون سلسلته موسومة بأثر إعادة تسعير يجعل الحساب مضللاً. الصناديق الأحدث والصناديق ذات التاريخ المتقطع لا تظهر حتى يكتمل تاريخها.` },
          ]
        : [
              { q: 'What does annualized volatility mean?', a: 'It is the standard deviation of the fund’s consecutive NAV period returns (daily or weekly, whichever the fund publishes) scaled by the square root of the number of periods in a year. 2% means the price usually moved within a narrow band; 25% means large moves in both directions. It is computed from the fund’s own history and does not forecast anything.' },
              { q: 'Is low volatility the same as low risk?', a: 'It only means the price wobbled little in the past. It does not measure credit, liquidity or inflation risk: a money market fund with near-zero volatility can still lose purchasing power to inflation. Maximum drawdown completes the picture — the worst peak-to-trough fall the fund actually went through.' },
              { q: 'Why is my fund missing?', a: `A fund is listed when it has at least ${MIN_RISK_POINTS} NAV observations, enough for both volatility and maximum drawdown to be computed, and when its series is not flagged with a re-pricing artefact that would make the arithmetic misleading. Newer funds and funds with broken histories appear once their history is complete.` },
          ];

    const collection = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': absUrl(isAr ? PATH_AR : PATH_EN),
        name: title,
        inLanguage: isAr ? 'ar-EG' : 'en',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        ...(asOf.iso ? { dateModified: asOf.iso } : {}),
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: lines.length,
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            itemListElement: lines.map((x, i) => ({ '@type': 'ListItem', position: i + 1, item: investmentFundNode(x.f, lang) })),
        },
    };
    const faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
    };
    const crumbs = [
        { href: isAr ? '/ar' : '/', url: isAr ? '/ar' : '/', label: isAr ? 'الرئيسية' : 'Home' },
        { href: isAr ? '/ar/Funds' : '/Funds', url: isAr ? '/ar/Funds' : '/Funds', label: isAr ? 'صناديق الاستثمار' : 'Mutual Funds' },
        { label: isAr ? 'جدول المخاطر' : 'Risk' },
    ];
    const th = `px-4 py-3 ${isAr ? 'text-right' : 'text-left'}`;
    const thNum = `px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`;
    const tdNum = `px-4 py-2.5 tabular-nums ${isAr ? 'text-left' : 'text-right'}`;
    const siblings = isAr
        ? [
              { href: '/ar/Funds/categories', label: 'فئات الصناديق مقارنةً' },
              { href: '/ar/Funds/providers', label: 'البنوك وشركات إدارة الأصول' },
              { href: '/ar/Funds/best-mutual-funds-egypt-2026', label: 'أفضل الصناديق حسب العائد' },
              { href: '/ar/Funds/prices-today', label: 'أسعار الوثائق اليوم' },
              { href: '/ar/Funds/fees', label: 'مقارنة الرسوم' },
          ]
        : [
              { href: '/Funds/categories', label: 'Fund categories compared' },
              { href: '/Funds/providers', label: 'Banks and asset managers' },
              { href: '/Funds/best-mutual-funds-egypt-2026', label: 'Best funds by return' },
              { href: '/Funds/prices-today', label: 'Fund prices today' },
              { href: '/Funds/fees', label: 'Fee comparison' },
          ];

    return (
        <PublicPageShell lang={lang} altHref={isAr ? PATH_EN : PATH_AR} persistLang>
            <JsonLd data={collection} />
            <JsonLd data={faqLd} />
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <Breadcrumbs items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold tracking-tight text-main sm:text-3xl">{title}</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {isAr
                    ? `${lines.length} صندوق استثمار مصري لديه تاريخ كافٍ من صافي قيمة الأصول، مرتبة من الأقل تقلباً إلى الأعلى. لكل صندوق: التقلب السنوي، وأقصى انخفاض من قمة إلى قاع، والانحراف السلبي، ومعدل النمو السنوي المركّب منذ التأسيس، وعدد الملاحظات — كلها محسوبة من صافي قيمة أصول الصندوق نفسه كما نشره مديره`
                    : `${lines.length} Egyptian mutual funds with enough NAV history, ordered from least to most volatile. For each: annualized volatility, maximum peak-to-trough drawdown, downside deviation, compound annual growth since inception and the number of observations — all computed from the fund’s own NAVs as published by its manager`}
                {asOf.iso && (
                    <>
                        {' '}
                        {isAr ? '— أحدث بيانات حتى' : '— data through'} <time dateTime={asOf.iso}>{asOf.human}</time>
                    </>
                )}
                . {isAr ? 'الترتيب آلي وليس توصية.' : 'The ordering is mechanical, not a recommendation.'}
            </p>

            {perCategory.length > 0 && (
                <section className="mt-8">
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                        <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                        {isAr ? 'التقلب المعتاد لكل فئة' : 'What is normal for each category'}
                    </h2>
                    <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead>
                                <tr className="border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted">
                                    <th scope="col" className={th}>{isAr ? 'الفئة' : 'Category'}</th>
                                    <th scope="col" className={thNum}>{isAr ? 'الصناديق' : 'Funds'}</th>
                                    <th scope="col" className={thNum}>{isAr ? 'وسيط التقلب السنوي' : 'Median volatility'}</th>
                                    <th scope="col" className={thNum}>{isAr ? 'وسيط أقصى انخفاض' : 'Median max drawdown'}</th>
                                    <th scope="col" className={thNum}>{isAr ? 'وسيط النمو السنوي' : 'Median CAGR'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {perCategory.map((x) => (
                                    <tr key={x.c.key} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                        <th scope="row" className={`px-4 py-2.5 font-semibold ${isAr ? 'text-right' : 'text-left'}`}>
                                            <Link href={encodeURI(categoryPath(x.c, lang))} prefetch={false} className="text-main hover:text-starta-darkTeal">
                                                {isAr ? x.c.nameAr : x.c.nameEn}
                                            </Link>
                                        </th>
                                        <td className={`${tdNum} text-main`}>{x.n}</td>
                                        <td className={`${tdNum} font-semibold text-main`}>{pct(x.vol)}</td>
                                        <td className={`${tdNum} text-red-600`}>{pctSigned(x.dd)}</td>
                                        <td className={`${tdNum} ${x.cagr === null ? 'text-muted' : x.cagr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{pctSigned(x.cagr)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <section className="mt-8">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? 'كل الصناديق من الأقل تقلباً' : 'Every fund, least volatile first'}
                </h2>
                <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
                    <table className="w-full min-w-[960px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted">
                                <th scope="col" className={th}>#</th>
                                <th scope="col" className={th}>{isAr ? 'الصندوق' : 'Fund'}</th>
                                <th scope="col" className={th}>{isAr ? 'الفئة' : 'Category'}</th>
                                <th scope="col" className={thNum}>{isAr ? 'التقلب السنوي' : 'Volatility'}</th>
                                <th scope="col" className={thNum}>{isAr ? 'أقصى انخفاض' : 'Max drawdown'}</th>
                                <th scope="col" className={thNum}>{isAr ? 'الانحراف السلبي' : 'Downside dev.'}</th>
                                <th scope="col" className={thNum}>{isAr ? 'النمو السنوي المركّب' : 'CAGR'}</th>
                                <th scope="col" className={thNum}>{isAr ? 'الملاحظات' : 'Obs.'}</th>
                                <th scope="col" className={thNum}>{isAr ? 'حتى' : 'Through'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((x, i) => {
                                const cat = categoryOfFund(x.f);
                                const d = dayOf(x.r.latest_date, lang);
                                return (
                                    <tr key={x.r.fund_id} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                        <td className={`px-4 py-2.5 text-muted ${isAr ? 'text-right' : 'text-left'}`}>{i + 1}</td>
                                        <th scope="row" className={`px-4 py-2.5 font-semibold ${isAr ? 'text-right' : 'text-left'}`}>
                                            <Link href={encodeURI(fundPath(x.r.fund_id, str(x.f, 'fund_name_en'), str(x.f, 'fund_name'), lang))} prefetch={false} className="text-main hover:text-starta-darkTeal">
                                                {nameOf(x)}
                                            </Link>
                                        </th>
                                        <td className={`px-4 py-2.5 text-muted ${isAr ? 'text-right' : 'text-left'}`}>{cat ? (isAr ? cat.nameAr : cat.nameEn) : '—'}</td>
                                        <td className={`${tdNum} font-bold text-main`}>{pct(x.r.volatility_annual)}</td>
                                        <td className={`${tdNum} text-red-600`}>{pctSigned(x.r.max_drawdown)}</td>
                                        <td className={`${tdNum} text-main`}>{pct(x.r.downside_deviation)}</td>
                                        <td className={`${tdNum} ${x.r.cagr === null ? 'text-muted' : x.r.cagr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{pctSigned(x.r.cagr)}</td>
                                        <td className={`${tdNum} text-muted`}>{x.r.points ?? '—'}</td>
                                        <td className={`${tdNum} text-xs text-muted`}>{d.iso ? <time dateTime={d.iso}>{d.human}</time> : '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mt-10 max-w-3xl">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? 'كيف تُحسب هذه الأرقام' : 'How these figures are computed'}
                </h2>
                <ul className="mt-4 list-disc space-y-2 ps-5 leading-relaxed text-muted">
                    <li>
                        {isAr
                            ? 'التقلب السنوي: الانحراف المعياري لعوائد الفترات المتتالية مضروباً في الجذر التربيعي لعدد الفترات في السنة، محسوباً على الوتيرة الفعلية لنشر الصندوق (أسبوعية أو يومية) لا على افتراض ثابت. الفترات التي تمتد لأكثر من ثلاثة أضعاف الفاصل الوسيط للصندوق تُستبعد حتى لا تتحوّل الثغرات في البيانات إلى تقلب.'
                            : 'Volatility: the standard deviation of consecutive period returns, scaled by the square root of the periods per year, using the fund’s actual publication rhythm (weekly or daily) rather than a fixed assumption. Periods spanning more than three times the fund’s median interval are excluded, so a hole in the data cannot masquerade as volatility.'}
                    </li>
                    <li>
                        {isAr
                            ? 'أقصى انخفاض: أكبر هبوط من أي قمة سابقة إلى القاع التالي، بعد تصحيح إعادات التسعير (تغيّر مفاجئ في القيمة الاسمية للوثيقة) واستبعاد القراءات الشاذة المنفردة.'
                            : 'Maximum drawdown: the largest fall from any earlier peak to the trough that followed it, after stitching re-denominations (a sudden change in the unit’s par value) and discarding isolated bad ticks.'}
                    </li>
                    <li>
                        {isAr
                            ? 'الانحراف السلبي: الجذر التربيعي لمتوسط مربعات عوائد الفترات السالبة مقابل هدف 0% (تُحتسب الفترات الموجبة صفراً)، مضروباً في الجذر التربيعي لعدد الفترات في السنة — أي تذبذب الخسائر لا الأرباح.'
                            : 'Downside deviation: the root-mean-square of the negative period returns against a 0% target (positive periods count as zero), annualized by the fund’s cadence — the wobble of the losses, not the gains.'}
                    </li>
                    <li>
                        {isAr
                            ? 'معدل النمو السنوي المركّب: النمو الهندسي السنوي من أول صافي قيمة أصول متاح إلى آخره، ولا يُنشر لصناديق عمرها أقل من تسعين يوماً.'
                            : 'CAGR: the geometric annual growth from the first available NAV to the latest, not published for funds younger than ninety days.'}
                    </li>
                    <li>
                        {isAr
                            ? 'لا ننشر نسبة شارب أو ألفا أو بيتا: لا يوجد مؤشر مرجعي موثّق لكل فئة ولا سلسلة عائد خالٍ من المخاطر بالجنيه يمكن إعادة إنتاجها، ورقم لا يمكن إعادة إنتاجه لا يُنشر.'
                            : 'No Sharpe ratio, alpha or beta is published: there is no documented benchmark per category and no reproducible EGP risk-free series, and a figure that cannot be reproduced is not published.'}
                    </li>
                </ul>
                <p className="mt-4 text-sm">
                    <Link href={isAr ? '/ar/methodology' : '/methodology'} prefetch={false} className="font-semibold text-starta-darkTeal hover:underline">
                        {isAr ? 'المنهجية الكاملة ←' : 'Full methodology →'}
                    </Link>
                </p>
            </section>

            <section className="mt-10 max-w-3xl">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? 'أسئلة شائعة' : 'Frequently asked questions'}
                </h2>
                <dl className="mt-4 space-y-4">
                    {faq.map((x) => (
                        <div key={x.q} className="rounded-2xl border border-border bg-surface p-4">
                            <dt className="font-bold text-main">{x.q}</dt>
                            <dd className="mt-1.5 leading-relaxed text-muted">{x.a}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <nav aria-label={isAr ? 'صفحات ذات صلة' : 'Related'} className="mt-10">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? 'المزيد عن صناديق الاستثمار' : 'More on Egyptian funds'}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                    {siblings.map((s) => (
                        <li key={s.href}>
                            <Link href={s.href} prefetch={false} className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-main transition-colors hover:border-starta-teal hover:text-starta-darkTeal">
                                {s.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            <p className="mt-10 text-xs leading-relaxed text-muted">
                {isAr
                    ? 'التقلب وأقصى الانخفاض مقاييس تاريخية محسوبة من صافي قيمة الأصول المنشورة ولا تتنبأ بالمستقبل. هذه الصفحة معلوماتية وليست نصيحة استثمارية ولا عرضاً للاشتراك في أي صندوق.'
                    : 'Volatility and drawdown are historical measures computed from published NAVs and do not forecast the future. This page is informational; it is not investment advice and not an offer to subscribe to any fund.'}
            </p>
        </PublicPageShell>
    );
}
