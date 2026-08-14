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
            },
            {
                    "key": "nav_risk",
                    "href": "/RiskAssessment",
                    "en": "ASSESS YOUR INVESTMENT",
                    "ar": "قيم استثمارك"
            }
    ];
    var CTA = null;

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
    /**
     * Load the canonical stylesheet. The look lives in starta-nav.css so the
     * React renderers can load the exact same file — while it was inlined here,
     * only static pages got it and /Calculators rendered a different nav.
     */
    function ensureStyles() {
        if (document.getElementById("starta-nav-css")) return;
        var link = document.createElement("link");
        link.id = "starta-nav-css";
        link.rel = "stylesheet";
        link.href = "/assets/starta-nav.css";
        document.head.appendChild(link);
    }

    /**
     * The profile CTA is a normal nav item now (nav_risk), so the bar carries no
     * button. Pages still ship a `data-key="nav_cta"` in their markup, so remove
     * it rather than leaving a stale duplicate of a link that already exists.
     */
    function ensureCta() {
        if (!CTA) {
            var stale = document.querySelectorAll('nav [data-key="nav_cta"]');
            for (var i = 0; i < stale.length; i++) stale[i].remove();
            var bar0 = document.querySelector("nav");
            var host0 = bar0 && bar0.querySelector("#themeToggle");
            if (host0 && host0.parentElement) host0.parentElement.classList.add("starta-nav-controls");
            return;
        }
        var bar = document.querySelector("nav");
        if (!bar) return;
        var host = bar.querySelector("#themeToggle");
        host = host ? host.parentElement : null;
        if (!host) return;
        host.classList.add("starta-nav-controls");

        // Search the whole bar, not just the control cluster: on home.html the
        // existing CTA is a SIBLING of .nav-controls, so a host-scoped lookup
        // missed it and appended a duplicate.
        var existing = bar.querySelector('[data-key="nav_cta"]');
        if (existing) {
            existing.className = "starta-nav-cta";
            existing.textContent = CTA[lang()];
            if (existing.parentElement !== host) host.insertBefore(existing, host.firstChild);
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
