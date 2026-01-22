"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    Activity, BarChart3, MessageSquare, Users, TrendingUp, TrendingDown,
    AlertTriangle, Clock, Globe, Inbox, ChevronRight, Download, RefreshCw,
    CheckCircle, XCircle, HelpCircle, Zap, Filter, Info, ArrowUpRight, ArrowDownRight,
    Search, LayoutDashboard, Flag, UserCheck, ShieldAlert, Sparkles
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

interface HealthKPIs {
    total_chats: number;
    trend_chats: number;
    total_messages: number;
    trend_messages: number;
    unique_users: number;
    trend_users: number;
    guest_sessions: number;
    success_rate: number;
    trend_success: number;
    failure_rate: number;
    trend_failure: number;
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

interface DemandInsight {
    query_text: string;
    volume: number;
    growth_rate: number;
    intent: string;
    is_new: boolean;
}

interface ProductHealthSummary {
    status: string;
    improvements: string[];
    degradations: string[];
    top_issues: string[];
    decision_needed: boolean;
}

// ============================================================
// API BASE
// ============================================================

const API_BASE = "https://starta.46-224-223-172.sslip.io/api/v1/admin/analytics";

// ============================================================
// TOOLTIP COMPONENT
// ============================================================

function Tooltip({ content, children, side = "top" }: { content: string; children: React.ReactNode; side?: "top" | "right" }) {
    return (
        <div className="group relative inline-flex items-center">
            {children}
            <div className={`
                absolute ${side === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : 'left-full top-1/2 -translate-y-1/2 ml-2'} 
                px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-50 text-xs rounded-md 
                opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 
                shadow-xl whitespace-nowrap min-w-[max-content] max-w-xs
            `}>
                {content}
                {side === 'top' && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                )}
                {side === 'right' && (
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
                )}
            </div>
        </div>
    );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function ChatbotAnalyticsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    // Filters
    const [period, setPeriod] = useState("30d");
    const [userType, setUserType] = useState("all");
    const [language, setLanguage] = useState("all");

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
    const [demandInsights, setDemandInsights] = useState<DemandInsight[]>([]);
    const [healthSummary, setHealthSummary] = useState<ProductHealthSummary | null>(null);

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
            const qs = `period=${period}&user_type=${userType}&language=${language}&t=${ts}`;

            const [health, questions, unresolved, intents, resolver, funnel, perf, lang, demand, summary] = await Promise.all([
                fetch(`${API_BASE}/health?${qs}`, { headers }).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/questions?${qs}&limit=20`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/unresolved?${qs}&status=pending&limit=50`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/intents?${qs}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/resolver?${qs}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/sessions/funnel?${qs}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/performance?${qs}`, { headers }).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/language?${qs}`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/demand/trending?${qs}&limit=10`, { headers }).then(r => r.json()).catch(() => []),
                fetch(`${API_BASE}/health/summary?period=${period}`, { headers }).then(r => r.json()).catch(() => null)
            ]);

            setHealthKPIs(health);
            setTopQuestions(questions);
            setUnresolvedQueries(unresolved);
            setIntentPerformance(intents);
            setResolverStats(resolver);
            setSessionFunnel(funnel);
            setPerformanceMetrics(perf);
            setLanguageStats(lang);
            setDemandInsights(demand);
            setHealthSummary(summary);
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
    }, [period, userType, language, isAuthenticated, user]);

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
            <div className="min-h-screen bg-slate-50 dark:bg-[#151925] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
        );
    }

    if (!isAuthenticated || user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center">
                <div className="text-center">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
                    <p className="text-slate-500 dark:text-slate-400">This dashboard is restricted to administrators.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] transition-colors duration-300">
            {/* Background Ambient Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] bg-[#14B8A6]/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] bg-[#3B82F6]/5 rounded-full blur-[100px]" />
            </div>
            {/* 1. TOP HEADER & FILTERS */}
            <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-[#0B1121]/80 border-b border-slate-200 dark:border-white/[0.08]">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                        {/* Title */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#0F172A] to-[#1E293B] dark:from-[#1E293B] dark:to-[#0F172A] rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10">
                                <LayoutDashboard className="w-5 h-5 text-[#14B8A6]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Analytics v2
                                    <span className="px-2 py-0.5 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] text-[10px] font-bold border border-[#14B8A6]/20 tracking-wider">
                                        PRO TERMINAL
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Real-time intelligence dashboard</p>
                            </div>
                        </div>

                        {/* Global Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">

                            {/* User Type */}
                            <Tooltip content="Filter by user authentication status">
                                <div className="relative group">
                                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#14B8A6] transition-colors" />
                                    <select
                                        value={userType}
                                        onChange={(e) => setUserType(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6]/50 outline-none appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors shadow-sm"
                                    >
                                        <option value="all">All Users</option>
                                        <option value="user">Registered</option>
                                        <option value="guest">Guests</option>
                                    </select>
                                </div>
                            </Tooltip>

                            {/* Language */}
                            <Tooltip content="Filter by detected conversation language">
                                <div className="relative group">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#14B8A6] transition-colors" />
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6]/50 outline-none appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors shadow-sm"
                                    >
                                        <option value="all">All Languages</option>
                                        <option value="en">English (EN)</option>
                                        <option value="ar">Arabic (AR)</option>
                                    </select>
                                </div>
                            </Tooltip>

                            <div className="h-6 w-px bg-slate-200 dark:bg-white/[0.08] mx-1"></div>

                            {/* Period Selection */}
                            <Tooltip content="Select time range for all metrics">
                                <div className="flex bg-white dark:bg-[#111827] rounded-xl p-1 border border-slate-200 dark:border-white/[0.08] shadow-sm">
                                    {['today', '7d', '30d'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p
                                                ? 'bg-slate-100 dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            {p === 'today' ? '24H' : p.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </Tooltip>

                            <Tooltip content="Refresh all data">
                                <button
                                    onClick={fetchData}
                                    className="p-2.5 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-xl transition-colors border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 shadow-sm"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#14B8A6]' : ''}`} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* 2. PRODUCT HEALTH SUMMARY (NEW) */}


