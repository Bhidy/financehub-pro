import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getFund, getFundNavHistory, type NavPoint } from '@/lib/public-data';
import { SITE_URL, absUrl, fundPath, idFromParam, canonicalRedirectTarget, OG_DEFAULTS, clampTitle } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { NAVHIST, t, type Lang } from '@/content/symbol-pages-i18n';
import { fundSourceLabel } from '@/lib/fund-sources';

/**
 * /Funds/{id}-{slug}/nav-history and the Arabic twin.
 *
 * The fund profile shows a NAV chart; a chart is not crawlable and not
 * quotable. This publishes the SERIES — annual closes with the change between
 * them, plus the most recent published values — from nav_history directly
 * (the public API caps at 90 points; the stored series reaches ~4,300 and back
 * to 2009).
 *
 * Nothing is interpolated. A fund does not publish a NAV every calendar day,
 * so a year is shown only where the manager actually published within it, and
 * the page says so.
 */

const MIN_POINTS = 24;

const fmtNav = (v: number, lang: Lang): string =>
    v.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', { maximumFractionDigits: 4 });

const fmtPct = (v: number | null): string =>
    v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const humanDate = (iso: string, lang: Lang): string => {
    const d = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(d.getTime())
        ? iso
        : d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
              day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
          });
};

