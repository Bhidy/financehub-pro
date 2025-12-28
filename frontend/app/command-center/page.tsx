'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Database, TrendingUp, BarChart3, Users, Calendar,
    FileText, PieChart, Activity, Zap, Clock, Server, CheckCircle2,
    AlertCircle, Layers, Globe, ChevronRight, BrainCircuit, Cpu, Sparkles
} from 'lucide-react';

interface InventoryData {
    generated_at: string;
    sections: Record<string, any>;
    aggregate: {
        total_data_points: number;
        total_stocks: number;
        total_funds: number;
        total_tables: number;
        database_health: string;
    };
}

const colorMap: Record<string, { bg: string; border: string; text: string; light: string }> = {
    emerald: { bg: 'bg-emerald-500', border: 'border-emerald-200', text: 'text-emerald-600', light: 'bg-emerald-50' },
    blue: { bg: 'bg-blue-500', border: 'border-blue-200', text: 'text-blue-600', light: 'bg-blue-50' },
    orange: { bg: 'bg-orange-500', border: 'border-orange-200', text: 'text-orange-600', light: 'bg-orange-50' },
    teal: { bg: 'bg-teal-500', border: 'border-teal-200', text: 'text-teal-600', light: 'bg-teal-50' },
    cyan: { bg: 'bg-cyan-500', border: 'border-cyan-200', text: 'text-cyan-600', light: 'bg-cyan-50' },
    amber: { bg: 'bg-amber-500', border: 'border-amber-200', text: 'text-amber-600', light: 'bg-amber-50' },
    rose: { bg: 'bg-rose-500', border: 'border-rose-200', text: 'text-rose-600', light: 'bg-rose-50' },

    lime: { bg: 'bg-lime-500', border: 'border-lime-200', text: 'text-lime-600', light: 'bg-lime-50' },
    sky: { bg: 'bg-sky-500', border: 'border-sky-200', text: 'text-sky-600', light: 'bg-sky-50' },
    yellow: { bg: 'bg-yellow-500', border: 'border-yellow-200', text: 'text-yellow-600', light: 'bg-yellow-50' },
};

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function DataCard({ section, sectionKey }: { section: any; sectionKey: string }) {
    const colors = colorMap[section.color] || colorMap.blue;

    return (
        <div className={`bg-white rounded-2xl border-2 ${colors.border} shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group`}>
            {/* Header */}
            <div className={`${colors.light} px-5 py-4 border-b ${colors.border}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{section.icon}</span>
                        <h3 className="font-bold text-gray-800">{section.title}</h3>
                    </div>
                    <div className={`${colors.bg} text-white text-xs px-3 py-1 rounded-full font-semibold`}>
                        LIVE
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
                {/* Main Metric */}
                <div className="text-center py-3">
                    <div className={`text-4xl font-black ${colors.text}`}>
                        {formatNumber(section.total_rows || section.total || 0)}
                    </div>
                    <div className="text-gray-500 text-sm mt-1">
                        {section.total_rows !== undefined ? 'Total Rows' : 'Total Items'}
                    </div>
                </div>

                {/* Sub Metrics */}
                <div className="grid grid-cols-2 gap-3">
                    {section.data_points && (
                        <div className={`${colors.light} rounded-xl p-3 text-center`}>
                            <div className={`font-bold ${colors.text}`}>{formatNumber(section.data_points)}</div>
                            <div className="text-xs text-gray-500">Data Points</div>
                        </div>
                    )}
                    {section.unique_symbols && (
                        <div className={`${colors.light} rounded-xl p-3 text-center`}>
                            <div className={`font-bold ${colors.text}`}>{section.unique_symbols}</div>
                            <div className="text-xs text-gray-500">Symbols</div>
                        </div>
                    )}
                    {section.unique_stocks && (
                        <div className={`${colors.light} rounded-xl p-3 text-center`}>
                            <div className={`font-bold ${colors.text}`}>{section.unique_stocks}</div>
                            <div className="text-xs text-gray-500">Stocks</div>
                        </div>
                    )}
                    {section.with_data && (
                        <div className={`${colors.light} rounded-xl p-3 text-center`}>
                            <div className={`font-bold ${colors.text}`}>{section.with_data}</div>
                            <div className="text-xs text-gray-500">With Data</div>
                        </div>
                    )}
                    {section.with_risk_metrics && (
                        <div className={`${colors.light} rounded-xl p-3 text-center`}>
                            <div className={`font-bold ${colors.text}`}>{section.with_risk_metrics}</div>
                            <div className="text-xs text-gray-500">With Metrics</div>
                        </div>
                    )}
                    {section.coverage !== undefined && (
                        <div className={`${colors.light} rounded-xl p-3 text-center`}>
                            <div className={`font-bold ${colors.text}`}>{section.coverage}%</div>
                            <div className="text-xs text-gray-500">Coverage</div>
                        </div>
                    )}
                </div>

                {/* Date Range */}
                {section.date_from && section.date_to && (
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 mb-1">Date Range</div>
                        <div className="text-sm font-medium text-gray-700">
                            {section.date_from} → {section.date_to}
                        </div>
                    </div>
                )}

                {/* Breakdown */}
                {section.breakdown && Object.keys(section.breakdown).length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500 mb-2">Period Breakdown</div>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(section.breakdown).map(([key, val]) => (
                                <div key={key} className={`${colors.light} ${colors.text} text-xs px-2 py-1 rounded-lg font-medium`}>
                                    {key}: {formatNumber(val as number)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CommandCenterPage() {
    const [data, setData] = useState<InventoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [aiStatus, setAiStatus] = useState<{ status: string; model: string; provider: string; tier: string } | null>(null);

    // Check AI status
    const checkAIStatus = useCallback(async () => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bhidy-financehub-api.hf.space';
            const res = await fetch(`${API_URL}/api/v1/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'ping' })
            });
            const data = await res.json();
            if (data.error) {
                setAiStatus({ status: 'rate_limited', model: '-', provider: 'Groq', tier: 'Free' });
            } else {
                setAiStatus({
                    status: 'online',
                    model: data.model_used || 'llama-3.3-70b',
                    provider: data.provider || 'Groq',
                    tier: 'Free'
                });
            }
        } catch {
            setAiStatus({ status: 'offline', model: '-', provider: '-', tier: '-' });
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Use production HuggingFace API
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bhidy-financehub-api.hf.space';
            const res = await fetch(`${API_URL}/api/v1/dashboard/summary`);
            const summary = await res.json();

            // Transform API response to InventoryData format
            const inventoryData: InventoryData = {
                generated_at: new Date().toISOString(),
                sections: {
                    stocks: { title: "Stock Tickers", icon: "📈", color: "emerald", total: summary.stocks || 0 },
                    mutual_funds: { title: "Mutual Funds", icon: "💼", color: "teal", total: summary.funds || 0 },
                    shareholders: { title: "Major Shareholders", icon: "👥", color: "amber", total_rows: summary.shareholders || 0 },
                    earnings: { title: "Earnings Calendar", icon: "📅", color: "rose", total_rows: summary.earnings || 0 },
                    financials: { title: "Financial Statements", icon: "📑", color: "blue", total_rows: summary.financials || 0 },
                    nav_history: { title: "Fund NAV History", icon: "📊", color: "cyan", total_rows: summary.nav_rows || 0 },
                    ratios: { title: "Financial Ratios", icon: "📐", color: "lime", total_rows: summary.ratios || 0 },
                    ohlc_history: { title: "OHLC Price Data", icon: "📉", color: "orange", total_rows: summary.ohlc_rows || 0 },
                },
                aggregate: {
                    // Calculate total data points same way as original:
                    // NAV has 2 columns, OHLC has 5 columns, Financials have ~10 fields
                    total_data_points:
                        ((summary.nav_rows || 0) * 2) +
                        ((summary.ohlc_rows || 0) * 5) +
                        ((summary.financials || 0) * 10) +
                        ((summary.shareholders || 0) * 3) +
                        ((summary.earnings || 0) * 5),
                    total_stocks: summary.stocks || 0,
                    total_funds: summary.funds || 0,
                    total_tables: 12,
                    database_health: (summary.nav_rows || 0) > 500000 ? "EXCELLENT" : (summary.nav_rows || 0) > 100000 ? "GOOD" : "BUILDING"
                }
            };

            setData(inventoryData);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Failed to fetch inventory:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        checkAIStatus();
    }, [fetchData, checkAIStatus]);

    useEffect(() => {
        if (autoRefresh) {
            const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh, fetchData]);

    const getHealthColor = (health: string) => {
        switch (health) {
            case 'EXCELLENT': return 'bg-gradient-to-r from-emerald-500 to-green-500';
            case 'GOOD': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
            default: return 'bg-gradient-to-r from-orange-500 to-amber-500';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
            {/* Hero Header */}
            <div className="bg-gradient-to-r from-blue-600 via-teal-500 to-cyan-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Database className="w-10 h-10" />
                                <span className="text-blue-200 text-sm font-medium">ENTERPRISE DATA PLATFORM</span>
                            </div>
                            <h1 className="text-4xl font-black tracking-tight">
                                Database Command Center
                            </h1>
                            <p className="text-blue-100 mt-2">
                                Real-time monitoring of your enterprise financial data inventory
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Auto Refresh Toggle */}
                            <button
                                onClick={() => setAutoRefresh(!autoRefresh)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${autoRefresh
                                    ? 'bg-green-400 text-green-900'
                                    : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <Activity className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
                                {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh'}
                            </button>

                            {/* Manual Refresh */}
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                Refresh Data
                            </button>
                        </div>
                    </div>

                    {/* Last Updated */}
                    {lastRefresh && (
                        <div className="mt-4 text-blue-200 text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Last updated: {lastRefresh.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Aggregate Stats Bar */}
                {data?.aggregate && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        {/* Total Data Points */}
                        <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-blue-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-blue-100 p-2 rounded-xl">
                                    <Layers className="w-6 h-6 text-blue-600" />
                                </div>
                                <span className="text-gray-500 text-sm font-medium">Total Data Points</span>
                            </div>
                            <div className="text-3xl font-black text-blue-600">
                                {formatNumber(data.aggregate.total_data_points)}
                            </div>
                        </div>

                        {/* Total Stocks */}
                        <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-emerald-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-emerald-100 p-2 rounded-xl">
                                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                                </div>
                                <span className="text-gray-500 text-sm font-medium">Stock Tickers</span>
                            </div>
                            <div className="text-3xl font-black text-emerald-600">
                                {data.aggregate.total_stocks}
                            </div>
                        </div>

                        {/* Total Funds */}
                        <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-teal-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-teal-100 p-2 rounded-xl">
                                    <PieChart className="w-6 h-6 text-teal-600" />
                                </div>
                                <span className="text-gray-500 text-sm font-medium">Mutual Funds</span>
                            </div>
                            <div className="text-3xl font-black text-teal-600">
                                {data.aggregate.total_funds}
                            </div>
                        </div>

                        {/* Total Tables */}
                        <div className="bg-white rounded-2xl shadow-lg p-5 border-2 border-orange-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-orange-100 p-2 rounded-xl">
                                    <Server className="w-6 h-6 text-orange-600" />
                                </div>
                                <span className="text-gray-500 text-sm font-medium">Data Tables</span>
                            </div>
                            <div className="text-3xl font-black text-orange-600">
                                {data.aggregate.total_tables}
                            </div>
                        </div>

                        {/* Database Health */}
                        <div className={`${getHealthColor(data.aggregate.database_health)} rounded-2xl shadow-lg p-5 text-white`}>
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle2 className="w-6 h-6" />
                                <span className="text-white/80 text-sm font-medium">Database Health</span>
                            </div>
                            <div className="text-3xl font-black">
                                {data.aggregate.database_health}
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Advisor Status Card - Ultra Premium */}
                <div className="mb-8">
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-3xl shadow-2xl p-6 text-white overflow-hidden relative">
                        {/* Animated background glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                        <BrainCircuit className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">AI Advisor Status</h3>
                                        <p className="text-blue-300 text-sm">Real-time LLM monitoring</p>
                                    </div>
                                </div>
                                <button
                                    onClick={checkAIStatus}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Check Status
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Status */}
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-3 h-3 rounded-full ${aiStatus?.status === 'online' ? 'bg-emerald-400 animate-pulse' : aiStatus?.status === 'rate_limited' ? 'bg-amber-400' : 'bg-red-400'}`}></div>
                                        <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Status</span>
                                    </div>
                                    <div className="text-xl font-bold capitalize">
                                        {aiStatus?.status === 'online' ? '🟢 Online' : aiStatus?.status === 'rate_limited' ? '🟡 Rate Limited' : '🔴 Offline'}
                                    </div>
                                </div>

                                {/* Provider */}
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Cpu className="w-4 h-4 text-white/60" />
                                        <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Provider</span>
                                    </div>
                                    <div className="text-xl font-bold">
                                        {aiStatus?.provider || 'Groq'}
                                    </div>
                                </div>

                                {/* Model */}
                                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 text-white/60" />
                                        <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Model</span>
                                    </div>
                                    <div className="text-lg font-bold truncate">
                                        {aiStatus?.model?.split('-').slice(-2).join('-') || 'Llama 3.3'}
                                    </div>
                                </div>

                                {/* Tier */}
                                <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-4 border border-amber-500/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-4 h-4 text-amber-400" />
                                        <span className="text-amber-300 text-xs font-medium uppercase tracking-wider">Tier</span>
                                    </div>
                                    <div className="text-xl font-bold text-amber-400">
                                        Free Tier
                                    </div>
                                    <div className="text-xs text-amber-300/70 mt-1">~20 req/day</div>
                                </div>
                            </div>

                            {/* Usage Bar */}
                            <div className="mt-6 bg-white/5 rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-white/70">Daily Token Usage (Estimated)</span>
                                    <span className="text-sm font-bold text-blue-400">~50% Used</span>
                                </div>
                                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: '50%' }}></div>
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-white/50">
                                    <span>0 tokens</span>
                                    <span>~50K / 100K tokens</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section Title */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-2 rounded-xl">
                        <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Data Inventory by Category</h2>
                </div>

                {/* Data Cards Grid */}
                {loading && !data ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : data?.sections ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Object.entries(data.sections).map(([key, section]) => (
                            <DataCard key={key} section={section} sectionKey={key} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                        <p>Failed to load inventory data</p>
                    </div>
                )}

                {/* Footer Stats */}
                <div className="mt-12 bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Globe className="w-8 h-8 text-blue-500" />
                            <div>
                                <h3 className="font-bold text-gray-800">FinanceHub Pro Enterprise Database</h3>
                                <p className="text-gray-500 text-sm">Made with ❤️ by Bhidy</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Generated at</div>
                            <div className="font-mono text-gray-700">{data?.generated_at ? new Date(data.generated_at).toLocaleString() : '-'}</div>
                        </div>
                    </div>
                </div>            </div>
        </div>
    );
}
