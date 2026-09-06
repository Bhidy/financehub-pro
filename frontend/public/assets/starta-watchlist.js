/**
 * ============================================================================
 * THE WATCHLIST — local for guests, the ACCOUNT for signed-in visitors
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The registration gate on the watchlist tells visitors, in both languages,
 * that "a watchlist kept in this browser disappears the moment you clear it,
 * and it never follows you to your phone — a free account keeps it, on every
 * device you sign in from."
 *
 * That sentence was not true when it shipped. The list was written to
 * localStorage and nowhere else. The backend has had `/user/watchlists` and
 * `/user/watchlists/{id}/items` the whole time, and frontend/lib/api.ts has had
 * typed wrappers for them, with ZERO callers — the plumbing was laid and never
 * connected. So a visitor could reach a gate, create an account for the reason
 * the gate gave, and get exactly what they had before.
 *
 * A gate that asks for something in exchange for a promise the product does not
 * keep is worse than no gate: it converts once and loses the person. This file
 * connects the pipe.
 *
 * ══ THE CONTRACT ═══════════════════════════════════════════════════════════
 *   GUEST      localStorage is the whole story, capped by the free allowance.
 *   SIGNED IN  the ACCOUNT is the source of truth; localStorage is a cache so
 *              the list still paints instantly and still works offline.
 *
 * ══ THE MERGE, AND WHY IT MATTERS MOST ═════════════════════════════════════
 * The first sync after signing in is a UNION, not a replace. Someone who builds
 * a list as a guest, hits the allowance, registers because of it, and then
 * finds their list emptied has been punished for doing the thing we asked. The
 * union is the payoff moment for registering, so it is the one behaviour here
 * that must never be "simplified" into an overwrite.
 *
 * Removals are honoured too, but only AFTER the first merge, so a fresh sign-in
 * on a second device does not delete the list made on the first.
 *
 * ══ FAILURE IS SILENT AND SAFE ═════════════════════════════════════════════
 * Every network call is best-effort. If the backend is unreachable the visitor
 * keeps the local list and loses nothing; the watchlist is a convenience, not a
 * record, and it must never be able to break the page it lives on.
 */
(function () {
    "use strict";

    if (window.startaWatchlist) return;

    var LOCAL_KEY = "starta-watchlist";
    var MERGED_KEY = "starta-watchlist-merged";
    /** Requests go through the same-origin proxy, which forwards the bearer. */
    var API = "/api/proxy/user";
    /** The account-side list this device syncs with. */
    var LIST_NAME = "Starta";

    function token() {
        try {
            return localStorage.getItem("fh_auth_token");
        } catch (e) {
            return null;
        }
    }

    function signedIn() {
        return Boolean(window.startaGate && window.startaGate.isSignedIn() && token());
    }

    function readLocal() {
        try {
            var raw = localStorage.getItem(LOCAL_KEY);
            var list = raw ? JSON.parse(raw) : null;
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function writeLocal(list) {
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
        } catch (e) {}
    }

    function api(path, options) {
        var t = token();
        if (!t) return Promise.reject(new Error("no session"));
        var opts = options || {};
        opts.headers = Object.assign({ Authorization: "Bearer " + t }, opts.headers || {});
        if (opts.body) opts.headers["Content-Type"] = "application/json";
        return fetch(API + path, opts).then(function (r) {
            if (!r.ok) throw new Error("http " + r.status);
            return r.status === 204 ? null : r.json();
        });
    }

    /** The account's list for this device, created on first use. */
    function ensureList() {
        return api("/watchlists").then(function (lists) {
            var rows = Array.isArray(lists) ? lists : [];
            var mine = rows.find(function (w) { return w && w.name === LIST_NAME; }) || rows[0];
            if (mine) return mine;
            return api("/watchlists", {
                method: "POST",
                body: JSON.stringify({ name: LIST_NAME }),
            });
        });
    }

    function itemsOf(list) {
        if (!list || !Array.isArray(list.items)) return [];
        return list.items
            .map(function (i) { return i && i.symbol; })
            .filter(Boolean);
    }

    function alreadyMerged() {
        try { return localStorage.getItem(MERGED_KEY) === "1"; } catch (e) { return false; }
    }

    function markMerged() {
        try { localStorage.setItem(MERGED_KEY, "1"); } catch (e) {}
    }

    /**
     * Bring the account and this device into agreement, and return the list the
     * page should render. Safe to call on every load.
     */
    function sync() {
        if (!signedIn()) return Promise.resolve(readLocal());

        return ensureList()
            .then(function (list) {
                if (!list || !list.id) throw new Error("no list");
                // GET /watchlists returns items; POST (on first creation) does not.
                return ("items" in list ? Promise.resolve(list) : api("/watchlists")
                    .then(function (all) {
                        return (Array.isArray(all) ? all : []).find(function (w) { return w.id === list.id; }) || list;
                    }))
                    .then(function (full) {
                        var remote = itemsOf(full);
                        var local = readLocal();

                        if (!alreadyMerged()) {
                            // FIRST SYNC ON THIS DEVICE — union. See the header:
                            // this is the payoff for registering and must never
                            // become an overwrite.
                            var union = remote.slice();
                            local.forEach(function (s) { if (union.indexOf(s) === -1) union.push(s); });
                            var toAdd = union.filter(function (s) { return remote.indexOf(s) === -1; });
                            markMerged();
                            return Promise.all(toAdd.map(function (symbol) {
                                return api("/watchlists/" + full.id + "/items", {
                                    method: "POST",
                                    body: JSON.stringify({ symbol: symbol }),
                                }).catch(function () { return null; });
                            })).then(function () {
                                writeLocal(union);
                                return union;
                            });
                        }

                        // Steady state: the account is the source of truth.
                        writeLocal(remote);
                        return remote;
                    });
            })
            .catch(function () {
                // Offline, signed out mid-flight, or the backend is down. Keep
                // what the visitor has; never clear a list because a fetch failed.
                return readLocal();
            });
    }

    /** Mirror one addition to the account. Local write has already happened. */
    function add(symbol) {
        if (!signedIn() || !symbol) return Promise.resolve();
        return ensureList()
            .then(function (list) {
                return api("/watchlists/" + list.id + "/items", {
                    method: "POST",
                    body: JSON.stringify({ symbol: symbol }),
                });
            })
            .catch(function () {});
    }

    /** Mirror one removal to the account. */
    function remove(symbol) {
        if (!signedIn() || !symbol) return Promise.resolve();
        return ensureList()
            .then(function (list) {
                return api("/watchlists/" + list.id + "/items/" + encodeURIComponent(symbol), {
                    method: "DELETE",
                });
            })
            .catch(function () {});
    }

    window.startaWatchlist = {
        sync: sync,
        add: add,
        remove: remove,
        readLocal: readLocal,
        signedIn: signedIn,
    };
})();
