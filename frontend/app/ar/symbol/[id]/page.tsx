import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTicker, getStats, getCompanyProfile, getSectorPeers } from '@/lib/public-data';
import type { Ticker } from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
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
    const symbol = (id || '').toUpperCase();
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
            };
        }
        return { title: 'الشركة غير موجودة', robots: { index: false } };
    }

    const name = ticker.name_ar || ticker.name_en || symbol;
    const cur = ticker.currency || 'EGP';
    const priceStr = ticker.last_price !== null ? `${cur} ${fmtNum(ticker.last_price)}` : null;
    const title = `سعر سهم ${name} (${symbol}) اليوم — البورصة المصرية`;
    let description = `تابع سعر سهم ${name} (${symbol}) في البورصة المصرية${priceStr ? ` — آخر سعر ${priceStr}` : ''}${ticker.sector_name ? `، قطاع ${sectorAr(ticker.sector_name)}` : ''}. إحصاءات وقوائم مالية وتوزيعات، تحديث كل 15 دقيقة.`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    return {
        title,
        description,
        alternates: {
            canonical: `/ar/symbol/${symbol}`,
            languages: {
                en: `/symbol/${symbol}`,
                ar: `/ar/symbol/${symbol}`,
                'x-default': `/ar/symbol/${symbol}`,
            },
        },
        openGraph: {
            type: 'website',
            locale: 'ar_EG',
            title,
            description,
            url: `/ar/symbol/${symbol}`,
            images: ['/og-default.png'],
        },
    };
}

export default async function ArabicSymbolPage({ params }: Props) {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();
    if (!symbol) notFound();

    // No try/catch on getTicker: a DB outage must surface as a 5xx (temporary),
    // never as a 404 — unknown symbols are the only 404.
    const ticker = await getTicker(symbol);
    if (!ticker) notFound();

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

    const crumbs = [
        { href: '/', label: 'الرئيسية' },
        { href: '/companies', label: 'الشركات المدرجة' },
        { label: name },
    ];

    const corporationJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Corporation',
        name: ticker.name_en || symbol,
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
        <PublicPageShell lang="ar" altHref={symbolPath(symbol)}>
            <JsonLd data={corporationJsonLd} />
            <JsonLd data={faqJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    crumbs.map(({ href, label }) => ({ url: href, label })),
                    SITE_URL
                )}
            />
            <Breadcrumbs items={crumbs} />

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
                            className={`text-sm font-bold ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
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

                {profile?.description && (
                    <section className="mt-8">
                        <h2 className="text-xl font-bold text-main">نبذة عن الشركة</h2>
                        {/* English disclosure kept as-is: no Arabic descriptions exist and
                            financial text is never machine-translated. */}
                        <p dir="ltr" lang="en" className="mt-3 max-w-3xl leading-relaxed text-muted">
                            {profile.description}
                        </p>
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
                            [symbolPath(symbol), 'الصفحة الإنجليزية'],
                            [`${symbolPath(symbol)}/financials`, 'القوائم المالية'],
                            [`${symbolPath(symbol)}/dividends`, 'التوزيعات'],
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
        </PublicPageShell>
    );
}
