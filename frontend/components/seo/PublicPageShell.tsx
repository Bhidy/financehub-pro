import Link from 'next/link';
import Script from 'next/script';
import ThemeToggle from '@/components/seo/ThemeToggle';
import NavAuth from '@/components/seo/NavAuth';
import navConfig from '@/lib/nav.json';
import assetVersions from '@/lib/asset-versions.json';
import arTwinRoutes from '@/lib/ar-twin-routes.json';
import { localizedHref } from '@/lib/localized-href';

/**
 * Server-rendered chrome for the SEO/public pages — a FAITHFUL replication of
 * the designed static pages' header and footer (extracted verbatim from
 * home.html: same markup, classes, theme system and translations). The site's
 * design is canonical:
 *  - dark theme is the DEFAULT; /assets/starta-theme.js toggles data-theme
 *    (light) and binds #themeToggle exactly like the static pages
 *  - /assets/starta-mobile-nav.js provides the shared premium burger nav
 *    (drop-in for any header family per its own contract)
 *  - bg-page/text-main/text-muted/border-border/starta-teal tokens map to the
 *    same --c-* variables the static pages define (see globals.css)
 *  - language is per-URL here (SSR), so the langToggle is a LINK to the
 *    hreflang twin instead of the static pages' client-side dict toggle —
 *    visually identical control, correct mechanic for indexable pages.
 */

type Lang = 'en' | 'ar';

const NAV_LABELS: Record<Lang, Record<string, string>> = {
    en: {
        home: 'HOME', funds: 'MUTUAL FUNDS', pulse: 'MARKET PULSE', news: 'MARKET NEWS',
        portfolio: 'MY PORTFOLIO', learn: 'LEARN', cta: 'Free Risk Profile',
    },
    ar: {
        home: 'الرئيسية', funds: 'الصناديق الاستثمارية', pulse: 'نبض السوق', news: 'أخبار السوق',
        portfolio: 'محفظتي', learn: 'تعلّم', cta: 'اعرف ملف مخاطرك',
    },
};

const FOOTER_LABELS: Record<Lang, Record<string, string>> = {
    en: {
        desc: 'The bilingual mutual-fund platform for the Egyptian market: verified NAV data, fund comparison and scorecards, market news, an investing academy, and wealth calculators — in Arabic and English.',
        cta: 'Explore Funds',
        col1: 'PLATFORM', col2: 'RESEARCH', col3: 'RESOURCES',
        home: 'Home', funds: 'Mutual Funds', pulse: 'Market Pulse',
        news: 'Market News', learn: 'Learn Catalog', portfolio: 'Smart Portfolio',
        calculators: 'Wealth Calculators', risk: 'Risk Assessment', account: 'Create Account', login: 'Sign In',
        discTitle: 'Regulatory Disclaimer',
        disclaimer: 'Starta Markets is a financial data and technology platform. All content, tools, and analytics provided are for informational and educational purposes only, and should not be construed as investment advice, recommendations, or endorsements to buy or sell any security or mutual fund. Financial markets carry high volatility and risks; every investor is fully responsible for their own investment due diligence.',
        copy: '© 2026 Starta Markets. All Rights Reserved.',
        companies: 'EGX Companies', about: 'About', contact: 'Contact',
        privacy: 'Privacy Policy', terms: 'Terms of Service',
        editorial: 'Editorial Policy', corrections: 'Corrections',
    },
    ar: {
        desc: 'منصة الصناديق الاستثمارية في السوق المصري بالعربية والإنجليزية: أسعار موثّقة لصافي قيمة الوحدة، ومقارنة وبطاقات تقييم للصناديق، وأخبار السوق، وأكاديمية تعليمية، وحاسبات استثمارية.',
        cta: 'استكشف الصناديق',
        col1: 'المنصة', col2: 'الأبحاث', col3: 'المصادر',
        home: 'الرئيسية', funds: 'الصناديق الاستثمارية', pulse: 'نبض السوق',
        news: 'أخبار السوق', learn: 'أكاديمية ستارتا', portfolio: 'المحفظة الذكية',
        calculators: 'حاسبات الثروة', risk: 'تقييم المخاطر', account: 'إنشاء حساب', login: 'تسجيل الدخول',
        discTitle: 'إخلاء المسؤولية التنظيمي',
        disclaimer: 'ستارتا ماركتس منصة بيانات وتقنيات مالية. جميع المحتويات والأدوات والتحليلات المقدَّمة لأغراض معلوماتية وتعليمية فقط، ولا تُعد نصيحة استثمارية أو توصية أو تزكية لشراء أو بيع أي ورقة مالية أو صندوق استثمار. الأسواق المالية عالية التقلب والمخاطر؛ وكل مستثمر مسؤول مسؤولية كاملة عن قراراته الاستثمارية.',
        copy: '© 2026 ستارتا ماركتس. جميع الحقوق محفوظة.',
        companies: 'الشركات المدرجة', about: 'من نحن', contact: 'اتصل بنا',
        privacy: 'سياسة الخصوصية', terms: 'شروط الاستخدام',
        editorial: 'سياسة التحرير', corrections: 'التصحيحات',
    },
};