/** Last published value in each calendar year, with year-over-year change. */
function annualCloses(points: NavPoint[]): Array<{ year: string; date: string; nav: number; change: number | null }> {
    const byYear = new Map<string, NavPoint>();
    for (const p of points) byYear.set(p.date.slice(0, 4), p); // ascending → last wins
    const years = [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return years.map(([year, p], i) => {
        const prev = i > 0 ? years[i - 1][1].nav : null;
        return {
            year,
            date: p.date,
            nav: p.nav,
            change: prev !== null && prev > 0 ? ((p.nav - prev) / prev) * 100 : null,
        };
    });
}

async function load(id: string) {
    const fundId = idFromParam(id);
    if (fundId === null) notFound();
    const fund = (await getFund(fundId)) as unknown as Record<string, unknown> | null;
    if (!fund) notFound();
    return { fundId, fund };
}

const nameFor = (fund: Record<string, unknown>, lang: Lang): string => {
    const ar = typeof fund.fund_name === 'string' ? fund.fund_name.trim() : '';
    const en = typeof fund.fund_name_en === 'string' ? fund.fund_name_en.trim() : '';
    return (lang === 'ar' ? ar || en : en || ar) || `Fund ${fund.fund_id}`;
};

const basePath = (fund: Record<string, unknown>, lang: Lang): string =>
    fundPath(
        fund.fund_id as number,
        (fund.fund_name_en as string) || null,
        (fund.fund_name as string) || null,
        lang
    );

export async function navHistoryMetadata(id: string, lang: Lang): Promise<Metadata> {
    const fundId = idFromParam(id);
    if (fundId === null) return {};
    let fund: Record<string, unknown> | null = null;
    try {
        fund = (await getFund(fundId)) as unknown as Record<string, unknown> | null;
    } catch {
        return {};
    }
    if (!fund) return {};

    const points = await getFundNavHistory(fundId).catch(() => [] as NavPoint[]);
    if (points.length < MIN_POINTS) return { robots: { index: false, follow: true } };

    const name = nameFor(fund, lang);
    const from = humanDate(points[0].date, lang);
    const to = humanDate(points[points.length - 1].date, lang);
    const pathEn = encodeURI(`${basePath(fund, 'en')}/nav-history`);
    const pathAr = encodeURI(`${basePath(fund, 'ar')}/nav-history`);
    const canonical = lang === 'ar' ? pathAr : pathEn;

    // Goes through the root template (+17 chars): the long form only when it fits.
    const title = clampTitle([t(NAVHIST.title(name), lang), t(NAVHIST.h1(name), lang)]);
    let description = t(NAVHIST.description(name, from, to, points.length), lang);
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    return {
        title,
        description,
        alternates: { canonical, languages: { en: pathEn, ar: pathAr, 'x-default': pathAr } },
        openGraph: {
            ...OG_DEFAULTS,
            type: 'website',
            title: `${title} | Starta Markets`,
            description,
            url: canonical,
            locale: lang === 'ar' ? 'ar_EG' : 'en_US',
        },
    };
}

export async function renderNavHistory(id: string, lang: Lang) {
    const isAr = lang === 'ar';
    const { fundId, fund } = await load(id);

    const canonicalPath = `${basePath(fund, lang)}/nav-history`;
    const requestPath = `${isAr ? '/ar' : ''}/Funds/${id}/nav-history`;
    const target = canonicalRedirectTarget(requestPath, canonicalPath);
    if (target) permanentRedirect(target);

    const points = await getFundNavHistory(fundId);
    // Quality gate: a couple of dozen points is the floor for a history page.
    if (points.length < MIN_POINTS) notFound();

    const name = nameFor(fund, lang);
    const currency = (fund.currency as string) || 'EGP';
    const annual = annualCloses(points).reverse();
    const recent = [...points].reverse().slice(0, 24);
    const first = points[0];
    const last = points[points.length - 1];
    const high = points.reduce((m, p) => (p.nav > m.nav ? p : m), points[0]);
    const low = points.reduce((m, p) => (p.nav < m.nav ? p : m), points[0]);

    const crumbs = [
        { href: isAr ? '/ar' : '/', url: isAr ? '/ar' : '/', label: isAr ? 'الرئيسية' : 'Home' },
        { href: isAr ? '/ar/Funds' : '/Funds', url: isAr ? '/ar/Funds' : '/Funds', label: isAr ? 'صناديق الاستثمار' : 'Mutual Funds' },
        { href: encodeURI(basePath(fund, lang)), url: encodeURI(basePath(fund, lang)), label: name },
        { label: isAr ? 'سجل صافي قيمة الأصول' : 'NAV history' },
    ];

    const stats: Array<[string, string]> = [
        [t(NAVHIST.stats.first, lang), `${humanDate(first.date, lang)} · ${currency} ${fmtNav(first.nav, lang)}`],
        [t(NAVHIST.stats.latest, lang), `${humanDate(last.date, lang)} · ${currency} ${fmtNav(last.nav, lang)}`],
        [t(NAVHIST.stats.points, lang), points.length.toLocaleString(isAr ? 'ar-EG' : 'en-EG')],
        [t(NAVHIST.stats.high, lang), `${currency} ${fmtNav(high.nav, lang)} · ${humanDate(high.date, lang)}`],
        [t(NAVHIST.stats.low, lang), `${currency} ${fmtNav(low.nav, lang)} · ${humanDate(low.date, lang)}`],
    ];

    // PROVENANCE (audit 2026-09-05): which source vouched for each point, from
    // which document, and when it was ingested — read from nav_history itself.
    // Sources are named as the pipeline tags them; nothing is inferred.
    // Labels live in lib/fund-sources.ts, shared with the fund profile's
    // provenance row, so both pages name a source identically.
    const bySource = new Map<string, number>();
    for (const p of points) bySource.set(p.source ?? 'unrecorded', (bySource.get(p.source ?? 'unrecorded') ?? 0) + 1);
    const provenance = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
    const latestIngest = points.reduce<string | null>((mx, p) => (p.ingested_at && (!mx || p.ingested_at > mx) ? p.ingested_at : mx), null);
    const sourceUrls = [...new Set(points.map((p) => p.source_url).filter((u): u is string => !!u))];
    const sourceName = (k: string) => fundSourceLabel(k, lang) ?? k;

    const dataset = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        ...(sourceUrls.length ? { isBasedOn: sourceUrls.slice(0, 5) } : {}),
        name: t(NAVHIST.h1(name), lang),
        description: t(NAVHIST.description(name, humanDate(first.date, lang), humanDate(last.date, lang), points.length), lang),
        url: absUrl(canonicalPath),
        inLanguage: isAr ? 'ar-EG' : 'en',
        creator: { '@id': `${SITE_URL}/#organization` },
        temporalCoverage: `${first.date}/${last.date}`,
        dateModified: last.date,
        variableMeasured: {
            '@type': 'PropertyValue',
            name: isAr ? 'صافي قيمة الأصول للوثيقة' : 'Net asset value per unit',
            unitText: currency,
        },
    };

    const th = `px-4 py-3 ${isAr ? 'text-right' : 'text-left'}`;
    const thNum = `px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`;
    const tdNum = `px-4 py-2.5 tabular-nums text-main ${isAr ? 'text-left' : 'text-right'}`;

    return (
        <PublicPageShell lang={lang} altHref={encodeURI(`${basePath(fund, isAr ? 'en' : 'ar')}/nav-history`)} persistLang>
            <JsonLd data={dataset} />
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <Breadcrumbs lang={lang} items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold tracking-tight text-main sm:text-3xl">{t(NAVHIST.h1(name), lang)}</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {t(NAVHIST.lede(name, points.length, humanDate(first.date, lang), humanDate(last.date, lang)), lang)}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {stats.map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border bg-surface p-3.5">
                        <dt className="text-xs font-bold text-muted">{label}</dt>
                        <dd dir="ltr" className="mt-1.5 text-sm font-extrabold text-main">{value}</dd>
                    </div>
                ))}
            </dl>

            <section className="mt-8">
                <h2 className="text-lg font-extrabold tracking-tight text-main">{t(NAVHIST.annual, lang)}</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                    <table className="w-full min-w-[520px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted">
                                <th scope="col" className={th}>{t(NAVHIST.cols.year, lang)}</th>
                                <th scope="col" className={th}>{t(NAVHIST.cols.date, lang)}</th>
                                <th scope="col" className={thNum}>{t(NAVHIST.cols.yearEnd, lang)}</th>
                                <th scope="col" className={thNum}>{t(NAVHIST.cols.change, lang)}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {annual.map((r) => (
                                <tr key={r.year} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                    <th scope="row" className={`px-4 py-2.5 font-semibold text-main ${isAr ? 'text-right' : 'text-left'}`} dir="ltr">{r.year}</th>
                                    <td className={`px-4 py-2.5 text-muted ${isAr ? 'text-right' : 'text-left'}`}>{humanDate(r.date, lang)}</td>
                                    <td className={tdNum}>{fmtNav(r.nav, lang)} <span className="text-xs text-muted">{currency}</span></td>
                                    <td className={`px-4 py-2.5 font-bold tabular-nums ${isAr ? 'text-left' : 'text-right'} ${r.change === null ? 'text-muted' : r.change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {fmtPct(r.change)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mt-8">
                <h2 className="text-lg font-extrabold tracking-tight text-main">{t(NAVHIST.recent, lang)}</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                    <table className="w-full min-w-[380px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted">
                                <th scope="col" className={th}>{t(NAVHIST.cols.date, lang)}</th>
                                <th scope="col" className={thNum}>{t(NAVHIST.cols.nav, lang)}</th>
                                <th scope="col" className={th}>{isAr ? 'المصدر' : 'Source'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent.map((p) => (
                                <tr key={p.date} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                    <th scope="row" className={`px-4 py-2.5 font-medium text-main ${isAr ? 'text-right' : 'text-left'}`}>{humanDate(p.date, lang)}</th>
                                    <td className={tdNum}>{fmtNav(p.nav, lang)} <span className="text-xs text-muted">{currency}</span></td>
                                    <td className={`px-4 py-2.5 text-xs text-muted ${isAr ? 'text-right' : 'text-left'}`}>{sourceName(p.source ?? 'unrecorded')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mt-8 max-w-3xl" aria-labelledby="nav-provenance" data-nav-provenance={provenance.length}>
                <h2 id="nav-provenance" className="text-lg font-extrabold tracking-tight text-main">{isAr ? 'مصدر كل نقطة في هذا السجل' : 'Where every point in this history comes from'}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                    {isAr
                        ? 'يحمل كل صافي قيمة أصول في هذه السلسلة اسم المصدر الذي أفصح عنه، ورابط الملف أو التقرير الذي قُرئ منه، ووقت إدخاله إلى قاعدة بياناتنا. لا تُقدَّر أي قيمة؛ والنقاط المسجَّلة قبل بدء تتبّع المصدر تظهر كذلك.'
                        : 'Every NAV in this series carries the source that vouched for it, the file or report it was read from, and the time it entered our database. Nothing is estimated; points recorded before source tracking began are shown as such.'}
                </p>
                <table className="mt-3 w-full max-w-xl text-sm">
                    <thead>
                        <tr className={`border-b border-border text-xs font-bold uppercase tracking-wide text-muted ${isAr ? 'text-right' : 'text-left'}`}>
                            <th className="py-2">{isAr ? 'المصدر' : 'Source'}</th>
                            <th className={`py-2 ${isAr ? 'text-left' : 'text-right'}`}>{isAr ? 'عدد النقاط' : 'Points'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {provenance.map(([k, n]) => (
                            <tr key={k} className="border-b border-border/60 last:border-0">
                                <td className="py-2 text-muted">{sourceName(k)}</td>
                                <td className={`py-2 tabular-nums font-semibold text-main ${isAr ? 'text-left' : 'text-right'}`} dir="ltr">{n.toLocaleString('en-EG')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {(latestIngest || sourceUrls.length > 0) && (
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                        {latestIngest && (
                            <>
                                {isAr ? 'آخر إدخال: ' : 'Last ingested: '}
                                <time dateTime={latestIngest}>{new Date(latestIngest).toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' })}</time>
                                {isAr ? ' (بتوقيت القاهرة)' : ' (Cairo time)'}
                            </>
                        )}
                        {sourceUrls.length > 0 && (
                            <>
                                {latestIngest ? ' · ' : ''}
                                {isAr ? 'المستندات الأصلية: ' : 'Source documents: '}
                                {sourceUrls.slice(0, 3).map((u, i) => (
                                    <span key={u}>
                                        {i > 0 && ', '}
                                        <a href={u} rel="nofollow noopener" target="_blank" className="underline">{new URL(u).hostname.replace(/^www\./, '')}</a>
                                    </span>
                                ))}
                            </>
                        )}
                    </p>
                )}
            </section>

            <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted">{t(NAVHIST.sourceNote, lang)}</p>

            <nav className="mt-8 border-t border-border pt-5">
                <Link href={encodeURI(basePath(fund, lang))} prefetch={false} className="text-sm font-semibold text-starta-darkTeal hover:underline">
                    {isAr ? `العودة إلى صفحة ${name}` : `Back to ${name}`}
                </Link>
            </nav>
        </PublicPageShell>
    );
}
