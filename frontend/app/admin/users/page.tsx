"use client";

/**
 * ============================================================================
 * /admin/users — the registered-account directory, and the controls for it
 * ============================================================================
 *
 * WHAT CHANGED AND WHY
 * This page was reachable only by typing the URL (no admin nav existed) and
 * could only LOOK: a list and a CSV button. The one implementation of
 * "reset a user's password" lived in components/settings/UsersTab.tsx —
 * a file imported by nothing, i.e. dead code shipping a real capability that
 * no operator could ever reach. That capability is folded in here, where the
 * account it acts on is on screen, and those orphaned files are deleted.
 *
 * Surfaces use theme tokens (bg-surface / text-main / border-border), not the
 * bg-slate-50 / literals this page used to carry —
 * DESIGN_SYSTEM.md §4: page and card surfaces are never hardcoded.
 */

import { useCallback, useEffect, useState } from "react";
import {
    Search, Download, RefreshCw, ChevronLeft, ChevronRight,
    Loader2, AlertCircle, KeyRound, X, Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminUser {
    id: number;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

interface UsersResponse {
    users: AdminUser[];
    total: number;
    skip: number;
    limit: number;
}

const LIMIT = 20;

function formatDate(value: string | null): string {
    if (!value) return "Never";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function AdminUsersPage() {
    const { getToken } = useAuth();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Reset-password dialog state
    const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [resetBusy, setResetBusy] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetDone, setResetDone] = useState<string | null>(null);

    // Debounced, and it resets to page 0. Typing a name while parked on page 4
    // otherwise queries `?skip=80` against a 3-row result and renders nothing —
    // an empty table that looks like "no such user".
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(0);
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                skip: String(page * LIMIT),
                limit: String(LIMIT),
            });
            if (debouncedSearch) params.append("search", debouncedSearch);

            const res = await fetch(`/api/v1/auth/users?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                cache: "no-store",
            });
            if (!res.ok) {
                throw new Error(
                    res.status === 403
                        ? "Admin access required."
                        : `Failed to load users (${res.status}).`
                );
            }
            const data: UsersResponse = await res.json();
            setUsers(data.users ?? []);
            setTotal(data.total ?? 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load users.");
        } finally {
            setIsLoading(false);
        }
    }, [page, debouncedSearch, getToken]);

    useEffect(() => {
        void fetchUsers();
    }, [fetchUsers]);

    const submitReset = async () => {
        if (!resetTarget) return;
        if (newPassword.length < 8) {
            setResetError("Password must be at least 8 characters.");
            return;
        }
        setResetBusy(true);
        setResetError(null);
        try {
            const res = await fetch("/api/proxy/auth/admin/reset-user-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ user_id: resetTarget.id, new_password: newPassword }),
            });
            const payload = await res.json().catch(() => null);
            if (!res.ok) {
                const detail = payload && typeof payload === "object" && "detail" in payload
                    ? String((payload as { detail: unknown }).detail)
                    : `Reset failed (${res.status}).`;
                throw new Error(detail);
            }
            setResetDone(resetTarget.email);
            setResetTarget(null);
            setNewPassword("");
        } catch (err) {
            setResetError(err instanceof Error ? err.message : "Reset failed.");
        } finally {
            setResetBusy(false);
        }
    };

    const exportCSV = () => {
        const headers = ["ID", "Full Name", "Email", "Phone", "Role", "Active", "Created", "Last Login"];
        const rows = users.map((u) => [
            u.id,
            // Quoted: a name containing a comma otherwise shifts every later
            // column by one for that row.
            `"${(u.full_name ?? "").replace(/"/g, '""')}"`,
            u.email,
            u.phone ?? "",
            u.role,
            u.is_active ? "Yes" : "No",
            u.created_at,
            u.last_login ?? "",
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `starta-users_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div>
            <header className="border-b border-border bg-surface px-5 py-5 sm:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="font-display text-xl font-bold tracking-tight text-main">Users</h1>
                        <p className="mt-1 text-sm text-muted">
                            {isLoading && !users.length
                                ? "Loading…"
                                : `${total.toLocaleString()} registered ${total === 1 ? "account" : "accounts"}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:flex-none">
                            <Search
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name or email"
                                aria-label="Search users"
                                className="h-11 w-full rounded-xl border border-border bg-page pl-9 pr-3 text-sm text-main outline-none placeholder:text-muted focus:border-starta-teal sm:w-64"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => void fetchUsers()}
                            aria-label="Refresh"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:text-main"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={exportCSV}
                            disabled={!users.length}
                            className="flex h-11 items-center gap-2 rounded-xl bg-starta-teal px-4 text-sm font-semibold text-white transition-colors hover:bg-starta-darkTeal disabled:opacity-40"
                        >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
                {resetDone && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-starta-teal/30 bg-starta-teal/[0.07] px-4 py-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-starta-teal" aria-hidden="true" />
                        <p className="text-sm text-main">
                            Password reset for <strong className="font-semibold">{resetDone}</strong>. Give it to
                            them over a channel they already trust, and have them change it after signing in.
                        </p>
                        <button
                            type="button"
                            onClick={() => setResetDone(null)}
                            aria-label="Dismiss"
                            className="ml-auto text-muted hover:text-main"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                        <p className="text-sm text-main">{error}</p>
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                    {/* Wide table scrolls inside its own box; the page never
                        scrolls horizontally. */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[46rem] text-left text-sm">
                            <thead>
                                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                                    <th scope="col" className="px-5 py-3.5 font-semibold">Account</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold">Role</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold">Joined</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold">Last seen</th>
                                    <th scope="col" className="px-5 py-3.5 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && !users.length && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-starta-teal" aria-label="Loading" />
                                        </td>
                                    </tr>
                                )}

                                {!isLoading && !users.length && !error && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-16 text-center text-sm text-muted">
                                            {debouncedSearch
                                                ? `No account matches “${debouncedSearch}”.`
                                                : "No registered accounts yet."}
                                        </td>
                                    </tr>
                                )}

                                {users.map((u) => (
                                    <tr key={u.id} className="border-b border-border last:border-0">
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-main">{u.full_name || "—"}</p>
                                            <p className="mt-0.5 break-all text-xs text-muted">{u.email}</p>
                                            {u.phone && <p className="mt-0.5 font-mono text-xs text-muted">{u.phone}</p>}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex rounded-md px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
                                                    u.role === "admin"
                                                        ? "bg-starta-teal/15 text-starta-darkTeal"
                                                        : "bg-border/60 text-muted"
                                                }`}
                                            >
                                                {u.role}
                                            </span>
                                            {!u.is_active && (
                                                <span className="ml-2 inline-flex rounded-md bg-red-500/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-red-600">
                                                    inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-xs text-muted">{formatDate(u.created_at)}</td>
                                        <td className="px-5 py-4 text-xs text-muted">{formatDate(u.last_login)}</td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setResetTarget(u);
                                                    setNewPassword("");
                                                    setResetError(null);
                                                }}
                                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-main transition-colors hover:border-starta-teal hover:text-starta-darkTeal"
                                            >
                                                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                                                Reset password
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {total > LIMIT && (
                        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                            <p className="text-xs text-muted">
                                Page {page + 1} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    aria-label="Previous page"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                                    disabled={page + 1 >= totalPages}
                                    aria-label="Next page"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {resetTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setResetTarget(null)}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reset-title"
                        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6"
                    >
                        <h2 id="reset-title" className="font-display text-lg font-bold text-main">
                            Reset password
                        </h2>
                        <p className="mt-2 break-all text-sm text-muted">
                            Sets a new password for <strong className="font-semibold text-main">{resetTarget.email}</strong>.
                            They are not notified — you have to tell them.
                        </p>

                        <label htmlFor="new-password" className="mt-5 block text-xs font-semibold text-muted">
                            New password
                        </label>
                        <input
                            id="new-password"
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="off"
                            placeholder="At least 8 characters"
                            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-page px-3 font-mono text-sm text-main outline-none focus:border-starta-teal"
                        />
                        {/* Deliberately type="text": the operator has to read this
                            value back to the account holder, and a masked field
                            they cannot see is how a typo becomes a lockout. */}

                        {resetError && (
                            <p className="mt-3 text-sm text-red-600">{resetError}</p>
                        )}

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setResetTarget(null)}
                                className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-muted transition-colors hover:text-main"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void submitReset()}
                                disabled={resetBusy}
                                className="flex h-11 items-center gap-2 rounded-xl bg-starta-teal px-4 text-sm font-semibold text-white transition-colors hover:bg-starta-darkTeal disabled:opacity-50"
                            >
                                {resetBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                Set password
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