/** Custom classes from the designed pages, scoped under .seo-shell so they
 * can never collide with the interactive app's own styles. */
const SHELL_CSS = `
.seo-shell{overflow-x:hidden}
.seo-shell .btn-primary{background:linear-gradient(135deg,#14B8A6 20%,#0f766e 100%);color:#fff;box-shadow:0 18px 44px rgba(20,184,166,0.22);border:1px solid rgba(45,212,191,0.35);transition:transform .28s ease,box-shadow .28s ease,filter .28s ease}
.seo-shell .btn-primary:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 24px 52px rgba(20,184,166,0.32);filter:saturate(1.06)}
.seo-shell .btn-secondary{border:1px solid rgba(45,212,191,0.45);background:rgba(45,212,191,0.08);color:var(--c-text-main);transition:background-color .25s ease,color .25s ease,transform .25s ease}
.seo-shell .btn-secondary:hover{background:rgba(45,212,191,0.2);transform:translateY(-1px)}
.seo-shell .nav-controls{display:flex;align-items:center;gap:.5rem}
.seo-shell .control-btn{width:2.35rem;height:2.35rem;border-radius:999px;border:1px solid var(--c-border);background:var(--glass-bg);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;color:var(--c-text-main)}
.seo-shell .control-btn:hover{transform:translateY(-1px);color:#14B8A6;border-color:rgba(20,184,166,0.5)}
[data-theme="light"] .seo-shell .dark-icon{opacity:0}
[data-theme="light"] .seo-shell .light-icon{opacity:1}
`;

/** Route PATTERNS that have real /ar twins (server-rendered, language-in-URL).
 *  Exact per-route patterns, not parent prefixes: /ar/News exists while
 *  /ar/News/[id] does not, and prefix matching turned every article link
 *  into a 404. See scripts/sync-ar-routes.mjs. */
/**
 * Derived from app/ar/** by scripts/sync-ar-routes.mjs — never hand-written.
 * The hand-written version listed 2 routes while 15 existed, so every link to
 * /Learn/{slug}, /Funds/{id}, /companies, /sectors, /markets/* and /symbol/{id}
 * dropped an Arabic reader onto the English page.
 */
const AR_TWIN_ROUTES = arTwinRoutes.routes;

/**
 * Language-safe internal href — the shell-side single source of truth.
 * Server pages carry the language IN the URL, so an Arabic page linking a bare
 * EN path silently flips the user to English (the exact bug this prevents).
 * Static single-URL pages (/, /Funds, /News, /Learn) keep language via
 * localStorage/persistLang and must NOT be prefixed.
 */
// Re-exported from lib/localized-href so this shell and SiteNav share ONE
// implementation. A second copy is how the lists drifted in the first place.

