import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAllTickers, type Ticker } from '@/lib/public-data';
import { SITE_URL, absUrl, arabicSlug, canonicalRedirectTarget, symbolPath, symbolPathAr, OG_DEFAULTS, slugify, clampTitle } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { EGX_OFFICIAL_SECTORS, type EgxOfficialSector } from '@/content/egx-official-sectors';
import { SECURITY_MASTER_SOURCES } from '@/lib/security-master';
import { sectorAr } from '@/content/sector-names-ar';

/**
 * OFFICIAL EGX SECTOR HUBS — /sectors/egx/{slug} and /ar/sectors/egx/{arabic}.
 *
 * The existing /sectors/* pages group companies by the PRICE VENDOR's global
 * classification ("Finance", "Process Industries", "Non-Energy Minerals"),
 * which files Egypt's largest property developer under Finance. An Egyptian
 * investor and an Egyptian search query mean the exchange's own 18 sectors
 * ("بنوك", "عقارات", "أغذية ومشروبات وتبغ"). Those pages are kept (a URL
 * contract) and labelled as the vendor classification; these hubs are the
 * official layer, keyed to each company by ISIN through the security master.
 *
 * Data-gated: a sector with fewer than MIN_COMPANIES listed companies is not
 * a page, so the sitemap and the 404 gate provably agree.
 */
export const MIN_COMPANIES = 3;
type Lang = 'en' | 'ar';

export const egxSectorPath = (s: EgxOfficialSector, lang: Lang): string =>
    lang === 'ar' ? `/ar/sectors/egx/${arabicSlug(s.ar) || s.slug}` : `/sectors/egx/${s.slug}`;

/** Resolve a slug in EITHER language to its sector, so a Latin slug on the Arabic route still resolves and 308s. */
export function findEgxSector(raw: string): EgxOfficialSector | null {
    let slug = raw;
    try { slug = decodeURIComponent(raw); } catch { /* keep raw */ }
    return EGX_OFFICIAL_SECTORS.find((s) => s.slug === slug || arabicSlug(s.ar) === slug) ?? null;
}

/** One-paragraph scope of each official sector, in the exchange's own terms. Descriptive, never advisory. */
const SCOPE: Record<string, { en: string; ar: string }> = {
    banks: { en: 'Commercial and Islamic banks licensed by the Central Bank of Egypt whose shares are listed on the exchange.', ar: 'البنوك التجارية والإسلامية المرخصة من البنك المركزي المصري والمقيدة أسهمها في البورصة.' },
    'basic-resources': { en: 'Producers of fertilisers, chemicals, steel, aluminium, cement inputs and other raw and intermediate materials.', ar: 'منتجو الأسمدة والكيماويات والحديد والألومنيوم والمواد الخام والوسيطة.' },
    'health-care-pharmaceuticals': { en: 'Pharmaceutical manufacturers, hospitals, diagnostics and medical-supply companies.', ar: 'شركات تصنيع الأدوية والمستشفيات والتشخيص والمستلزمات الطبية.' },
    'industrial-goods-services-automobiles': { en: 'Cables, glass, engineering products, printing and packaging, automotive assembly and distribution.', ar: 'الكابلات والزجاج والمنتجات الهندسية والطباعة والتعبئة وتجميع وتوزيع السيارات.' },
    'real-estate': { en: 'Property developers, housing and urban-development companies and real-estate investors.', ar: 'المطوّرون العقاريون وشركات الإسكان والتنمية العمرانية والاستثمار العقاري.' },
    'travel-leisure': { en: 'Hotels, tourism development, resorts and travel services.', ar: 'الفنادق والتنمية السياحية والمنتجعات وخدمات السفر.' },
    utilities: { en: 'Gas distribution and energy utilities.', ar: 'توزيع الغاز ومرافق الطاقة.' },
    'it-media-communication': { en: 'Telecoms, payments and fintech, IT services, media and satellite operators.', ar: 'الاتصالات والمدفوعات والتكنولوجيا المالية وخدمات تكنولوجيا المعلومات والإعلام والأقمار الصناعية.' },
    'food-beverages-tobacco': { en: 'Food processors, dairies, poultry, flour mills, sugar, edible oils and tobacco.', ar: 'الصناعات الغذائية والألبان والدواجن والمطاحن والسكر والزيوت والتبغ.' },
    'energy-support-services': { en: 'Petroleum services, drilling, petrochemical engineering and energy contractors.', ar: 'خدمات البترول والحفر والهندسة البتروكيماوية ومقاولي الطاقة.' },
    'trade-distributors': { en: 'Trading houses, distributors, duty-free retail and agricultural trading.', ar: 'شركات التجارة والتوزيع والأسواق الحرة وتجارة المنتجات الزراعية.' },
    'shipping-transportation': { en: 'Container terminals, shipping agencies and transport services.', ar: 'محطات الحاويات والتوكيلات الملاحية وخدمات النقل.' },
    'education-services': { en: 'School operators, education platforms and training companies.', ar: 'مشغّلو المدارس ومنصات التعليم وشركات التدريب.' },
    'non-bank-financial-services': { en: 'Investment banks, brokers, leasing, insurance, consumer finance, holding companies and listed fund certificates.', ar: 'بنوك الاستثمار والوساطة والتأجير التمويلي والتأمين والتمويل الاستهلاكي والشركات القابضة ووثائق الصناديق المقيدة.' },
    'contracting-construction': { en: 'Contractors, construction engineering and land-reclamation companies.', ar: 'شركات المقاولات والإنشاءات الهندسية واستصلاح الأراضي.' },
    'textile-durables': { en: 'Spinning, weaving, garments, carpets and consumer durables.', ar: 'الغزل والنسيج والملابس والسجاد والسلع المعمرة.' },
    'building-materials': { en: 'Cement, ceramics, refractories, pipes and other construction materials.', ar: 'الأسمنت والسيراميك والحراريات والمواسير ومواد البناء.' },
    'paper-packaging': { en: 'Paper mills, printing and packaging manufacturers.', ar: 'مصانع الورق والطباعة والتعبئة والتغليف.' },
};

