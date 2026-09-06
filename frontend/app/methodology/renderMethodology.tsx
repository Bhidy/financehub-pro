import type { Metadata } from 'next';
import { FUND_TAXONOMY_OVERRIDES } from '@/content/fund-categories';
/** Arabic names of the asset classes, for the classification table. */
const CLASS_AR: Record<string, string> = { money_market: 'أسواق نقد', fixed_income: 'دخل ثابت', equity: 'أسهم', balanced: 'متوازن', gold: 'ذهب' };
import reconciliation from '@/content/fund-universe-reconciliation.json';
import { SECURITY_MASTER_SOURCES } from '@/lib/security-master';
import { DORMANT_DAYS, MIN_NAV_POINTS, QUOTE_STALE_DAYS } from '@/lib/fund-stats';
import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { HOME_PATH } from '@/lib/lang';

/**
 * /methodology and /ar/methodology — HOW EVERY NUMBER ON THE SITE IS MADE.
 *
 * The site publishes returns, risk figures, rankings and quality grades, and
 * the rules behind them lived only in code comments (fund_metrics.py,
 * fund_data_quality.py, public-data.ts). A reader — or an answer engine
 * deciding whether to cite a figure — had no page to check a definition
 * against. This is that page: sources and cadence, the exact return and risk
 * formulas, the anchor and cadence tolerances, the quality grades, the
 * missing-is-never-zero rule, the currency rules and the automated checks.
 *
 * EVERY STATEMENT HERE IS READ OFF THE CODE THAT PRODUCES THE FIGURE. If a
 * threshold below changes in the pipeline, this page must change with it —
 * the thresholds are named in the text on purpose so a diff is obvious.
 */

const PATH_EN = '/methodology';
const PATH_AR = '/ar/methodology';

type Section = {
    id: string;
    h: string;
    paragraphs?: string[];
    bullets?: string[];
    table?: { head: string[]; rows: string[][] };
};