                {/* 3. EXECUTIVE KPI ROW */}
                <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <OverviewCard
                        icon={MessageSquare}
                        label="Total Chats"
                        value={healthKPIs?.total_chats ?? 0}
                        trend={healthKPIs?.trend_chats}
                        tooltip="Total unique chat sessions started in period"
                        color="blue"
                    />
                    <OverviewCard
                        icon={BarChart3}
                        label="Messages"
                        value={healthKPIs?.total_messages ?? 0}
                        trend={healthKPIs?.trend_messages}
                        tooltip="Total individual messages exchanged"
                        color="indigo"
                    />
                    <OverviewCard
                        icon={Users}
                        label="Active Users"
                        value={healthKPIs?.unique_users ?? 0}
                        trend={healthKPIs?.trend_users}
                        tooltip="Unique registered users who interacted"
                        color="purple"
                    />
                    <OverviewCard
                        icon={CheckCircle}
                        label="Success Rate"
                        value={`${healthKPIs?.success_rate ?? 0}%`}
                        trend={healthKPIs?.trend_success}
                        tooltip="Percentage of queries with successful data response"
                        color="green"
                        inverseTrend={false}
                    />
                    <OverviewCard
                        icon={XCircle}
                        label="Failure Rate"
                        value={`${healthKPIs?.failure_rate ?? 0}%`}
                        trend={healthKPIs?.trend_failure}
                        tooltip="Percentage of queries that failed or triggered fallback"
                        color="red"
                        inverseTrend={true}
                    />
                    <OverviewCard
                        icon={Globe}
                        label="Guest Sessions"
                        value={healthKPIs?.guest_sessions ?? 0}
                        trend={null}
                        tooltip="Sessions by unregistered users"
                        color="orange"
                    />
                    <OverviewCard
                        icon={Clock}
                        label="Avg Latency"
                        value={`${performanceMetrics?.avg_latency_ms?.toFixed(0) ?? 0}ms`}
                        trend={null}
                        tooltip="Average response time per message"
                        color="teal"
                        inverseTrend={true}
                    />
                </section>

                {/* 4. MAIN CONTENT GRID */}
                {/* 4. MAIN CONTENT GRID */}
                <div className="grid lg:grid-cols-3 gap-8 relative z-10">

