/**
 * ============================================================================
 * THE ENGAGEMENT ENGINE — when, and whether, to ask
 * ============================================================================
 *
 * The brief was "a lot of things making the user register… but do it smart",
 * and those two halves fight each other. A site with eight registration prompts
 * and no budget is a site people leave. So the prompts are not the hard part of
 * this file — the RESTRAINT is. Everything below exists to decide when the site
 * has earned the right to ask, and then to shut up.
 *
 * ══ THE BUDGET ══════════════════════════════════════════════════════════════
 *   · ONE prompt per session. Not one per trigger — one, total.
 *   · At most three across a rolling week.
 *   · A dismissal is permanent, for every scenario, not just the one dismissed.
 *   · Signed-in visitors are never evaluated at all.
 *   · Nothing fires in the first ten seconds of a visit. Someone who has just
 *     landed from a search result has not been given anything yet, and asking
 *     then is the behaviour that makes people bounce.
 *
 * ══ THE SCENARIOS ═══════════════════════════════════════════════════════════
 * Each is a different EARNED moment, and each names something the visitor was
 * already doing:
 *   deep      read one page properly — dwell past 45s and most of the way down
 *   repeat    came back to the SAME fund or company three times
 *   breadth   looked at four different things inside a month
 *   returning a second visit on a different day, with history to restore
 *   exit      leaving a page they had genuinely engaged with
 *
 * They are ranked. When several qualify at once the strongest wins, because the
 * strongest is the one whose sentence is most obviously true about this person.
 *
 * ══ WHY NONE OF THIS TOUCHES SEO OR GEO ═════════════════════════════════════
 * It runs in the browser, after load, and writes nothing into the document that
 * a crawler fetches. No content is removed, hidden, blurred or reordered; the
 * answer that earned the visit is exactly as it was. Answer engines read the
 * same HTML they always did — llms.txt, llms-full.txt, the answer-first
 * paragraphs and the FAQ blocks are untouched by anything here. See
 * REGISTRATION_STRATEGY.md.
 */
