"use client";

/**
 * ============================================================================
 * /admin/sessions — what happens BEFORE someone registers
 * ============================================================================
 *
 * The backend has served GET /auth/guest-sessions (admin-only) for as long as
 * guest sessions have existed, and nothing in the product has ever rendered
 * it. Given the registration-gating strategy — gate the workflow, never the
 * answer — the number that matters is how many anonymous sessions turn into
 * accounts, and it was sitting behind an endpoint with no page.
 *
 * Pagination is offset-only because the endpoint returns no row count: it
 * gives `sessions` and an aggregate `stats`, so "next" is offered when a full
 * page came back and withdrawn when it did not. Inventing a total from
 * stats.total_sessions would be wrong the moment a session is created between
 * two requests.
 */

import { useCallback, useEffect, useState } from "react";
import {
    Loader2, AlertCircle, ChevronLeft, ChevronRight, RefreshCw,
    UserCheck, MessageSquare, Radio,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface GuestSession {
    id: number;
    device_fingerprint: string | null;
    ip_address: string | null;
    question_count: number;
    first_question_at: string | null;
    last_question_at: string | null;
    converted_user_id: number | null;
}

interface GuestStats {
    total_sessions?: number;
    total_questions?: number;
    conversions?: number;
}

const LIMIT = 25;

function formatDate(value: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function Stat({ icon: Icon, label, value }: { icon: typeof Radio; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-muted">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
            </div>
            <p className="mt-3 font-display text-3xl font-bold tracking-tight text-main">{value}</p>
        </div>
    );
}

export default function AdminSessionsPage() {
    const { getToken } = useAuth();
    const [sessions, setSessions] = useState<GuestSession[]>([]);
    const [stats, setStats] = useState<GuestStats>({});
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                skip: String(page * LIMIT),
                limit: String(LIMIT),
            });
            const res = await fetch(`/api/proxy/auth/guest-sessions?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
                cache: "no-store",
            });
            if (!res.ok) {
                throw new Error(
                    res.status === 403
                        ? "Admin access required."
                        : `Failed to load sessions (${res.status}).`
                );
            }
            const data = await res.json();
            setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
            setStats(data?.stats ?? {});
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load sessions.");
        } finally {
            setIsLoading(false);
        }
    }, [page, getToken]);

    useEffect(() => {
        void load();
    }, [load]);

    const totalSessions = stats.total_sessions ?? 0;
    const conversions = stats.conversions ?? 0;
    // Guarded: 0/0 renders as NaN%, which reads as a broken page rather than
    // as "nothing has happened yet".
    const conversionRate = totalSessions > 0
        ? `${((conversions / totalSessions) * 100).toFixed(1)}%`
        : "—";

    return (
        <div>
            <header className="border-b border-border bg-surface px-5 py-5 sm:px-8">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-xl font-bold tracking-tight text-main">Guest sessions</h1>
                        <p className="mt-1 text-sm text-muted">Pre-registration activity and conversion</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void load()}
                        aria-label="Refresh"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:text-main"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
                    </button>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
                {error && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                        <p className="text-sm text-main">{error}</p>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat icon={Radio} label="Sessions" value={totalSessions.toLocaleString()} />
                    <Stat icon={MessageSquare} label="Questions asked" value={(stats.total_questions ?? 0).toLocaleString()} />
                    <Stat icon={UserCheck} label="Converted" value={conversions.toLocaleString()} />
                    <Stat icon={UserCheck} label="Conversion rate" value={conversionRate} />
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[44rem] text-left text-sm">
                            <thead>
                                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                                    <th scope="col" className="px-5 py-3.5 font-semibold">Session</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold">Questions</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold">First seen</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold">Last seen</th>
                                    <th scope="col" className="px-5 py-3.5 font-semibold">Outcome</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && !sessions.length && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-starta-teal" aria-label="Loading" />
                                        </td>
                                    </tr>
                                )}

                                {!isLoading && !sessions.length && !error && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-16 text-center text-sm text-muted">
                                            No guest sessions recorded yet.
                                        </td>
                                    </tr>
                                )}

                                {sessions.map((s) => (
                                    <tr key={s.id} className="border-b border-border last:border-0">
                                        <td className="px-5 py-4">
                                            <p className="font-mono text-xs text-main">
                                                {s.device_fingerprint ? `${s.device_fingerprint.slice(0, 14)}…` : `#${s.id}`}
                                            </p>
                                            {s.ip_address && (
                                                <p className="mt-0.5 font-mono text-[11px] text-muted">{s.ip_address}</p>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 font-mono text-sm text-main">{s.question_count}</td>
                                        <td className="px-5 py-4 text-xs text-muted">{formatDate(s.first_question_at)}</td>
                                        <td className="px-5 py-4 text-xs text-muted">{formatDate(s.last_question_at)}</td>
                                        <td className="px-5 py-4">
                                            {s.converted_user_id ? (
                                                <span className="inline-flex rounded-md bg-starta-teal/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-starta-darkTeal">
                                                    registered
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-md bg-border/60 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
                                                    guest
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                        <p className="text-xs text-muted">Page {page + 1}</p>
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
                                onClick={() => setPage((p) => p + 1)}
                                disabled={sessions.length < LIMIT}
                                aria-label="Next page"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted disabled:opacity-40"
                            >
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