                    {/* LEFT COLUMN: 2/3 Width */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* DEMAND INTELLIGENCE (NEW) */}
                        <section className="relative group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 duration-500">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <div className="p-8 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#0B1121] rounded-2xl flex items-center justify-center shadow-lg border border-white/[0.05]">
                                        <TrendingUp className="w-6 h-6 text-[#14B8A6]" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                            Demand Intelligence
                                            <Tooltip content="Trending topics based on volume growth">
                                                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                            </Tooltip>
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">Market query velocity & trends</p>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50/50 dark:bg-[#0B1121]/50 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3">Trending Query</th>
                                            <th className="px-6 py-3">Volume</th>
                                            <th className="px-6 py-3">Growth</th>
                                            <th className="px-6 py-3">Intent</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-[#2A303C]">
                                        {demandInsights.length === 0 ? (
                                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No trending data available</td></tr>
                                        ) : (
                                            demandInsights.map((d, i) => (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#2A303C]/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{d.query_text}</td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{d.volume}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`flex items-center gap-1 font-bold ${d.growth_rate > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {d.growth_rate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                            {Math.abs(d.growth_rate)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono uppercase">{d.intent}</td>
                                                    <td className="px-6 py-4">
                                                        {d.is_new ? (
                                                            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold">NEW</span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Recurring</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* TOP QUESTIONS */}
                        <section className="relative group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 duration-500">
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#3B82F6]/5 via-transparent to-[#14B8A6]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="p-8 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#0B1121] rounded-2xl flex items-center justify-center shadow-lg border border-white/[0.05]">
                                        <HelpCircle className="w-6 h-6 text-[#3B82F6]" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                            Top Questions
                                            <Tooltip content="Most frequently asked questions">
                                                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                            </Tooltip>
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">Highest volume user inquiries</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => exportToCSV(topQuestions, 'top_questions')}
                                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
                                >
                                    <Download className="w-3 h-3" /> CSV
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-[#2A303C] max-h-96 overflow-y-auto">
                                {topQuestions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">No data yet</div>
                                ) : (
                                    topQuestions.map((q, i) => (
                                        <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2A303C]/50 transition-colors group">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#2A303C] flex items-center justify-center text-xs font-bold text-slate-500">
                                                        {i + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate pr-4">{q.normalized_text}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] uppercase font-bold text-slate-400">{q.top_intent}</span>
                                                            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                                                            <span className={`text-[10px] font-bold ${q.success_rate > 80 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                                                                }`}>
                                                                {q.success_rate.toFixed(0)}% Success
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-base font-bold text-slate-900 dark:text-white">{q.count}</p>
                                                    <p className="text-xs text-slate-400">requests</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>


                    </div>

                    {/* RIGHT COLUMN: 1/3 Width */}
                    <div className="space-y-8">

                        {/* SYSTEM PERFORMANCE (Right Top) */}
                        <section className="relative group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/5 via-transparent to-[#0D9488]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="p-8 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#0B1121] rounded-2xl flex items-center justify-center shadow-lg border border-white/[0.05]">
                                        <Activity className="w-6 h-6 text-[#14B8A6]" />
                                    </div>
                                    <h2 className="font-bold text-xl text-slate-900 dark:text-white">System Health</h2>
                                </div>
                                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-emerald-500 tracking-widest">ONLINE</span>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-4 relative z-10">
                                <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#0B1121]/50 border border-slate-200/50 dark:border-white/[0.05] hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 transition-all hover:bg-slate-50 dark:hover:bg-[#0B1121] group/card">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-hover/card:text-[#14B8A6] transition-colors">Avg Latency</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                                        {performanceMetrics?.avg_latency_ms?.toFixed(0) || 0}<span className="text-sm font-medium text-slate-400 ml-1">ms</span>
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#0B1121]/50 border border-slate-200/50 dark:border-white/[0.05] hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 transition-all hover:bg-slate-50 dark:hover:bg-[#0B1121] group/card">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-hover/card:text-[#14B8A6] transition-colors">P95 Latency</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                                        {performanceMetrics?.p95_latency_ms?.toFixed(0) || 0}<span className="text-sm font-medium text-slate-400 ml-1">ms</span>
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#0B1121]/50 border border-slate-200/50 dark:border-white/[0.05] hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 transition-all hover:bg-slate-50 dark:hover:bg-[#0B1121] group/card">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-hover/card:text-[#14B8A6] transition-colors">Throughput</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                                        {((healthKPIs?.total_messages || 0) / (30 * 24)).toFixed(1)}<span className="text-xs font-bold text-slate-400 ml-1">MSG/HR</span>
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-[#0B1121]/50 border border-slate-200/50 dark:border-white/[0.05] hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 transition-all hover:bg-slate-50 dark:hover:bg-[#0B1121] group/card">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 group-hover/card:text-[#14B8A6] transition-colors">Error Rate</p>
                                    <p className={`text-2xl font-black ${(performanceMetrics?.error_rate ?? 0) > 1 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {performanceMetrics?.error_rate || 0}<span className="text-sm font-medium text-slate-400 ml-1">%</span>
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* SESSION FUNNEL */}
                        <section className="relative group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 duration-500">
                            <div className="p-8 border-b border-slate-100 dark:border-white/[0.08] flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-[#0B1121] rounded-2xl flex items-center justify-center shadow-lg border border-white/[0.05]">
                                    <Filter className="w-6 h-6 text-[#14B8A6]" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                        Session Funnel
                                        <Tooltip content="User journey drop-off analysis">
                                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                        </Tooltip>
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">Conversion flow analysis</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-5 relative z-10">
                                {sessionFunnel.map((step, i) => (
                                    <div key={i} className="relative">
                                        <div className="flex justify-between text-xs mb-1.5 px-0.5">
                                            <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{step.step}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-slate-400">{step.count}</span>
                                                <span className="font-bold text-[#14B8A6]">({step.percentage.toFixed(0)}%)</span>
                                            </div>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-100 dark:bg-[#0B1121] rounded-full overflow-hidden border border-slate-100 dark:border-white/[0.05]">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#14B8A6] to-[#0D9488] rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)] transition-all duration-700"
                                                style={{ width: `${step.percentage}%`, opacity: 1 - (i * 0.15) }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* LANGUAGE & DEMOGRAPHICS */}
                        <section className="relative group bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="p-8 border-b border-slate-100 dark:border-white/[0.08] flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-[#0B1121] rounded-2xl flex items-center justify-center shadow-lg border border-white/[0.05]">
                                    <Globe className="w-6 h-6 text-orange-500" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-xl text-slate-900 dark:text-white">Demographics</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">User distribution</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {languageStats.map((ls, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#0B1121] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#0B1121] flex items-center justify-center text-lg border border-slate-200 dark:border-white/[0.05]">
                                                    {ls.language === 'en' ? '🇬🇧' : ls.language === 'ar' ? '🇪🇬' : '🌍'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{ls.language.toUpperCase()}</p>
                                                    <p className="text-xs text-slate-500">{ls.count} users</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{ls.percentage.toFixed(0)}%</p>
                                                <p className="text-xs text-red-500">{ls.failure_rate.toFixed(0)}% fail</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                    </div>
                </div>

                {/* 5. FAILURE DETAILS ANALYSIS (Full Width) */}
                <section className="bg-white dark:bg-[#111827] rounded-3xl border border-red-100 dark:border-red-500/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="p-8 border-b border-slate-100 dark:border-white/[0.08] relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#0B1121] rounded-2xl flex items-center justify-center shadow-lg border border-red-500/20">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h2 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                    Failure Rate Analysis
                                    <Tooltip content="Detailed breakdown of system fallback and failure reasons">
                                        <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                    </Tooltip>
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">Automated fallback & error diagnostics</p>
                            </div>
                        </div>
                    </div>

                    {/* Failure Reason Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#0B1121]/50 relative z-10">
                        {Array.from(new Set(unresolvedQueries.map(q => q.failure_reason))).map((reason, i) => {
                            const count = unresolvedQueries.filter(q => q.failure_reason === reason).length;
                            const pct = (unresolvedQueries.length ? (count / unresolvedQueries.length) * 100 : 0).toFixed(0);
                            return (
                                <div key={i} className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-100 dark:border-white/[0.05] shadow-sm hover:border-red-500/30 transition-colors">
                                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">{reason.replace(/_/g, ' ')}</div>
                                    <div className="flex items-end justify-between">
                                        <div className="text-2xl font-black text-slate-900 dark:text-white">{count}</div>
                                        <div className="text-sm font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-lg">{pct}%</div>
                                    </div>
                                </div>
                            );
                        })}
                        {unresolvedQueries.length === 0 && (
                            <div className="col-span-4 text-center text-sm text-slate-400 py-2">
                                No active failure data to analyze
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-[#1E293B] text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">Query Context</th>
                                    <th className="px-6 py-4">Failure Reason</th>
                                    <th className="px-6 py-4">Intent Match</th>
                                    <th className="px-6 py-4">User Impact</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                                {unresolvedQueries.slice(0, 20).map((q, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                <Clock className="w-3 h-3" />
                                                {new Date(q.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white mb-0.5 line-clamp-2">"{q.raw_text}"</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-white/5 px-1.5 rounded">{q.language.toUpperCase()}</span>
                                                <span className="text-[10px] text-slate-400">ID: #{q.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                <span className="text-xs font-bold capitalize">{q.failure_reason.replace(/_/g, ' ')}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1 pl-1">
                                                {q.failure_reason === 'low_confidence' ? 'Intent unrecognized' :
                                                    q.failure_reason === 'out_of_scope' ? 'Topic not supported' : 'System error'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{q.detected_intent || 'None'}</span>
                                                <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full mt-1 overflow-hidden">
                                                    <div className={`h-full ${q.confidence > 0.7 ? 'bg-green-500' : q.confidence > 0.4 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${(q.confidence * 100)}%` }} />
                                                </div>
                                                <span className="text-[10px] text-slate-500 mt-0.5">Confidence: {(q.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3 h-3" />
                                                <span>Guest User</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1">
                                                <Tooltip content="Mark as Resolved">
                                                    <button onClick={() => resolveQuery(q.id, 'resolved')} className="p-1 hover:bg-green-100 dark:hover:bg-green-900 text-green-600 rounded">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Ignore">
                                                    <button onClick={() => resolveQuery(q.id, 'ignored')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {unresolvedQueries.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-400">
                                            <div className="flex flex-col items-center">
                                                <CheckCircle className="w-8 h-8 text-green-500 mb-2 opacity-50" />
                                                <span>System healthy. No failures recorded.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

            </main>
        </div>
    );
}

// ============================================================
// OVERVIEW CARD COMPONENT (Renamed & Enhanced)
// ============================================================

function OverviewCard({ icon: Icon, label, value, trend, tooltip, color, inverseTrend = false }: {
    icon: any;
    label: string;
    value: string | number;
    trend: number | null | undefined;
    tooltip: string;
    color: string;
    inverseTrend?: boolean;
}) {
    const colorClasses: Record<string, string> = {
        blue: 'text-blue-600 dark:text-[#3B82F6] bg-blue-100 dark:bg-[#3B82F6]/10 border border-blue-200 dark:border-[#3B82F6]/20',
        indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20',
        green: 'text-green-600 dark:text-[#10B981] bg-green-100 dark:bg-[#10B981]/10 border border-green-200 dark:border-[#10B981]/20',
        red: 'text-red-600 dark:text-[#EF4444] bg-red-100 dark:bg-[#EF4444]/10 border border-red-200 dark:border-[#EF4444]/20',
        orange: 'text-orange-600 dark:text-[#F59E0B] bg-orange-100 dark:bg-[#F59E0B]/10 border border-orange-200 dark:border-[#F59E0B]/20',
        teal: 'text-teal-600 dark:text-[#14B8A6] bg-teal-100 dark:bg-[#14B8A6]/10 border border-teal-200 dark:border-[#14B8A6]/20',
    };

    const isPositive = trend && trend > 0;
    const isNeutral = trend === 0;

    // Determine trend color
    let trendColor = 'text-slate-500';
    let TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
    let trendBg = 'bg-slate-100 dark:bg-slate-800';

    if (trend !== null && trend !== undefined && !isNeutral) {
        if (inverseTrend) {
            trendColor = isPositive ? 'text-red-500' : 'text-emerald-500';
            trendBg = isPositive ? 'bg-red-50 dark:bg-red-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10';
        } else {
            trendColor = isPositive ? 'text-emerald-500' : 'text-red-500';
            trendBg = isPositive ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10';
        }
    }

    return (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border border-slate-200 dark:border-white/[0.08] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group flex flex-col justify-between h-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${colorClasses[color]} shadow-sm`}>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                </div>
                {trend !== null && trend !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trendColor} ${trendBg}`}>
                        <TrendIcon className="w-3 h-3" />
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
                </div>
            </div>

            <Tooltip content={tooltip}>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Info className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
            </Tooltip>
        </div>
    );
}
