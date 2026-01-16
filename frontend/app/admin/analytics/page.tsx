"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    Activity, BarChart3, MessageSquare, Users, TrendingUp, TrendingDown,
    AlertTriangle, Clock, Globe, Inbox, ChevronRight, Download, RefreshCw,
    CheckCircle, XCircle, HelpCircle, Zap, Filter
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

interface HealthKPIs {
    total_chats: number;
    total_messages: number;
    unique_users: number;
    guest_sessions: number;
    success_rate: number;
    failure_rate: number;
    out_of_scope_count: number;
    avg_messages_per_session: number;
    period: string;
}

interface TopQuestion {
    normalized_text: string;
    count: number;
    percentage: number;
    top_intent: string;
    success_rate: number;
}

interface UnresolvedQuery {
    id: number;
    raw_text: string;
    language: string;
    detected_intent: string;
    confidence: number;
    failure_reason: string;
    admin_status: string;
    created_at: string;
}

interface IntentPerformance {
    intent: string;
    volume: number;
    success_rate: number;
    avg_confidence: number;
    avg_latency_ms: number;
    failure_rate: number;
}

interface ResolverStats {
    method: string;
    count: number;
    percentage: number;
}

interface SessionFunnel {
    step: string;
    count: number;
    percentage: number;
}

interface PerformanceMetrics {
    avg_latency_ms: number;
    p95_latency_ms: number;
    error_rate: number;
    timeout_count: number;
}

interface LanguageStats {
    language: string;
    count: number;
    percentage: number;
    failure_rate: number;
}

// ============================================================
// API BASE
// ============================================================