const EN: { title: string; description: string; h1: string; lede: string; sections: Section[]; related: Array<{ href: string; label: string }> } = {
    title: 'Methodology — Sources, Formulas & Quality Grades',
    description:
        'Where Starta’s EGX and fund data comes from, how often it refreshes, how returns, volatility and CAGR are computed, and why a missing figure is never shown as zero.',
    h1: 'Methodology',
    lede:
        'How every figure on this site is produced: the sources and their refresh cadence, the formulas behind returns and risk, the tolerances that decide when a figure is withheld, the per-fund data-quality grades, and the checks that run on the live site every day.',
    sections: [
        {
            id: 'sources',
            h: 'Where the data comes from, and how often it refreshes',
            table: {
                head: ['Dataset', 'Source', 'Refresh'],
                rows: [
                    ['EGX share prices, quotes, technical indicators', 'TradingView’s Egyptian Exchange feed, stored in our own price and quote tables', 'Every 15 minutes during EGX trading hours (Sunday–Thursday), plus a post-close snapshot'],
                    ['Financial statements and fundamentals', 'Company disclosures aggregated via TradingView — up to 20 years of annual statements', 'Weekly (Friday)'],
                    ['Dividends and analyst estimates', 'TradingView', 'Daily, after the close'],
                    ['Company and market news', 'Licensed Egyptian financial press, Arabic and English', 'Every 30 minutes during market hours'],
                    ['Mutual-fund NAVs', 'The net asset value each fund manager publishes, collected from Mubasher’s per-fund price files; a browser-based collector covers funds that have no file', 'Twice daily — 08:00 and 19:00 Cairo, Sunday–Thursday'],
                    ['Fund NAV history for the 2025 gap', 'EIMA’s weekly fund performance reports, inverted to reconstruct NAV points for the months in which the primary file was frozen; every reconstructed point is reconciled against NAV we already hold before it is written', 'Weekly (Friday)'],
                    ['Fund profiles, fees, minimums', 'Fund managers’ prospectuses and disclosures', 'On change'],
                ],
            },
            paragraphs: [
                'Writes are add-only: a fetch that returns nothing can never delete a NAV that is already stored. Every data page carries an as-of date, and on price lists the date is shown per row, because managers publish on different schedules and one page-level timestamp would imply a uniform freshness that does not exist.',
            ],
        },
        {
            id: 'returns',
            h: 'How fund returns are computed',
            bullets: [
                'Trailing returns (1M, 3M, 6M, 1Y, 3Y, 5Y) are the latest NAV divided by a reference NAV, minus one. The reference is the last NAV on or before the window’s start date.',
                'Anchor rule: the reference must sit no further from the intended start date than the greater of 10 days or 10% of the window. If the nearest NAV is older than that, the return is not published and the page shows “—”. A “3-month return” measured from a 15-month-old NAV is a wrong figure, not a stale one.',
                'Year-to-date compares the latest NAV with the last NAV of the previous calendar year.',
                'Returns are recomputed from the full NAV history every trading day, and the figure a fund page shows is the computed one. Only where no computed row exists yet does the provider’s own reported figure appear.',
                'Rankings (“best funds”) sort mechanically by trailing 1-year return within each category; a category with fewer than three ranked funds is omitted. Nothing is hand-picked and no ranking is a recommendation.',
            ],
        },
        {
            id: 'risk',
            h: 'How risk figures are computed',
            bullets: [
                'Volatility is the standard deviation of consecutive period NAV returns, annualized by the fund’s actual observation frequency — roughly 52 periods a year for a weekly fund, roughly 250 for a daily one — never a fixed assumption. Periods spanning more than three times the fund’s median publication interval (floor: 10 days) are excluded, so a hole in the data cannot manufacture risk, and at least six clean periods are required before a figure is published.',
                'Maximum drawdown is the largest fall from any earlier peak to the trough that followed it, expressed as a negative percentage.',
                'Downside deviation is the root-mean-square of the negative period returns against a 0% target (positive periods count as zero), annualized by cadence in the same way as volatility.',
                'CAGR is the geometric annual growth rate from the first usable NAV to the latest; it is not published for a fund with under 90 days of history, because annualizing a sub-quarter series manufactures meaningless extremes.',
                'Series hygiene precedes all of the above: an adjacent NAV ratio outside 0.34–3.0 within 45 days is treated as a re-denomination and stitched; a single point deviating more than 50% from its local median is dropped as a bad tick; and a fund whose series still carries a re-pricing artefact has its whole analytics layer suppressed rather than published.',
                'Not published: Sharpe ratio, alpha and beta. There is no documented benchmark per category and no reproducible EGP risk-free series, and a figure that cannot be reproduced is not published.',
            ],
        },
        {
            id: 'quality',
            h: 'Per-fund data-quality grades',
            paragraphs: [
                'Every fund’s NAV history is graded A to F on three measures: coverage (observations held divided by observations expected at the fund’s own cadence), the longest gap, and the age of the newest NAV. Tolerances derive from each fund’s own median publication interval — 54 of the funds publish weekly, and a seven-day interval is their rhythm, not a hole — and the Egyptian Exchange closure of 27 January to 23 March 2011 is excluded as real history rather than missing data.',
            ],
            table: {
                head: ['Grade', 'Condition (all three must hold)'],
                rows: [
                    ['A', 'Coverage ≥ 92%, longest gap under 21 days, newest NAV at most 7 days old'],
                    ['B', 'Coverage ≥ 80%, longest gap under 45 days, newest NAV at most 14 days old'],
                    ['C', 'Coverage ≥ 65%, longest gap under 90 days, newest NAV at most 30 days old'],
                    ['D', 'Coverage ≥ 40%, longest gap under 365 days, newest NAV at most 60 days old'],
                    ['F', 'Below any D threshold, or fewer than two observations'],
                ],
            },
            bullets: [
                'The grades drive monitoring: an alarm fires when the number of funds below grade C rises, so one healthy fund can no longer mask a frozen one — the failure that once ran for thirteen months with every aggregate check green.',
            ],
        },
        {
            id: 'missing',
            h: 'Missing is never zero',
            paragraphs: [
                'A dash (“—”) means the figure cannot be computed honestly from the data held: not enough history, a reference outside tolerance, or no disclosure. “0.00%” is shown only when the computed value is exactly zero. No figure is estimated, interpolated or carried forward from an older period.',
            ],
        },
        {
            id: 'currency',
            h: 'Currencies',
            paragraphs: [
                'EGX lines trade in Egyptian pounds, except the few that trade in US dollars (for example FAITA, EGBE and VLMRA), which are shown in their trading currency. Company fundamentals — market capitalisation and statements — are in EGP. Fund NAVs are in the fund’s own currency, EGP unless the fund discloses otherwise. A legacy “SAR” label on an Egyptian line is corrected to EGP: no EGX line trades in Saudi riyal.',
            ],
        },
        {
            id: 'screens',
            h: 'Market screens and company pages',
            bullets: [
                'Oversold and overbought screens use the 14-period RSI with Wilder’s bands: at or below 30, at or above 70.',
                'Dividend-yield rankings exclude trailing yields above 100% as implausible — a fund or company cannot pay out more than its own price in a year without a data error behind it.',
                'Only companies whose market code is EGX are published; the EGX 30 is an index and is excluded from company lists, movers and sectors.',
                'A company’s statements, dividends, technicals, history and seasonality pages exist only where that dataset exists. A missing page means nothing was disclosed, not that the page is broken; the sitemap applies the same rule.',
            ],
        },
        {
            id: 'freshness',
            h: 'Freshness signals',
            bullets: [
                'Every data page states its as-of date; price lists state it per row.',
                'Sitemap “last modified” values are observed — the newest real data timestamp in each segment — never the time of the request.',
                'Fund NAVs are collected twice daily; a fund flagged stale by the pipeline is labelled on the price list rather than hidden.',
            ],
        },
        {
            id: 'checks',
            h: 'Automated checks on the live site',
            paragraphs: [
                'A crawler audits the live site every morning at 06:15 UTC and again after every deployment. It verifies canonical URLs, the language and direction declared on every Arabic page, hreflang pairs and their reciprocity, structured data, as-of dates on fund surfaces, currency labels on fund and company surfaces, sitemap integrity and the redirect from every non-canonical host. A critical finding fails the release. Duplicate-content detection, a competitor coverage scorecard and a review of open experiments run on the same schedule.',
            ],
        },
        {
            id: 'corrections',
            h: 'Corrections',
            paragraphs: [
                'If a figure on any page looks wrong, report it through the Corrections page or by email to corrections@startamarkets.com. Errors are corrected on the next refresh and, where an article is affected, noted on the article.',
            ],
        },
        {
            id: 'coverage',
            h: 'Fund coverage, reconciled to the regulator',
            paragraphs: [
                `The Financial Regulatory Authority counts investment funds BY ISSUANCE: ${reconciliation.fra.total_by_issuance} at the end of June 2026 (report of ${reconciliation.fra.report_date}). This site prices publicly offered funds with a published net asset value. ${reconciliation.fra.out_of_scope.count} of the regulator's issuances are private-equity, real-estate, fund-of-funds or exchange-traded vehicles that publish no public unit price, so they are outside what can be priced here.`,
                `A fund is CURRENT when its manager has published a NAV within ${DORMANT_DAYS} days and at least ${MIN_NAV_POINTS} NAV points are held; a fund outside that rule keeps its own page, marked dormant, and is not counted, ranked or listed as a current price. The marketplace, the category and provider pages, the rankings and the price list all read this one rule, so the number a crawler is served equals the number a visitor sees.`,
                `On ${reconciliation.as_of} this site priced ${reconciliation.starta.current_priced_funds} current funds against the regulator's ${reconciliation.fra.in_scope_for_starta} in-scope issuances (difference: ${reconciliation.delta.fra_in_scope_minus_starta_current}). What remains is recent launches whose first NAVs publish with a lag and type-boundary differences the regulator's report does not itemise. The machine-readable reconciliation (content/fund-universe-reconciliation.json) is regenerated from the live data and re-checked at every build.`,
            ],
            table: {
                head: ['Regulator type (Q2 2026)', 'Issuances', 'Priced here?'],
                rows: reconciliation.fra.out_of_scope.types.map((t) => [t.type_en, String(t.count), 'No — no public unit price']),
            },
        },
        {
            id: 'classification',
            h: 'How funds are classified',
            paragraphs: [
                'A fund’s category comes from the type its manager disclosed to the price vendor (money market, fixed income, equity, balanced, gold). When no type is disclosed, the fund’s own registered name is read for the type words it carries — "Money Market", "Fixed Income", "Equity", an EGX index, a sector — in either language; a name that names no type leaves the fund uncategorised rather than guessed.',
                `When the vendor’s type contradicts the fund’s prospectus or its issuer’s own description, the vendor is not trusted: a documented override replaces it, and every override cites the document it rests on (content/fund-taxonomy-overrides.json). ${FUND_TAXONOMY_OVERRIDES.filter((o) => o.disposition === 'override').length} funds carry such an override today; they are listed below. A reviewed case where the vendor is right is recorded too, so the same question is not reopened.`,
                'Asset class, strategy and Shariah compliance are separate properties. An index fund is an equity fund with an index strategy; an Islamic money-market fund is a money-market fund that is Shariah-compliant. The category pages keep one canonical page per fund (a Shariah-compliant fund’s canonical hub is the Shariah page); the fund page’s "similar funds" module and the public API use the asset class. A fund whose registered name contradicts its disclosed type and has no recorded disposition is flagged by the daily live audit until someone reads its prospectus.',
            ],
            table: {
                head: ['Fund', 'Vendor type', 'Classified as', 'Evidence'],
                rows: FUND_TAXONOMY_OVERRIDES.map((o) => [
                    o.fund_name_en,
                    o.vendor_type ?? '—',
                    o.disposition === 'override' ? `${o.primary_asset_class.replace('_', ' ')} (override)` : `${o.primary_asset_class.replace('_', ' ')} (vendor confirmed)`,
                    o.evidence.length ? o.evidence.map((u) => { try { return new URL(u).hostname; } catch { return u; } }).join(', ') : 'registered name',
                ]),
            },
        },
        {
            id: 'ranking-eligibility',
            h: 'Who is ranked on the best-funds pages',
            bullets: [
                'A fund is ranked only when the audited engine (fund_metrics.py, recomputed daily from the NAV history) produced its trailing 12-month return. The same figure appears on the fund’s own page; the ranking never reads a second column family.',
                'The 12-month return is withheld — not estimated — when no NAV was published within 10% of the window (about 36 days) of the anchor date, or when the history is shorter than 12 months.',
                'A series flagged as a data artefact (a redenomination the cleaner could not repair) is not ranked even when a number exists; the fund page still shows what it can honestly support.',
                'Every excluded fund is counted with its reason on the ranking page itself (eligible, excluded, reason table), so the ranked count and the directory count can never disagree silently.',
            ],
        },
        {
            id: 'listed-companies',
            h: 'Which companies are published as EGX-listed',
            paragraphs: [
                `Listing status is not inferred from the price feed. The security master (content/egx-security-master.json) is built from the Egyptian Exchange's own registers — the main-market register captured ${SECURITY_MASTER_SOURCES.egx_main_register?.captured_at} and the SME-market register captured ${SECURITY_MASTER_SOURCES.egx_sme_register?.captured_at} — keyed by ISIN. TradingView supplies identity and prices only. A symbol the registers do not confirm (a delisted security such as Global Telecom Holding, delisted 9 September 2019; an ISIN alias of a company already published; a subscription-rights or preferred-share line; or a line neither register lists) keeps a reachable page that states its status, is not indexed, and is excluded from the directory, the market screens, sector pages and sitemaps.`,
                `Sector on company pages and in the directory is the exchange's own 18-sector classification from the register; the vendor's global classification is kept for the vendor-derived sector hubs and is labelled as such. A quote older than ${QUOTE_STALE_DAYS} days is withheld rather than shown as current.`,
            ],
        },
    ],
    related: [
        { href: '/editorial-policy', label: 'Editorial policy' },
        { href: '/corrections', label: 'Corrections' },
        { href: '/about', label: 'About & data sources' },
        { href: '/Funds/risk', label: 'Fund risk league table' },
        { href: '/Funds/categories', label: 'Fund categories compared' },
        { href: '/Funds/best-mutual-funds-egypt-2026', label: 'Best funds by return' },
        { href: '/Learn/glossary/volatility', label: 'Glossary: volatility' },
        { href: '/Learn/glossary/nav', label: 'Glossary: NAV' },
    ],
};