export default function PublicPageShell({
    children,
    lang = 'en',
    altHref,
    dir,
    wide = false,
    persistLang = false,
}: {
    children: React.ReactNode;
    lang?: Lang;
    /** URL of the hreflang twin — renders the site's lang toggle as a link. */
    altHref?: string;
    /** @deprecated derived from lang; kept for call-site compatibility. */
    dir?: 'ltr' | 'rtl';
    /** Widen the content to match the header (max-w-screen-2xl vs the default max-w-7xl). */
    wide?: boolean;
    /** Persist this page's URL-derived language to localStorage + cookie so the
     *  client-i18n surfaces (static marketplace / compare / home / news) stay in
     *  the SAME language after navigation — fixing the "language suddenly flips to
     *  English" bug globally. Opt-in: pass true ONLY from URL-based bilingual pages
     *  (funds, news) that own their language via the URL. Do NOT pass it from
     *  localStorage-based sections like /symbol, or their Arabic would be clobbered. */
    persistLang?: boolean;
}) {
    const direction = dir ?? (lang === 'ar' ? 'rtl' : 'ltr');
    const t = NAV_LABELS[lang];
    const f = FOOTER_LABELS[lang];

    return (
        <div dir={direction} lang={lang} className={`seo-shell min-h-screen bg-page text-main ${lang === 'ar' ? 'font-arabic' : ''}`}>
            <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
            {(lang === 'ar' || persistLang) && (
                // The root layout hardcodes <html lang="en"> — mirror the page
                // language onto the document element so assistive tech and search
                // engines see the right document. When persistLang is set, also
                // sticky-store the language (localStorage + cookie) so the static /
                // client-i18n surfaces (marketplace, compare, home, news) render in
                // the SAME language after the user navigates to them.
                <script
                    dangerouslySetInnerHTML={{
                        __html:
                            (lang === 'ar' ? "document.documentElement.lang='ar';document.documentElement.dir='rtl';" : '') +
                            (persistLang
                                ? `try{localStorage.setItem('starta-lang','${lang}');localStorage.setItem('lang','${lang}');}catch(e){}` +
                                  `try{document.cookie='starta-lang=${lang};path=/;max-age=31536000;samesite=lax';}catch(e){}`
                                : ''),
                    }}
                />
            )}
            <Script src="/assets/starta-theme.js?v=1.1.0" strategy="beforeInteractive" />
            {/* starta-mobile-nav builds its drawer CTA through
                window.startaLocalizedHref. That helper normally ships in
                starta-lang-boot.js, which only the STATIC pages load — so every
                /ar/* server page was shipping a drawer CTA that fell back to
                String() and dropped Arabic users onto the ENGLISH page.
                We define it here instead of loading lang-boot, because on a
                server-rendered page the language comes from the URL (this
                `lang` prop), not from localStorage — lang-boot would stamp the
                stale stored language onto <html>. Same contract, right source. */}
            <script
                dangerouslySetInnerHTML={{
                    __html:
                        `(function(){var L=${JSON.stringify(lang)},P=${JSON.stringify(arTwinRoutes.patterns)};` +
                        `window.startaLocalizedHref=function(p){if(L!=="ar")return p;` +
                        `var s=String(p||""),q="",c=s.search(/[?#]/);` +
                        `if(c>=0){q=s.slice(c);s=s.slice(0,c);}` +
                        `if(s.length>1&&s.charAt(s.length-1)==="/")s=s.slice(0,-1);` +
                        `for(var i=0;i<P.length;i++){if(new RegExp(P[i]).test(s))return "/ar"+s+q;}return p;};})();`,
                }}
            />
            {/* Canonical nav appearance, the SAME file the static pages load.
                While this shell styled its own links they rendered 12px mono at
                40px gaps against 13px IBM Plex at 36px everywhere else. */}
            <link rel="stylesheet" href={`/assets/starta-nav.css?v=${assetVersions["starta-nav.css"]}`} />
            <Script src="/assets/starta-mobile-nav.js?v=1.0.6" strategy="lazyOnload" />

            {/* ── Header: verbatim structure from the designed pages ─────────── */}
            <nav className="fixed top-0 w-full z-50 border-b border-border bg-page/80 backdrop-blur-xl transition-all duration-300">
                <div className="max-w-screen-2xl mx-auto px-8 h-20 flex justify-between items-center">
                    <a href="/" className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-8 h-8 bg-starta-teal rounded flex items-center justify-center font-bold text-white text-xl font-display group-hover:rotate-12 transition-transform">S</div>
                        <span className="text-lg font-display font-bold text-main tracking-widest">STARTA</span>
                    </a>

                    <div className="hidden lg:flex items-center gap-10">
                        <div className="starta-nav-links">
                            {/* One canonical list (lib/nav.json) for every surface:
                                this shell, SiteNav, and the static pages. */}
                            {navConfig.items.map((item) => (
                                <Link
                                    key={item.key}
                                    href={localizedHref(item.href, lang)}
                                    prefetch={false}
                                    className="hover:text-starta-teal transition-colors"
                                    data-key={item.key}
                                >
                                    {lang === 'en' ? item.en : item.ar}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 ml-3 starta-nav-controls">
                        {/* Auth entry points. This shell is a SERVER component and the
                            session lives in localStorage, so the two links used to be
                            hardcoded here — every one of the ~40 routes this shell
                            renders told a signed-in user to "Create Account" and offered
                            no way to reach /settings or sign out. NavAuth is the shared
                            client island: it server-renders the signed-out pair (correct
                            for crawlers and for most requests, and hydration-safe) and
                            swaps to the account state in an effect.
                            /login and /register are single-URL pages that follow the
                            STORED language (no /ar twin), so they carry no prefix. */}
                        <NavAuth lang={lang} />
                        <div className="nav-controls">
                            <ThemeToggle />
                            {altHref && (
                                <a href={altHref} className="control-btn font-display text-xs font-bold" aria-label={lang === 'ar' ? 'English version' : 'النسخة العربية'}>
                                    {lang === 'ar' ? 'EN' : 'ع'}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className={`mx-auto ${wide ? 'max-w-screen-2xl' : 'max-w-7xl'} px-6 pt-28 pb-16`}>{children}</main>

            {/* ── Footer: verbatim structure from the designed pages ─────────── */}
            <footer className="relative bg-surface border-t border-border overflow-hidden pt-24 pb-12">
                <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-80" aria-hidden="true">
                    <div className="absolute bottom-0 right-10 w-[450px] h-[300px] bg-starta-teal/5 rounded-full blur-[100px]" />
                    <div className="absolute top-12 left-10 w-[300px] h-[200px] bg-violet-600/3 rounded-full blur-[80px]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 pb-16 border-b border-border mb-16">
                        <div className="space-y-4 max-w-md text-start">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-starta-teal rounded-xl flex items-center justify-center font-bold text-white text-xl font-display">S</div>
                                <span className="text-xl font-display font-bold text-main tracking-widest">STARTA</span>
                            </div>
                            <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full lg:w-auto">
                            <Link href="/Funds" prefetch={false} className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold tracking-widest uppercase">
                                <span>{f.cta}</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-8 mb-16 text-start">
                        <div className="space-y-4">
                            <h4 className="text-xs font-mono text-muted uppercase tracking-[0.2em] font-semibold">{f.col1}</h4>
                            <ul className="space-y-2.5 text-sm">
                                <li><Link href="/" prefetch={false} className="text-muted hover:text-starta-teal transition-colors font-medium">{f.home}</Link></li>
                                <li><Link href="/Funds" prefetch={false} className="text-muted hover:text-starta-teal transition-colors font-medium">{f.funds}</Link></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-mono text-muted uppercase tracking-[0.2em] font-semibold">{f.col2}</h4>
                            <ul className="space-y-2.5 text-sm">
                                <li><Link href="/News" prefetch={false} className="text-muted hover:text-starta-teal transition-colors font-medium">{f.news}</Link></li>
                                <li><Link href="/Learn" prefetch={false} className="text-muted hover:text-starta-teal transition-colors font-medium">{f.learn}</Link></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-mono text-muted uppercase tracking-[0.2em] font-semibold">{f.col3}</h4>
                            <ul className="space-y-2.5 text-sm">
                                <li><Link href={localizedHref('/Calculators', lang)} prefetch={false} className="text-muted hover:text-starta-teal transition-colors font-medium">{f.calculators}</Link></li>
                                <li><Link href={localizedHref('/RiskAssessment', lang)} prefetch={false} className="text-muted hover:text-starta-teal transition-colors font-medium">{f.risk}</Link></li>
                                <li><Link href="/register" prefetch={false} className="text-muted hover:text-starta-teal transition-colors font-medium">{f.account}</Link></li>
                                <li><Link href="/login" prefetch={false} className="text-muted hover:text-starta-teal transition-colors font-medium">{f.login}</Link></li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <ul className="space-y-2.5 text-sm">
                                <li><a href="mailto:support@startamarkets.com" className="text-muted hover:text-starta-teal transition-colors font-medium">support@startamarkets.com</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-panel/30 border border-border mb-12 text-start">
                        <h5 className="text-xs font-mono text-main tracking-widest uppercase font-semibold mb-2.5">{f.discTitle}</h5>
                        <p className="text-[11px] text-muted leading-relaxed">{f.disclaimer}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted font-mono pt-4 border-t border-border/80">
                        <div>{f.copy}</div>
                        <div className="flex flex-wrap gap-6">
                            <Link href="/companies" prefetch={false} className="hover:text-starta-teal transition-colors">{f.companies}</Link>
                            <Link href="/about" prefetch={false} className="hover:text-starta-teal transition-colors">{f.about}</Link>
                            <Link href={lang === 'ar' ? '/ar/editorial-policy' : '/editorial-policy'} prefetch={false} className="hover:text-starta-teal transition-colors">{f.editorial}</Link>
                            <Link href={lang === 'ar' ? '/ar/corrections' : '/corrections'} prefetch={false} className="hover:text-starta-teal transition-colors">{f.corrections}</Link>
                            <Link href="/contact" prefetch={false} className="hover:text-starta-teal transition-colors">{f.contact}</Link>
                            <Link href="/privacy" prefetch={false} className="hover:text-starta-teal transition-colors">{f.privacy}</Link>
                            <Link href="/terms" prefetch={false} className="hover:text-starta-teal transition-colors">{f.terms}</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

/** Linked breadcrumb trail in the site's font-mono tracked style. */
export function Breadcrumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-mono uppercase tracking-widest text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
                {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                        {i > 0 && <span aria-hidden className="opacity-50">/</span>}
                        {item.href ? (
                            <Link href={item.href} prefetch={false} className="transition-colors hover:text-starta-teal">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-main">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

/** BreadcrumbList JSON-LD helper (absolute URLs required). */
export function breadcrumbJsonLd(items: Array<{ url?: string; label: string }>, siteUrl: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.label,
            ...(item.url ? { item: siteUrl + item.url } : {}),
        })),
    };
}
