import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAllFundsRanked, getFund, getFundPeers, type Fund } from '@/lib/public-data';
import { SITE_URL, fundPath, idFromParam, canonicalRedirectTarget, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import FundPageClient, { type FundClientData } from './FundPageClient';
import { fundLabels, fundTypeLabel, riskLabel, freqLabel, type Lang } from './fund-i18n';
import { fundLogo } from '@/lib/fund-logos';
import { investmentFundNode } from '@/lib/funds-hub-render';
import { DORMANT_DAYS } from '@/lib/fund-stats';
import { buildFundAnalytics, type AnalyticsInput } from '@/lib/fund-analytics';

/**
 * Shared, per-URL bilingual renderer for the fund-profile page. Both routes
 * delegate here: /Funds/{slug} (lang 'en', LTR) and /ar/Funds/{slug}
 * (lang 'ar', RTL). Content is shown in ONE language per URL — never mixed —
 * and the nav shows the EN/AR switcher (PublicPageShell altHref). All SEO
 * derivation, JSON-LD and canonical 308s are preserved from the original page.
 */

type Fields = Record<string, unknown>;

function str(fund: Fund, key: string): string | null {
    const v = (fund as Fields)[key];
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
}
function num(fund: Fund, key: string): number | null {
    const v = (fund as Fields)[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function isTrue(fund: Fund, key: string): boolean {
    const v = (fund as Fields)[key];
    return v === true || v === 'true' || v === 't' || v === 1;
}
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
    return `${v.toFixed(2)}%`;
}
function fmtInt(v: number): string {
    return Math.round(v).toLocaleString('en-EG');
}

const CURRENCY_AR: Record<string, string> = { EGP: 'جنيه مصري', USD: 'دولار أمريكي', EUR: 'يورو', SAR: 'ريال سعودي' };
const ELIGIBILITY_AR: Record<string, string> = {
    'all nationalities': 'جميع الجنسيات',
    egyptians: 'المصريون فقط',
    'egyptians only': 'المصريون فقط',
    'egyptians and foreigners': 'المصريون والأجانب',
};

async function resolveFund(idParam: string): Promise<Fund> {
    const id = idFromParam(idParam);
    if (!id) notFound();
    const fund = await getFund(id);
    if (!fund) notFound();
    return fund;
}

function basics(fund: Fund, lang: Lang) {
    const nameEn = str(fund, 'fund_name_en');
    const nameAr = str(fund, 'fund_name');
    const nameFallback = lang === 'ar' ? `صندوق ${fund.fund_id}` : `Fund ${fund.fund_id}`;
    const name = lang === 'ar' ? nameAr || nameEn || nameFallback : nameEn || nameAr || nameFallback;
    const canonicalEn = fundPath(fund.fund_id, nameEn, nameAr, 'en');
    // Arabic canonical carries the ARABIC slug (/ar/Funds/{id}-{arabic-slug});
    // any older /ar URL with the English slug 308s here via the ID-keyed route.
    const canonicalAr = fundPath(fund.fund_id, nameEn, nameAr, 'ar');
    const managerEn = str(fund, 'manager_name_en') || str(fund, 'owner_name_en') || str(fund, 'issuer_en');
    const managerAr = str(fund, 'manager_name') || str(fund, 'owner_name');
    const manager = lang === 'ar' ? managerAr || managerEn : managerEn || managerAr;
    const nav = num(fund, 'latest_nav');
    const navDateIso = isoDate((fund as Fields)['last_nav_date']);
    return { nameEn, nameAr, name, canonicalEn, canonicalAr, manager, nav, navDateIso };
}

export async function fundMetadata(idParam: string, lang: Lang): Promise<Metadata> {
    const id = idFromParam(idParam);
    if (!id) return {};
    const fund = await getFund(id);
    if (!fund) return {};
    const { name, canonicalEn, canonicalAr, nav, navDateIso, manager } = basics(fund, lang);
    const ytd = num(fund, 'return_ytd');

    let description: string;
    if (lang === 'ar') {
        const bits: string[] = [];
        if (nav !== null) bits.push(`صافي قيمة الأصول ${fmtNav(nav)} جنيه${navDateIso ? ` (كما في ${navDateIso})` : ''}`);
        if (ytd !== null) bits.push(`عائد منذ بداية العام ${fmtPct(ytd)}`);
        if (manager) bits.push(`تحت إدارة ${manager}`);
        description = bits.length
            ? `${name}: ${bits.join('، ')}. الرسوم والأداء والاستراتيجية بالكامل.`
            : `${name} — سجل صافي قيمة الأصول والعوائد والرسوم والاستراتيجية على ستارتا ماركتس.`;
    } else {
        const bits: string[] = [];
        if (nav !== null) bits.push(`latest NAV ${fmtNav(nav)} EGP${navDateIso ? ` (as of ${navDateIso})` : ''}`);
        if (ytd !== null) bits.push(`YTD return ${fmtPct(ytd)}`);
        if (manager) bits.push(`managed by ${manager}`);
        description = bits.length
            ? `${name}: ${bits.join(', ')}. Full fees, performance and strategy.`
            : `${name} — NAV history, returns, fees and strategy on Starta Markets.`;
    }
    if (description.length > 300) description = `${description.slice(0, 297).trimEnd()}…`;

    const title = lang === 'ar' ? `${name} — صافي قيمة الأصول والعوائد والرسوم` : `${name} — NAV, Returns & Fees`;
    const canonical = lang === 'ar' ? canonicalAr : canonicalEn;
    return {
        title,
        description,
        alternates: {
            canonical: encodeURI(canonical),
            // x-default = Arabic: the site's default language is Arabic (Egypt-first).
            languages: { en: encodeURI(canonicalEn), ar: encodeURI(canonicalAr), 'x-default': encodeURI(canonicalAr) },
        },
        openGraph: {
            type: 'website',
            locale: lang === 'ar' ? 'ar_EG' : 'en_US',
            title,
            description,
            url: encodeURI(canonical),
        },
    };
}

function buildClientData(fund: Fund, peers: FundClientData['peers'], lang: Lang): FundClientData {
    const t = fundLabels(lang);
    const { nameEn, nameAr, name, manager, nav, navDateIso } = basics(fund, lang);
    const currencyRaw = str(fund, 'currency') || 'EGP';
    const currency = lang === 'ar' ? CURRENCY_AR[currencyRaw.toUpperCase()] || currencyRaw : currencyRaw;

    const navHigh = num(fund, 'nav_52w_high');
    const navLow = num(fund, 'nav_52w_low');
    const navAgeDays = navDateIso ? Math.floor((Date.now() - Date.parse(navDateIso)) / 86_400_000) : null;
    const navStale = navAgeDays !== null && navAgeDays > 10;

    const rawType = str(fund, 'fund_type');
    const classificationRaw = str(fund, 'classification_en') || str(fund, 'classification');
    const fundTypeValue = fundTypeLabel(rawType, classificationRaw, lang);
    const classificationValue = fundTypeLabel(classificationRaw, null, lang);
    const riskValue = riskLabel(str(fund, 'risk_level') || str(fund, 'risk_level_en'), lang);
    const inceptionYear = isoDate((fund as Fields)['inception_date'])?.slice(0, 4) ?? null;
    const minSubscription = num(fund, 'min_subscription');

    const marketRaw = str(fund, 'market');
    const marketCode = str(fund, 'market_code');
    const marketValue = lang === 'ar' ? marketRaw || marketCode : marketCode || marketRaw;
    const eligRaw = str(fund, 'eligibility_en') || str(fund, 'eligibility');
    const eligValue = eligRaw ? (lang === 'ar' ? ELIGIBILITY_AR[eligRaw.toLowerCase()] || eligRaw : eligRaw) : null;
    const navPoints = num(fund, 'nav_points');

    // NAV-history quality, from the per-fund ledger: coverage of the
    // observations expected at the fund's own cadence, the worst gap, and the
    // A-F grade defined on /methodology. A fact about our data, stated as one.
    const qCoverage = num(fund, 'quality_coverage_pct');
    const qGrade = str(fund, 'quality_grade');
    const qWorstGap = num(fund, 'quality_worst_gap_days');
    const qGapFrom = isoDate((fund as Fields)['quality_worst_gap_from']);
    const qGapTo = isoDate((fund as Fields)['quality_worst_gap_to']);
    let qualityText: string | null = null;
    if (qCoverage !== null && qGrade) {
        const gapBit =
            qWorstGap !== null && qWorstGap >= 45 && qGapFrom && qGapTo
                ? lang === 'ar'
                    ? `؛ أطول فجوة ${fmtInt(qWorstGap)} يوماً (${qGapFrom} إلى ${qGapTo})`
                    : `; longest gap ${fmtInt(qWorstGap)} days (${qGapFrom} to ${qGapTo})`
                : '';
        qualityText =
            lang === 'ar'
                ? `${qCoverage.toFixed(0)}% — الدرجة ${qGrade}${gapBit}`
                : `${qCoverage.toFixed(0)}% — grade ${qGrade}${gapBit}`;
    }
    const dormant = navAgeDays !== null && navAgeDays > DORMANT_DAYS;

    const fundManager = str(fund, 'fund_manager');
    const fundManagerFact =
        fundManager && (!manager || fundManager.trim().toLowerCase() !== manager.trim().toLowerCase())
            ? fundManager
            : null;

    // Fixed structural skeleton: "core" fact rows ALWAYS render ('—' when unknown)
    // so a data-poor fund shows the same section shape as a rich one; the extra
    // facts appear only when data exists.
    const facts = (
        [
            [t.issuer, str(fund, 'issuer_en'), false],
            [t.fundManager, fundManagerFact, false],
            [t.fundType, fundTypeValue, true],
            [t.classification, classificationValue && classificationValue !== fundTypeValue ? classificationValue : null, false],
            [t.riskLevel, riskValue, true],
            [t.currency, currency, true],
            [t.inceptionYear, inceptionYear, true],
            [t.navFrequency, str(fund, 'nav_frequency_en'), true],
            [t.market, marketValue, false],
            [t.eligibility, eligValue, false],
            [t.isin, str(fund, 'isin'), false],
            [t.domicile, str(fund, 'domicile'), false],
            [t.dividendPolicy, str(fund, 'dividend_policy'), false],
            [t.navObservations, navPoints !== null ? fmtInt(navPoints) : null, false],
            [t.historyQuality, qualityText, false],
            [
                t.minSubscription,
                minSubscription !== null
                    ? `${fmtInt(minSubscription)} ${minSubscription === 1 ? t.unit : t.units}`
                    : null,
                true,
            ],
            [t.benchmark, str(fund, 'benchmark_en'), false],
        ] as Array<[string, string | null, boolean]>
    )
        .filter(([, value, core]) => value !== null || core)
        .map(([label, value]) => ({ label, value: value ?? '—' }));

    // Standard fee rows (management/subscription/redemption) ALWAYS render — '—'
    // when unpublished; the extra fee kinds appear only when disclosed.
    const fees = (
        [
            [t.managementFee, num(fund, 'fee_management'), true],
            [t.subscriptionFee, num(fund, 'fee_subscription'), true],
            [t.redemptionFee, num(fund, 'fee_redemption'), true],
            [t.performanceFee, num(fund, 'fee_performance'), false],
            [t.custodianFee, num(fund, 'fee_custodian'), false],
            [t.adminFee, num(fund, 'fee_administration'), false],
            [t.expenseRatio, num(fund, 'expense_ratio'), false],
        ] as Array<[string, number | null, boolean]>
    )
        .filter(([, value, core]) => value !== null || core)
        .map(([label, value]) => ({ label, value: value !== null ? fmtPct(value) : '—' }));

    // Fixed risk row set — every fund shows the same three rows; null → '—'
    // (never dropped, never fabricated as 0.00%).
    const riskStats = (
        [
            [t.maxDrawdown, num(fund, 'max_drawdown')],
            [t.volatility, num(fund, 'volatility_annual')],
            [t.downsideDeviation, num(fund, 'downside_deviation')],
        ] as Array<[string, number | null]>
    ).map(([label, value]) => ({
        label,
        value: value !== null ? fmtPct(value) : null,
        negative: value !== null && value < 0,
    }));

    const ytd = num(fund, 'return_ytd');
    // ALWAYS all six period cards — a null return renders as a muted '—'; only a
    // true 0 from the data shows 0.00%. Never dropped, never fabricated.
    const perfDefs = [
        ['1M', num(fund, 'return_1m')],
        ['3M', num(fund, 'return_3m')],
        ['YTD', ytd],
        ['1Y', num(fund, 'return_1y')],
        ['3Y', num(fund, 'return_3y')],
        ['5Y', num(fund, 'return_5y')],
    ] as Array<[string, number | null]>;
    const perfCards = perfDefs.map(([label, value]) => ({
        label,
        value: value !== null ? fmtPct(value) : null,
        negative: value !== null && value < 0,
    }));

    // Headline hero return from the RAW values (the cards now include '—' fillers).
    const firstPerf = perfDefs.find((p): p is [string, number] => p[1] !== null) ?? null;
    const headlineReturn =
        ytd !== null
            ? { label: t.ytdReturn, value: fmtPct(ytd), negative: ytd < 0 }
            : firstPerf
              ? { label: `${firstPerf[0]} ${t.returnLabel}`, value: fmtPct(firstPerf[1]), negative: firstPerf[1] < 0 }
              : null;

    // Risk-level badge removed from hero chips by design — the 0-100 Risk score +
    // Advanced-risk section now carry risk far more precisely than a "High" pill.
    const chips = [fundTypeValue, isTrue(fund, 'is_shariah') ? t.shariah : null].filter(
        (c): c is string => !!c
    );

    const platforms = (Array.isArray((fund as Fields).platforms) ? ((fund as Fields).platforms as Fields[]) : [])
        .map((p) => ({
            name: typeof p.platform_name === 'string' ? p.platform_name.trim() : '',
            logo: typeof p.logo_url === 'string' ? p.logo_url : null,
        }))
        .filter((p) => p.name);
    const prospectusUrl = str(fund, 'prospectus_url');

    // Fixed two-row trading schedule — '—' when unknown so the block keeps shape.
    const tradingRows = (
        [
            [t.purchaseFrequency, freqLabel(str(fund, 'purchase_frequency'), lang)],
            [t.redemptionFrequency, freqLabel(str(fund, 'redemption_frequency'), lang)],
        ] as Array<[string, string | null]>
    ).map(([label, value]) => ({ label, value: value ?? '—' }));

    // Content strictly one language per URL.
    const strategy = lang === 'ar' ? str(fund, 'investment_strategy') : str(fund, 'investment_strategy_en');
    const objectiveRaw = lang === 'ar' ? str(fund, 'objective') : str(fund, 'objective_en');
    const normS = (s: string | null) => (s ? s.replace(/\s+/g, ' ').trim().toLowerCase() : '');
    const objective = normS(objectiveRaw) && normS(objectiveRaw) !== normS(strategy) ? objectiveRaw : null;

    // Asset-manager profile (premium "About the manager" section). The section
    // ALWAYS renders as long as we know a manager NAME (we nearly always do —
    // manager_name/owner_name/issuer); a missing manager_profile only degrades
    // the detail rows to a bilingual placeholder, it never hides the section.
    const mpRaw = (fund as Fields).manager_profile as Fields | null | undefined;
    let mpName: string | null = null;
    let mpLogo: string | null = null;
    let mpRows: Array<{ label: string; value: string }> = [];
    if (mpRaw && (mpRaw.name_en || mpRaw.name)) {
        mpName = lang === 'ar' ? (mpRaw.name as string) || (mpRaw.name_en as string) : (mpRaw.name_en as string) || (mpRaw.name as string);
        mpLogo = typeof mpRaw.logo_url === 'string' ? mpRaw.logo_url : null;
        const totalAum = Number(mpRaw.total_aum);
        const fundCount = Number(mpRaw.fund_count);
        const est = mpRaw.establishment_year != null ? String(mpRaw.establishment_year) : null;
        mpRows = (
            [
                [t.established, est],
                [t.chairman, typeof mpRaw.chairman === 'string' && mpRaw.chairman.trim() ? mpRaw.chairman.trim() : null],
                [t.aum, Number.isFinite(totalAum) && totalAum > 0 ? `${fmtInt(totalAum)} ${currency}` : null],
                [t.fundsManaged, Number.isFinite(fundCount) && fundCount > 0 ? fmtInt(fundCount) : null],
            ] as Array<[string, string | null]>
        ).filter((r): r is [string, string] => r[1] !== null).map(([label, value]) => ({ label, value }));
    }
    const managerDisplayName = (mpName ?? manager ?? '').trim();
    const managerProfile: FundClientData['managerProfile'] = managerDisplayName
        ? { name: managerDisplayName, logo: mpLogo, rows: mpRows }
        : null;

    // FAQ — localized, single source for visible text + JSON-LD.
    const faqs: Array<{ q: string; a: string }> = [];
    if (nav !== null && navDateIso) {
        const dh = humanDate(navDateIso, lang);
        faqs.push(
            lang === 'ar'
                ? { q: `ما هو أحدث صافي قيمة أصول ${name}؟`, a: `بلغ أحدث صافي قيمة أصول ${name} ${fmtNav(nav)} جنيه مصري كما في ${dh}.` }
                : { q: `What is the latest NAV of ${name}?`, a: `The latest NAV of ${name} is ${fmtNav(nav)} EGP as of ${dh}.` }
        );
    }
    if (manager) {
        faqs.push(
            lang === 'ar'
                ? { q: `من يدير ${name}؟`, a: `يُدار ${name} بواسطة ${manager}.` }
                : { q: `Who manages ${name}?`, a: `${name} is managed by ${manager}.` }
        );
    }
    if (fundTypeValue) {
        if (lang === 'ar') {
            faqs.push({ q: `ما نوع صندوق ${name}؟`, a: `${name} هو ${fundTypeValue}.` });
        } else {
            const article = /^[aeiou]/i.test(fundTypeValue) ? 'an' : 'a';
            faqs.push({ q: `What type of fund is ${name}?`, a: `${name} is ${article} ${fundTypeValue}.` });
        }
    }
    if (minSubscription !== null) {
        const units = minSubscription === 1 ? t.unit : t.units;
        faqs.push(
            lang === 'ar'
                ? { q: `ما الحد الأدنى للاستثمار؟`, a: `الحد الأدنى للاشتراك في ${name} هو ${fmtInt(minSubscription)} ${units}.` }
                : { q: 'What is the minimum investment?', a: `The minimum subscription for ${name} is ${fmtInt(minSubscription)} ${units}.` }
        );
    }

    const managerLine = manager ? `${t.managedByPrefix} ${manager}` : null;
    const monogram = (name || 'F').trim().charAt(0).toUpperCase();

    // ---- Analytics layer (Scoring / Suitability / Insights / Stress-test / Calculator) ----
    // Pure derivation from primitives fund_metrics.py already stored; see lib/fund-analytics.ts.
    const analyticsInput: AnalyticsInput = {
        cagr: num(fund, 'cagr'),
        returnInception: num(fund, 'return_inception'),
        inceptionYears: num(fund, 'inception_years'),
        volatility: num(fund, 'volatility_annual'),
        downsideDeviation: num(fund, 'downside_deviation'),
        maxDrawdown: num(fund, 'max_drawdown'),
        bestPeriod: num(fund, 'best_period'),
        worstPeriod: num(fund, 'worst_period'),
        positivePeriodsPct: num(fund, 'positive_periods_pct'),
        avgGain: num(fund, 'avg_gain'),
        avgLoss: num(fund, 'avg_loss'),
        avgPeriodDays: num(fund, 'avg_period_days'),
        feeManagement: num(fund, 'fee_management'),
        expenseRatio: num(fund, 'expense_ratio'),
        navPoints,
        latestNav: nav,
        return1y: num(fund, 'return_1y'),
        return3y: num(fund, 'return_3y'),
        return5y: num(fund, 'return_5y'),
        fundType: str(fund, 'fund_type_en') || rawType,
        classification: classificationRaw,
        strategy: str(fund, 'investment_strategy_en') || strategy,
    };
    // Cash-fund redenomination-artifact guard (compute_fund_metrics.py) — hard-suppress
    // the whole analytics layer so a guarded row can never surface a false score.
    const analyticsSuppressed = isTrue(fund, 'analytics_suppressed');
    const analytics = buildFundAnalytics(analyticsInput, currency, analyticsSuppressed);

    // CAGR headline stat (★ requested feature).
    const cagrVal = num(fund, 'cagr');
    const retIncep = num(fund, 'return_inception');
    const cagrStat = cagrVal !== null
        ? { value: fmtPct(cagrVal), years: num(fund, 'inception_years'), sinceInception: retIncep !== null ? fmtPct(retIncep) : null }
        : null;

    // Best/worst-period movement panel (labelled by the series' real cadence).
    const periodDays = num(fund, 'avg_period_days');
    const cadence: 'day' | 'week' | 'period' =
        periodDays === null ? 'period' : periodDays <= 2.5 ? 'day' : periodDays <= 10 ? 'week' : 'period';
    const bp = num(fund, 'best_period');
    const wp = num(fund, 'worst_period');
    const ag = num(fund, 'avg_gain');
    const al = num(fund, 'avg_loss');
    // Raw numbers (not formatted) so the client can sign (+/−) and colour them.
    const movement = bp !== null || wp !== null ? { best: bp, worst: wp, avgGain: ag, avgLoss: al, cadence } : null;

    // Hero "Compare" CTA → the in-page picker (client). This href is only the
    // no-JS / open-in-new-tab fallback: the bilingual compare tool pre-seeded with
    // the closest peer, in the current language.
    const compareHref =
        peers.length > 0 ? peers[0].compareHref : `${lang === 'ar' ? '/ar' : ''}/Funds/Compare?ids=${fund.fund_id}&lang=${lang}`;

    return {
        t,
        lang,
        fundId: fund.fund_id,
        name,
        nameEn,
        nameAr,
        managerLine,
        monogram,
        heroLogo: fundLogo(fund.fund_id) ?? managerProfile?.logo ?? null,
        navText: nav !== null ? fmtNav(nav) : null,
        navDateIso,
        navHuman: navDateIso ? humanDate(navDateIso, lang) : null,
        navStale,
        navAgeDays,
        dormant,
        dormantNotice: dormant && navDateIso ? t.dormantNotice(humanDate(navDateIso, lang)) : null,
        navHigh: navHigh !== null ? fmtNav(navHigh) : null,
        navLow: navLow !== null ? fmtNav(navLow) : null,
        currency,
        headlineReturn,
        chips,
        perfCards,
        facts,
        fees,
        riskStats,
        platforms,
        prospectusUrl,
        tradingRows,
        strategy,
        objective,
        managerProfile,
        peers,
        faqs,
        isShariah: isTrue(fund, 'is_shariah'),
        analytics,
        cagrStat,
        movement,
        compareHref,
    };
}

async function resolvePeers(fund: Fund, lang: Lang): Promise<FundClientData['peers']> {
    let peers = (await getFundPeers(fund.fund_id))
        .map((p) => {
            const peerId = typeof p.peer_fund_id === 'number' ? p.peer_fund_id : Number(p.peer_fund_id);
            if (!Number.isInteger(peerId) || peerId <= 0 || peerId === Number(fund.fund_id)) return null;
            const en = typeof p.peer_fund_name_en === 'string' && p.peer_fund_name_en.trim() ? p.peer_fund_name_en.trim() : null;
            const ar = typeof p.peer_fund_name === 'string' && p.peer_fund_name.trim() ? p.peer_fund_name.trim() : null;
            if (!en && !ar) return null;
            const label = lang === 'ar' ? ar || en! : en || ar!;
            return { id: peerId, label, href: encodeURI(fundPath(peerId, en, ar, lang)) };
        })
        .filter((p): p is { id: number; label: string; href: string } => p !== null);
    if (peers.length === 0) {
        const myId = Number(fund.fund_id);
        const myType = str(fund, 'fund_type_en') || str(fund, 'fund_type');
        const seen = new Set<number>([myId]);
        peers = (await getAllFundsRanked())
            .filter((f) => !myType || f.fund_type_en === myType || f.fund_type === myType)
            .map((f) => {
                const id = Number(f.fund_id);
                const en = typeof f.fund_name_en === 'string' && f.fund_name_en.trim() ? f.fund_name_en.trim() : null;
                const ar = typeof f.fund_name === 'string' && f.fund_name.trim() ? f.fund_name.trim() : null;
                if (!Number.isInteger(id) || id <= 0 || seen.has(id) || (!en && !ar)) return null;
                seen.add(id);
                const label = lang === 'ar' ? ar || en! : en || ar!;
                return { id, label, href: encodeURI(fundPath(id, en, ar, lang)) };
            })
            .filter((p): p is { id: number; label: string; href: string } => p !== null)
            .slice(0, 4);
    }
    const myId = Number(fund.fund_id);
    // Compare via the BILINGUAL comparison tool (/Funds/Compare), carrying the
    // current language so the user stays in Arabic/English — the old /Funds/vs
    // route was English-only and flipped the language. `lang` is also persisted in
    // localStorage by the shell, so the tool renders correctly even without the param.
    return peers.map((p) => ({
        ...p,
        compareHref: `${lang === 'ar' ? '/ar' : ''}/Funds/Compare?ids=${Math.min(myId, p.id)},${Math.max(myId, p.id)}&lang=${lang}`,
    }));
}

export async function renderFundPage(idParam: string, lang: Lang) {
    const fund = await resolveFund(idParam);
    const { name, canonicalEn, canonicalAr } = basics(fund, lang);

    const canonicalPath = lang === 'ar' ? canonicalAr : canonicalEn;
    const requestPath = lang === 'ar' ? `/ar/Funds/${idParam}` : `/Funds/${idParam}`;
    const redirectTarget = canonicalRedirectTarget(requestPath, canonicalPath);
    if (redirectTarget) permanentRedirect(redirectTarget);

    const peers = await resolvePeers(fund, lang);
    const data = buildClientData(fund, peers, lang);
    const altHref = encodeURI(lang === 'ar' ? canonicalEn : canonicalAr);

    const crumbs =
        lang === 'ar'
            ? [{ href: '/ar', label: 'الرئيسية' }, { href: '/ar/Funds', label: 'الصناديق الاستثمارية' }, { label: name }]
            : [{ href: '/', label: 'Home' }, { href: '/Funds', label: 'Mutual Funds' }, { label: name }];
    const crumbLd =
        lang === 'ar'
            ? [{ url: '/ar', label: 'الرئيسية' }, { url: '/ar/Funds', label: 'الصناديق الاستثمارية' }, { label: name }]
            : [{ url: '/', label: 'Home' }, { url: '/Funds', label: 'Mutual Funds' }, { label: name }];

    // ONE builder for the fund entity, shared with every hub's ItemList
    // (lib/funds-hub-render.ts). This page used to emit a thinner node than the
    // hubs emitted FOR THE SAME FUND — name, url and currency only — while the
    // category page beside it carried the numeric NAV, the fee and the
    // provider. The page that actually shows those figures now describes them;
    // every value is visible above and none is emitted unless real.
    const fundJsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        ...investmentFundNode(fund as Record<string, unknown>, lang, canonicalPath),
    };
    // The page itself, dated by the NAV it shows. dateModified is a WebPage
    // property, not an InvestmentFund one, so it lives on this node.
    const pageJsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': absUrl(canonicalPath),
        url: absUrl(canonicalPath),
        name: lang === 'ar' ? `${name} — صافي قيمة الأصول والعوائد والرسوم` : `${name} — NAV, Returns & Fees`,
        inLanguage: lang === 'ar' ? 'ar-EG' : 'en',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        ...(data.navDateIso ? { dateModified: data.navDateIso } : {}),
        mainEntity: { '@id': `${absUrl(canonicalPath)}#fund` },
    };

    return (
        <PublicPageShell lang={lang} altHref={altHref} wide persistLang>
            <JsonLd data={fundJsonLd} />
            <JsonLd data={pageJsonLd} />
            <JsonLd data={breadcrumbJsonLd(crumbLd, SITE_URL)} />
            {data.faqs.length > 0 && (
                <JsonLd
                    data={{
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: data.faqs.map((f) => ({
                            '@type': 'Question',
                            name: f.q,
                            acceptedAnswer: { '@type': 'Answer', text: f.a },
                        })),
                    }}
                />
            )}
            <Breadcrumbs items={crumbs} />
            {/* Machine-readable status for the live audit: a page that DECLARES
                dormancy is honest about a years-old NAV, not stale. */}
            <div data-fund-status={data.dormant ? 'dormant' : 'active'}>
                <FundPageClient {...data} />
            </div>
        </PublicPageShell>
    );
}