const AR: typeof EN = {
    title: 'المنهجية — المصادر والمعادلات ودرجات الجودة',
    description:
        'من أين تأتي بيانات البورصة وصناديق الاستثمار في ستارتا، وكم مرة تُحدَّث، وكيف تُحسب العوائد والتقلب ومعدل النمو المركّب، ولماذا لا يُعرض الرقم المفقود صفراً.',
    h1: 'المنهجية',
    lede:
        'كيف يُنتَج كل رقم على هذا الموقع: المصادر وتواتر تحديثها، والمعادلات وراء العوائد والمخاطر، والحدود التي تقرر متى يُحجب الرقم، ودرجات جودة البيانات لكل صندوق، والفحوص التي تعمل على الموقع الحي يومياً.',
    sections: [
        {
            id: 'sources',
            h: 'من أين تأتي البيانات وكم مرة تُحدَّث',
            table: {
                head: ['مجموعة البيانات', 'المصدر', 'التحديث'],
                rows: [
                    ['أسعار أسهم البورصة المصرية والمؤشرات الفنية', 'بيانات البورصة المصرية عبر TradingView، مخزّنة في جداول الأسعار الخاصة بنا', 'كل 15 دقيقة خلال ساعات التداول (الأحد–الخميس)، مع لقطة بعد الإغلاق'],
                    ['القوائم المالية والبيانات الأساسية', 'إفصاحات الشركات المجمّعة عبر TradingView — حتى 20 سنة من القوائم السنوية', 'أسبوعياً (الجمعة)'],
                    ['التوزيعات وتقديرات المحللين', 'TradingView', 'يومياً بعد الإغلاق'],
                    ['أخبار الشركات والسوق', 'الصحافة المالية المصرية المرخّصة بالعربية والإنجليزية', 'كل 30 دقيقة خلال ساعات السوق'],
                    ['صافي قيمة أصول صناديق الاستثمار', 'صافي قيمة الأصول الذي ينشره مدير كل صندوق، مجمّعاً من ملفات الأسعار الخاصة بكل صندوق على مباشر؛ ويغطي جامع يعمل عبر المتصفح الصناديق التي لا ملف لها', 'مرتين يومياً — 08:00 و19:00 بتوقيت القاهرة، الأحد–الخميس'],
                    ['تاريخ صافي قيمة الأصول لفجوة 2025', 'تقارير الأداء الأسبوعية للجمعية المصرية لإدارة الاستثمار (EIMA)، تُعكَس حسابياً لإعادة بناء نقاط صافي قيمة الأصول للأشهر التي تجمّد فيها الملف الأساسي؛ وتُطابَق كل نقطة مُعاد بناؤها مع ما نملكه فعلاً قبل كتابتها', 'أسبوعياً (الجمعة)'],
                    ['ملفات الصناديق والرسوم والحد الأدنى', 'نشرات الاكتتاب وإفصاحات مديري الصناديق', 'عند التغيير'],
                ],
            },
            paragraphs: [
                'الكتابة بالإضافة فقط: طلب لا يعيد شيئاً لا يمكنه أبداً حذف صافي قيمة أصول مخزّن سلفاً. تحمل كل صفحة بيانات تاريخ "كما في"، وفي قوائم الأسعار يظهر التاريخ في كل صف، لأن المديرين ينشرون على جداول مختلفة، وتاريخ واحد للصفحة كلها يوحي بحداثة موحّدة غير موجودة.',
            ],
        },
        {
            id: 'returns',
            h: 'كيف تُحسب عوائد الصناديق',
            bullets: [
                'العوائد التاريخية (شهر، 3 أشهر، 6 أشهر، سنة، 3 سنوات، 5 سنوات) هي أحدث صافي قيمة أصول مقسوماً على قيمة مرجعية ناقص واحد. القيمة المرجعية هي آخر صافي قيمة أصول في تاريخ بداية النافذة أو قبله.',
                'قاعدة المرساة: يجب ألا تبعد القيمة المرجعية عن تاريخ البداية المقصود أكثر من الأكبر بين 10 أيام و10% من طول النافذة. إذا كان أقرب صافي قيمة أصول أقدم من ذلك، لا يُنشر العائد وتعرض الصفحة "—". فـ"عائد 3 أشهر" المحسوب من قيمة عمرها 15 شهراً رقم خاطئ لا رقم قديم.',
                'العائد منذ بداية العام يقارن أحدث صافي قيمة أصول بآخر قيمة في السنة الميلادية السابقة.',
                'تُعاد حساب العوائد من تاريخ صافي قيمة الأصول الكامل كل يوم تداول، والرقم الذي تعرضه صفحة الصندوق هو المحسوب. ولا يظهر رقم المزوّد المُبلَّغ إلا حيث لا يوجد صف محسوب بعد.',
                'الترتيبات ("أفضل الصناديق") تُرتَّب آلياً حسب عائد سنة داخل كل فئة، وتُحذف الفئة التي فيها أقل من ثلاثة صناديق مرتّبة. لا شيء يُختار يدوياً ولا ترتيب يُعد توصية.',
            ],
        },
        {
            id: 'risk',
            h: 'كيف تُحسب أرقام المخاطر',
            bullets: [
                'التقلب هو الانحراف المعياري لعوائد الفترات المتتالية لصافي قيمة الأصول، مضروباً في الجذر التربيعي لعدد الفترات في السنة وفق وتيرة نشر الصندوق الفعلية — نحو 52 فترة للصندوق الأسبوعي ونحو 250 لليومي — لا وفق افتراض ثابت. تُستبعد الفترات التي تمتد لأكثر من ثلاثة أضعاف الفاصل الوسيط للصندوق (بحد أدنى 10 أيام) حتى لا تصنع الثغرات مخاطر، ويلزم ست فترات نظيفة على الأقل قبل نشر الرقم.',
                'أقصى الانخفاض هو أكبر هبوط من أي قمة سابقة إلى القاع الذي تلاها، كنسبة مئوية سالبة.',
                'الانحراف السلبي هو الجذر التربيعي لمتوسط مربعات عوائد الفترات السالبة مقابل هدف 0% (تُحتسب الفترات الموجبة صفراً)، مضروباً في الجذر التربيعي لعدد الفترات في السنة كما في التقلب.',
                'معدل النمو السنوي المركّب هو النمو الهندسي السنوي من أول صافي قيمة أصول صالح إلى الأحدث، ولا يُنشر لصندوق عمره أقل من 90 يوماً، لأن تحويل سلسلة أقصر من ربع سنة إلى معدل سنوي يصنع قيماً متطرفة بلا معنى.',
                'تنظيف السلسلة يسبق كل ما سبق: نسبة بين قيمتين متجاورتين خارج 0.34–3.0 خلال 45 يوماً تُعامل كإعادة تسعير وتُوصَل؛ ونقطة مفردة تنحرف أكثر من 50% عن وسيطها المحلي تُحذف كقراءة خاطئة؛ والصندوق الذي لا تزال سلسلته تحمل أثر إعادة تسعير تُحجب طبقة تحليلاته كلها بدل نشرها.',
                'لا يُنشر: نسبة شارب وألفا وبيتا. لا يوجد مؤشر مرجعي موثّق لكل فئة ولا سلسلة عائد خالٍ من المخاطر بالجنيه يمكن إعادة إنتاجها، والرقم الذي لا يمكن إعادة إنتاجه لا يُنشر.',
            ],
        },
        {
            id: 'quality',
            h: 'درجات جودة البيانات لكل صندوق',
            paragraphs: [
                'يُصنَّف تاريخ صافي قيمة الأصول لكل صندوق من A إلى F وفق ثلاثة مقاييس: التغطية (الملاحظات المتوافرة مقسومة على المتوقعة وفق وتيرة الصندوق نفسه)، وأطول فجوة، وعمر أحدث قيمة. تُشتق الحدود من الفاصل الوسيط لنشر كل صندوق — 54 صندوقاً تنشر أسبوعياً، وفاصل سبعة أيام هو إيقاعها لا ثغرة — ويُستثنى إغلاق البورصة المصرية من 27 يناير إلى 23 مارس 2011 بوصفه تاريخاً حقيقياً لا بيانات مفقودة.',
            ],
            table: {
                head: ['الدرجة', 'الشرط (يجب تحقق الثلاثة)'],
                rows: [
                    ['A', 'تغطية ≥ 92%، أطول فجوة أقل من 21 يوماً، أحدث قيمة عمرها 7 أيام على الأكثر'],
                    ['B', 'تغطية ≥ 80%، أطول فجوة أقل من 45 يوماً، أحدث قيمة عمرها 14 يوماً على الأكثر'],
                    ['C', 'تغطية ≥ 65%، أطول فجوة أقل من 90 يوماً، أحدث قيمة عمرها 30 يوماً على الأكثر'],
                    ['D', 'تغطية ≥ 40%، أطول فجوة أقل من 365 يوماً، أحدث قيمة عمرها 60 يوماً على الأكثر'],
                    ['F', 'دون أي حد من حدود D، أو أقل من ملاحظتين'],
                ],
            },
            bullets: [
                'الدرجات تقود المراقبة: ينطلق الإنذار عندما يرتفع عدد الصناديق دون الدرجة C، فلا يعود صندوق واحد سليم قادراً على إخفاء صندوق متجمّد — وهو العطل الذي استمر ثلاثة عشر شهراً بينما كل فحص إجمالي أخضر.',
            ],
        },
        {
            id: 'missing',
            h: 'المفقود ليس صفراً أبداً',
            paragraphs: [
                'الشرطة ("—") تعني أن الرقم لا يمكن حسابه بأمانة من البيانات المتوافرة: تاريخ غير كافٍ، أو قيمة مرجعية خارج الحدود، أو غياب الإفصاح. ولا يُعرض "0.00%" إلا عندما تكون القيمة المحسوبة صفراً بالضبط. لا يُقدَّر أي رقم ولا يُستكمل بالاستيفاء ولا يُرحَّل من فترة أقدم.',
            ],
        },
        {
            id: 'currency',
            h: 'العملات',
            paragraphs: [
                'تُتداول أسهم البورصة المصرية بالجنيه المصري، عدا القليل الذي يُتداول بالدولار الأمريكي (مثل FAITA وEGBE وVLMRA) ويُعرض بعملة تداوله. البيانات الأساسية للشركات — القيمة السوقية والقوائم — بالجنيه المصري. وصافي قيمة أصول الصناديق بعملة الصندوق نفسه، الجنيه المصري ما لم يفصح الصندوق عن غير ذلك. أي تسمية قديمة "SAR" على سهم مصري تُصحَّح إلى الجنيه: لا سهم في البورصة المصرية يُتداول بالريال السعودي.',
            ],
        },
        {
            id: 'screens',
            h: 'شاشات السوق وصفحات الشركات',
            bullets: [
                'شاشات ذروة البيع وذروة الشراء تستخدم مؤشر القوة النسبية لـ14 فترة بنطاقي وايلدر: 30 فأقل، و70 فأعلى.',
                'ترتيبات عائد التوزيعات تستبعد العوائد التاريخية التي تتجاوز 100% بوصفها غير معقولة — لا يمكن لشركة أن توزّع أكثر من سعرها في سنة دون خطأ بيانات وراء ذلك.',
                'لا تُنشر إلا الشركات التي رمز سوقها EGX؛ وEGX 30 مؤشر ويُستبعد من قوائم الشركات والأكثر تحركاً والقطاعات.',
                'صفحات القوائم المالية والتوزيعات والتحليل الفني والتاريخ والموسمية لأي شركة لا توجد إلا حيث توجد بياناتها. الصفحة الغائبة تعني أنه لم يُفصَح عن شيء لا أن الصفحة معطّلة؛ وتطبّق خريطة الموقع القاعدة نفسها.',
            ],
        },
        {
            id: 'freshness',
            h: 'إشارات الحداثة',
            bullets: [
                'تذكر كل صفحة بيانات تاريخها "كما في"؛ وقوائم الأسعار تذكره لكل صف.',
                'قيم "آخر تعديل" في خريطة الموقع مرصودة — أحدث طابع زمني حقيقي للبيانات في كل جزء — وليست وقت الطلب أبداً.',
                'تُجمع قيم صافي الأصول مرتين يومياً؛ والصندوق الذي يرصده النظام غير محدّث يُوسَم على قائمة الأسعار بدل إخفائه.',
            ],
        },
        {
            id: 'checks',
            h: 'الفحوص الآلية على الموقع الحي',
            paragraphs: [
                'يفحص زاحف الموقع الحي كل صباح في 06:15 بالتوقيت العالمي وبعد كل نشر. يتحقق من العناوين القانونية، ومن اللغة والاتجاه المعلنين على كل صفحة عربية، ومن أزواج hreflang وتبادليتها، ومن البيانات المهيكلة، ومن تواريخ "كما في" على صفحات الصناديق، ومن تسميات العملة على صفحات الصناديق والشركات، ومن سلامة خريطة الموقع، ومن إعادة التوجيه من كل نطاق غير قانوني. أي نتيجة حرجة تُفشل الإصدار. ويعمل على الجدول نفسه كشف المحتوى المكرر، وبطاقة قياس تغطية المنافسين، ومراجعة التجارب المفتوحة.',
            ],
        },
        {
            id: 'corrections',
            h: 'التصحيحات',
            paragraphs: [
                'إذا بدا رقم على أي صفحة خاطئاً، أبلغ عنه عبر صفحة التصحيحات أو بالبريد إلى corrections@startamarkets.com. تُصحَّح الأخطاء في التحديث التالي، وتُذكر على المقال إذا كان مقالاً.',
            ],
        },
        {
            id: 'coverage',
            h: 'تغطية الصناديق مطابَقةً مع الجهة الرقابية',
            paragraphs: [
                `تُحصي الهيئة العامة للرقابة المالية صناديق الاستثمار بإصداراتها: ${reconciliation.fra.total_by_issuance} صندوقًا في نهاية يونيو 2026 (تقرير ${reconciliation.fra.report_date}). يعرض هذا الموقع أسعار الصناديق المطروحة للجمهور التي تنشر صافي قيمة أصولها. ومن إصدارات الهيئة ${reconciliation.fra.out_of_scope.count} صندوقًا من صناديق الملكية الخاصة والصناديق العقارية والقابضة والمؤشرات المتداولة التي لا تنشر سعر وثيقة للجمهور، فهي خارج ما يمكن تسعيره هنا.`,
                `يُعدّ الصندوق حاليًا عندما ينشر مديره صافي قيمة الأصول خلال ${DORMANT_DAYS} يومًا ونحتفظ بما لا يقل عن ${MIN_NAV_POINTS} من نقاط صافي قيمة الأصول؛ والصندوق خارج هذه القاعدة يحتفظ بصفحته موسومًا بأنه متوقف، ولا يُحصى ولا يُرتَّب ولا يُعرض كسعر حالي. يقرأ سوق الصناديق وصفحات الفئات والجهات والترتيبات وقائمة الأسعار هذه القاعدة الواحدة، فيتساوى العدد الذي يُقدَّم للزاحف مع ما يراه الزائر.`,
                `بتاريخ ${reconciliation.as_of} سعّر هذا الموقع ${reconciliation.starta.current_priced_funds} صندوقًا حاليًا مقابل ${reconciliation.fra.in_scope_for_starta} إصدارًا داخل النطاق لدى الهيئة (الفارق: ${reconciliation.delta.fra_in_scope_minus_starta_current}). وما يبقى هو إصدارات حديثة تنشر أول قيم لها متأخرة، وفروق في حدود التصنيف لا يفصّلها تقرير الهيئة. تُعاد المطابقة الآلية (content/fund-universe-reconciliation.json) من البيانات الحية ويُتحقق منها عند كل بناء.`,
            ],
            table: {
                head: ['نوع الصندوق لدى الهيئة (الربع الثاني 2026)', 'الإصدارات', 'مُسعَّر هنا؟'],
                rows: reconciliation.fra.out_of_scope.types.map((t) => [t.type_ar, String(t.count), 'لا — لا يُنشر سعر وثيقة للجمهور']),
            },
        },
        {
            id: 'classification',
            h: 'كيف تُصنَّف الصناديق',
            paragraphs: [
                'تأتي فئة الصندوق من النوع الذي أفصح عنه مديره لمزوّد الأسعار (أسواق نقد، دخل ثابت، أسهم، متوازن، ذهب). وعندما لا يُفصَح عن نوع، يُقرأ الاسم المسجَّل للصندوق بحثًا عن كلمات النوع التي يحملها — «النقدي»، «الدخل الثابت»، «الأسهم»، مؤشر من مؤشرات البورصة، قطاع — بأي من اللغتين؛ والاسم الذي لا يسمّي نوعًا يترك الصندوق بلا فئة بدلًا من تخمينها.',
                `وعندما يخالف نوع المزوّد نشرة اكتتاب الصندوق أو وصف الجهة المُصدِرة له، لا يُؤخذ برأي المزوّد: يُطبَّق تصحيح موثّق يستبدله، ويستند كل تصحيح إلى الوثيقة التي بُني عليها (content/fund-taxonomy-overrides.json). يحمل ${FUND_TAXONOMY_OVERRIDES.filter((o) => o.disposition === 'override').length} صناديق تصحيحًا من هذا النوع اليوم، وهي مدرجة أدناه. وتُسجَّل أيضًا الحالة التي رُوجعت وتبيّن فيها صواب المزوّد حتى لا يُعاد فتح السؤال نفسه.`,
                'فئة الأصول والاستراتيجية والتوافق مع الشريعة خصائص منفصلة. فصندوق المؤشرات صندوق أسهم باستراتيجية مؤشر، وصندوق أسواق النقد الإسلامي صندوق أسواق نقد متوافق مع الشريعة. تحتفظ صفحات الفئات بصفحة أساسية واحدة لكل صندوق (الصفحة الأساسية للصندوق المتوافق مع الشريعة هي صفحة الصناديق الإسلامية)، بينما تستخدم وحدة «صناديق مشابهة» في صفحة الصندوق وواجهة البيانات العامة فئة الأصول. والصندوق الذي يخالف اسمه المسجَّل نوعه المُفصَح عنه دون قرار مسجَّل يُبلِّغ عنه التدقيق اليومي للموقع حتى تُقرأ نشرته.',
            ],
            table: {
                head: ['الصندوق', 'نوع المزوّد', 'صُنِّف كـ', 'الدليل'],
                rows: FUND_TAXONOMY_OVERRIDES.map((o) => [
                    o.fund_name,
                    o.vendor_type ?? '—',
                    o.disposition === 'override' ? `${CLASS_AR[o.primary_asset_class] ?? o.primary_asset_class} (تصحيح موثّق)` : `${CLASS_AR[o.primary_asset_class] ?? o.primary_asset_class} (تأكيد المزوّد)`,
                    o.evidence.length ? o.evidence.map((u) => { try { return new URL(u).hostname; } catch { return u; } }).join('، ') : 'الاسم المسجَّل',
                ]),
            },
        },
        {
            id: 'ranking-eligibility',
            h: 'من يُرتَّب في صفحات أفضل الصناديق',
            bullets: [
                'لا يُرتَّب الصندوق إلا عندما يُنتج المحرّك المُدقَّق (fund_metrics.py، يُعاد حسابه يوميًا من سجل صافي قيمة الأصول) عائده لآخر 12 شهرًا. الرقم نفسه يظهر على صفحة الصندوق؛ ولا يقرأ الترتيب أي عمود آخر.',
                'يُحجب عائد 12 شهرًا — لا يُقدَّر — عندما لا يوجد إفصاح خلال 10% من النافذة (نحو 36 يومًا) حول تاريخ الإسناد، أو عندما يقل السجل عن 12 شهرًا.',
                'السلسلة الموسومة بخلل في البيانات (إعادة تقييم لم يستطع المنظّف إصلاحها) لا تُرتَّب حتى لو وُجد رقم؛ وتعرض صفحة الصندوق ما يمكنها إثباته بأمانة.',
                'يُحصى كل صندوق مستبعد مع سببه على صفحة الترتيب نفسها (مؤهل، مستبعد، جدول الأسباب)، فلا يمكن أن يختلف عدد المُرتَّبين عن عدد الدليل بصمت.',
            ],
        },
        {
            id: 'listed-companies',
            h: 'أي الشركات تُنشر كشركات مقيدة في البورصة',
            paragraphs: [
                `لا تُستنتج حالة القيد من تغذية الأسعار. يُبنى سجل الأوراق المالية (content/egx-security-master.json) من سجلات البورصة المصرية نفسها — سجل السوق الرئيسي (بتاريخ ${SECURITY_MASTER_SOURCES.egx_main_register?.captured_at}) وسجل سوق الشركات الصغيرة والمتوسطة (بتاريخ ${SECURITY_MASTER_SOURCES.egx_sme_register?.captured_at}) — مفهرسةً برقم ISIN. ويقتصر دور TradingView على الهوية والأسعار. والرمز الذي لا تؤكده السجلات (ورقة مشطوبة مثل جلوبال تليكوم هولدنج المشطوبة في 9 سبتمبر 2019، أو رمز ISIN مكرر لشركة منشورة، أو حق اكتتاب أو أسهم ممتازة، أو ورقة لا يذكرها أي سجل) يحتفظ بصفحة يمكن الوصول إليها تبيّن حالته، ولا يُفهرس، ويُستبعد من الدليل وشاشات السوق وصفحات القطاعات وخرائط الموقع.`,
                `القطاع في صفحات الشركات والدليل هو تصنيف البورصة نفسها ذو 18 قطاعًا من السجل؛ ويُحتفظ بتصنيف المزوّد العالمي لصفحات القطاعات المشتقة منه مع الإشارة إلى ذلك. ويُحجب السعر الذي مضى عليه أكثر من ${QUOTE_STALE_DAYS} يومًا بدلًا من عرضه كسعر حالي.`,
            ],
        },
    ],
    related: [
        { href: '/ar/editorial-policy', label: 'سياسة التحرير' },
        { href: '/ar/corrections', label: 'التصحيحات' },
        { href: '/ar/about', label: 'من نحن ومصادر البيانات' },
        { href: '/ar/Funds/risk', label: 'جدول مخاطر الصناديق' },
        { href: '/ar/Funds/categories', label: 'فئات الصناديق مقارنةً' },
        { href: '/ar/Funds/best-mutual-funds-egypt-2026', label: 'أفضل الصناديق حسب العائد' },
        { href: '/ar/Learn/glossary', label: 'مسرد المصطلحات' },
    ],
};

