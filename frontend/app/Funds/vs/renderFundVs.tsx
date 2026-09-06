import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getFund, type Fund } from '@/lib/public-data';
import { SITE_URL, fundPath, absUrl, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { FUNDVS, t, type Lang } from '@/content/symbol-pages-i18n';
import { ltrNum } from '@/lib/bidi';
import { fundTypeLabel, riskLabel } from '@/app/Funds/[id]/fund-i18n';
import { HOME_PATH } from '@/lib/lang';

/**
 * /Funds/vs/{idA}-vs-{idB} — side-by-side comparison of two Egyptian mutual
 * funds. CANONICAL ORDER: lower fund id first — the reversed pair 308s to the
 * ordered canonical, so each pair has exactly one indexable URL. Equal ids or
 * a malformed pair are real 404s.
 *
 * 'vs' is a static segment so this route never collides with /Funds/[id]
 * (static segments win over dynamic ones in the App Router).
 *
 * Null-safety discipline matches /Funds/[id]: every funds_view field may be
 * null; rows render only when at least one side has data, the missing side
 * shows '—', and the summary paragraph only makes claims derivable from the
 * loaded numbers. Factual comparison only — no recommendation language.
 */

// ISR: cache at the edge and revalidate in background — the audit found
// every SSR route shipped no-store (0% CDN hit, 1.0-1.5s TTFB). Pages are
// anonymous, so edge-caching is safe; value tuned to how fast the data moves.
export const revalidate = 900;

type Props = { params: Promise<{ pair: string }> };

const PAIR_RE = /^(\d+)-vs-(\d+)$/;

/** Parse "{idA}-vs-{idB}" → two distinct positive ints, else null. */
function parsePair(pair: string): { idA: number; idB: number } | null {
    const m = PAIR_RE.exec(pair || '');
    if (!m) return null;
    const idA = parseInt(m[1], 10);
    const idB = parseInt(m[2], 10);
    if (!Number.isInteger(idA) || !Number.isInteger(idB) || idA <= 0 || idB <= 0 || idA === idB) return null;
    return { idA, idB };
}

/** Trimmed non-empty string field, else null. */
function str(fund: Fund, key: string): string | null {
    const v = fund[key];
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
}

/** Finite number field (funds_view numerics are pre-coerced by getFund), else null. */
function num(fund: Fund, key: string): number | null {
    const v = fund[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/** Tri-state boolean: true / false / unknown(null) — never a truthy-string guess. */
function bool(fund: Fund, key: string): boolean | null {
    const v = fund[key];
    if (v === true || v === 'true' || v === 't' || v === 1) return true;
    if (v === false || v === 'false' || v === 'f' || v === 0) return false;
    return null;
}

/**
 * Normalize a date-ish value (pg DATE → Date at local midnight, timestamps/ISO
 * → strings) to plain YYYY-MM-DD, or null. Component extraction avoids UTC
 * off-by-one shifts on local-midnight Dates.
 */
function isoDate(v: unknown): string | null {
    if (v instanceof Date) {
        if (Number.isNaN(v.getTime())) return null;
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    if (typeof v === 'string') {
        const m = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim());
        if (m) return m[1];
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    return null;
}

/** Human date ("2 July 2026" / "٢ يوليو ٢٠٢٦") from a YYYY-MM-DD string, in the page language, timezone-stable. */
function humanDate(iso: string, lang: Lang): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

function fmtNav(v: number): string {
    return v.toLocaleString('en-EG', { maximumFractionDigits: 4 });
}

function fmtPct(v: number): string {
    return ltrNum(`${v.toFixed(2)}%`);
}

function fmtSignedPct(v: number): string {
    return ltrNum(`${v > 0 ? '+' : ''}${v.toFixed(2)}%`);
}

/** Shared derivations for generateMetadata + the page body. */
function fundBasics(fund: Fund, lang: Lang) {
    const nameEn = str(fund, 'fund_name_en');
    const nameAr = str(fund, 'fund_name');
    // Display name follows the page language; the link does too.
    const name = (lang === 'ar' ? nameAr || nameEn : nameEn || nameAr) || `Fund ${fund.fund_id}`;
    const path = fundPath(fund.fund_id, nameEn, nameAr, lang);
    const nav = num(fund, 'latest_nav');
    const navDateIso = isoDate(fund['last_nav_date']);
    return { nameEn, nameAr, name, path, nav, navDateIso };
}

async function loadPair(pairParam: string): Promise<{ a: Fund; b: Fund } | { redirect: string } | null> {
    const parsed = parsePair(pairParam);
    if (!parsed) return null;
    if (parsed.idA > parsed.idB) return { redirect: `/Funds/vs/${parsed.idB}-vs-${parsed.idA}` };
    const [a, b] = await Promise.all([getFund(parsed.idA), getFund(parsed.idB)]);
    if (!a || !b) return null;
    return { a, b };
}

export async function fundVsMetadata(pair: string, lang: Lang): Promise<Metadata> {
    const loaded = await loadPair(pair);
    // Malformed/unknown pairs 404 in the body; reversed pairs 308 — no metadata.
    if (!loaded || 'redirect' in loaded) return {};
    const { a, b } = loaded;
    const A = fundBasics(a, lang);
    const B = fundBasics(b, lang);
    const r1yA = num(a, 'return_1y');
    const r1yB = num(b, 'return_1y');

    let description =
        r1yA !== null && r1yB !== null
        ? `${t(FUNDVS.description(A.name, B.name), lang)}`
        : `${t(FUNDVS.description(A.name, B.name), lang)}`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    const pairSlug = `${a.fund_id}-vs-${b.fund_id}`;
    const pathEn = `/Funds/vs/${pairSlug}`;
    const pathAr = `/ar/Funds/vs/${pairSlug}`;
    const canonicalPath = lang === 'ar' ? pathAr : pathEn;
    const title = t(FUNDVS.title(A.name, B.name), lang);
    return {
        title,
        description,
        alternates: {
            // Language-aware, with reciprocal hreflang — the comparison pages
            // were English-only and unpaired, so the Arabic tree had no
            // fund-comparison surface at all.
            canonical: canonicalPath,
            languages: { en: pathEn, ar: pathAr, 'x-default': pathAr },
        },
        openGraph: {
            ...OG_DEFAULTS, type: 'website', title, description, url: canonicalPath },
    };
}

type CompareRow = {
    label: string;
    a: string | null;
    b: string | null;
    /** Return rows: color ± and bold the better (higher) side. */
    isReturn?: boolean;
    aNum?: number | null;
    bNum?: number | null;
};

function returnCell(value: number | null, otherValue: number | null) {
    if (value === null) return <td className="px-4 py-2.5 text-muted">—</td>;
    const better = otherValue !== null && value > otherValue;
    const color = value < 0 ? 'text-red-600' : value > 0 ? 'text-emerald-700' : 'text-main';
    return (
        <td className={`px-4 py-2.5 tabular-nums ${color} ${better ? 'font-bold' : 'font-medium'}`}>
            {fmtSignedPct(value)}
        </td>
    );
}

export async function renderFundVs(pair: string, lang: Lang) {
    const isAr = lang === 'ar';
    const loaded = await loadPair(pair);
    if (!loaded) notFound();
    if ('redirect' in loaded) permanentRedirect(loaded.redirect);

    const { a, b } = loaded;
    const A = fundBasics(a, lang);
    const B = fundBasics(b, lang);
    const canonicalPath = `${isAr ? '/ar' : ''}/Funds/vs/${a.fund_id}-vs-${b.fund_id}`;

    // Currency in the page language ("جنيه مصري", not "EGP", inside Arabic prose).
    const currencyLabel = (code: string): string => (FUNDVS.currency[code.toUpperCase()] ? t(FUNDVS.currency[code.toUpperCase()], lang) : code);
    const currencyA = currencyLabel(str(a, 'currency') || 'EGP');
    const currencyB = currencyLabel(str(b, 'currency') || 'EGP');
    const asOf = (iso: string | null): string => (iso ? ` (${t(FUNDVS.asOf, lang)} ${humanDate(iso, lang)})` : '');

    const navCell = (basics: typeof A, currency: string): string | null =>
        basics.nav !== null ? `${fmtNav(basics.nav)} ${currency}${asOf(basics.navDateIso)}` : null;

    const minSubCell = (fund: Fund, currency: string): string | null => {
        const v = num(fund, 'min_subscription');
        return v !== null ? `${v.toLocaleString('en-EG')} ${currency}` : null;
    };

    const shariahCell = (fund: Fund): string | null => {
        const v = bool(fund, 'is_shariah');
        return v === null ? null : t(v ? FUNDVS.yes : FUNDVS.no, lang);
    };

    const pctCell = (fund: Fund, key: string): string | null => {
        const v = num(fund, key);
        return v !== null ? fmtPct(v) : null;
    };

    // Type / classification / risk through the fund page's own label maps, so
    // the two pages name the same thing identically in each language. The
    // classification row is shown only when it adds something to the type.
    const typeCell = (fund: Fund): string | null =>
        fundTypeLabel(str(fund, 'fund_type') || str(fund, 'fund_type_en'), str(fund, 'classification_en') || str(fund, 'classification'), lang);
    const classificationCell = (fund: Fund): string | null => {
        const v = fundTypeLabel(str(fund, 'classification_en') || str(fund, 'classification'), null, lang);
        return v && v !== typeCell(fund) ? v : null;
    };
    const riskCell = (fund: Fund): string | null => riskLabel(str(fund, 'risk_level') || str(fund, 'risk_level_en'), lang);
    const managerCell = (fund: Fund): string | null =>
        isAr ? str(fund, 'manager_name') || str(fund, 'manager_name_en') : str(fund, 'manager_name_en') || str(fund, 'manager_name');
    const issuerCell = (fund: Fund): string | null =>
        isAr ? str(fund, 'owner_name') || str(fund, 'issuer_en') || str(fund, 'owner_name_en') : str(fund, 'issuer_en') || str(fund, 'owner_name_en') || str(fund, 'owner_name');

    const returnRows: CompareRow[] = (
        [
            [t(FUNDVS.rows.returnYtd, lang), 'return_ytd'],
            [t(FUNDVS.rows.return1m, lang), 'return_1m'],
            [t(FUNDVS.rows.return3m, lang), 'return_3m'],
            [t(FUNDVS.rows.return1y, lang), 'return_1y'],
            [t(FUNDVS.rows.return3y, lang), 'return_3y'],
            [t(FUNDVS.rows.return5y, lang), 'return_5y'],
        ] as Array<[string, string]>
    ).map(([label, key]) => {
        const aNum = num(a, key);
        const bNum = num(b, key);
        return {
            label,
            a: aNum !== null ? fmtSignedPct(aNum) : null,
            b: bNum !== null ? fmtSignedPct(bNum) : null,
            isReturn: true,
            aNum,
            bNum,
        };
    });

    const factRows: CompareRow[] = [
        { label: t(FUNDVS.rows.latestNav, lang), a: navCell(A, currencyA), b: navCell(B, currencyB) },
        ...returnRows,
        { label: t(FUNDVS.rows.fundType, lang), a: typeCell(a), b: typeCell(b) },
        { label: t(FUNDVS.rows.classification, lang), a: classificationCell(a), b: classificationCell(b) },
        { label: t(FUNDVS.rows.riskLevel, lang), a: riskCell(a), b: riskCell(b) },
        { label: t(FUNDVS.rows.managementFee, lang), a: pctCell(a, 'fee_management'), b: pctCell(b, 'fee_management') },
        { label: t(FUNDVS.rows.expenseRatio, lang), a: pctCell(a, 'expense_ratio'), b: pctCell(b, 'expense_ratio') },
        { label: t(FUNDVS.rows.minSubscription, lang), a: minSubCell(a, currencyA), b: minSubCell(b, currencyB) },
        { label: t(FUNDVS.rows.shariah, lang), a: shariahCell(a), b: shariahCell(b) },
        { label: t(FUNDVS.rows.manager, lang), a: managerCell(a), b: managerCell(b) },
        { label: t(FUNDVS.rows.issuer, lang), a: issuerCell(a), b: issuerCell(b) },
        { label: t(FUNDVS.rows.inception, lang), a: isoDate(a['inception_date'])?.slice(0, 4) ?? null, b: isoDate(b['inception_date'])?.slice(0, 4) ?? null },
    ].filter((row) => row.a !== null || row.b !== null);

    // Summary: only claims derivable from the loaded numbers — factual, no
    // recommendation language.
    const summaryBits: string[] = [];
    const r1yA = num(a, 'return_1y');
    const r1yB = num(b, 'return_1y');
    const latestNavDate = [A.navDateIso, B.navDateIso].filter((d): d is string => d !== null).sort().pop() ?? null;
    if (r1yA !== null && r1yB !== null) {
        summaryBits.push(
            t(FUNDVS.summary.bothReturns(A.name, fmtSignedPct(r1yA), B.name, fmtSignedPct(r1yB), latestNavDate ? humanDate(latestNavDate, lang) : ''), lang)
        );
    } else if (r1yA !== null) {
        summaryBits.push(t(FUNDVS.summary.oneReturn(A.name, fmtSignedPct(r1yA), B.name), lang));
    } else if (r1yB !== null) {
        summaryBits.push(t(FUNDVS.summary.oneReturn(B.name, fmtSignedPct(r1yB), A.name), lang));
    }
    if (A.nav !== null && B.nav !== null) {
        summaryBits.push(
            t(FUNDVS.summary.navs(A.name, fmtNav(A.nav), currencyA, A.navDateIso ? humanDate(A.navDateIso, lang) : '', B.name, fmtNav(B.nav), currencyB, B.navDateIso ? humanDate(B.navDateIso, lang) : ''), lang)
        );
    }
    const feeA = num(a, 'fee_management');
    const feeB = num(b, 'fee_management');
    if (feeA !== null && feeB !== null) {
        summaryBits.push(t(FUNDVS.summary.fees(fmtPct(feeA), fmtPct(feeB)), lang));
    }
    const summary = summaryBits.length > 0 ? `${summaryBits.join('. ')}.` : null;

    const breadcrumbItems = [
        { href: HOME_PATH, url: HOME_PATH, label: isAr ? 'الرئيسية' : 'Home' },
        { href: isAr ? '/ar/Funds' : '/Funds', url: isAr ? '/ar/Funds' : '/Funds', label: t(FUNDVS.crumb, lang) },
        { label: t(FUNDVS.h1(A.name, B.name), lang) },
    ];

    return (
        <PublicPageShell lang={lang} altHref={`${isAr ? '' : '/ar'}/Funds/vs/${pair}`} persistLang>
            <JsonLd data={breadcrumbJsonLd(breadcrumbItems, SITE_URL)} />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'ItemList',
                    name: t(FUNDVS.h1(A.name, B.name), lang),
                    url: absUrl(canonicalPath),
                    numberOfItems: 2,
                    itemListElement: [
                        { '@type': 'ListItem', position: 1, name: A.name, url: absUrl(A.path) },
                        { '@type': 'ListItem', position: 2, name: B.name, url: absUrl(B.path) },
                    ],
                }}
            />
            <Breadcrumbs lang={lang} items={breadcrumbItems} />

            <h1 className="text-2xl font-extrabold leading-snug text-main sm:text-3xl">
                {t(FUNDVS.h1(A.name, B.name), lang)}
            </h1>
            <p className="mt-2 text-lg text-muted">{t(FUNDVS.heading, lang)}</p>

            {summary && <p className="mt-4 max-w-3xl leading-relaxed text-main">{summary}</p>}

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[560px] text-sm">
                    <thead>
                        <tr className={`border-b border-border bg-panel/40 ${isAr ? 'text-right' : 'text-left'} text-xs font-bold uppercase tracking-wide text-muted`}>
                            <th scope="col" className="px-4 py-3">{t(FUNDVS.metric, lang)}</th>
                            <th scope="col" className="px-4 py-3">
                                <Link href={A.path} className="normal-case tracking-normal text-main hover:text-starta-darkTeal">{A.name}</Link>
                            </th>
                            <th scope="col" className="px-4 py-3">
                                <Link href={B.path} className="normal-case tracking-normal text-main hover:text-starta-darkTeal">{B.name}</Link>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {factRows.map((row) => (
                            <tr key={row.label} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <th scope="row" className={`px-4 py-2.5 ${isAr ? 'text-right' : 'text-left'} font-semibold text-main`}>{row.label}</th>
                                {row.isReturn ? (
                                    <>
                                        {returnCell(row.aNum ?? null, row.bNum ?? null)}
                                        {returnCell(row.bNum ?? null, row.aNum ?? null)}
                                    </>
                                ) : (
                                    <>
                                        <td className={`px-4 py-2.5 ${row.a === null ? 'text-muted' : 'text-main'}`}>{row.a ?? '—'}</td>
                                        <td className={`px-4 py-2.5 ${row.b === null ? 'text-muted' : 'text-main'}`}>{row.b ?? '—'}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-3 text-xs text-muted">{t(FUNDVS.footnote, lang)}</p>

            <nav aria-label={isAr ? 'صفحات الصناديق' : 'Fund profiles'} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-teal-700">
                <Link href={A.path} className="hover:text-starta-darkTeal hover:underline">{t(FUNDVS.profile(A.name), lang)} →</Link>
                <Link href={B.path} className="hover:text-starta-darkTeal hover:underline">{t(FUNDVS.profile(B.name), lang)} →</Link>
                <Link href={isAr ? '/ar/Funds' : '/Funds'} className="hover:text-starta-darkTeal hover:underline">{t(FUNDVS.allFunds, lang)} →</Link>
            </nav>

            <p className="mt-8 border-t border-border pt-4 text-xs text-muted">{t(FUNDVS.disclaimer, lang)}</p>
        </PublicPageShell>
    );
}
