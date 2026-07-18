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
})();
