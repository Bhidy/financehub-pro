/**
 * CANONICAL PRIMARY NAV — renderer for the static HTML pages.
 *
 * WHY THIS FILE EXISTS
 * The nav was hand-duplicated into 13 static pages plus two React components.
 * They drifted: home carried 5 links and the CTA, eleven pages carried 4 links
 * and NO CTA, /Calculators still showed the pre-rename CTA copy, and the same
 * destination was keyed both `nav_mobile` and `nav_funds`. Three independent
 * implementations of one component is three chances to be wrong.
 *
 * Instead of editing 13 copies, this script RENDERS the nav from canonical data
 * at runtime. A page gets the correct nav simply by loading it, so a new page
 * can never ship a stale menu.
 *
 * SOURCE OF TRUTH: lib/nav.json. This file mirrors it and the mirror is
 * build-gated (scripts/verify-route-aliases.mjs). Edit lib/nav.json, then run
 * `node scripts/sync-nav.mjs`. Never hand-edit the list below.
 */
(function () {
    "use strict";

    var ITEMS = [
            {
                    "key": "nav_home",
                    "href": "/",
                    "en": "HOME",
                    "ar": "الرئيسية"
            },
            {
                    "key": "nav_mobile",
                    "href": "/Funds",
                    "en": "MUTUAL FUNDS",
                    "ar": "الصناديق الاستثمارية"
            },
            {
                    "key": "nav_news",
                    "href": "/News",
                    "en": "MARKET NEWS",
                    "ar": "أخبار السوق"
            },
            {
                    "key": "nav_learn",
                    "href": "/Learn",
                    "en": "LEARN",
                    "ar": "تعلّم"
            },
            {
                    "key": "nav_calculators",
                    "href": "/Calculators",
                    "en": "WEALTH CALCULATORS",
                    "ar": "حاسبات الثروة"
            }
    ];
    var CTA = {"key":"nav_cta","href":"/RiskAssessment","en":"ASSESS YOUR PROFILE","ar":"قيّم ملفك الاستثماري"};

    window.STARTA_NAV = { items: ITEMS, cta: CTA };

    function lang() {
        return document.documentElement.lang === "en" ? "en" : "ar";
    }

    /** Active link = current path, or its section root for nested routes. */
    function isActive(href) {
        var path = window.location.pathname.replace(/^\/ar(?=\/|$)/, "") || "/";
        if (href === "/") return path === "/";
        return path === href || path.indexOf(href + "/") === 0;
    }

    function render() {
        // The link row is whatever element currently holds the nav anchors, so
        // this works across the differing page shells without per-page wiring.
        var anchor = document.querySelector('a[data-key="nav_home"]');
        if (!anchor) return;
        var row = anchor.parentElement;
        if (!row) return;

        row.classList.add("starta-nav-links");
        var linkClass = anchor.className.replace(/\s*text-starta-darkTeal\s*/g, " ").trim();
        var L = lang();

        row.innerHTML = ITEMS.map(function (item) {
            var active = isActive(item.href) ? " text-starta-darkTeal" : "";
            return '<a href="' + item.href + '" class="' + linkClass + active +
                '" data-key="' + item.key + '">' + item[L] + "</a>";
        }).join("");

        ensureCta();
    }

    /**
     * Own styles, injected once. Utility classes are NOT safe here: each static
     * page ships its own frozen Tailwind build, and `md:inline-flex` does not
     * exist in most of them — the first version of this CTA inherited `hidden`
     * with no matching `md:` rule and was invisible on eleven pages.
     */
    function ensureStyles() {
        if (document.getElementById("starta-nav-style")) return;
        var css =
            ".starta-nav-cta{display:none;align-items:center;padding:.5rem 1.5rem;border-radius:999px;" +
            "font-size:.75rem;font-weight:700;letter-spacing:.1em;white-space:nowrap;cursor:pointer;" +
            "border:1px solid rgba(45,212,191,.45);background:rgba(45,212,191,.08);color:#0F766E;" +
            "transition:background-color .25s ease,border-color .25s ease}" +
            ".starta-nav-cta:hover{background:rgba(45,212,191,.16)}" +
            'html[data-theme="dark"] .starta-nav-cta{color:#2DD4BF}' +
            "@media(min-width:768px){.starta-nav-cta{display:inline-flex}}" +
            /* One canonical order for the controls cluster on every page. */
            /* Nav typography is owned here too. Each page styled its own links,
               so the same menu rendered 400 weight on /Learn and 600 on /News. */
            "nav .starta-nav-links{display:flex;align-items:center;gap:2.25rem}" +
            "nav .starta-nav-links a{font-family:'IBM Plex Sans Arabic','Sora',sans-serif;" +
            "font-size:13px;font-weight:600;letter-spacing:0;line-height:1;white-space:nowrap;" +
            "color:var(--c-text-muted);text-decoration:none;transition:color .22s ease}" +
            "nav .starta-nav-links a:hover{color:#14B8A6}" +
            "nav .starta-nav-links a.text-starta-darkTeal{color:#0F766E}" +
            'html[data-theme="dark"] nav .starta-nav-links a.text-starta-darkTeal{color:#2DD4BF}' +
            ".starta-nav-controls{display:flex;align-items:center;gap:.75rem}" +
            ".starta-nav-controls .starta-nav-cta{order:1}" +
            ".starta-nav-controls .starta-auth-links{order:2}" +
            ".starta-nav-controls #themeToggle{order:3}" +
            ".starta-nav-controls #langToggle{order:4}" +
            ".starta-nav-controls .smn-burger{order:5}" +
            /* starta-mobile-nav marks its burger `is-visible` and dropped it into
               whatever container it found first, so it showed on desktop and in a
               different place on every page. It is a mobile affordance only. */
            "@media(min-width:1024px){nav .smn-burger{display:none !important}}";
        var el = document.createElement("style");
        el.id = "starta-nav-style";
        el.textContent = css;
        document.head.appendChild(el);
    }

    /**
     * The CTA was absent from the desktop bar on eleven pages. Scope the
     * existence check to the NAV: starta-mobile-nav.js also renders a
     * `data-key="nav_cta"` inside its drawer, and matching that made the first
     * version bail out and add nothing.
     */
    function ensureCta() {
        var bar = document.querySelector("nav");
        if (!bar) return;
        var host = bar.querySelector("#themeToggle");
        host = host ? host.parentElement : null;
        if (!host) return;
        host.classList.add("starta-nav-controls");

        var existing = host.querySelector('[data-key="nav_cta"]');
        if (existing) {
            existing.classList.add("starta-nav-cta");
            existing.textContent = CTA[lang()];
            return;
        }

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "starta-nav-cta";
        btn.setAttribute("data-key", CTA.key);
        btn.textContent = CTA[lang()];
        btn.addEventListener("click", function () {
            var href = window.startaLocalizedHref ? window.startaLocalizedHref(CTA.href) : CTA.href;
            window.location.href = href;
        });
        host.insertBefore(btn, host.firstChild);
    }

    /**
     * The burger is injected by starta-mobile-nav.js into whatever container it
     * finds, so it landed beside the logo on some pages and at the far edge on
     * others — and stayed visible on desktop. Park it in the controls cluster
     * and let the media query hide it above the mobile breakpoint.
     */
    function normalizeBurger() {
        var bar = document.querySelector("nav");
        if (!bar) return;
        var controls = bar.querySelector(".starta-nav-controls");
        if (!controls) return;
        var burger = bar.querySelector(".smn-burger");
        if (burger && burger.parentElement !== controls) controls.appendChild(burger);
    }

    function start() {
        ensureStyles();
        render();
        normalizeBurger();
        // starta-mobile-nav.js injects its burger asynchronously; catch it
        // whenever it lands rather than racing the script order.
        var bar = document.querySelector("nav");
        if (bar) new MutationObserver(normalizeBurger).observe(bar, { childList: true, subtree: true });
        // Re-render on language change: labels and the active state both depend
        // on <html lang>, which every page already flips on toggle.
        new MutationObserver(render).observe(document.documentElement, {
            attributes: true, attributeFilter: ["lang"]
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
