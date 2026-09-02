/**
 * CANONICAL AUTH NAV — renderer for the static HTML pages.
 *
 * WHY THIS FILE EXISTS
 * starta-lang-boot.js used to paint "Sign In / Create Account" into every
 * static page's control cluster UNCONDITIONALLY — it never looked at the
 * session. So a visitor who had just registered was invited to create an
 * account again on / and on /Funds (the page registration redirects to), had no
 * link to /settings anywhere on the site, and no way to sign out. This file
 * replaces that painter with a session-aware one.
 *
 * It is the third renderer of the same control; the other two are React
 * (components/seo/NavAuth.tsx, mounted by PublicPageShell and SiteNav). All
 * three read ONE definition — lib/auth-nav.json — and emit the same class
 * names, which are styled once in starta-nav.css.
 *
 * SOURCE OF TRUTH: lib/auth-nav.json. The constants below are a MIRROR.
 * Edit lib/auth-nav.json, then run `node scripts/sync-auth-nav.mjs`.
 * verify-route-aliases.mjs fails the build if the mirror is stale, so a
 * forgotten sync cannot ship.
 */
(function () {
    "use strict";

    /* ── mirrored from lib/auth-nav.json ─────────────────────────────── */
    var STORAGE = {
            "token": "fh_auth_token",
            "refresh": "fh_refresh_token",
            "user": "fh_user",
            "avatar": "user_avatar_url"
    };
    var ROUTES = {
            "signIn": "/login",
            "createAccount": "/register",
            "account": "/settings"
    };
    var LABELS = {
            "en": {
                    "signIn": "Sign In",
                    "createAccount": "Create Account",
                    "signOut": "Sign Out",
                    "account": "Account"
            },
            "ar": {
                    "signIn": "تسجيل الدخول",
                    "createAccount": "إنشاء حساب",
                    "signOut": "تسجيل الخروج",
                    "account": "حسابي"
            }
    };
    /* ── end mirror ──────────────────────────────────────────────────── */

    var SESSION_EVENT = "starta:session";

    function lang() {
        return document.documentElement.lang === "en" ? "en" : "ar";
    }

    function t() {
        return LABELS[lang()];
    }

    /**
     * Expiry of a JWT in ms, or null when unreadable. The signature is NOT
     * verified — the browser has no secret and does not need one: this only
     * decides what the nav draws, and every protected resource is authorised
     * server-side. Mirrors jwtExpiry() in lib/auth-session.ts.
     */
    function expiryMs(token) {
        try {
            var part = token.split(".")[1];
            if (!part) return null;
            var b64 = part.replace(/-/g, "+").replace(/_/g, "/");
            b64 += new Array(((4 - (b64.length % 4)) % 4) + 1).join("=");
            var json = decodeURIComponent(
                atob(b64)
                    .split("")
                    .map(function (c) {
                        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                    })
                    .join("")
            );
            var exp = JSON.parse(json).exp;
            return typeof exp === "number" ? exp * 1000 : null;
        } catch (e) {
            return null;
        }
    }

    /** A token with no readable exp is treated as live (see auth-session.ts). */
    function dead(token) {
        if (!token) return true;
        var ms = expiryMs(token);
        return ms === null ? false : ms <= Date.now();
    }

    /** { user } when someone is signed in, else null. */
    function session() {
        var token, raw, refresh, user;
        try {
            token = localStorage.getItem(STORAGE.token);
            raw = localStorage.getItem(STORAGE.user);
            refresh = localStorage.getItem(STORAGE.refresh);
        } catch (e) {
            return null; // private mode / storage disabled
        }
        if (!token || !raw) return null;
        try {
            user = JSON.parse(raw);
        } catch (e) {
            return null;
        }
        if (!user || typeof user.email !== "string") return null;
        // Access token dead and no live refresh token → genuinely signed out.
        if (dead(token) && dead(refresh)) return null;
        return { user: user };
    }

    function firstName(user) {
        var full = (user.full_name || "").trim();
        if (full) return full.split(/\s+/)[0];
        return user.email.split("@")[0];
    }

    function signOut() {
        try {
            localStorage.removeItem(STORAGE.token);
            localStorage.removeItem(STORAGE.refresh);
            localStorage.removeItem(STORAGE.user);
            localStorage.removeItem(STORAGE.avatar);
            localStorage.removeItem("fh_chat_session");
        } catch (e) { /* storage unavailable */ }
        try {
            window.dispatchEvent(new CustomEvent(SESSION_EVENT));
        } catch (e) { /* old browser */ }
        paint();
    }

    /**
     * The static pages have 13 different header markups, but every one of them
     * renders #themeToggle inside its control cluster — so that button is the
     * one reliable anchor to hang the auth controls off.
     */
    function host() {
        var toggle = document.getElementById("themeToggle");
        return toggle ? toggle.parentElement : null;
    }

    function paint() {
        var mount = host();
        if (!mount) return;

        var existing = mount.querySelector("[data-starta-auth]");
        if (existing) existing.remove();

        var s = session();
        var strings = t();
        var wrap = document.createElement("div");
        wrap.className = "starta-auth-links";
        wrap.setAttribute("data-starta-auth", s ? "in" : "out");

        if (!s) {
            var login = document.createElement("a");
            login.className = "starta-auth-link";
            login.href = ROUTES.signIn;
            login.textContent = strings.signIn;

            var register = document.createElement("a");
            register.className = "starta-auth-cta";
            register.href = ROUTES.createAccount;
            register.textContent = strings.createAccount;

            wrap.appendChild(login);
            wrap.appendChild(register);
        } else {
            var name = firstName(s.user);

            var account = document.createElement("a");
            account.className = "starta-auth-account";
            account.href = ROUTES.account;
            account.title = s.user.email || strings.account;

            var avatar = document.createElement("span");
            avatar.className = "starta-auth-avatar";
            avatar.setAttribute("aria-hidden", "true");
            avatar.textContent = (name.charAt(0) || "?").toUpperCase();

            var label = document.createElement("span");
            label.className = "starta-auth-name";
            label.textContent = name || strings.account;

            account.appendChild(avatar);
            account.appendChild(label);

            var out = document.createElement("button");
            out.type = "button";
            out.className = "starta-auth-signout";
            out.textContent = strings.signOut;
            out.addEventListener("click", signOut);

            wrap.appendChild(account);
            wrap.appendChild(out);
        }

        mount.insertBefore(wrap, mount.firstChild);
        paintDrawer(s, strings);
    }

    /**
     * Mobile parity. The bar's auth cluster is hidden under 768px (168px of
     * pills pushed the burger clean off a 375px screen), so the drawer is the
     * ONLY auth affordance on a phone — it cannot be skipped.
     *
     * starta-mobile-nav.js builds the drawer asynchronously; this is called
     * again from the MutationObserver in start() whenever it appears.
     */
    function paintDrawer(s, strings) {
        var drawer = document.querySelector(".smn-drawer");
        if (!drawer) return;
        var footer = drawer.querySelector(".smn-footer");
        if (!footer) return;

        var existing = drawer.querySelector("[data-starta-auth-mobile]");
        if (existing) existing.remove();

        var row = document.createElement("div");
        row.className = "smn-footer";
        row.setAttribute("data-starta-auth-mobile", s ? "in" : "out");
        row.style.marginTop = "0.6rem";

        function btn(text, onClick, href) {
            var el = document.createElement(href ? "a" : "button");
            el.className = "smn-foot-btn";
            if (href) el.href = href;
            else el.type = "button";
            el.textContent = text;
            if (onClick) el.addEventListener("click", onClick);
            return el;
        }

        if (!s) {
            row.appendChild(btn(strings.signIn, null, ROUTES.signIn));
            row.appendChild(btn(strings.createAccount, null, ROUTES.createAccount));
        } else {
            row.appendChild(btn(firstName(s.user) || strings.account, null, ROUTES.account));
            row.appendChild(btn(strings.signOut, signOut));
        }

        footer.parentElement.insertBefore(row, footer);
    }

    function start() {
        paint();
        // Language toggles flip <html lang>; re-label from that one signal.
        new MutationObserver(paint).observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["lang"]
        });
        // Sign-in/out in THIS tab (React writes it) and in other tabs.
        window.addEventListener(SESSION_EVENT, paint);
        window.addEventListener("storage", function (e) {
            if (!e.key || e.key === STORAGE.token || e.key === STORAGE.user) paint();
        });
        // The mobile drawer is injected asynchronously — catch it whenever it
        // lands rather than racing script order.
        new MutationObserver(function () {
            if (document.querySelector(".smn-drawer") &&
                !document.querySelector("[data-starta-auth-mobile]")) {
                paint();
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
