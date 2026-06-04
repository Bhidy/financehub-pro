/*
 * Starta — Ultra-premium mobile navigation (shared, self-contained).
 *
 * The public site hides its desktop nav below a breakpoint on every page
 * (Tailwind pages: `hidden lg:flex`; .nav-links pages: `@media{ display:none }`)
 * but never shipped a mobile replacement, leaving the site un-navigable on phones.
 *
 * This module injects a premium burger trigger + glass slide-in drawer that:
 *   - mirrors whatever nav links the host page already has (any header family),
 *   - reuses the page's existing #themeToggle / #langToggle and data-key i18n,
 *   - is theme-aware (data-theme) and RTL-aware (dir),
 *   - appears exactly when the page's own links are hidden (breakpoint-agnostic),
 *   - is accessible (role=dialog, Esc, focus trap, scroll-lock, aria state).
 *
 * Drop-in: <script src="/assets/starta-mobile-nav.js?v=1.0.0" defer></script>
 */
(function () {
    "use strict";

    if (window.__startaMobileNav) return;
    window.__startaMobileNav = true;

    var TEAL = "#14B8A6";
    var CTA_HREF = "/AiChat";

    // Net-new chrome strings (everything else flows through the page's data-key i18n).
    var STR = {
        en: { menu: "Menu", explore: "Navigate the platform", close: "Close menu", open: "Open menu", appearance: "Appearance", light: "Light", dark: "Dark", language: "العربية", tagline: "Egypt market intelligence" },
        ar: { menu: "القائمة", explore: "تصفّح المنصة", close: "إغلاق القائمة", open: "فتح القائمة", appearance: "المظهر", light: "فاتح", dark: "داكن", language: "English", tagline: "ذكاء السوق المصري" }
    };

    function lang() { return document.documentElement.lang === "ar" ? "ar" : "en"; }
    function isLight() { return document.documentElement.getAttribute("data-theme") === "light"; }
    function t(key) { return STR[lang()][key]; }

    /* ---------------------------------------------------------------- styles */
    function injectStyles() {
        if (document.getElementById("smn-styles")) return;
        var css = `
        .smn-root{
            --smn-page:#040506; --smn-surface:rgba(13,15,16,.86); --smn-panel:rgba(22,25,27,.7);
            --smn-text:#eef2f6; --smn-muted:#9ca6b5; --smn-border:rgba(255,255,255,.09);
            --smn-border-strong:rgba(255,255,255,.16); --smn-teal:#2dd4bf; --smn-teal-deep:#14B8A6;
            --smn-shadow:0 40px 120px -20px rgba(0,0,0,.75);
            position:fixed; inset:0; z-index:1000; pointer-events:none;
            font-family:inherit;
        }
        [data-theme="light"] .smn-root{
            --smn-page:#eef2f6; --smn-surface:rgba(255,255,255,.92); --smn-panel:rgba(255,255,255,.7);
            --smn-text:#0f172a; --smn-muted:#5c6676; --smn-border:rgba(15,23,42,.1);
            --smn-border-strong:rgba(15,23,42,.16); --smn-teal:#0d9488; --smn-teal-deep:#0f766e;
            --smn-shadow:0 40px 90px -28px rgba(15,23,42,.4);
        }
        .smn-root.is-open{ pointer-events:auto; }

        /* scrim */
        .smn-overlay{
            position:absolute; inset:0; background:rgba(2,4,6,.62);
            opacity:0; transition:opacity .42s ease; backdrop-filter:blur(0px);
            -webkit-backdrop-filter:blur(0px);
        }
        .smn-root.is-open .smn-overlay{ opacity:1; backdrop-filter:blur(7px); -webkit-backdrop-filter:blur(7px); }

        /* drawer */
        .smn-drawer{
            position:absolute; top:0; right:0; height:100%;
            width:min(88vw,392px); display:flex; flex-direction:column;
            padding:1.55rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom,0px));
            background:var(--smn-surface);
            backdrop-filter:blur(26px) saturate(1.3); -webkit-backdrop-filter:blur(26px) saturate(1.3);
            border-left:1px solid var(--smn-border-strong);
            box-shadow:var(--smn-shadow);
            transform:translateX(105%); transition:transform .5s cubic-bezier(.16,1,.3,1);
            overflow-y:auto; overscroll-behavior:contain;
        }
        .smn-root.is-open .smn-drawer{ transform:translateX(0); }
        html[dir="rtl"] .smn-drawer{ right:auto; left:0; border-left:0; border-right:1px solid var(--smn-border-strong); transform:translateX(-105%); }
        html[dir="rtl"] .smn-root.is-open .smn-drawer{ transform:translateX(0); }

        /* ambient glow */
        .smn-glow{
            position:absolute; top:-120px; right:-80px; width:320px; height:320px; pointer-events:none;
            background:radial-gradient(circle, rgba(45,212,191,.22), transparent 62%); filter:blur(8px);
        }
        html[dir="rtl"] .smn-glow{ right:auto; left:-80px; }

        /* header row */
        .smn-head{ display:flex; align-items:center; justify-content:space-between; position:relative; z-index:1; }
        .smn-brand{ display:flex; align-items:center; gap:.6rem; text-decoration:none; }
        .smn-brand-mark{
            width:2rem; height:2rem; border-radius:.55rem; display:flex; align-items:center; justify-content:center;
            background:linear-gradient(135deg,var(--smn-teal),var(--smn-teal-deep)); color:#04201c;
            font-weight:800; font-size:1.05rem; box-shadow:0 6px 18px -6px rgba(20,184,166,.7);
        }
        .smn-brand-name{ font-weight:800; letter-spacing:.22em; font-size:.95rem; color:var(--smn-text); }
        .smn-close{
            width:2.5rem; height:2.5rem; border-radius:999px; display:flex; align-items:center; justify-content:center;
            background:var(--smn-panel); border:1px solid var(--smn-border); color:var(--smn-text);
            cursor:pointer; transition:transform .25s ease, border-color .25s ease, color .25s ease;
        }
        .smn-close:hover{ transform:rotate(90deg); color:var(--smn-teal); border-color:var(--smn-teal); }
        .smn-close svg{ width:1.15rem; height:1.15rem; }

        .smn-eyebrow{
            position:relative; z-index:1; margin:1.5rem 0 .4rem; display:flex; align-items:center; gap:.55rem;
            font-size:.62rem; letter-spacing:.34em; text-transform:uppercase; color:var(--smn-muted);
        }
        .smn-eyebrow::before{ content:""; width:1.4rem; height:1px; background:var(--smn-teal); }
        .smn-explore{ position:relative; z-index:1; margin:0 0 1.05rem; font-size:1.45rem; font-weight:300; color:var(--smn-text); letter-spacing:-.01em; }

        /* links */
        .smn-nav{ position:relative; z-index:1; display:flex; flex-direction:column; }
        .smn-link{
            display:flex; align-items:center; gap:.95rem; padding:.92rem .35rem; text-decoration:none;
            border-bottom:1px solid var(--smn-border); color:var(--smn-text);
            position:relative; transition:padding .3s cubic-bezier(.16,1,.3,1), color .25s ease;
        }
        .smn-link::after{
            content:""; position:absolute; bottom:-1px; inset-inline-start:0; height:1px; width:0;
            background:linear-gradient(90deg,var(--smn-teal),transparent); transition:width .4s cubic-bezier(.16,1,.3,1);
        }
        .smn-link:hover, .smn-link:focus-visible{ padding-inline-start:.85rem; color:var(--smn-teal); outline:none; }
        .smn-link:hover::after, .smn-link:focus-visible::after{ width:70%; }
        .smn-link-idx{
            font-size:.62rem; letter-spacing:.12em; color:var(--smn-muted); min-width:1.6rem;
            font-variant-numeric:tabular-nums; transition:color .25s ease;
        }
        .smn-link:hover .smn-link-idx{ color:var(--smn-teal); }
        .smn-link-label{ flex:1; font-size:1.05rem; font-weight:500; letter-spacing:.01em; }
        .smn-link-arrow{ width:1rem; height:1rem; color:var(--smn-muted); transition:transform .3s cubic-bezier(.16,1,.3,1), color .25s ease; }
        .smn-link:hover .smn-link-arrow{ color:var(--smn-teal); transform:translateX(4px); }
        html[dir="rtl"] .smn-link-arrow{ transform:scaleX(-1); }
        html[dir="rtl"] .smn-link:hover .smn-link-arrow{ transform:scaleX(-1) translateX(4px); }

        /* CTA */
        .smn-cta{
            position:relative; z-index:1; margin-top:1.35rem; display:flex; align-items:center; justify-content:center; gap:.6rem;
            padding:1rem 1.25rem; border-radius:.85rem; text-decoration:none; font-weight:700; font-size:.95rem; letter-spacing:.02em;
            color:#04201c; background:linear-gradient(135deg,var(--smn-teal),var(--smn-teal-deep));
            box-shadow:0 18px 38px -14px rgba(20,184,166,.65); overflow:hidden;
            transition:transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s ease;
        }
        .smn-cta::before{
            content:""; position:absolute; inset:0; background:linear-gradient(120deg,transparent 20%,rgba(255,255,255,.45),transparent 80%);
            transform:translateX(-130%); transition:transform .7s ease;
        }
        .smn-cta:hover{ transform:translateY(-2px); box-shadow:0 22px 46px -14px rgba(20,184,166,.8); }
        .smn-cta:hover::before{ transform:translateX(130%); }
        .smn-cta svg{ width:1.05rem; height:1.05rem; }
        html[dir="rtl"] .smn-cta svg{ transform:scaleX(-1); }

        /* footer controls */
        .smn-footer{ position:relative; z-index:1; margin-top:1.1rem; display:grid; grid-template-columns:1fr 1fr; gap:.6rem; }
        .smn-foot-btn{
            display:flex; align-items:center; justify-content:center; gap:.55rem; padding:.8rem .6rem; border-radius:.7rem; cursor:pointer;
            background:var(--smn-panel); border:1px solid var(--smn-border); color:var(--smn-text);
            font-size:.82rem; font-weight:600; transition:transform .25s ease, border-color .25s ease, color .25s ease;
        }
        .smn-foot-btn:hover{ transform:translateY(-1px); color:var(--smn-teal); border-color:var(--smn-teal); }
        .smn-foot-btn svg{ width:1.1rem; height:1.1rem; }
        .smn-foot-lang-tag{ font-weight:800; letter-spacing:.04em; }

        .smn-tagline{ position:relative; z-index:1; margin-top:1.15rem; text-align:center; font-size:.66rem; letter-spacing:.26em; text-transform:uppercase; color:var(--smn-muted); }

        /* staggered entrance */
        .smn-stagger{ opacity:0; transform:translateX(20px); transition:opacity .55s ease, transform .55s cubic-bezier(.16,1,.3,1); }
        html[dir="rtl"] .smn-stagger{ transform:translateX(-20px); }
        .smn-root.is-open .smn-stagger{ opacity:1; transform:none; transition-delay:calc(var(--i,0) * 55ms + 140ms); }

        /* burger trigger (lives inside the page's .nav-controls) */
        .smn-burger{
            width:2.35rem; height:2.35rem; border-radius:999px; display:none; align-items:center; justify-content:center;
            background:var(--glass-bg,rgba(14,16,16,.56)); border:1px solid var(--c-border,rgba(255,255,255,.1));
            color:var(--c-text-main,#eef2f6); cursor:pointer; padding:0; flex-shrink:0;
            -webkit-backdrop-filter:blur(10px); backdrop-filter:blur(10px);
            transition:transform .25s ease, border-color .25s ease, color .25s ease;
        }
        .smn-burger:hover{ transform:translateY(-1px); color:#14B8A6; border-color:rgba(20,184,166,.55); }
        .smn-burger.is-visible{ display:inline-flex; }
        .smn-burger-box{ position:relative; width:1.05rem; height:.72rem; }
        .smn-burger-box span{
            position:absolute; left:0; height:1.7px; width:100%; border-radius:2px; background:currentColor;
            transition:transform .35s cubic-bezier(.16,1,.3,1), opacity .25s ease, width .35s ease;
        }
        .smn-burger-box span:nth-child(1){ top:0; }
        .smn-burger-box span:nth-child(2){ top:50%; transform:translateY(-50%); width:72%; }
        .smn-burger-box span:nth-child(3){ bottom:0; }
        html[dir="rtl"] .smn-burger-box span:nth-child(2){ right:0; left:auto; }
        .smn-burger[aria-expanded="true"] .smn-burger-box span:nth-child(1){ top:50%; transform:translateY(-50%) rotate(45deg); }
        .smn-burger[aria-expanded="true"] .smn-burger-box span:nth-child(2){ opacity:0; width:0; }
        .smn-burger[aria-expanded="true"] .smn-burger-box span:nth-child(3){ bottom:auto; top:50%; transform:translateY(-50%) rotate(-45deg); }

        /* branded keyboard-focus rings (replace UA default) */
        .smn-close:focus-visible, .smn-link:focus-visible, .smn-cta:focus-visible, .smn-foot-btn:focus-visible{
            outline:2px solid var(--smn-teal); outline-offset:3px;
        }
        .smn-burger:focus-visible{ outline:2px solid #14B8A6; outline-offset:3px; }

        html.smn-locked, body.smn-locked{ overflow:hidden !important; }

        @media (prefers-reduced-motion: reduce){
            .smn-overlay,.smn-drawer,.smn-stagger,.smn-cta::before,.smn-burger-box span{ transition-duration:.01ms !important; }
            .smn-stagger{ transition-delay:0ms !important; }
        }
        `;
        var style = document.createElement("style");
        style.id = "smn-styles";
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* --------------------------------------------------------------- helpers */
    var SVG = "http://www.w3.org/2000/svg";
    function svgArrow(cls) {
        return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
    }
    function svgClose() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    }
    function svgSun() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>';
    }
    function svgMoon() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>';
    }
    function svgGlobe() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>';
    }

    // Collect the host page's nav links across either header family, in order.
    function collectLinks() {
        var nodes = document.querySelectorAll(
            'nav a[data-key^="nav_"], .site-nav a[data-key^="nav_"], .nav-links a'
        );
        var seen = {}, out = [];
        nodes.forEach(function (a) {
            var href = a.getAttribute("href");
            if (!href) return;
            var key = href + "::" + (a.getAttribute("data-key") || "");
            if (seen[key]) return;
            seen[key] = 1;
            // Skip the CTA itself; it is rendered separately.
            if (a.getAttribute("data-key") === "nav_cta") return;
            out.push(a);
        });
        return out;
    }

    /* ----------------------------------------------------------------- build */
    var root, overlay, drawer, burger, sourceLinks, lastFocus;

    function build() {
        sourceLinks = collectLinks();
        if (!sourceLinks.length) return false;

        root = document.createElement("div");
        root.className = "smn-root";
        root.setAttribute("data-smn", "");

        overlay = document.createElement("div");
        overlay.className = "smn-overlay";

        drawer = document.createElement("aside");
        drawer.className = "smn-drawer";
        drawer.id = "smn-drawer";
        drawer.setAttribute("role", "dialog");
        drawer.setAttribute("aria-modal", "true");
        drawer.setAttribute("aria-hidden", "true");

        var i = 0;
        var linksHtml = sourceLinks.map(function (a, idx) {
            var n = String(idx + 1);
            if (n.length < 2) n = "0" + n;
            var dk = a.getAttribute("data-key");
            return (
                '<a class="smn-link smn-stagger" style="--i:' + i++ + '" href="' + a.getAttribute("href") + '">' +
                '<span class="smn-link-idx">' + n + "</span>" +
                '<span class="smn-link-label"' + (dk ? ' data-key="' + dk + '"' : "") + ">" + a.textContent.trim() + "</span>" +
                svgArrow("smn-link-arrow") +
                "</a>"
            );
        }).join("");

        var ctaIdx = i++, footIdx = i++, tagIdx = i++;

        drawer.innerHTML =
            '<div class="smn-glow"></div>' +
            '<div class="smn-head">' +
                '<a class="smn-brand" href="/" aria-label="Starta home"><span class="smn-brand-mark">S</span><span class="smn-brand-name">STARTA</span></a>' +
                '<button class="smn-close" type="button" aria-label="' + t("close") + '">' + svgClose() + "</button>" +
            "</div>" +
            '<div class="smn-eyebrow smn-stagger" style="--i:0"><span class="smn-eyebrow-text">' + t("menu") + "</span></div>" +
            '<h2 class="smn-explore smn-stagger" style="--i:0"><span class="smn-explore-text">' + t("explore") + "</span></h2>" +
            '<nav class="smn-nav" aria-label="Mobile">' + linksHtml + "</nav>" +
            '<a class="smn-cta smn-stagger" style="--i:' + ctaIdx + '" href="' + CTA_HREF + '"><span data-key="nav_cta">' + ctaLabel() + "</span>" + svgArrow("") + "</a>" +
            '<div class="smn-footer smn-stagger" style="--i:' + footIdx + '">' +
                '<button class="smn-foot-btn smn-theme" type="button"><span class="smn-theme-icon"></span><span class="smn-theme-label"></span></button>' +
                '<button class="smn-foot-btn smn-lang" type="button">' + svgGlobe() + '<span class="smn-foot-lang-tag"></span></button>' +
            "</div>" +
            '<div class="smn-tagline smn-stagger" style="--i:' + tagIdx + '"><span class="smn-tagline-text">' + t("tagline") + "</span></div>";

        root.appendChild(overlay);
        root.appendChild(drawer);
        document.body.appendChild(root);

        // Burger trigger into the page's existing control cluster.
        var controls = document.querySelector(".nav-controls") || document.querySelector("nav .flex.items-center.gap-3");
        burger = document.createElement("button");
        burger.type = "button";
        burger.className = "smn-burger";
        burger.setAttribute("aria-label", t("open"));
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-controls", "smn-drawer");
        burger.innerHTML = '<span class="smn-burger-box"><span></span><span></span><span></span></span>';
        if (controls) controls.appendChild(burger);
        else document.querySelector("nav, .site-nav").appendChild(burger);

        wire();
        syncChrome();
        syncBurgerVisibility();
        return true;
    }

    function ctaLabel() {
        var existing = document.querySelector('[data-key="nav_cta"]');
        return existing ? existing.textContent.trim() : (lang() === "ar" ? "جرّب الآن" : "Try Now");
    }

    /* -------------------------------------------------------------- behavior */
    function wire() {
        burger.addEventListener("click", function () { isOpen() ? close() : open(); });
        overlay.addEventListener("click", close);
        drawer.querySelector(".smn-close").addEventListener("click", close);

        // Close after navigating.
        drawer.querySelectorAll(".smn-link, .smn-cta, .smn-brand").forEach(function (a) {
            a.addEventListener("click", function () { close(); });
        });

        // Footer controls proxy the page's own toggles so persistence + i18n stay intact.
        drawer.querySelector(".smn-theme").addEventListener("click", function () {
            var tgl = document.getElementById("themeToggle");
            if (tgl) tgl.click();
            setTimeout(syncChrome, 30);
        });
        drawer.querySelector(".smn-lang").addEventListener("click", function () {
            var tgl = document.getElementById("langToggle");
            if (tgl) tgl.click();
            // Page re-renders with a brief fade; re-sync our chrome after it settles.
            setTimeout(function () { syncLabels(); syncChrome(); }, 260);
        });

        document.addEventListener("keydown", function (e) {
            if (!isOpen()) return;
            if (e.key === "Escape") { close(); return; }
            if (e.key === "Tab") trapFocus(e);
        });

        var rt;
        window.addEventListener("resize", function () {
            clearTimeout(rt);
            rt = setTimeout(syncBurgerVisibility, 120);
        });

        // Keep our cloned labels in sync if the page toggles language elsewhere.
        var lt = document.getElementById("langToggle");
        if (lt) lt.addEventListener("click", function () { setTimeout(function () { syncLabels(); syncChrome(); }, 260); });
        var tt = document.getElementById("themeToggle");
        if (tt) tt.addEventListener("click", function () { setTimeout(syncChrome, 30); });
    }

    function isOpen() { return root.classList.contains("is-open"); }

    function open() {
        syncLabels();
        syncChrome();
        lastFocus = document.activeElement;
        root.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
        burger.setAttribute("aria-expanded", "true");
        burger.setAttribute("aria-label", t("close"));
        document.documentElement.classList.add("smn-locked");
        document.body.classList.add("smn-locked");
        var first = drawer.querySelector(".smn-close");
        if (first) setTimeout(function () { first.focus(); }, 80);
    }

    function close() {
        if (!isOpen()) return;
        root.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", t("open"));
        document.documentElement.classList.remove("smn-locked");
        document.body.classList.remove("smn-locked");
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function trapFocus(e) {
        var f = drawer.querySelectorAll('a[href], button:not([disabled])');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    // Pull the freshest (already-translated) label text from the host links.
    function syncLabels() {
        drawer.querySelectorAll(".smn-link").forEach(function (link, idx) {
            var src = sourceLinks[idx];
            if (!src) return;
            var label = link.querySelector(".smn-link-label");
            if (label) label.textContent = src.textContent.trim();
        });
        var cta = drawer.querySelector(".smn-cta span");
        if (cta) cta.textContent = ctaLabel();
        setText(".smn-eyebrow-text", t("menu"));
        setText(".smn-explore-text", t("explore"));
        setText(".smn-tagline-text", t("tagline"));
        drawer.querySelector(".smn-close").setAttribute("aria-label", t("close"));
    }

    function setText(sel, val) { var el = drawer.querySelector(sel); if (el) el.textContent = val; }

    // Reflect current theme + language on the footer quick-controls.
    function syncChrome() {
        var light = isLight();
        var iconWrap = drawer.querySelector(".smn-theme-icon");
        if (iconWrap) iconWrap.innerHTML = light ? svgMoon() : svgSun();
        setText(".smn-theme-label", light ? t("dark") : t("light"));
        var tag = drawer.querySelector(".smn-foot-lang-tag");
        if (tag) tag.textContent = t("language");
        if (burger) burger.setAttribute("aria-label", isOpen() ? t("close") : t("open"));
    }

    // Show the burger only when the host page's own nav links are hidden.
    function syncBurgerVisibility() {
        if (!burger || !sourceLinks.length) return;
        var probe = sourceLinks[0];
        var hidden = !probe.offsetParent && getComputedStyle(probe).position !== "fixed";
        // offsetParent is null when an ancestor is display:none — our reliable "links hidden" signal.
        burger.classList.toggle("is-visible", hidden);
        if (!hidden && isOpen()) close();
    }

    /* -------------------------------------------------------------- bootstrap */
    function init() {
        injectStyles();
        if (!build()) return;
        // Re-check once fonts/late layout settle.
        setTimeout(syncBurgerVisibility, 400);
        window.addEventListener("load", syncBurgerVisibility);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
