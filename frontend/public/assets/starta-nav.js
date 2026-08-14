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

        var linkClass = anchor.className.replace(/\s*text-starta-darkTeal\s*/g, " ").trim();
        var L = lang();

        row.innerHTML = ITEMS.map(function (item) {
            var active = isActive(item.href) ? " text-starta-darkTeal" : "";
            return '<a href="' + item.href + '" class="' + linkClass + active +
                '" data-key="' + item.key + '">' + item[L] + "</a>";
        }).join("");

        ensureCta();
    }

    /** The CTA was missing on eleven pages; add it where the page allows. */
    function ensureCta() {
        if (document.querySelector('[data-key="nav_cta"]')) return;
        var controls = document.querySelector(".nav-controls");
        var host = controls ? controls.parentElement : null;
        if (!host) {
            var toggle = document.getElementById("themeToggle");
            host = toggle ? toggle.parentElement : null;
            controls = toggle;
        }
        if (!host || !controls) return;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "hidden md:inline-flex px-6 py-2 rounded-full text-xs font-bold tracking-widest btn-secondary";
        btn.setAttribute("data-key", CTA.key);
        btn.textContent = CTA[lang()];
        btn.addEventListener("click", function () {
            var href = window.startaLocalizedHref ? window.startaLocalizedHref(CTA.href) : CTA.href;
            window.location.href = href;
        });
        host.insertBefore(btn, controls);
    }

    function start() {
        render();
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
