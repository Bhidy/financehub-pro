import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAllFundsRanked, getFund, getFundPeers, type Fund } from '@/lib/public-data';
import { SITE_URL, fundPath, idFromParam, canonicalRedirectTarget, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import FundPageClient, { type FundClientData } from './FundPageClient';

/**
 * Server-rendered fund profile at /Funds/{fund_id}-{slug}.
 * Bare /Funds/{fund_id} (or a stale slug) 308s to the slugged canonical;
 * unknown ids are real 404s. /Funds/Compare is intercepted by a rewrite
 * before the filesystem, so non-numeric params here are simply 404s.
 *
 * Every field from funds_view may be null — blocks and rows are omitted
 * when data is missing rather than rendering placeholders (financial data:
 * a wrong or fabricated value is worse than no value).
 */

type Props = { params: Promise<{ id: string }> };

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

/** Strict true only — never renders a badge off a truthy string like "false". */
function isTrue(fund: Fund, key: string): boolean {
    const v = fund[key];
    return v === true || v === 'true' || v === 't' || v === 1;
}

/**
 * Normalize a date-ish value (pg DATE comes back as a Date at local midnight,
 * timestamps/ISO come back as strings) to a plain YYYY-MM-DD, or null.
 * Extracting components directly avoids UTC off-by-one shifts.
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

/** Human date ("2 July 2026") from a YYYY-MM-DD string, timezone-stable. */
function humanDate(iso: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
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
    return `${v.toFixed(2)}%`;
}

async function resolveFund(idParam: string): Promise<Fund> {
    const id = idFromParam(idParam);
    if (!id) notFound();
    const fund = await getFund(id);
    if (!fund) notFound();
    return fund;
}

/** Shared derivations for generateMetadata + the page body. */
function fundBasics(fund: Fund) {
    const nameEn = str(fund, 'fund_name_en');
    const nameAr = str(fund, 'fund_name');
    const name = nameEn || nameAr || `Fund ${fund.fund_id}`;
    const canonicalPath = fundPath(fund.fund_id, nameEn, nameAr);
    const nav = num(fund, 'latest_nav');
    const navDateIso = isoDate(fund['last_nav_date']);
    const manager = str(fund, 'manager_name_en') || str(fund, 'manager_name');
    return { nameEn, nameAr, name, canonicalPath, nav, navDateIso, manager };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id: idParam } = await params;
    const id = idFromParam(idParam);
    if (!id) return {};
    const fund = await getFund(id);
    if (!fund) return {};
    const { name, canonicalPath, nav, navDateIso, manager } = fundBasics(fund);
    const ytd = num(fund, 'return_ytd');

    const bits: string[] = [];
    if (nav !== null) bits.push(`latest NAV ${fmtNav(nav)} EGP${navDateIso ? ` (as of ${navDateIso})` : ''}`);
    if (ytd !== null) bits.push(`YTD return ${fmtPct(ytd)}`);
    if (manager) bits.push(`managed by ${manager}`);
    let description = bits.length
        ? `${name}: ${bits.join(', ')}. Full fees, performance and strategy.`
        : `${name} — NAV history, returns, fees and strategy on Starta Markets.`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    const title = `${name} — NAV, Returns & Fees`;
    return {
        title,
        description,
        alternates: { canonical: encodeURI(canonicalPath) },
        openGraph: {
            type: 'website',
            title,
            description,
            url: encodeURI(canonicalPath),
        },
    };
}

