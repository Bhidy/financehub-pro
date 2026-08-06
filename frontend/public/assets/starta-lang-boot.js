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
    var AR_TWIN_ROUTES = ["/RiskAssessment", "/Calculators"];
    window.startaLocalizedHref = function (path) {
        var current = document.documentElement.lang === "en" ? "en" : "ar";
        if (current !== "ar") return path;
        for (var i = 0; i < AR_TWIN_ROUTES.length; i++) {
            var route = AR_TWIN_ROUTES[i];
            if (path === route || path.indexOf(route + "/") === 0 || path.indexOf(route + "?") === 0) {
                return "/ar" + path;
            }
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
        var href = anchor.getAttribute("href");
        var localized = window.startaLocalizedHref(href);
        if (localized !== href) anchor.setAttribute("href", localized);
    };
    document.addEventListener("pointerdown", localizeAnchor, true);
    document.addEventListener("click", localizeAnchor, true);
})();
