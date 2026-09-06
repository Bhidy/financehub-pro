/**
 * ============================================================================
 * REGISTRATION GATE — the static-page renderer
 * ============================================================================
 *
 * The React twin is components/gate/RegisterGate.tsx. This file exists because
 * three of the four surfaces the strategy targets — /Funds, /News and
 * /Market-Pulse — are Route Handlers that emit a string of HTML built from a
 * designed shell (lib/static-hub.ts). There is no React tree to mount into.
 *
 * Both renderers share public/assets/starta-gate.css, so a gate cannot look
 * like two different products, and both resolve the session through the SAME
 * contract the auth nav uses (lib/auth-nav.json), so they cannot disagree about
 * who is signed in.
 *
 * ══ WHAT THIS MAY GATE ══════════════════════════════════════════════════════
 * Read REGISTRATION_STRATEGY.md. Only PERSONAL or DERIVED value: a watchlist, a
 * comparison set, an alert, an export. Never an answer a search query asked
 * for. Organic search is this site's only channel and the domain is young.
 *
 * Note the crucial difference from the React gate: the features this file
 * governs — a watchlist, a comparison tray — produce NO indexable text at all.
 * They are built in the browser from live data after load. So there is nothing
 * for a crawler to be shown and denied, and therefore nothing to declare in
 * structured data. If you ever use this to veil server-rendered prose, that
 * stops being true and the page must emit the paywall markup; see
 * lib/paywall-jsonld.ts.
 *
 * ══ THE ALLOWANCES ══════════════════════════════════════════════════════════
 * A free allowance is a real, usable amount, not a teaser. The watchlist ships
 * seeded with four symbols and stays useful at five; the gate appears only when
 * someone is genuinely building a list, which is the moment an account starts
 * paying for itself. Set a limit low enough to be a nuisance and you buy a
 * sign-up from someone who never returns.
 */