(function () {
    "use strict";

    if (window.startaEngage) return;

    var K = {
        seen: "starta-seen",            // distinct items, shared with starta-gate.js
        visits: "starta-visits",        // per-item view counts, for "repeat"
        sessions: "starta-sessions",    // session stamps, for "returning"
        shown: "starta-prompt-log",     // when we last spoke
        off: "starta-invite-off",       // permanent dismissal, shared
        session: "starta-session-id",
    };

    var WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    var MONTH_MS = 30 * 24 * 60 * 60 * 1000;

    /** The budget. Changing these is changing the product's manners. */
    var LIMITS = {
        perSession: 1,
        perWeek: 3,
        /** Nothing at all before this much time on the page. */
        quietMs: 10000,
        /** "deep": engaged reading of a single page. */
        dwellMs: 45000,
        scrollPct: 0.6,
        /** "repeat": the same item, this many times, across visits. */
        repeatViews: 3,
        /** "breadth": distinct items in the rolling month. */
        distinctItems: 4,
    };

    /** Strongest first — the most specific true sentence wins. */
    var RANK = ["repeat", "returning", "deep", "breadth", "exit"];

    function read(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }

    function signedIn() {
        return Boolean(window.startaGate && window.startaGate.isSignedIn());
    }

    function dismissed() {
        try { return localStorage.getItem(K.off) === "1"; } catch (e) { return false; }
    }

    /* ── session identity ────────────────────────────────────────────────── */
    function sessionId() {
        try {
            var id = sessionStorage.getItem(K.session);
            if (!id) {
                id = String(Date.now());
                sessionStorage.setItem(K.session, id);
                // A session boundary is also a VISIT. Kept as day-stamps rather
                // than a counter so "came back on another day" is answerable,
                // which is the only version of "returning" worth acting on —
                // three tabs in one afternoon is not a returning visitor.
                var days = read(K.sessions, []);
                var today = new Date().toISOString().slice(0, 10);
                if (days.indexOf(today) === -1) {
                    days.push(today);
                    write(K.sessions, days.slice(-30));
                }
            }
            return id;
        } catch (e) {
            return "0";
        }
    }

    function promptsThisSession() {
        try { return Number(sessionStorage.getItem("starta-prompted") || 0); } catch (e) { return 0; }
    }

    function promptsThisWeek() {
        var log = read(K.shown, []);
        var cutoff = Date.now() - WEEK_MS;
        return log.filter(function (t) { return t > cutoff; }).length;
    }

    /* ── signals ─────────────────────────────────────────────────────────── */
    var pageStart = Date.now();
    var maxScroll = 0;
    var currentItem = null;

    function noteScroll() {
        var doc = document.documentElement;
        var height = Math.max(doc.scrollHeight - doc.clientHeight, 1);
        var pct = (window.scrollY || doc.scrollTop || 0) / height;
        if (pct > maxScroll) maxScroll = pct;
    }

    /**
     * Record that this page is about a specific thing. Drives both "breadth"
     * (how many DIFFERENT things) and "repeat" (how many times THIS thing).
     */
    function noteItem(id) {
        if (!id || signedIn()) return;
        currentItem = String(id);

        var seen = read(K.seen, {});
        var cutoff = Date.now() - MONTH_MS;
        var kept = {};
        Object.keys(seen).forEach(function (k) {
            if (typeof seen[k] === "number" && seen[k] > cutoff) kept[k] = seen[k];
        });
        kept[currentItem] = Date.now();
        write(K.seen, kept);

        // Count views ONCE per session per item: a reader who refreshes or uses
        // the back button has not developed a new interest.
        try {
            var flag = "starta-counted:" + currentItem;
            if (!sessionStorage.getItem(flag)) {
                sessionStorage.setItem(flag, "1");
                var visits = read(K.visits, {});
                visits[currentItem] = (visits[currentItem] || 0) + 1;
                write(K.visits, visits);
            }
        } catch (e) {}
    }

    function distinctCount() {
        return Object.keys(read(K.seen, {})).length;
    }

    function viewsOf(id) {
        var visits = read(K.visits, {});
        return id ? visits[String(id)] || 0 : 0;
    }

    function returningVisitor() {
        return read(K.sessions, []).length >= 2;
    }

    /* ── the decision ────────────────────────────────────────────────────── */
    /**
     * Which scenario, if any, has been earned right now. Returns null far more
     * often than not, and that is the point.
     */
    function pick(opts) {
        if (signedIn() || dismissed()) return null;
        if (promptsThisSession() >= LIMITS.perSession) return null;
        if (promptsThisWeek() >= LIMITS.perWeek) return null;

        var elapsed = Date.now() - pageStart;
        if (elapsed < LIMITS.quietMs) return null;

        var isExit = Boolean(opts && opts.exit);
        var qualifies = {
            repeat: currentItem !== null && viewsOf(currentItem) >= LIMITS.repeatViews,
            returning: returningVisitor() && distinctCount() >= 1,
            deep: elapsed >= LIMITS.dwellMs && maxScroll >= LIMITS.scrollPct,
            breadth: distinctCount() >= LIMITS.distinctItems,
            // Exit intent alone is not a signal — leaving a page you never read
            // says nothing. It only counts on top of real engagement.
            exit: isExit && (elapsed >= LIMITS.dwellMs / 2 || maxScroll >= 0.35),
        };

        for (var i = 0; i < RANK.length; i++) {
            if (qualifies[RANK[i]]) return RANK[i];
        }
        return null;
    }

    /** Spend one unit of the budget. Called by whatever actually renders. */
    function recordPrompt() {
        try { sessionStorage.setItem("starta-prompted", String(promptsThisSession() + 1)); } catch (e) {}
        var log = read(K.shown, []);
        log.push(Date.now());
        write(K.shown, log.filter(function (t) { return t > Date.now() - WEEK_MS; }));
    }

    function dismissForever() {
        try { localStorage.setItem(K.off, "1"); } catch (e) {}
    }

    /* ── exit intent ─────────────────────────────────────────────────────── */
    var exitHandlers = [];
    function onExitIntent(fn) { exitHandlers.push(fn); }

    function armExitIntent() {
        var fired = false;
        // Pointer leaving through the TOP of the viewport is the only reliable
        // desktop signal — toward the address bar, the tabs, the close button.
        // Deliberately not wired on touch, where there is no equivalent and
        // every heuristic for it is a scroll-jacking annoyance.
        document.addEventListener("mouseout", function (e) {
            if (fired || e.relatedTarget || e.clientY > 8) return;
            fired = true;
            exitHandlers.forEach(function (fn) { try { fn(); } catch (err) {} });
        });
    }

    function start() {
        sessionId();
        noteScroll();
        window.addEventListener("scroll", noteScroll, { passive: true });
        armExitIntent();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    window.startaEngage = {
        noteItem: noteItem,
        pick: pick,
        recordPrompt: recordPrompt,
        dismissForever: dismissForever,
        onExitIntent: onExitIntent,
        signedIn: signedIn,
        // Read-only views of the signals, for the renderers' copy.
        stats: function () {
            return {
                distinct: distinctCount(),
                viewsOfCurrent: viewsOf(currentItem),
                returning: returningVisitor(),
                dwellMs: Date.now() - pageStart,
                scroll: maxScroll,
                item: currentItem,
            };
        },
        limits: LIMITS,
    };
})();
