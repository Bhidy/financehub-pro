import type { Metadata } from 'next';
import { ltrNum } from '@/lib/bidi';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTicker, getStats, getCompanyProfile, getSectorPeers } from '@/lib/public-data';
import type { Ticker } from '@/lib/public-data';
import { SITE_URL, symbolPath, symbolPathAr, symbolFromArParam, canonicalRedirectTarget, absUrl } from '@/lib/seo';
import { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import SymbolPageClient from '@/app/symbol/[id]/SymbolPageClient';
import JsonLd from '@/components/seo/JsonLd';
import KeyTerms from '@/components/seo/KeyTerms';
import { sectorAr } from '@/content/sector-names-ar';

/**
 * Arabic company page at /ar/symbol/{SYMBOL} — the AR twin of the EN
 * /symbol/{SYMBOL} SEO layer. Server-rendered, zero client JS: Arabic quote
 * line, key statistics, peers and FAQ (visible text === FAQPage JSON-LD).
 * Company descriptions stay in ENGLISH (dir="ltr") — no Arabic disclosures
 * exist and financial text is never machine-translated. Numbers use western
 * digits (en-EG) and keep the currency CODE (EGP/USD) exactly like the EN
 * pages: per-line trading currency for the price, report currency (EGP) for
 * fundamentals.
 */

// ISR: cache at the edge and revalidate in background — the audit found
// every SSR route shipped no-store (0% CDN hit, 1.0-1.5s TTFB). Pages are
// anonymous, so edge-caching is safe; value tuned to how fast the data moves.
export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

type Stats = Record<string, number | string | null>;

const fmtNum = (n: number | null | undefined, digits = 2): string | null =>
    n === null || n === undefined || !Number.isFinite(n)
        ? null
        : n.toLocaleString('en-EG', { maximumFractionDigits: digits });

const fmtEgp = (n: number | null | undefined): string | null => {
    if (n === null || n === undefined || !Number.isFinite(n)) return null;
    if (Math.abs(n) >= 1e9) return `EGP ${(n / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 2 })}B`;
    if (Math.abs(n) >= 1e6) return `EGP ${(n / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 2 })}M`;
    return `EGP ${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })}`;
};

const fmtPct = (n: number | null | undefined): string | null =>
    n === null || n === undefined || !Number.isFinite(n)
        ? null
        : `${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%`;

const num = (stats: Stats | null, key: string): number | null => {
    const v = stats?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

/** As-of timestamp in Cairo time — Arabic month names, WESTERN digits (nu-latn). */
const fmtAsOf = (lastUpdated: string | null): string | null => {
    if (!lastUpdated) return null;
    const d = new Date(lastUpdated);
    if (!Number.isFinite(d.getTime())) return null;
    return d.toLocaleString('ar-EG-u-nu-latn', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
    });
};

/**
 * Arabic FAQ — SINGLE source for both the visible <dl> and the FAQPage
 * JSON-LD, so the two can never diverge. Only questions whose data exists.
 */
function buildArabicFaq(ticker: Ticker, stats: Stats | null, asOf: string | null): Array<{ q: string; a: string }> {
    const symbol = ticker.symbol.toUpperCase();
    const name = ticker.name_ar || ticker.name_en || symbol;
    const cur = ticker.currency || 'EGP';
    const faq: Array<{ q: string; a: string }> = [];

    const price = ticker.last_price ?? num(stats, 'last_price');
    if (price !== null) {
        faq.push({
            q: `كم سعر سهم ${name} (${symbol}) اليوم؟`,
            a: `آخر سعر لسهم ${name} هو ${cur} ${fmtNum(price)} في البورصة المصرية${asOf ? ` (حتى ${asOf} بتوقيت القاهرة)` : ''}. تتحدث الأسعار كل 15 دقيقة خلال جلسات التداول.`,
        });
    }
    const mcap = ticker.market_cap ?? num(stats, 'market_cap');
    if (mcap !== null) {
        faq.push({
            q: `كم تبلغ القيمة السوقية لـ${name}؟`,
            a: `تبلغ القيمة السوقية لـ${name} نحو ${fmtEgp(mcap)}.`,
        });
    }
    const dy = ticker.dividend_yield ?? num(stats, 'dividend_yield');
    const dps = num(stats, 'dps');
    if (dy !== null && dy > 0) {
        faq.push({
            q: `هل يوزع سهم ${symbol} أرباحًا نقدية؟`,
            a: `نعم — يبلغ عائد التوزيعات لسهم ${name} نحو ${fmtPct(dy)}${dps !== null ? ` (EGP ${fmtNum(dps)} للسهم)` : ''}.`,
        });
    }
    const pe = ticker.pe_ratio ?? num(stats, 'pe_ratio');
    if (pe !== null) {
        faq.push({
            q: `ما هو مكرر ربحية سهم ${symbol}؟`,
            a: `يتداول سهم ${name} عند مكرر ربحية ${fmtNum(pe)}.`,
        });
    }
    faq.push({
        q: `أين يمكن متابعة سهم ${symbol}؟`,
        a: `تعرض هذه الصفحة سعر سهم ${name} في البورصة المصرية مع أهم الإحصاءات والقوائم المالية والتوزيعات — ويمكنك أيضًا سؤال المحلل الذكي من ستارتا ماركتس عن ${symbol} بالعربية أو الإنجليزية.`,
    });
    return faq;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const symbol = symbolFromArParam(id || '');
    let ticker: Ticker | null = null;
    let dbOk = true;
    try {
        ticker = symbol ? await getTicker(symbol) : null;
    } catch {
        dbOk = false;
    }
    if (!ticker) {
        if (!dbOk) {
            // DB unreachable ≠ unknown symbol: degrade, keep the canonical.
            return {
                title: `سعر سهم ${symbol} اليوم — البورصة المصرية`,
                alternates: { canonical: `/ar/symbol/${symbol}` },
                robots: { index: false }, // degraded render: don't index a stub
            };
        }
        return { title: 'الشركة غير موجودة', robots: { index: false } };
    }

    const name = ticker.name_ar || ticker.name_en || symbol;
    const cur = ticker.currency || 'EGP';
    const priceStr = ticker.last_price !== null ? `${cur} ${fmtNum(ticker.last_price)}` : null;
    // The live price in the title: 25,066 impressions on the Arabic company
    // pages over three months, 55 clicks (0.22%) at position 8.6 — the query
    // is "سعر سهم X" and the answer belongs in the title, as the incumbents do.
    const title = `سعر سهم ${name} (${symbol}) اليوم${priceStr ? ` ${priceStr}` : ''} — البورصة المصرية`;
    let description = `تابع سعر سهم ${name} (${symbol}) في البورصة المصرية${priceStr ? ` — آخر سعر ${priceStr}` : ''}${ticker.sector_name ? `، قطاع ${sectorAr(ticker.sector_name)}` : ''}. إحصاءات وقوائم مالية وتوزيعات، تحديث كل 15 دقيقة.`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    return {
        title: { absolute: title },
        description,
        alternates: {
            // Arabic canonical carries the Arabic company slug (built by the
            // same helper the page redirects to, so metadata and route agree).
            canonical: encodeURI(symbolPathAr(symbol, ticker.name_ar)),
            languages: {
                en: symbolPath(symbol),
                ar: encodeURI(symbolPathAr(symbol, ticker.name_ar)),
                'x-default': encodeURI(symbolPathAr(symbol, ticker.name_ar)),
            },
        },
        openGraph: {
            type: 'website',
            locale: 'ar_EG',
            title,
            description,
            url: encodeURI(symbolPathAr(symbol, ticker.name_ar)),
            images: ['/og-default.png'],
        },
    };
}

/** The lang seed + the premium app on their own — the DB-outage fallback and
 *  the top of the full page. One definition so the two cannot drift. */
function ArabicSymbolAppOnly() {
    return (
        <>
            <script
                dangerouslySetInnerHTML={{
                    __html:
                        "try{localStorage.setItem('starta-lang','ar');localStorage.setItem('lang','ar');" +
                        "document.cookie='starta-lang=ar;path=/;max-age=31536000;samesite=lax';}catch(e){}",
                }}
            />
            <SymbolPageClient />
        </>
    );
}

export default async function ArabicSymbolPage({ params }: Props) {
    const { id } = await params;
    // The param may be a bare ticker (/ar/symbol/COMI — the legacy form, still
    // indexed) or the canonical slugged form (/ar/symbol/COMI-البنك-التجاري-الدولي).
    const symbol = symbolFromArParam(id || '');
    if (!symbol) notFound();

    // DB-outage resilience, matching the English /symbol/{SYMBOL} exactly:
    // SymbolPageClient fetches its own data over the API, so when the database
    // is unreachable we still serve the full interactive page rather than a
    // 500. 'unavailable' is not 'unknown symbol' — only the latter is a 404,
    // so a DB outage can never de-index a real company page.
    let ticker: Awaited<ReturnType<typeof getTicker>> = null;
    let dbOk = true;
    try {
        ticker = await getTicker(symbol);
    } catch {
        dbOk = false;
    }
    if (!ticker) {
        if (!dbOk) return <ArabicSymbolAppOnly />;
        notFound();
    }

    // Canonicalise: the bare-ticker form and any stale slug 308 to the current
    // Arabic canonical, so a renamed company self-heals every indexed URL.
    // canonicalRedirectTarget handles the percent-encoding — route params
    // arrive encoded while our canonical paths carry raw Arabic, and a raw
    // unicode Location header 500s.
    const canonicalPath = symbolPathAr(symbol, ticker.name_ar);
    const redirectTarget = canonicalRedirectTarget(`/ar/symbol/${id}`, canonicalPath);
    if (redirectTarget) permanentRedirect(redirectTarget);

    const [stats, profile, peers] = await Promise.all([
        getStats(symbol).catch(() => null),
        getCompanyProfile(symbol).catch(() => null),
        ticker.sector_name
            ? getSectorPeers(ticker.sector_name, symbol, 6).catch(() => [] as Ticker[])
            : Promise.resolve([] as Ticker[]),
    ]);

    const name = ticker.name_ar || ticker.name_en || symbol;
    const cur = ticker.currency || 'EGP';
    const asOf = fmtAsOf(ticker.last_updated);
    const price = ticker.last_price ?? num(stats, 'last_price');
    const change = ticker.change_percent;
    const faq = buildArabicFaq(ticker, stats, asOf);

    const statRows: Array<[string, string | null]> = [
        ['آخر سعر', price !== null ? `${cur} ${fmtNum(price)}` : null],
        ['القيمة السوقية', fmtEgp(ticker.market_cap ?? num(stats, 'market_cap'))],
        ['مكرر الربحية', fmtNum(ticker.pe_ratio ?? num(stats, 'pe_ratio'))],
        ['مكرر القيمة الدفترية', fmtNum(ticker.pb_ratio ?? num(stats, 'pb_ratio'))],
        ['عائد التوزيعات', fmtPct(ticker.dividend_yield ?? num(stats, 'dividend_yield'))],
        ['ربحية السهم', num(stats, 'eps_ttm') !== null ? `EGP ${fmtNum(num(stats, 'eps_ttm'))}` : null],
        ['الإيرادات', fmtEgp(num(stats, 'revenue_ttm'))],
        ['صافي الدخل', fmtEgp(num(stats, 'net_income_ttm'))],
        ['العائد على حقوق المساهمين', fmtPct(num(stats, 'roe'))],
        ['القيمة الدفترية للسهم', num(stats, 'bvps') !== null ? `EGP ${fmtNum(num(stats, 'bvps'))}` : null],
        ['بيتا', fmtNum(num(stats, 'beta_1y'))],
        ['متوسط 50 يوم', num(stats, 'ma_50d') !== null ? `EGP ${fmtNum(num(stats, 'ma_50d'))}` : null],
        ['متوسط 200 يوم', num(stats, 'ma_200d') !== null ? `EGP ${fmtNum(num(stats, 'ma_200d'))}` : null],
        ['مؤشر القوة النسبية (RSI)', fmtNum(num(stats, 'rsi_14'))],
    ];
    const presentRows = statRows.filter((r): r is [string, string] => r[1] !== null);

    /**
     * Language-neutral company facts for the Arabic page. Only values that
     * carry no language are included — a year, a headcount, a currency code, a
     * URL — plus the sector, which we hold in Arabic. English prose fields
     * (description, headquarters, industry, ceo) are deliberately excluded:
     * showing them would put English copy on a page declared lang="ar".
     */
    const companyFacts: Array<[string, string, boolean]> = [];
    const sectorArName = ticker.sector_name ? sectorAr(ticker.sector_name) : null;
    if (sectorArName) companyFacts.push(['القطاع', sectorArName, false]);
    companyFacts.push(['السوق', 'البورصة المصرية (EGX)', false]);
    companyFacts.push(['رمز السهم', symbol, true]);
    if (ticker.currency) companyFacts.push(['عملة التداول', ticker.currency, true]);
    if (ticker.isin) companyFacts.push(['رقم الأيزين (ISIN)', ticker.isin, true]);
    if (profile?.founded) companyFacts.push(['سنة التأسيس', String(profile.founded), true]);
    if (typeof profile?.employees === 'number' && Number.isFinite(profile.employees)) {
        companyFacts.push(['عدد الموظفين', profile.employees.toLocaleString('en-EG'), true]);
    }
    if (profile?.website) {
        let host = String(profile.website);
        try {
            host = new URL(host.startsWith('http') ? host : `https://${host}`).host.replace(/^www\./, '');
        } catch {
            // keep the raw value if it is not a parseable URL
        }
        companyFacts.push(['الموقع الإلكتروني', host, true]);
    }

    const crumbs = [
        { href: '/', label: 'الرئيسية' },
        { href: '/companies', label: 'الشركات المدرجة' },
        { label: name },
    ];

    const corporationJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Corporation',
        name: ticker.name_ar || ticker.name_en || symbol,
        ...(ticker.name_ar ? { alternateName: ticker.name_ar } : {}),
        tickerSymbol: symbol,
        url: absUrl(`/ar/symbol/${symbol}`),
    };

    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    };

    return (
        <>
            {/* THE PREMIUM COMPANY PAGE. Identical in structure to the English
                /symbol/{SYMBOL}: the same interactive app, then the SEO layer
                beneath it. This page previously rendered ONLY the SEO layer
                inside PublicPageShell, so Arabic visitors — the site's DEFAULT
                audience — got a static summary where English visitors got the
                full product. SymbolPageClient has been bilingual all along
                (1,500+ lines of `lang === "ar"` branches); it was simply never
                mounted here. */}
            <ArabicSymbolAppOnly />
            <section dir="rtl" lang="ar" className="seo-shell bg-page text-main font-arabic">
              <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <JsonLd data={corporationJsonLd} />
            <JsonLd data={faqJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    crumbs.map(({ href, label }) => ({ url: href, label })),
                    SITE_URL
                )}
            />
            <Breadcrumbs lang="ar" items={crumbs} />

            <div lang="ar">
                <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                    سهم {name} <span dir="ltr">({symbol})</span>
                </h1>

                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted">
                    <span dir="ltr" className="text-xl font-extrabold text-main">
                        {price !== null ? `${cur} ${fmtNum(price)}` : '—'}
                    </span>
                    {change !== null && (
                        <span
                            dir="ltr"
                            className={`text-sm font-bold ${change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
                        >
                            {change >= 0 ? '+' : ''}
                            {fmtNum(change)}%
                        </span>
                    )}
                    <span className="text-sm font-semibold text-muted">البورصة المصرية (EGX)</span>
                    {ticker.sector_name && (
                        <span className="text-sm text-muted">قطاع {sectorAr(ticker.sector_name)}</span>
                    )}
                </p>
                {ticker.last_price !== null && (
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
                        <strong>ما هو سعر سهم {name} اليوم؟</strong> آخر سعر لسهم {symbol} هو {ltrNum(`${cur} ${fmtNum(ticker.last_price) ?? ''}`)}
                        {typeof ticker.change_percent === 'number' ? ` (${ltrNum(`${ticker.change_percent >= 0 ? '+' : ''}${ticker.change_percent.toFixed(2)}%`)} خلال الجلسة)` : ''}
                        {typeof ticker.market_cap === 'number' && ticker.market_cap > 0 ? `، بقيمة سوقية ${ltrNum((ticker.market_cap / 1e9).toFixed(2))} مليار ${cur}` : ''}
                        {typeof ticker.pe_ratio === 'number' && ticker.pe_ratio > 0 ? `، ومضاعف ربحية ${ltrNum(fmtNum(ticker.pe_ratio) ?? '')}` : ''}
                        {typeof ticker.dividend_yield === 'number' && ticker.dividend_yield > 0 ? `، وعائد توزيعات ${ltrNum(`${ticker.dividend_yield.toFixed(2)}%`)}` : ''}.
                    </p>
                )}

                {presentRows.length > 0 && (
                    <section className="mt-8">
                        <h2 className="text-xl font-bold text-main">
                            أهم إحصاءات سهم <span dir="ltr">{symbol}</span>
                        </h2>
                        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {presentRows.map(([label, value]) => (
                                <div key={label} className="rounded-xl border border-border bg-surface p-3.5">
                                    <dt className="text-xs font-bold text-muted">{label}</dt>
                                    <dd dir="ltr" className="mt-1.5 text-[15px] font-extrabold text-main">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}

                {/* COMPANY FACTS, IN ARABIC.
                    This section used to render the data provider's ENGLISH prose
                    description inside an RTL page: a wall of dir="ltr" text that
                    read as a foreign-language block to an Arabic visitor AND broke
                    the layout (a max-w paragraph pinned to the right edge of an RTL
                    flow, leaving half the row empty).
                    Machine-translating a company disclosure is not an option on a
                    financial page, and no Arabic disclosure exists upstream. So the
                    section now presents only facts that carry NO language — a code,
                    a year, a headcount, a domain — under Arabic labels, plus the
                    sector, which we do hold in Arabic. Nothing is translated and
                    nothing is invented; the English prose simply is not shown on an
                    Arabic page. */}
                {companyFacts.length > 0 && (
                    <section className="mt-8">
                        <h2 className="text-xl font-bold text-main">نبذة عن الشركة</h2>
                        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {companyFacts.map(([label, value, ltr]) => (
                                <div key={label} className="rounded-xl border border-border bg-surface p-3.5">
                                    <dt className="text-xs font-bold text-muted">{label}</dt>
                                    <dd
                                        {...(ltr ? { dir: 'ltr' as const } : {})}
                                        className="mt-1.5 text-[15px] font-extrabold text-main"
                                    >
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}

                {peers.length > 0 && ticker.sector_name && (
                    <section className="mt-8">
                        <h2 className="text-xl font-bold text-main">
                            قارن مع شركات قطاع {sectorAr(ticker.sector_name)} الأخرى
                        </h2>
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {peers.map((p) => (
                                <li key={p.symbol}>
                                    <Link
                                        href={`/ar/symbol/${p.symbol.toUpperCase()}`}
                                        prefetch={false}
                                        className="inline-block rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:border-teal-300 hover:text-teal-700"
                                    >
                                        {p.name_ar || p.name_en || p.symbol}{' '}
                                        <span dir="ltr">({p.symbol.toUpperCase()})</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <KeyTerms slugs={['market-cap', 'pe-ratio', 'pb-ratio', 'dividend-yield']} lang="ar" heading={`مصطلحات أساسية وراء أرقام ${symbol}`} />

                <section className="mt-8">
                    <h2 className="text-xl font-bold text-main">أسئلة شائعة</h2>
                    <dl className="mt-4 divide-y divide-slate-200 rounded-xl border border-border bg-surface">
                        {faq.map((f) => (
                            <div key={f.q} className="px-5 py-4">
                                <dt className="text-[15px] font-bold text-main">{f.q}</dt>
                                <dd className="mt-1.5 max-w-3xl text-sm leading-7 text-muted">{f.a}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <nav aria-label={`صفحات بيانات ${symbol}`} className="mt-8 flex flex-wrap gap-2 text-sm font-semibold">
                    {(
                        [
                            [`${symbolPathAr(symbol, name)}/financials`, 'القوائم المالية'],
                            [`${symbolPathAr(symbol, name)}/dividends`, 'التوزيعات'],
                            [`${symbolPathAr(symbol, name)}/history`, 'السعر التاريخي'],
                            [symbolPath(symbol), 'الصفحة الإنجليزية'],
                        ] as Array<[string, string]>
                    ).map(([href, label]) => (
                        <Link
                            key={href}
                            href={href}
                            prefetch={false}
                            className="rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-muted transition-colors hover:border-teal-300 hover:text-teal-700"
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                <p className="mt-6 text-xs text-muted">
                    {asOf ? `البيانات حتى ${asOf} (بتوقيت القاهرة). ` : ''}
                    المصدر: البورصة المصرية عبر TradingView. الأسعار تتحدث كل 15 دقيقة خلال ساعات التداول (الأحد–الخميس).
                </p>
            </div>
              </div>
            </section>
        </>
    );
}