export default async function FundPage({ params }: Props) {
    const { id: idParam } = await params;
    const fund = await resolveFund(idParam);
    const { nameEn, nameAr, name, canonicalPath, nav, navDateIso, manager } = fundBasics(fund);

    // 308 any non-canonical form (bare id, stale/wrong slug) to the canonical.
    // Encoding-aware: params arrive percent-encoded (Arabic-named funds), and
    // the Location header must be encoded — raw unicode there 500s.
    const redirectTarget = canonicalRedirectTarget(`/Funds/${idParam}`, canonicalPath);
    if (redirectTarget) {
        permanentRedirect(redirectTarget);
    }

    const navHigh = num(fund, 'nav_52w_high');
    const navLow = num(fund, 'nav_52w_low');
    // Staleness cue: EG fund NAVs publish ~weekly, so >10 days without a fresh
    // point means the headline is delayed. Surfacing this lets us show more funds
    // (relaxed freshness gate) without ever presenting a stale NAV as current.
    const navAgeDays = navDateIso ? Math.floor((Date.now() - Date.parse(navDateIso)) / 86_400_000) : null;
    const navStale = navAgeDays !== null && navAgeDays > 10;
    const currency = str(fund, 'currency');
    // Fund type: funds_view carries fund_type/classification but not the *_en variants,
    // so fall back through them (and humanise a raw code like "money_market").
    const TYPE_LABEL: Record<string, string> = {
        equity: 'Equity Fund', money_market: 'Money Market Fund', fixed_income: 'Fixed Income Fund',
        balanced: 'Balanced Fund', mixed: 'Balanced Fund', bond: 'Fixed Income Fund', real_estate: 'Real Estate Fund',
    };
    const rawType = str(fund, 'fund_type');
    const fundTypeEn = str(fund, 'fund_type_en') || str(fund, 'classification_en')
        || str(fund, 'classification') || (rawType ? (TYPE_LABEL[rawType.toLowerCase()] ?? rawType) : null);
    const classificationEn = str(fund, 'classification_en') || str(fund, 'classification');
    const minSubscription = num(fund, 'min_subscription');
    const cap = (s: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : null);
    const inceptionYear = isoDate(fund['inception_date'])?.slice(0, 4) ?? null;

    const riskStats = (
        [
            ['Max drawdown (all-time, peak-to-trough)', num(fund, 'max_drawdown')],
            ['Volatility (annualized, full history)', num(fund, 'volatility_annual')],
        ] as Array<[string, number | null]>
    ).filter((r): r is [string, number] => r[1] !== null);

    // The AMC/manager appears in the hero tagline; only surface a distinct
    // "Fund manager" (the harvested individual/house) when it actually differs.
    const fundManager = str(fund, 'fund_manager');
    const fundManagerFact =
        fundManager && (!manager || fundManager.trim().toLowerCase() !== manager.trim().toLowerCase())
            ? fundManager
            : null;
    const facts = (
        [
            ['Issuer', str(fund, 'issuer_en')],
            ['Fund manager', fundManagerFact],
            ['Fund type', fundTypeEn],
            ['Classification', classificationEn && classificationEn !== fundTypeEn ? classificationEn : null],
            ['Risk level', str(fund, 'risk_level_en') || cap(str(fund, 'risk_level'))],
            ['Currency', currency],
            ['Inception year', inceptionYear],
            ['NAV frequency', str(fund, 'nav_frequency_en')],
            [
                // Egyptian fund minimums are a number of certificates (units), not a
                // currency amount — snduk labels it "Units" too. Never append a currency.
                'Minimum subscription',
                minSubscription !== null
                    ? `${minSubscription.toLocaleString('en-EG')} ${minSubscription === 1 ? 'unit' : 'units'}`
                    : null,
            ],
            ['Benchmark', str(fund, 'benchmark_en')],
        ] as Array<[string, string | null]>
    ).filter((f): f is [string, string] => f[1] !== null);

    // Trading schedule — surfaced in "Where to Invest", not the facts grid, so
    // purchase/redemption cadence never renders twice on the page.
    const tradingRows = (
        [
            ['Purchase frequency', cap(str(fund, 'purchase_frequency'))],
            ['Redemption frequency', cap(str(fund, 'redemption_frequency'))],
        ] as Array<[string, string | null]>
    ).filter((f): f is [string, string] => f[1] !== null);

    const fees = (
        [
            ['Management fee', num(fund, 'fee_management')],
            ['Subscription fee', num(fund, 'fee_subscription')],
            ['Redemption fee', num(fund, 'fee_redemption')],
            ['Expense ratio', num(fund, 'expense_ratio')],
        ] as Array<[string, number | null]>
    ).filter((f): f is [string, number] => f[1] !== null);

    const prospectusUrl = str(fund, 'prospectus_url');
    const platforms = (Array.isArray(fund.platforms) ? (fund.platforms as Record<string, unknown>[]) : [])
        .map((p) => ({
            name: typeof p.platform_name === 'string' ? p.platform_name.trim() : '',
            logo: typeof p.logo_url === 'string' ? p.logo_url : null,
        }))
        .filter((p) => p.name);

    const strategyEn = str(fund, 'investment_strategy_en');
    const strategyAr = str(fund, 'investment_strategy');
    // De-duplicate: many funds store the same text in both the strategy and
    // objective columns — only surface the objective when it actually differs.
    const norm = (s: string | null) => (s ? s.replace(/\s+/g, ' ').trim().toLowerCase() : '');
    const objectiveEnRaw = str(fund, 'objective_en');
    const objectiveArRaw = str(fund, 'objective');
    const objectiveEn = norm(objectiveEnRaw) && norm(objectiveEnRaw) !== norm(strategyEn) ? objectiveEnRaw : null;
    const objectiveAr = norm(objectiveArRaw) && norm(objectiveArRaw) !== norm(strategyAr) ? objectiveArRaw : null;

    let peers = (await getFundPeers(fund.fund_id))
        .map((p) => {
            const peerId = typeof p.peer_fund_id === 'number' ? p.peer_fund_id : Number(p.peer_fund_id);
            if (!Number.isInteger(peerId) || peerId <= 0 || peerId === Number(fund.fund_id)) return null;
            const en = typeof p.peer_fund_name_en === 'string' && p.peer_fund_name_en.trim() ? p.peer_fund_name_en.trim() : null;
            const ar = typeof p.peer_fund_name === 'string' && p.peer_fund_name.trim() ? p.peer_fund_name.trim() : null;
            if (!en && !ar) return null;
            return { id: peerId, label: en || ar!, href: fundPath(peerId, en, ar) };
        })
        .filter((p): p is { id: number; label: string; href: string } => p !== null);
    if (peers.length === 0) {
        // fund_peers is empty on production (2026-07-03 audit follow-up):
        // fall back to the best same-type funds so "Similar Funds" and its
        // head-to-head links never render as an empty section. Compare ids
        // NUMERICALLY — pg returns fund_id as a string, and a strict
        // string-vs-number check let the fund list itself as its own peer
        // (live 2666-vs-2666 regression).
        const myId = Number(fund.fund_id);
        const myType = str(fund, 'fund_type_en');
        const seen = new Set<number>([myId]);
        peers = (await getAllFundsRanked())
            .filter((f) => !myType || f.fund_type_en === myType)
            .map((f) => {
                const id = Number(f.fund_id);
                const en = typeof f.fund_name_en === 'string' && f.fund_name_en.trim() ? f.fund_name_en.trim() : null;
                const ar = typeof f.fund_name === 'string' && f.fund_name.trim() ? f.fund_name.trim() : null;
                if (!Number.isInteger(id) || id <= 0 || seen.has(id) || (!en && !ar)) return null;
                seen.add(id);
                return { id, label: en || ar!, href: fundPath(id, en, ar) };
            })
            .filter((p): p is { id: number; label: string; href: string } => p !== null)
            .slice(0, 4);
    }

    // FAQ: visible text and JSON-LD are rendered from this one array so they
    // can never drift apart. Entries exist only where the data does.
    const faqs: Array<{ q: string; a: string }> = [];
    if (nav !== null && navDateIso) {
        faqs.push({
            q: `What is the latest NAV of ${name}?`,
            a: `The latest NAV of ${name} is ${fmtNav(nav)} EGP as of ${humanDate(navDateIso)}.`,
        });
    }
    if (manager) {
        faqs.push({ q: `Who manages ${name}?`, a: `${name} is managed by ${manager}.` });
    }
    if (fundTypeEn) {
        const article = /^[aeiou]/i.test(fundTypeEn) ? 'an' : 'a';
        faqs.push({ q: `What type of fund is ${name}?`, a: `${name} is ${article} ${fundTypeEn}.` });
    }
    if (minSubscription !== null) {
        // minSubscription is a unit count (e.g. 100 وثيقة), NOT an EGP amount —
        // never suffix the fund currency here or it reads as "100 EGP".
        const units = minSubscription === 1 ? 'unit' : 'units';
        faqs.push({
            q: 'What is the minimum investment?',
            a: `The minimum subscription for ${name} is ${minSubscription.toLocaleString('en-EG')} ${units}.`,
        });
    }

    const fundJsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'InvestmentFund',
        name,
        ...(nameAr && nameAr !== name ? { alternateName: nameAr } : {}),
        url: absUrl(canonicalPath),
        ...(str(fund, 'issuer_en') ? { provider: { '@type': 'Organization', name: str(fund, 'issuer_en') } } : {}),
        ...(currency ? { currency } : {}),
    };

    const currencyLabel = currency ?? 'EGP';
    const monogram = (name || 'F').trim().charAt(0).toUpperCase();
    const ytd = num(fund, 'return_ytd');

    // Period performance cards use the server's precomputed returns (SEO-friendly,
    // no client compute) with short labels; the interactive chart handles history.
    const perfCards = (
        [
            ['1M', num(fund, 'return_1m')],
            ['3M', num(fund, 'return_3m')],
            ['YTD', ytd],
            ['1Y', num(fund, 'return_1y')],
            ['3Y', num(fund, 'return_3y')],
            ['5Y', num(fund, 'return_5y')],
        ] as Array<[string, number | null]>
    )
        .filter((p): p is [string, number] => p[1] !== null)
        .map(([label, value]) => ({ label, value: fmtPct(value), negative: value < 0 }));

    const headlineReturn =
        ytd !== null
            ? { label: 'YTD return', value: fmtPct(ytd), negative: ytd < 0 }
            : perfCards.length > 0
              ? { label: `${perfCards[0].label} return`, value: perfCards[0].value, negative: perfCards[0].negative }
              : null;

    const riskChip = str(fund, 'risk_level_en') || cap(str(fund, 'risk_level'));
    const chips = [fundTypeEn, riskChip, isTrue(fund, 'is_shariah') ? 'Shariah-compliant' : null].filter(
        (c): c is string => !!c
    );

    const myId = Number(fund.fund_id);
    const clientData: FundClientData = {
        fundId: fund.fund_id,
        name,
        nameEn,
        nameAr,
        managerLine: manager ? `Managed by ${manager}` : null,
        monogram,
        navText: nav !== null ? fmtNav(nav) : null,
        navDateIso,
        navHuman: navDateIso ? humanDate(navDateIso) : null,
        navStale,
        navAgeDays,
        navHigh: navHigh !== null ? fmtNav(navHigh) : null,
        navLow: navLow !== null ? fmtNav(navLow) : null,
        currency: currencyLabel,
        headlineReturn,
        chips,
        miniStats: [],
        perfCards,
        facts: facts.map(([label, value]) => ({ label, value })),
        fees: fees.map(([label, value]) => ({ label, value: fmtPct(value) })),
        riskStats: riskStats.map(([label, value]) => ({ label, value: fmtPct(value), negative: value < 0 })),
        platforms,
        prospectusUrl,
        tradingRows: tradingRows.map(([label, value]) => ({ label, value })),
        strategyEn,
        objectiveEn,
        strategyAr,
        objectiveAr,
        peers: peers.map((p) => ({
            id: p.id,
            label: p.label,
            href: p.href,
            compareHref: `/Funds/vs/${Math.min(myId, p.id)}-vs-${Math.max(myId, p.id)}`,
        })),
        faqs,
    };

    return (
        <PublicPageShell>
            <JsonLd data={fundJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [{ url: '/', label: 'Home' }, { url: '/Funds', label: 'Mutual Funds' }, { label: name }],
                    SITE_URL
                )}
            />
            {faqs.length > 0 && (
                <JsonLd
                    data={{
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: faqs.map((f) => ({
                            '@type': 'Question',
                            name: f.q,
                            acceptedAnswer: { '@type': 'Answer', text: f.a },
                        })),
                    }}
                />
            )}
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/Funds', label: 'Mutual Funds' }, { label: name }]} />
            <FundPageClient {...clientData} />
        </PublicPageShell>
    );
}
