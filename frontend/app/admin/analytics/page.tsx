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
            <div className="min-h-screen bg-slate-50 dark:bg-[#151925] flex items-center justify-center">
                <div className="text-center">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
                    <p className="text-slate-500 dark:text-slate-400">This dashboard is restricted to administrators.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#151925]">
            {/* 1. TOP HEADER & FILTERS */}
            <header className="bg-white/90 dark:bg-[#1E2433]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#2A303C] sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                        {/* Title */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Analytics v2
                                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-500/30">
                                        PREMIUM
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Real-time intelligence dashboard</p>
                            </div>
                        </div>

                        {/* Global Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">

                            {/* User Type */}
                            <Tooltip content="Filter by user authentication status">
                                <div className="relative">
                                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select
                                        value={userType}
                                        onChange={(e) => setUserType(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-[#2A303C] border-none rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-200 dark:hover:bg-[#323946] transition-colors"
                                    >
                                        <option value="all">All Users</option>
                                        <option value="user">Registered</option>
                                        <option value="guest">Guests</option>
                                    </select>
                                </div>
                            </Tooltip>

                            {/* Language */}
                            <Tooltip content="Filter by detected conversation language">
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-[#2A303C] border-none rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-200 dark:hover:bg-[#323946] transition-colors"
                                    >
                                        <option value="all">All Languages</option>
                                        <option value="en">English (EN)</option>
                                        <option value="ar">Arabic (AR)</option>
                                    </select>
                                </div>
                            </Tooltip>

                            <div className="h-6 w-px bg-slate-300 dark:bg-[#323946] mx-1"></div>

                            {/* Period Selection */}
                            <Tooltip content="Select time range for all metrics">
                                <div className="flex bg-slate-100 dark:bg-[#2A303C] rounded-lg p-1 border border-slate-200 dark:border-[#323946]">
                                    {['today', '7d', '30d'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${period === p
                                                ? 'bg-white dark:bg-[#1E2433] text-blue-600 dark:text-blue-400 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-[#2A303C] rounded-lg transition-colors border border-transparent dark:border-[#323946] text-slate-500 dark:text-slate-400"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* 2. PRODUCT HEALTH SUMMARY (NEW) */}
                {healthSummary && (
                    <section className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-[#1E2433] dark:to-[#151925] rounded-2xl border border-indigo-100 dark:border-[#2A303C] shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles className="w-24 h-24 text-indigo-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-indigo-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Product Health Summary</h2>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${healthSummary.status === 'Healthy' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30' :
                                        healthSummary.status === 'Critical' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30' :
                                            'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30'
                                    }`}>
                                    {healthSummary.status}
                                </span>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" /> Improvements
                                    </h3>
                                    <ul className="space-y-1">
                                        {healthSummary.improvements.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                                                <span className="text-green-500 mt-1">●</span> {item}
                                            </li>
                                        ))}
                                        {healthSummary.improvements.length === 0 && <li className="text-sm text-slate-400 italic">No significant improvements</li>}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1">
                                        <TrendingDown className="w-3 h-3" /> Degradations
                                    </h3>
                                    <ul className="space-y-1">
                                        {healthSummary.degradations.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                                                <span className="text-red-500 mt-1">●</span> {item}
                                            </li>
                                        ))}
                                        {healthSummary.degradations.length === 0 && <li className="text-sm text-slate-400 italic">No failures detected</li>}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1">
                                        <Flag className="w-3 h-3" /> Action Items
                                    </h3>
                                    <ul className="space-y-1">
                                        {healthSummary.top_issues.map((item, i) => (
                                            <li key={i} className="text-sm text-slate-700 dark:text-slate-200 flex items-start gap-2">
                                                <span className="text-orange-500 mt-1">●</span> {item}
                                            </li>
                                        ))}
                                        {healthSummary.top_issues.length === 0 && <li className="text-sm text-slate-400 italic">No urgent issues</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

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
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: 2/3 Width */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* DEMAND INTELLIGENCE (NEW) */}
                        <section className="bg-white dark:bg-[#1E2433] rounded-2xl border border-slate-200 dark:border-[#2A303C] shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-[#2A303C] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        Demand Intelligence
                                        <Tooltip content="Trending topics based on volume growth vs previous period">
                                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                        </Tooltip>
                                    </h2>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-[#2A303C] text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
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
                        <section className="bg-white dark:bg-[#1E2433] rounded-2xl border border-slate-200 dark:border-[#2A303C] shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-[#2A303C] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                        <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        Top Questions
                                        <Tooltip content="Most frequently asked questions ranked by volume">
                                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                        </Tooltip>
                                    </h2>
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

                        {/* INTENT PERFORMANCE */}
                        <section className="bg-white dark:bg-[#1E2433] rounded-2xl border border-slate-200 dark:border-[#2A303C] shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-[#2A303C]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        Intent Analytics
                                        <Tooltip content="Performance metrics broken down by detected user intent">
                                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                        </Tooltip>
                                    </h2>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-[#2A303C] text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                        <tr>
                                            <th className="px-6 py-3">Intent Scope</th>
                                            <th className="px-6 py-3">Volume</th>
                                            <th className="px-6 py-3">Confidence</th>
                                            <th className="px-6 py-3">Success Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-[#2A303C]">
                                        {intentPerformance.slice(0, 10).map((ip, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#2A303C]/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">{ip.intent}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{ip.volume}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{(ip.avg_confidence * 100).toFixed(0)}%</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-[#2A303C] rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${ip.success_rate > 80 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${ip.success_rate}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{ip.success_rate.toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                    </div>

                    {/* RIGHT COLUMN: 1/3 Width */}
                    <div className="space-y-8">

                        {/* UNRESOLVED QUEUE */}
                        <section className="bg-white dark:bg-[#1E2433] rounded-2xl border border-slate-200 dark:border-[#2A303C] shadow-sm overflow-hidden ring-1 ring-red-100 dark:ring-red-900/20">
                            <div className="p-6 border-b border-slate-100 dark:border-[#2A303C] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
                                        <Inbox className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">Impact Queue</h2>
                                    {unresolvedQueries.length > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                            {unresolvedQueries.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-[#2A303C] max-h-[500px] overflow-y-auto">
                                {unresolvedQueries.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <CheckCircle className="w-12 h-12 text-green-200 dark:text-green-800 mx-auto mb-2" />
                                        <p className="text-slate-400 text-sm">All clear! No issues pending.</p>
                                    </div>
                                ) : (
                                    unresolvedQueries.map((q) => (
                                        <div key={q.id} className="p-4 hover:bg-slate-50 dark:hover:bg-[#2A303C]/50 transition-colors group">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 line-clamp-2">"{q.raw_text}"</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] bg-slate-100 dark:bg-[#2A303C] text-slate-500 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                    {q.failure_reason}
                                                </span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* SESSION FUNNEL */}
                        <section className="bg-white dark:bg-[#1E2433] rounded-2xl border border-slate-200 dark:border-[#2A303C] shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-[#2A303C]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-teal-100 dark:bg-teal-500/20 rounded-lg flex items-center justify-center">
                                        <Filter className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    </div>
                                    <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        Session Funnel
                                        <Tooltip content="User journey drop-off analysis">
                                            <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                        </Tooltip>
                                    </h2>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                {sessionFunnel.map((step, i) => (
                                    <div key={i} className="relative">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{step.step}</span>
                                            <span className="text-slate-500 font-mono">{step.count} ({step.percentage.toFixed(0)}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-[#2A303C] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-teal-500 dark:bg-teal-400 rounded-full transition-all duration-500"
                                                style={{ width: `${step.percentage}%`, opacity: 1 - (i * 0.15) }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* LANGUAGE & DEMOGRAPHICS */}
                        <section className="bg-white dark:bg-[#1E2433] rounded-2xl border border-slate-200 dark:border-[#2A303C] shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-[#2A303C]">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
                                        <Globe className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <h2 className="font-bold text-slate-900 dark:text-white">Demographics</h2>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {languageStats.map((ls, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#2A303C] flex items-center justify-center text-lg">
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
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20',
        indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20',
        green: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/20',
        red: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20',
        orange: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/20',
        teal: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-500/20',
    };

    const isPositive = trend && trend > 0;
    const isNeutral = trend === 0;

    // Determine trend color (green for good, red for bad)
    // If inverseTrend is true (e.g. failure rate), positive trend is BAD (red).
    let trendColor = 'text-slate-500';
    if (trend !== null && trend !== undefined && !isNeutral) {
        if (inverseTrend) {
            trendColor = isPositive ? 'text-red-500' : 'text-green-500';
        } else {
            trendColor = isPositive ? 'text-green-500' : 'text-red-500';
        }
    }

    return (
        <div className="bg-white dark:bg-[#1E2433] rounded-xl p-4 border border-slate-200 dark:border-[#2A303C] shadow-sm hover:shadow-md transition-all relative group">
            <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend !== null && trend !== undefined && (
                    <div className={`flex items-center text-xs font-bold ${trendColor} bg-slate-50 dark:bg-[#2A303C] px-1.5 py-0.5 rounded-full`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">{value}</h3>
            <div className="flex items-center gap-1.5">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                <Tooltip content={tooltip}>
                    <Info className="w-3 h-3 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-help" />
                </Tooltip>
            </div>
        </div>
    );
}
