/**
 * Starta language boot — runs in <head>, before first paint, on every static
 * public page. Resolves the visitor's language (stored preference, else the
 * site DEFAULT: ARABIC) and stamps documentElement.lang/dir immediately so
 * RTL layout applies from the very first frame instead of flashing LTR and
 * flipping after the page's own i18n script runs at the end of <body>.
 *
 * Contract:
 *  - Storage keys: "starta-lang" (canonical) with legacy fallback "lang" —
 *    the same keys every page script and PublicPageShell persistLang use.
 *  - Default when nothing is stored: "ar" (the site's default language).
 *  - This script only sets attributes; the per-page dictionaries still do the
 *    text swap. Page scripts re-derive the same value with the same rule.
 */
(function () {
    var lang = "ar";
    try {
        var stored = localStorage.getItem("starta-lang") || localStorage.getItem("lang");
        if (stored === "en") lang = "en";
    } catch (e) {
        /* storage unavailable (privacy mode): keep the Arabic default */
    }
    /**
     * AN /ar URL OUTRANKS STORAGE (lib/lang.ts R3), and records itself.
     *
     * The designed shells are single files that pick their language from
     * storage, and several of them are ALSO served under /ar — /ar, /ar/Funds,
     * /ar/News, /ar/Learn, /ar/Market-Pulse, /ar/Funds/Compare. A visitor whose
     * stored preference was "en" got the server's correct <html lang="ar"
     * dir="rtl"> overwritten to English right here, in the head, and the page's
     * own dictionary pass then rendered the Arabic URL in English. The routes
     * inject a seed script for exactly this, but it lands LATER in <head> than
     * this file, so the document spent the whole render in the wrong direction.
     * Deciding it here removes the ordering dependency entirely.
     */
    try {
        if (/^\/ar(\/|$)/.test(location.pathname)) {
            lang = "ar";
            localStorage.setItem("starta-lang", "ar");
            localStorage.setItem("lang", "ar");
            document.cookie = "starta-lang=ar;path=/;max-age=31536000;samesite=lax";
        }
    } catch (e) {
        /* storage unavailable: the language is still forced to Arabic above */
    }
    var d = document.documentElement;
    d.lang = lang;
    d.dir = lang === "ar" ? "rtl" : "ltr";

    /**
     * Language-safe internal link builder — THE single source of truth for
     * static-page links into server-rendered routes that have /ar twins.
     *
     * The site has two i18n mechanisms: static pages are one URL with a
     * client-side dictionary swap, while server pages (/RiskAssessment,
     * /Calculators, /Funds/{id}, …) carry the language IN the URL (/ar twins).
     * Any hardcoded EN link on an Arabic page silently flips the user to
     * English — the exact bug this helper exists to prevent. ALWAYS build
     * static→server links through it; it reads the CURRENT language at call
     * time, so a language toggle re-targets every CTA without a re-render.
     */
    var AR_TWIN_ROUTES = ["/Calculators","/Funds","/Learn","/Market-Pulse","/News","/RiskAssessment","/about","/companies","/contact","/corrections","/editorial-policy","/feed.xml","/markets","/methodology","/sectors","/symbol"];
    var AR_TWIN_PATTERNS = ["^/Calculators$","^/Funds$","^/Funds/Compare$","^/Funds/[^/]+$","^/Funds/[^/]+/nav-history$","^/Funds/best-mutual-funds-egypt-2026$","^/Funds/categories$","^/Funds/category/[^/]+$","^/Funds/fees$","^/Funds/prices-today$","^/Funds/provider/[^/]+$","^/Funds/providers$","^/Funds/risk$","^/Funds/vs/[^/]+$","^/Learn$","^/Learn/[^/]+$","^/Learn/glossary$","^/Learn/glossary/[^/]+$","^/Market-Pulse$","^/News$","^/News/category/[^/]+$","^/RiskAssessment$","^/about$","^/companies$","^/companies/vs/[^/]+$","^/contact$","^/corrections$","^/editorial-policy$","^/feed\\.xml$","^/markets$","^/markets/[^/]+$","^/markets/dividend-calendar$","^/markets/egx30$","^/markets/largest-companies$","^/markets/lowest-pe-stocks$","^/markets/movers$","^/markets/top-dividend-yield$","^/methodology$","^/sectors$","^/sectors/[^/]+$","^/sectors/egx/[^/]+$","^/symbol/[^/]+$","^/symbol/[^/]+/dividends$","^/symbol/[^/]+/financials$","^/symbol/[^/]+/history$","^/symbol/[^/]+/seasonality$","^/symbol/[^/]+/statistics$","^/symbol/[^/]+/technicals$"];
    window.startaLocalizedHref = function (path) {
        var current = document.documentElement.lang === "en" ? "en" : "ar";
        if (current !== "ar") return path;
        // EXACT PATTERNS, not prefix matching. Prefix matching asserted that an
        // Arabic twin of a parent covers every child: /ar/News exists but
        // /ar/News/[id] does not, so every article link became /ar/News/{id}
        // and 404'd — all 4,584 of them — and the same held for
        // /ar/symbol/{id}/{metric}. A path is now rewritten only when its OWN
        // Arabic route exists, and sync-ar-routes.mjs re-derives the list from
        // app/ar/** so adding a twin re-enables prefixing automatically.
        var rest = "";
        var bare = String(path || "");
        var cut = bare.search(/[?#]/);
        if (cut >= 0) { rest = bare.slice(cut); bare = bare.slice(0, cut); }
        if (bare.length > 1 && bare.charAt(bare.length - 1) === "/") bare = bare.slice(0, -1);
        // HOME IS ONE URL (lib/lang.ts R1) — "/" in every language. Stated
        // explicitly rather than left to fall through the pattern loop, because
        // the React twin of this function (lib/localized-href.ts) DID carry a
        // `path === "/" -> "/ar"` special case, and that single divergence is
        // what sent every Arabic nav/breadcrumb/footer HOME link to the Arabic
        // hub while these static pages still linked the designed homepage.
        // Both halves are executed against each other by
        // scripts/test-lang-contract.ts. Do not add an /ar mapping here.
        if (bare === "" || bare === "/") return "/" + rest;
        for (var i = 0; i < AR_TWIN_PATTERNS.length; i++) {
            if (new RegExp(AR_TWIN_PATTERNS[i]).test(bare)) return "/ar" + bare + rest;
        }
        // Not a twinned route (static single-URL pages keep language via
        // storage) — never invent an /ar URL that might 404.
        return path;
    };

    /**
     * Global anchor localizer: just before any interaction with an internal
     * link, rewrite its href through startaLocalizedHref. This makes EVERY
     * <a> to a twinned route on EVERY static page language-safe — including
     * links added later — without per-page wiring. Capture phase, so it runs
     * before navigation; pointerdown also covers middle-click new-tab opens.
     */
    var localizeAnchor = function (event) {
        var target = event.target;
        if (!target || !target.closest) return;
        var anchor = target.closest('a[href^="/"]');
        if (!anchor) return;
        // Remember the ORIGINAL, language-neutral href once and always recompute
        // from it. Rewriting the live href in place is one-way: after an Arabic
        // ctrl/middle-click the anchor would stay "/ar/…" forever, so toggling
        // back to English then clicking it would still open the Arabic page.
        var base = anchor.getAttribute("data-starta-href");
        if (base === null) {
            base = anchor.getAttribute("href");
            anchor.setAttribute("data-starta-href", base);
        }
        var localized = window.startaLocalizedHref(base);
        if (localized !== anchor.getAttribute("href")) anchor.setAttribute("href", localized);
    };
    document.addEventListener("pointerdown", localizeAnchor, true);
    document.addEventListener("click", localizeAnchor, true);

    /**
     * Auth controls moved to public/assets/starta-auth-nav.js.
     *
     * The painter that used to live here injected "Sign In / Create Account"
     * unconditionally — it never read the session — so every static page told a
     * signed-in user to create an account, offered no link to /settings, and no
     * way to sign out. The replacement renders from the same canonical
     * definition (lib/auth-nav.json) that the React shells use, and reacts to
     * sign-in/out. Language handling is unchanged: it re-labels off <html lang>
     * exactly as this file did.
     */
})();