(function () {
    "use strict";

    if (window.startaGate) return;

    /* ── mirrored from lib/auth-nav.json — build-gated against drift ──────
       These are the CANONICAL key names, not the generic ones they look like.
       The first version of this file guessed "access_token"/"user" and would
       have read every visitor — signed in or not — as a guest, so signed-in
       users would have met the watchlist gate. The build gate caught it. */
    var STORAGE = { token: "fh_auth_token", refresh: "fh_refresh_token", user: "fh_user" };

    /** Free allowances. Mirrored in lib/gate-i18n.ts commentary; keep in step. */
    var LIMITS = {
        /** Symbols a signed-out visitor may keep. Ships seeded with four. */
        watchlist: 5,
        /** Funds a signed-out visitor may line up side by side. */
        compareFunds: 2,
    };

    /* ── copy, mirroring lib/gate-i18n.ts ───────────────────────────────── */
    var COPY = {
        en: {
            watchlist: {
                title: "Keep more than five on your list",
                body: "A watchlist kept in this browser disappears the moment you clear it, and it never follows you to your phone. A free account keeps it, on every device you sign in from.",
            },
            compareFunds: {
                title: "Compare more than two funds",
                body: "Two funds is a glance; a shortlist is research. A free account holds your comparison so you can come back to it instead of rebuilding it.",
            },
            export: {
                title: "Download the full statements",
                body: "Every figure in this file is published free on the company's own pages. The download bundles the whole history into one workbook, and that needs an account so we can tell you when the data is restated.",
            },
            cta: "Create a free account",
            signin: "Sign in",
            close: "Close",
        },
        ar: {
            watchlist: {
                title: "تابع أكثر من خمسة",
                body: "قائمة المتابعة المحفوظة في هذا المتصفح تختفي بمجرد مسح بياناته، ولا تنتقل معك إلى هاتفك. الحساب المجاني يحتفظ بها على كل جهاز تسجّل الدخول منه.",
            },
            compareFunds: {
                title: "قارن أكثر من صندوقين",
                body: "صندوقان نظرة سريعة، أما القائمة المختصرة فهي بحث. الحساب المجاني يحفظ مقارنتك لتعود إليها بدل أن تبنيها من جديد.",
            },
            export: {
                title: "نزّل القوائم المالية كاملة",
                body: "كل رقم في هذا الملف منشور مجانًا على صفحات الشركة نفسها، لكن التنزيل يجمع التاريخ كاملًا في ملف واحد، وهذا يحتاج حسابًا حتى نخبرك عند تعديل أي بيان.",
            },
            cta: "أنشئ حسابًا مجانيًا",
            signin: "تسجيل الدخول",
            close: "إغلاق",
        },
    };

    function lang() {
        return document.documentElement.lang === "en" ? "en" : "ar";
    }

    function expiryMs(token) {
        try {
            var part = token.split(".")[1];
            if (!part) return null;
            var json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
            var exp = JSON.parse(json).exp;
            return typeof exp === "number" ? exp * 1000 : null;
        } catch (e) {
            return null;
        }
    }

    /** A token with no readable exp is treated as live — same rule as auth-session.ts. */
    function dead(token) {
        if (!token) return true;
        var ms = expiryMs(token);
        return ms === null ? false : ms <= Date.now();
    }

    /**
     * Signed in? Resolved exactly as public/assets/starta-auth-nav.js does, so
     * the gate and the nav can never disagree.
     *
     * This is PRESENTATION state, not authorisation — same caveat as
     * lib/auth-session.ts. It decides whether to show a prompt. Never put
     * anything that actually needs protecting behind it.
     */
    function isSignedIn() {
        var token, raw, refresh, user;
        try {
            token = localStorage.getItem(STORAGE.token);
            raw = localStorage.getItem(STORAGE.user);
            refresh = localStorage.getItem(STORAGE.refresh);
        } catch (e) {
            return false;
        }
        if (!token || !raw) return false;
        try {
            user = JSON.parse(raw);
        } catch (e) {
            return false;
        }
        if (!user || typeof user.email !== "string") return false;
        if (dead(token) && dead(refresh)) return false;
        return true;
    }

    function lockIcon() {
        return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
            '<rect x="4" y="10" width="16" height="11" rx="2.5"/>' +
            '<path stroke-linecap="round" d="M8 10V7a4 4 0 018 0v3"/></svg>';
    }

    /** Come back to this page after signing up, not to a generic landing page. */
    function href(base) {
        var here = window.location.pathname + window.location.search;
        return base + "?redirect=" + encodeURIComponent(here);
    }

    var openDialog = null;

    /**
     * Show the prompt. A dialog rather than an in-place veil: the feature that
     * triggered it (an "add" button) has no content to blur — the visitor
     * reached a limit, they were not shown something and denied it.
     */
    function show(reason) {
        if (openDialog) close();
        var L = COPY[lang()];
        var c = L[reason];
        if (!c) return;

        var root = document.createElement("div");
        root.className = "starta-gate-dialog-root";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-label", c.title);
        root.innerHTML =
            '<div class="starta-gate-dialog-scrim"></div>' +
            '<div class="starta-gate-panel starta-gate-dialog">' +
                '<span class="starta-gate-lock">' + lockIcon() + "</span>" +
                '<h3 class="starta-gate-dialog-title"></h3>' +
                '<p class="starta-gate-dialog-body"></p>' +
                '<div class="starta-gate-dialog-actions">' +
                    '<a class="starta-gate-cta"></a>' +
                    '<a class="starta-gate-signin"></a>' +
                "</div>" +
            "</div>";

        // textContent, never innerHTML, for anything derived from copy.
        root.querySelector(".starta-gate-dialog-title").textContent = c.title;
        root.querySelector(".starta-gate-dialog-body").textContent = c.body;
        var cta = root.querySelector(".starta-gate-cta");
        cta.textContent = L.cta;
        cta.href = href("/register");
        var signin = root.querySelector(".starta-gate-signin");
        signin.textContent = L.signin;
        signin.href = href("/login");

        root.querySelector(".starta-gate-dialog-scrim").addEventListener("click", close);
        document.addEventListener("keydown", onKey, true);
        document.body.appendChild(root);
        openDialog = root;
        cta.focus();
    }

    function onKey(e) {
        if (e.key === "Escape") close();
    }

    function close() {
        if (!openDialog) return;
        document.removeEventListener("keydown", onKey, true);
        openDialog.remove();
        openDialog = null;
    }

    /**
     * A plain message in the same dialog, with no call to action.
     *
     * For a limit that has nothing to do with registration — a signed-in
     * visitor reaching the maximum comparison width, say. It exists so that
     * case does not fall back to `window.alert`, which is what the funds hub
     * used: an OS-chrome box, in the wrong typeface, in the wrong language on
     * an Arabic page, that cannot be styled or dismissed by clicking away.
     */
    function notice(title, body) {
        if (openDialog) close();
        var L = COPY[lang()];
        var root = document.createElement("div");
        root.className = "starta-gate-dialog-root";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-label", title);
        root.innerHTML =
            '<div class="starta-gate-dialog-scrim"></div>' +
            '<div class="starta-gate-panel starta-gate-dialog">' +
                '<h3 class="starta-gate-dialog-title"></h3>' +
                '<p class="starta-gate-dialog-body"></p>' +
                '<div class="starta-gate-dialog-actions">' +
                    '<button type="button" class="starta-gate-cta"></button>' +
                "</div>" +
            "</div>";
        root.querySelector(".starta-gate-dialog-title").textContent = title;
        root.querySelector(".starta-gate-dialog-body").textContent = body || "";
        var btn = root.querySelector(".starta-gate-cta");
        btn.textContent = L.close;
        btn.addEventListener("click", close);
        root.querySelector(".starta-gate-dialog-scrim").addEventListener("click", close);
        document.addEventListener("keydown", onKey, true);
        document.body.appendChild(root);
        openDialog = root;
        btn.focus();
    }

    /**
     * The one call sites use: may this visitor take this action?
     *
     * Returns true to proceed. Returns false AND shows the prompt when a
     * signed-out visitor has reached the free allowance. Signed-in visitors
     * always proceed.
     */
    function allow(reason, currentCount) {
        if (isSignedIn()) return true;
        var limit = LIMITS[reason];
        if (typeof limit !== "number" || currentCount < limit) return true;
        show(reason);
        return false;
    }

    /* ══ THE INVITATION — Tier 3 ═════════════════════════════════════════
       Not a gate. Nothing is hidden, nothing is blocked, nothing is counted
       down. After a visitor has read several DISTINCT things, one dismissible
       line appears in the flow of the page offering to keep them; dismiss it
       once and it never returns.

       Why this and not a meter: metering is what costs rankings. A meter set
       where the average visitor would ever reach it — under two items a session
       — is a meter that blocks the search traffic this site runs on. An
       invitation converts on the same signal (demonstrated interest) and
       removes nothing.

       The count is of DISTINCT items over a rolling 30 days, not page views, so
       re-reading one article five times is one item. Refreshing a page cannot
       manufacture a prompt. */
    var VISITS_KEY = "starta-seen";
    var DISMISS_KEY = "starta-invite-off";
    var WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
    /** Distinct items before the line appears. */
    var INVITE_AFTER = 4;

    function readVisits() {
        try {
            var raw = JSON.parse(localStorage.getItem(VISITS_KEY) || "{}");
            var cutoff = Date.now() - WINDOW_MS;
            var kept = {};
            Object.keys(raw).forEach(function (k) {
                if (typeof raw[k] === "number" && raw[k] > cutoff) kept[k] = raw[k];
            });
            return kept;
        } catch (e) {
            return {};
        }
    }

    /** Record that this visitor looked at a distinct thing. Safe to call twice. */
    function noteVisit(id) {
        if (!id || isSignedIn()) return;
        var seen = readVisits();
        seen[String(id)] = Date.now();
        try { localStorage.setItem(VISITS_KEY, JSON.stringify(seen)); } catch (e) {}
    }

    function inviteDismissed() {
        try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch (e) { return false; }
    }

    function dismissInvite() {
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) {}
        var el = document.querySelector(".starta-invite");
        if (el) el.remove();
    }

    /** Should the line show? Guests only, past the threshold, not dismissed. */
    function shouldInvite() {
        if (isSignedIn() || inviteDismissed()) return false;
        return Object.keys(readVisits()).length >= INVITE_AFTER;
    }

    var INVITE_COPY = {
        en: {
            title: "Keep what you are reading",
            body: "You have looked at a few of these. A free account keeps your watchlist and your comparisons between visits.",
            cta: "Create a free account",
            dismiss: "Not now",
        },
        ar: {
            title: "احتفظ بما تقرأه",
            body: "اطّلعت على عدد منها. الحساب المجاني يحفظ قائمة متابعتك ومقارناتك بين الزيارات.",
            cta: "أنشئ حسابًا مجانيًا",
            dismiss: "ليس الآن",
        },
    };

    /**
     * Render the line into `anchor` (appended). Static pages call this; React
     * surfaces render their own markup and only borrow shouldInvite(), so the
     * RULE lives in one place while each renderer owns its own DOM.
     */
    function renderInvite(anchor) {
        if (!anchor || !shouldInvite()) return false;
        if (document.querySelector(".starta-invite")) return false;
        var L = INVITE_COPY[lang()];
        var box = document.createElement("div");
        box.className = "starta-invite";
        box.innerHTML =
            '<span class="starta-invite-text">' +
                '<span class="starta-invite-title"></span>' +
                '<span class="starta-invite-body"></span>' +
            "</span>" +
            '<a class="starta-gate-cta"></a>' +
            '<button type="button" class="starta-invite-dismiss"></button>';
        box.querySelector(".starta-invite-title").textContent = L.title;
        box.querySelector(".starta-invite-body").textContent = L.body;
        var cta = box.querySelector(".starta-gate-cta");
        cta.textContent = L.cta;
        cta.href = href("/register");
        var no = box.querySelector(".starta-invite-dismiss");
        no.textContent = L.dismiss;
        no.addEventListener("click", dismissInvite);
        anchor.appendChild(box);
        return true;
    }

    window.startaGate = {
        isSignedIn: isSignedIn,
        allow: allow,
        show: show,
        notice: notice,
        close: close,
        noteVisit: noteVisit,
        shouldInvite: shouldInvite,
        dismissInvite: dismissInvite,
        renderInvite: renderInvite,
        inviteAfter: INVITE_AFTER,
        limits: LIMITS,
    };
})();