const fmtCap = (n: number | null, lang: Lang): string => {
    if (n === null || !Number.isFinite(n)) return '—';
    const bn = lang === 'ar' ? ' مليار' : 'B';
    const mn = lang === 'ar' ? ' مليون' : 'M';
    if (n >= 1e9) return `${(n / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 1 })}${bn}`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 1 })}${mn}`;
    return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
};

async function load(sector: EgxOfficialSector): Promise<Ticker[]> {
    const all = await getAllTickers();
    return all.filter((t) => t.official_sector_en === sector.en);
}

export async function egxSectorMetadata(slug: string, lang: Lang): Promise<Metadata> {
    const sector = findEgxSector(slug);
    if (!sector) return { title: 'Sector Not Found', robots: { index: false, follow: false } };
    const tickers = await load(sector).catch(() => [] as Ticker[]);
    if (tickers.length < MIN_COMPANIES) return { title: 'Sector Not Found', robots: { index: false, follow: false } };
    const isAr = lang === 'ar';
    const names = tickers.slice(0, 2).map((t) => (isAr ? t.name_ar || t.name_en : t.name_en) || t.symbol);
    const title = isAr
        ? clampTitle([`قطاع ${sector.ar} في البورصة المصرية — الشركات المقيدة`, `قطاع ${sector.ar} في البورصة المصرية`, `قطاع ${sector.ar} — البورصة المصرية`], 60)
        : clampTitle([`${sector.en} Sector on the EGX — Listed Companies`, `${sector.en} Sector — EGX Listed Companies`, `${sector.en} — EGX Sector`], 60);
    let description = isAr
        ? `${tickers.length} شركة مقيدة في قطاع ${sector.ar} وفق تصنيف البورصة المصرية الرسمي — ${names.join(' و')} وغيرها — بالأسعار والقيمة السوقية، محدَّث يوميًا.`
        : `${tickers.length} companies in the ${sector.en} sector under the Egyptian Exchange’s own classification — ${names.join(', ')} and more — with prices and market caps, updated daily.`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;
    const en = egxSectorPath(sector, 'en');
    const ar = encodeURI(egxSectorPath(sector, 'ar'));
    return {
        title: { absolute: title },
        description,
        alternates: { canonical: isAr ? ar : en, languages: { en, ar, 'x-default': ar } },
        openGraph: { ...OG_DEFAULTS, type: 'website', title: `${title} | Starta Markets`, description, url: isAr ? ar : en, locale: isAr ? 'ar_EG' : 'en_US' },
    };
}

export async function renderEgxSector(slug: string, lang: Lang) {
    const isAr = lang === 'ar';
    const sector = findEgxSector(slug);
    if (!sector) notFound();
    const canonicalPath = egxSectorPath(sector, lang);
    // Any spelling other than the canonical slug — a Latin alias or a stale
    // form — 308s. (A double-encoded request is peeled by middleware.ts before
    // it reaches here; the audit found the hub at two addresses on 2026-09-05.)
    const requestPath = `${isAr ? '/ar' : ''}/sectors/egx/${slug}`;
    const target = canonicalRedirectTarget(requestPath, canonicalPath);
    if (target) permanentRedirect(target);

    const tickers = await load(sector);
    if (tickers.length < MIN_COMPANIES) notFound();

    const capped = tickers.filter((t) => typeof t.market_cap === 'number' && t.market_cap > 0);
    const totalCap = capped.reduce((a, t) => a + (t.market_cap as number), 0);
    const big3 = capped.slice(0, 3);
    const asOf = tickers.reduce<string | null>((mx, t) => (t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx), null);
    const asOfHuman = asOf ? new Date(asOf).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }) : null;
    const nameOf = (t: Ticker) => (isAr ? t.name_ar || t.name_en : t.name_en) || t.symbol;
    const hrefOf = (t: Ticker) => (isAr ? encodeURI(symbolPathAr(t.symbol, t.name_ar)) : symbolPath(t.symbol));
    const vendorSectors = [...new Set(tickers.map((t) => t.sector_name).filter((x): x is string => !!x))];
    const registerDate = SECURITY_MASTER_SOURCES.egx_main_register?.captured_at ?? '';
    const scope = SCOPE[sector.slug]?.[lang];

    const crumbs = isAr
        ? [{ href: '/ar', url: '/ar', label: 'الرئيسية' }, { href: '/ar/sectors', url: '/ar/sectors', label: 'القطاعات' }, { label: `قطاع ${sector.ar}` }]
        : [{ href: '/', url: '/', label: 'Home' }, { href: '/sectors', url: '/sectors', label: 'EGX Sectors' }, { label: `${sector.en} (official)` }];

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: isAr ? `قطاع ${sector.ar} — الشركات المقيدة في البورصة المصرية` : `${sector.en} — EGX listed companies (exchange classification)`,
        numberOfItems: tickers.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: tickers.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${nameOf(t)} (${t.symbol})`, url: SITE_URL + hrefOf(t) })),
    };

    const th = `px-4 py-3 ${isAr ? 'text-right' : 'text-left'}`;
    const thNum = `px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`;
    return (
        <PublicPageShell lang={lang} altHref={encodeURI(egxSectorPath(sector, isAr ? 'en' : 'ar'))}>
            <JsonLd data={itemList} />
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <Breadcrumbs lang={lang} items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                {isAr ? `قطاع ${sector.ar} في البورصة المصرية` : `${sector.en} Sector — EGX Listed Companies`}
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {isAr
                    ? `${tickers.length} شركة مقيدة في قطاع ${sector.ar} وفق التصنيف القطاعي الرسمي للبورصة المصرية (سجل الأوراق المقيدة بتاريخ ${registerDate})، مرتبة حسب القيمة السوقية${totalCap > 0 ? ` — بإجمالي قيمة سوقية ${fmtCap(totalCap, 'ar')} جنيه` : ''}.${big3.length ? ` أكبر شركاته: ${big3.map((t) => `${nameOf(t)} (${fmtCap(t.market_cap, 'ar')} جنيه)`).join('، ')}.` : ''}`
                    : `${tickers.length} companies in the ${sector.en} sector under the Egyptian Exchange’s own sector classification (register of listed securities, ${registerDate}), sorted by market capitalization${totalCap > 0 ? ` — combined market value EGP ${fmtCap(totalCap, 'en')}` : ''}.${big3.length ? ` The largest are ${big3.map((t) => `${nameOf(t)} (EGP ${fmtCap(t.market_cap, 'en')})`).join(', ')}.` : ''}`}
                {asOfHuman && <> {isAr ? `الأسعار بتاريخ ${asOfHuman}.` : `Prices as of ${asOfHuman}.`}</>}
            </p>
            {scope && (
                <section className="mt-5 max-w-3xl" aria-label={isAr ? 'نطاق القطاع' : 'Sector scope'}>
                    <h2 className="text-lg font-bold text-main">{isAr ? `ماذا يضم قطاع ${sector.ar}` : `What the ${sector.en} sector covers`}</h2>
                    <p className="mt-2 leading-relaxed text-muted">{scope}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                        {isAr
                            ? `هذا هو تصنيف البورصة المصرية نفسها لكل شركة برقم ISIN. تصنيف مزوّد البيانات العالمي يوزّع الشركات نفسها على: ${vendorSectors.map((v) => sectorAr(v)).join('، ')} — وتبقى صفحات ذلك التصنيف متاحة تحت «القطاعات».`
                            : `This is the exchange’s own classification of each company by ISIN. The data vendor’s global taxonomy files the same companies under: ${vendorSectors.join(', ')} — those pages remain available under “EGX Sectors”.`}
                    </p>
                </section>
            )}

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted">
                            <th className={th}>#</th>
                            <th className={th}>{isAr ? 'الشركة' : 'Company'}</th>
                            <th className={th}>{isAr ? 'الرمز' : 'Symbol'}</th>
                            <th className={thNum}>{isAr ? 'السعر' : 'Price'}</th>
                            <th className={thNum}>{isAr ? 'التغير' : 'Change'}</th>
                            <th className={thNum}>{isAr ? 'القيمة السوقية (ج.م)' : 'Market Cap (EGP)'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickers.map((t, i) => (
                            <tr key={t.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <td className="px-4 py-2.5 text-muted tabular-nums">{i + 1}</td>
                                <td className="px-4 py-2.5">
                                    <Link href={hrefOf(t)} className="font-semibold text-main hover:text-starta-darkTeal">{nameOf(t)}</Link>
                                    {isAr ? t.name_en && <span className="block text-xs text-muted" dir="ltr">{t.name_en}</span> : t.name_ar && <span className="block text-xs text-muted" dir="rtl" lang="ar">{t.name_ar}</span>}
                                </td>
                                <td className="px-4 py-2.5 font-mono font-semibold text-muted" dir="ltr"><Link href={hrefOf(t)} className="hover:text-starta-darkTeal">{t.symbol}</Link></td>
                                <td className={`px-4 py-2.5 font-semibold tabular-nums ${isAr ? 'text-left' : 'text-right'}`} dir="ltr">
                                    {t.last_price !== null ? `${t.last_price.toLocaleString('en-EG', { maximumFractionDigits: 2 })}${t.currency && t.currency !== 'EGP' ? ` ${t.currency}` : ''}` : '—'}
                                </td>
                                <td className={`px-4 py-2.5 font-semibold tabular-nums ${isAr ? 'text-left' : 'text-right'} ${t.change_percent === null ? 'text-muted' : t.change_percent >= 0 ? 'text-emerald-700' : 'text-red-600'}`} dir="ltr">
                                    {t.change_percent !== null ? `${t.change_percent >= 0 ? '+' : ''}${t.change_percent.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%` : '—'}
                                </td>
                                <td className={`px-4 py-2.5 tabular-nums ${isAr ? 'text-left' : 'text-right'}`} dir="ltr">{fmtCap(t.market_cap, lang)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <nav aria-label={isAr ? 'قطاعات أخرى' : 'Other official sectors'} className="mt-6 flex flex-wrap gap-2 text-sm">
                {EGX_OFFICIAL_SECTORS.filter((s) => s.slug !== sector.slug).map((s) => (
                    <Link key={s.slug} href={encodeURI(egxSectorPath(s, lang))} className="rounded-full border border-border bg-surface px-3 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">
                        {isAr ? s.ar : s.en}
                    </Link>
                ))}
            </nav>

            <p className="mt-4 text-xs text-muted">
                {isAr
                    ? 'حالة القيد والقطاع: سجل الأوراق المالية المقيدة الصادر عن البورصة المصرية. الأسعار: البورصة المصرية عبر TradingView، كل 15 دقيقة خلال ساعات التداول؛ ويُحجب السعر الذي مضى عليه أكثر من أسبوعين. القيم السوقية بالجنيه المصري.'
                    : 'Listing status and sector: the Egyptian Exchange’s register of listed securities. Prices: EGX via TradingView, every 15 minutes in trading hours; a quote older than two weeks is withheld. Market caps in Egyptian pounds.'}
                {' '}
                <Link href={isAr ? '/ar/sectors' : '/sectors'} className="font-semibold text-starta-darkTeal hover:underline">{isAr ? 'تصنيف المزوّد للقطاعات' : 'Vendor sector classification'}</Link>
                {' · '}
                <Link href={isAr ? '/ar/companies' : '/companies'} className="font-semibold text-starta-darkTeal hover:underline">{isAr ? 'كل الشركات المقيدة' : 'All listed companies'}</Link>
            </p>
        </PublicPageShell>
    );
}

/** Sitemap helper: official sectors that clear the page gate, with both paths. */
export async function publishableEgxSectors(): Promise<Array<{ sector: EgxOfficialSector; count: number; en: string; ar: string }>> {
    const all = await getAllTickers();
    const counts = new Map<string, number>();
    for (const t of all) if (t.official_sector_en) counts.set(t.official_sector_en, (counts.get(t.official_sector_en) ?? 0) + 1);
    return EGX_OFFICIAL_SECTORS
        .map((s) => ({ sector: s, count: counts.get(s.en) ?? 0, en: egxSectorPath(s, 'en'), ar: egxSectorPath(s, 'ar') }))
        .filter((x) => x.count >= MIN_COMPANIES);
}

// Vendor-classification slug helper re-exported for callers that link both layers.
export const vendorSectorSlug = (name: string) => slugify(name);
export const egxSectorAbsUrl = (s: EgxOfficialSector, lang: Lang) => absUrl(egxSectorPath(s, lang));
