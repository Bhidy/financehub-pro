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
     * Shared Sign in / Create account controls for the STATIC pages.
     *
     * The 13 static pages each hand-rolled their own header, so there is no one
     * markup shape to patch — but every one of them renders the #themeToggle
     * button inside its nav-controls cluster. We inject the auth links right
     * before it, from this single source of truth, instead of forking the same
     * markup 13 times (and 13 dictionaries with it).
     * /login and /register are single-URL pages that follow the STORED
     * language, so they need no /ar prefix — the labels just re-render when the
     * visitor toggles language (watched via <html lang>).
     */
    var AUTH_STR = {
        en: { login: "Sign In", register: "Create Account" },
        ar: { login: "تسجيل الدخول", register: "إنشاء حساب" }
    };

    function paintAuthLinks() {
        var host = document.getElementById("themeToggle");
        host = host && host.parentElement;
        if (!host) return;
        var strings = AUTH_STR[document.documentElement.lang === "en" ? "en" : "ar"];
        var existing = host.querySelector("[data-starta-auth]");
        if (existing) {
            existing.querySelector("[data-starta-auth-login]").textContent = strings.login;
            existing.querySelector("[data-starta-auth-register]").textContent = strings.register;
            return;
        }
        var wrap = document.createElement("div");
        wrap.setAttribute("data-starta-auth", "");
        wrap.style.cssText = "display:flex;align-items:center;gap:.5rem";
        var login = document.createElement("a");
        login.setAttribute("data-starta-auth-login", "");
        login.href = "/login";
        login.textContent = strings.login;
        login.style.cssText =
            "font-size:.72rem;font-weight:700;letter-spacing:.06em;padding:.5rem .7rem;" +
            "border-radius:999px;color:var(--c-text-muted,#5c6676);white-space:nowrap;text-decoration:none";
        var register = document.createElement("a");
        register.setAttribute("data-starta-auth-register", "");
        register.href = "/register";
        register.textContent = strings.register;
        register.style.cssText =
            "font-size:.72rem;font-weight:700;letter-spacing:.06em;padding:.5rem .9rem;" +
            "border-radius:999px;white-space:nowrap;text-decoration:none;color:#fff;" +
            "background:linear-gradient(135deg,#14B8A6 20%,#0f766e 100%);" +
            "box-shadow:0 8px 20px rgba(20,184,166,.22)";
        wrap.appendChild(login);
        wrap.appendChild(register);
        host.insertBefore(wrap, host.firstChild);
    }

    var startAuthLinks = function () {
        paintAuthLinks();
        // The per-page i18n scripts swap <html lang> when the visitor toggles
        // language; re-label from that single signal.
        new MutationObserver(paintAuthLinks).observe(document.documentElement, {
            attributes: true, attributeFilter: ["lang"]
        });
    };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startAuthLinks);
    } else {
        startAuthLinks();
    }
})();