export function methodologyMetadata(lang: 'en' | 'ar'): Metadata {
    const t = lang === 'ar' ? AR : EN;
    return {
        title: t.title,
        description: t.description,
        alternates: {
            canonical: lang === 'ar' ? PATH_AR : PATH_EN,
            languages: { en: PATH_EN, ar: PATH_AR, 'x-default': PATH_AR },
        },
    };
}

export function renderMethodology(lang: 'en' | 'ar') {
    const isAr = lang === 'ar';
    const t = isAr ? AR : EN;
    const path = isAr ? PATH_AR : PATH_EN;
    const crumbs = [
        { href: HOME_PATH, url: HOME_PATH, label: isAr ? 'الرئيسية' : 'Home' },
        { label: t.h1 },
    ];
    return (
        <PublicPageShell lang={lang} altHref={isAr ? PATH_EN : PATH_AR}>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'AboutPage',
                    '@id': `${SITE_URL}${path}`,
                    name: `${t.h1} — Starta Markets`,
                    url: `${SITE_URL}${path}`,
                    inLanguage: isAr ? 'ar-EG' : 'en',
                    isPartOf: { '@id': `${SITE_URL}/#website` },
                    mainEntity: { '@id': `${SITE_URL}/#organization` },
                }}
            />
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <Breadcrumbs lang={lang} items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">{t.h1}</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">{t.lede}</p>

            <nav aria-label={isAr ? 'المحتويات' : 'Contents'} className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {t.sections.map((s) => (
                    <a key={s.id} href={`#${s.id}`} className="text-muted hover:text-starta-darkTeal">
                        {s.h}
                    </a>
                ))}
            </nav>

            <div className="mt-8 max-w-3xl space-y-9">
                {t.sections.map((s) => (
                    <section key={s.id} id={s.id} className="scroll-mt-24">
                        <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-main">
                            <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                            {s.h}
                        </h2>
                        {s.table && (
                            <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                                <table className="w-full min-w-[560px] text-sm">
                                    <thead>
                                        <tr className={`border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted ${isAr ? 'text-right' : 'text-left'}`}>
                                            {s.table.head.map((h) => (
                                                <th key={h} scope="col" className="px-4 py-3">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {s.table.rows.map((r) => (
                                            <tr key={r[0]} className="border-b border-border/60 align-top last:border-0">
                                                {r.map((cell, i) => (
                                                    <td key={i} className={`px-4 py-2.5 leading-relaxed ${i === 0 ? 'font-semibold text-main' : 'text-muted'}`}>
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {s.paragraphs?.map((p) => (
                            <p key={p.slice(0, 40)} className="mt-3 leading-relaxed text-muted">
                                {p}
                            </p>
                        ))}
                        {s.bullets && (
                            <ul className="mt-3 list-disc space-y-2 ps-5 leading-relaxed text-muted">
                                {s.bullets.map((b) => (
                                    <li key={b.slice(0, 40)}>{b}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}
            </div>

            <nav aria-label={isAr ? 'صفحات ذات صلة' : 'Related'} className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                {t.related.map((r) => (
                    <Link key={r.href} href={r.href} prefetch={false} className="text-muted hover:text-starta-darkTeal">
                        {r.label}
                    </Link>
                ))}
            </nav>
        </PublicPageShell>
    );
}