const API_BASE = "https://starta.46-224-223-172.sslip.io/api/v1/admin/analytics";

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ChatbotAnalyticsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    const [period, setPeriod] = useState("30d");
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Data states
    const [healthKPIs, setHealthKPIs] = useState<HealthKPIs | null>(null);
    const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([]);
    const [unresolvedQueries, setUnresolvedQueries] = useState<UnresolvedQuery[]>([]);
    const [intentPerformance, setIntentPerformance] = useState<IntentPerformance[]>([]);
    const [resolverStats, setResolverStats] = useState<ResolverStats[]>([]);
    const [sessionFunnel, setSessionFunnel] = useState<SessionFunnel[]>([]);
    const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
    const [languageStats, setLanguageStats] = useState<LanguageStats[]>([]);

    // Admin check
    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
            router.push('/login');
        }
    }, [isAuthenticated, authLoading, user, router]);

    // Fetch all data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const headers = { 'Content-Type': 'application/json' };
            const ts = Date.now();

            const [health, questions, unresolved, intents, resolver, funnel, perf, lang] = await Promise.all([
                fetch(`${API_BASE}/health?period=${period}&t=${ts}`, { headers }).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/questions?period=${period}&limit=20&t=${ts}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/unresolved?status=pending&limit=50&t=${ts}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/intents?period=${period}&t=${ts}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/resolver?period=${period}&t=${ts}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/sessions/funnel?period=${period}&t=${ts}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/performance?period=${period}&t=${ts}`, { headers }).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/language?period=${period}&t=${ts}`, { headers }).then(r => r.json()).catch(() => [])
            ]);

            setHealthKPIs(health);
            setTopQuestions(questions);
            setUnresolvedQueries(unresolved);
            setIntentPerformance(intents);
            setResolverStats(resolver);
            setSessionFunnel(funnel);
            setPerformanceMetrics(perf);
            setLanguageStats(lang);
            setLastRefresh(new Date());
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            fetchData();
        }
    }, [period, isAuthenticated, user]);

    // Export to CSV
    const exportToCSV = (data: any[], filename: string) => {
        if (!data.length) return;
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    // Mark query as resolved
    const resolveQuery = async (id: number, status: 'resolved' | 'ignored') => {
        try {
            await fetch(`${API_BASE}/unresolved/${id}/resolve?status=${status}`, { method: 'POST' });
            setUnresolvedQueries(prev => prev.filter(q => q.id !== id));
        } catch (error) {
            console.error("Failed to resolve query:", error);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
                    <p className="text-slate-500">This page is only accessible to administrators.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                                <Activity className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Chatbot Analytics</h1>
                                <p className="text-sm text-slate-500">Starta AI Performance Dashboard</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Period Filter */}
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                {['today', '7d', '30d', '90d'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${period === p
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        {p === 'today' ? 'Today' : p.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* Refresh Button */}
                            <button
                                onClick={fetchData}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>

                            {lastRefresh && (
                                <span className="text-xs text-slate-400">
                                    Updated {lastRefresh.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* ============================================================ */}
                {/* 1. EXECUTIVE KPI STRIP */}
                {/* ============================================================ */}
                <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <KPICard
                        icon={MessageSquare}
                        label="Total Chats"
                        value={healthKPIs?.total_chats ?? 0}
                        color="blue"
                    />
                    <KPICard
                        icon={BarChart3}
                        label="Messages"
                        value={healthKPIs?.total_messages ?? 0}
                        color="indigo"
                    />
                    <KPICard
                        icon={Users}
                        label="Active Sessions"
                        value={healthKPIs?.unique_users ?? 0}
                        color="purple"
                    />
                    <KPICard
                        icon={CheckCircle}
                        label="Success Rate"
                        value={`${healthKPIs?.success_rate ?? 0}%`}
                        color="green"
                    />
                    <KPICard
                        icon={XCircle}
                        label="Failure Rate"
                        value={`${healthKPIs?.failure_rate ?? 0}%`}
                        color="red"
                    />
                    <KPICard
                        icon={Globe}
                        label="Guest Sessions"
                        value={healthKPIs?.guest_sessions ?? 0}
                        color="orange"
                    />
                    <KPICard
                        icon={TrendingUp}
                        label="Avg/Session"
                        value={healthKPIs?.avg_messages_per_session?.toFixed(1) ?? 0}
                        color="teal"
                    />
                </section>

                {/* Two Column Layout */}
                <div className="grid lg:grid-cols-2 gap-8">

                    {/* ============================================================ */}
                    {/* 2. TOP QUESTIONS LEADERBOARD */}
                    {/* ============================================================ */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <HelpCircle className="w-4 h-4 text-blue-600" />
                                </div>
                                <h2 className="font-bold text-slate-900">Top Questions</h2>
                            </div>
                            <button
                                onClick={() => exportToCSV(topQuestions, 'top_questions')}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                <Download className="w-4 h-4" /> Export
                            </button>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                            {topQuestions.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">No data yet</div>
                            ) : (
                                topQuestions.map((q, i) => (
                                    <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">{q.normalized_text}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Intent: <span className="font-mono bg-slate-100 px-1 rounded">{q.top_intent}</span>
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-lg font-bold text-slate-900">{q.count}</p>
                                                <p className={`text-xs ${q.success_rate >= 80 ? 'text-green-600' : q.success_rate >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                                                    {q.success_rate.toFixed(0)}% success
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* ============================================================ */}
                    {/* 3. UNRESOLVED INBOX */}
                    {/* ============================================================ */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                    <Inbox className="w-4 h-4 text-red-600" />
                                </div>
                                <h2 className="font-bold text-slate-900">Unresolved Queries</h2>
                                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {unresolvedQueries.length}
                                </span>
                            </div>
                            <button
                                onClick={() => exportToCSV(unresolvedQueries, 'unresolved_queries')}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                <Download className="w-4 h-4" /> Export
                            </button>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                            {unresolvedQueries.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">No pending issues! 🎉</div>
                            ) : (
                                unresolvedQueries.map((q) => (
                                    <div key={q.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900">{q.raw_text}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{q.failure_reason}</span>
                                                    <span className="text-xs text-slate-400">{q.language.toUpperCase()}</span>
                                                    <span className="text-xs text-slate-400">{(q.confidence * 100).toFixed(0)}% conf</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => resolveQuery(q.id, 'resolved')}
                                                    className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                    title="Mark Resolved"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => resolveQuery(q.id, 'ignored')}
                                                    className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                                    title="Ignore"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* ============================================================ */}
                {/* 4. INTENT PERFORMANCE */}
                {/* ============================================================ */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Zap className="w-4 h-4 text-indigo-600" />
                            </div>
                            <h2 className="font-bold text-slate-900">Intent Performance</h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Intent</th>
                                    <th className="px-6 py-3">Volume</th>
                                    <th className="px-6 py-3">Success Rate</th>
                                    <th className="px-6 py-3">Avg Confidence</th>
                                    <th className="px-6 py-3">Avg Latency</th>
                                    <th className="px-6 py-3">Failure Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {intentPerformance.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No data yet</td></tr>
                                ) : (
                                    intentPerformance.slice(0, 15).map((ip, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm text-slate-900">{ip.intent}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{ip.volume}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${ip.success_rate >= 80 ? 'bg-green-500' : ip.success_rate >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                                                            style={{ width: `${ip.success_rate}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-slate-600">{ip.success_rate.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{(ip.avg_confidence * 100).toFixed(0)}%</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{ip.avg_latency_ms.toFixed(0)}ms</td>
                                            <td className="px-6 py-4 text-sm text-red-600">{ip.failure_rate.toFixed(1)}%</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Three Column Layout */}
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* ============================================================ */}
                    {/* 5. RESOLVER STATS */}
                    {/* ============================================================ */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Filter className="w-4 h-4 text-purple-600" />
                                </div>
                                <h2 className="font-bold text-slate-900">Symbol Resolver</h2>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {resolverStats.length === 0 ? (
                                <div className="text-center text-slate-400">No data yet</div>
                            ) : (
                                resolverStats.map((rs, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-700 capitalize">{rs.method}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 rounded-full"
                                                    style={{ width: `${rs.percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-sm text-slate-600 w-12 text-right">{rs.percentage.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* ============================================================ */}
                    {/* 6. SESSION FUNNEL */}
                    {/* ============================================================ */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                                    <TrendingDown className="w-4 h-4 text-teal-600" />
                                </div>
                                <h2 className="font-bold text-slate-900">Session Funnel</h2>
                            </div>
                        </div>
                        <div className="p-6 space-y-3">
                            {sessionFunnel.length === 0 ? (
                                <div className="text-center text-slate-400">No data yet</div>
                            ) : (
                                sessionFunnel.map((sf, i) => (
                                    <div key={i} className="relative">
                                        <div
                                            className="h-10 bg-teal-100 rounded-lg flex items-center px-4 justify-between transition-all"
                                            style={{ width: `${Math.max(sf.percentage, 20)}%` }}
                                        >
                                            <span className="text-sm font-medium text-teal-800 truncate">{sf.step}</span>
                                        </div>
                                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-600 pr-2">
                                            {sf.count} ({sf.percentage.toFixed(0)}%)
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* ============================================================ */}
                    {/* 7. LANGUAGE STATS */}
                    {/* ============================================================ */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-orange-600" />
                                </div>
                                <h2 className="font-bold text-slate-900">Language Analytics</h2>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {languageStats.length === 0 ? (
                                <div className="text-center text-slate-400">No data yet</div>
                            ) : (
                                languageStats.map((ls, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{ls.language === 'ar' ? '🇪🇬' : ls.language === 'en' ? '🇬🇧' : '🌐'}</span>
                                            <span className="text-sm font-medium text-slate-700 uppercase">{ls.language}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-900">{ls.count} ({ls.percentage.toFixed(0)}%)</p>
                                            <p className="text-xs text-red-500">{ls.failure_rate.toFixed(1)}% fail</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* ============================================================ */}
                {/* 8. PERFORMANCE METRICS */}
                {/* ============================================================ */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <Clock className="w-4 h-4 text-green-600" />
                            </div>
                            <h2 className="font-bold text-slate-900">Performance & Reliability</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
                        <div className="p-6 text-center">
                            <p className="text-3xl font-bold text-slate-900">{performanceMetrics?.avg_latency_ms?.toFixed(0) ?? 0}ms</p>
                            <p className="text-sm text-slate-500 mt-1">Avg Latency</p>
                        </div>
                        <div className="p-6 text-center">
                            <p className="text-3xl font-bold text-slate-900">{performanceMetrics?.p95_latency_ms?.toFixed(0) ?? 0}ms</p>
                            <p className="text-sm text-slate-500 mt-1">P95 Latency</p>
                        </div>
                        <div className="p-6 text-center">
                            <p className={`text-3xl font-bold ${(performanceMetrics?.error_rate ?? 0) > 5 ? 'text-red-600' : 'text-slate-900'}`}>
                                {performanceMetrics?.error_rate?.toFixed(1) ?? 0}%
                            </p>
                            <p className="text-sm text-slate-500 mt-1">Error Rate</p>
                        </div>
                        <div className="p-6 text-center">
                            <p className="text-3xl font-bold text-slate-900">{performanceMetrics?.timeout_count ?? 0}</p>
                            <p className="text-sm text-slate-500 mt-1">Timeouts</p>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
}

// ============================================================
// KPI CARD COMPONENT
// ============================================================

function KPICard({ icon: Icon, label, value, color }: {
    icon: any;
    label: string;
    value: string | number;
    color: string;
}) {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        purple: 'bg-purple-100 text-purple-600',
        green: 'bg-green-100 text-green-600',
        red: 'bg-red-100 text-red-600',
        orange: 'bg-orange-100 text-orange-600',
        teal: 'bg-teal-100 text-teal-600',
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color]}`}>
                <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
        </div>
    );
}
