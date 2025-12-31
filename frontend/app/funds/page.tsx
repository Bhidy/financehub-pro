"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Loader2, TrendingUp, Sparkles, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Globe, Shield } from "lucide-react";
import { ResponsiveContainer, Area, AreaChart } from "recharts";
import { fetchFunds, fetchFundNav } from "@/lib/api";
import clsx from "clsx";

// Helpers for safety (Enterprise Standard)
const safeNumber = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isFinite(num) ? num : null;
};

interface MutualFund {
    fund_id: string;
    fund_name: string;
    fund_type: string;
    manager_name: string;
    latest_nav: number | string;
    expense_ratio: number | string | null;
    minimum_investment: number | string | null;
    ytd_return: number | string | null;
    one_year_return: number | string | null;
    three_year_return: number | string | null;
    five_year_return: number | string | null;
    sharpe_ratio: number | string | null;
    standard_deviation: number | string | null;
}

// Mini chart component for each fund card
function MiniNavChart({ fundId }: { fundId: string }) {
    const { data: navHistory, isLoading } = useQuery({
        queryKey: ["fund-nav-mini", fundId],
        queryFn: async () => {
            const data = await fetchFundNav(fundId, 30);
            return Array.isArray(data) ? data.reverse() : [];
        },
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="h-[60px] flex items-center justify-center text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin" />
            </div>
        );
    }

    if (!navHistory || navHistory.length < 2) {
        return (
            <div className="h-[60px] flex items-center justify-center text-slate-300 text-[10px]">
                No chart data
            </div>
        );
    }

    const firstNav = safeNumber(navHistory[0]?.nav) || 0;
    const lastNav = safeNumber(navHistory[navHistory.length - 1]?.nav) || 0;
    const isPositive = lastNav >= firstNav;

    return (
        <div className="h-[60px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={navHistory} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`gradient-${fundId}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="nav"
                        stroke={isPositive ? "#10b981" : "#ef4444"}
                        strokeWidth={1.5}
                        fill={`url(#gradient-${fundId})`}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

// Sorting & Period options
type SortOption = "name" | "nav" | "performance";
type PeriodOption = "ytd" | "1y" | "3y" | "5y";

const metricConfig: Record<PeriodOption, { label: string, key: keyof MutualFund }> = {
    "ytd": { label: "YTD Return", key: "ytd_return" },
    "1y": { label: "1 Year Return", key: "one_year_return" },
    "3y": { label: "3 Years Return", key: "three_year_return" },
    "5y": { label: "5 Years Return", key: "five_year_return" },
};

export default function MutualFundsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("All");

    // Explicitly separate Sort By and Period View
    const [sortBy, setSortBy] = useState<SortOption>("performance");
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("ytd");

    // Fetch all mutual funds
    const { data: funds = [], isLoading } = useQuery({
        queryKey: ["funds"],
        queryFn: fetchFunds,
    });

    // Filter and sort funds
    const filteredFunds = funds
        .filter((fund: MutualFund) => {
            const matchesSearch = fund.fund_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                fund.manager_name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === "All" || (fund.fund_type && fund.fund_type.includes(filterType));
            return matchesSearch && matchesType;
        })
        .sort((a: MutualFund, b: MutualFund) => {
            if (sortBy === "name") return a.fund_name.localeCompare(b.fund_name);
            if (sortBy === "nav") return (Number(b.latest_nav) || 0) - (Number(a.latest_nav) || 0);

            // Sort by Performance based on SELECTED PERIOD
            const key = metricConfig[selectedPeriod].key;
            const valA = Number(a[key] || -9999);
            const valB = Number(b[key] || -9999);
            return valB - valA;
        });

    const fundTypes = ["All", "Equity", "Real Estate", "Mixed", "Money", "Sector"];

    // Dynamic stats based on selected period
    const currentMetricInfo = metricConfig[selectedPeriod];

    // Calculate Averages for the selected period across visible funds
    const fundsWithData = funds.filter((f: MutualFund) => safeNumber(f[currentMetricInfo.key]) !== null);
    const avgReturn = fundsWithData.length > 0
        ? fundsWithData.reduce((sum: number, f: MutualFund) => sum + (Number(f[currentMetricInfo.key]) || 0), 0) / fundsWithData.length
        : 0;

    const positiveCount = fundsWithData.filter((f: MutualFund) => (Number(f[currentMetricInfo.key]) || 0) > 0).length;
    const negativeCount = fundsWithData.filter((f: MutualFund) => (Number(f[currentMetricInfo.key]) || 0) < 0).length;

    const avgNav = funds.length > 0
        ? funds.reduce((sum: number, f: MutualFund) => sum + (Number(f.latest_nav) || 0), 0) / funds.length
        : 0;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-12">
            {/* Premium Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white shadow-lg">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg border border-white/20">
                            💼
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Mutual Funds Center</h1>
                            <p className="text-blue-100 font-medium">{funds.length} funds • Real-time analytics</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Summary Statistics (Dynamic based on selected period) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 -mt-10 relative z-20">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100" />
                        <BarChart3 className="w-5 h-5 text-blue-500 mb-2" />
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Funds</div>
                        <div className="text-3xl font-black text-slate-900 font-mono">{funds.length}</div>
                        <div className="text-xs font-bold text-blue-600 mt-1">Active Universe</div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100" />
                        <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg NAV</div>
                        <div className="text-3xl font-black text-emerald-600 font-mono">SAR {avgNav.toFixed(2)}</div>
                        <div className="text-xs font-bold text-emerald-700 mt-1">Weighted Average</div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100" />
                        <Sparkles className="w-5 h-5 text-orange-500 mb-2" />
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg {currentMetricInfo.label}</div>
                        <div className={clsx(
                            "text-3xl font-black font-mono",
                            avgReturn >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                            {avgReturn >= 0 ? "+" : ""}{avgReturn.toFixed(2)}%
                        </div>
                        <div className="text-xs font-bold text-orange-600 mt-1">Market Average</div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100" />
                        <PieChart className="w-5 h-5 text-purple-500 mb-2" />
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{currentMetricInfo.label.split(' ')[0]} Performance</div>
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-emerald-600 flex items-center">{positiveCount} <ArrowUpRight className="w-3 h-3 ml-0.5" /></span>
                            <span className="text-slate-300">|</span>
                            <span className="text-lg font-black text-red-600 flex items-center">{negativeCount} <ArrowDownRight className="w-3 h-3 ml-0.5" /></span>
                        </div>
                        <div className="text-xs font-bold text-purple-600 mt-1">Gainers vs Losers</div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 mb-6 sticky top-4 z-40">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Search */}
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search funds..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                dir="auto"
                            />
                        </div>

                        {/* Controls */}
                        <div className="flex gap-3 overflow-x-auto max-w-full pb-1 md:pb-0 items-center">
                            {/* Sort By */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:border-blue-500 focus:outline-none bg-white text-slate-700 cursor-pointer hover:border-blue-400 transition-colors"
                            >
                                <option value="performance">Highest Return ({selectedPeriod.toUpperCase()})</option>
                                <option value="nav">Highest NAV</option>
                                <option value="name">Name (A-Z)</option>
                            </select>

                            {/* Period Selector (The user request) */}
                            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                {Object.keys(metricConfig).map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedPeriod(key as PeriodOption)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase",
                                            selectedPeriod === key
                                                ? "bg-white text-blue-600 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                                        )}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Fund Categories */}
                    <div className="flex gap-2 overflow-x-auto mt-4 pb-2 border-t border-slate-50 pt-4 scrollbar-hide">
                        {fundTypes.map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap",
                                    filterType === type
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fund Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-3 text-center py-20 flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                            <p className="text-slate-500 font-bold text-lg">Loading Market Data...</p>
                        </div>
                    ) : (
                        filteredFunds?.slice(0, 30).map((fund: MutualFund) => {
                            const returnKey = currentMetricInfo.key;
                            const rawVal = fund[returnKey];
                            const returnValue = safeNumber(rawVal) || 0;
                            const hasReturnValue = rawVal !== null && rawVal !== undefined && rawVal !== '';
                            const isPositive = returnValue >= 0;

                            const sharpeRatio = safeNumber(fund.sharpe_ratio);

                            return (
                                <div
                                    key={fund.fund_id}
                                    onClick={() => router.push(`/funds/${fund.fund_id}`)}
                                    className="bg-white rounded-3xl transition-all cursor-pointer border border-slate-100 shadow-lg hover:shadow-2xl hover:border-blue-200/50 hover:-translate-y-1 overflow-hidden group flex flex-col"
                                >
                                    {/* Card Header */}
                                    <div className="p-5 flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 pr-3">
                                                <h3 className="text-sm font-black text-slate-800 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight" dir="auto">
                                                    {fund.fund_name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    <Shield className="w-3 h-3" />
                                                    {fund.manager_name}
                                                </div>
                                            </div>
                                            <span className={clsx(
                                                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 border",
                                                fund.fund_type?.includes("Real Estate") ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                    fund.fund_type?.includes("Equity") ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                        fund.fund_type?.includes("Money") ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                            "bg-slate-50 text-slate-600 border-slate-100"
                                            )}>
                                                {fund.fund_type?.split(' ')[0] || 'Fund'}
                                            </span>
                                        </div>

                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
                                                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">NAV</div>
                                                <div className="text-lg font-black text-slate-900 font-mono flex items-baseline gap-1">
                                                    {Number(fund.latest_nav).toFixed(2)}
                                                    <span className="text-[10px] text-slate-400 font-sans">SAR</span>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "rounded-2xl p-3 border",
                                                isPositive ? "bg-emerald-50/30 border-emerald-100/50" : "bg-red-50/30 border-red-100/50"
                                            )}>
                                                <div className="text-[9px] uppercase font-bold text-slate-400 mb-1">{currentMetricInfo.label}</div>
                                                <div className={clsx(
                                                    "text-lg font-black font-mono flex items-center gap-1",
                                                    isPositive ? "text-emerald-600" : "text-red-500",
                                                    !hasReturnValue && "text-slate-300"
                                                )}>
                                                    {hasReturnValue ? (
                                                        <>
                                                            {isPositive ? "+" : ""}{returnValue.toFixed(2)}%
                                                        </>
                                                    ) : (
                                                        <span className="text-sm">—</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mini Chart */}
                                    <div className="px-5 pb-4">
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="text-[9px] font-bold text-slate-400 uppercase">30-Day Trend</div>
                                            {sharpeRatio !== null && (
                                                <div className={clsx(
                                                    "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                                                    sharpeRatio >= 1 ? "bg-green-50 text-green-700 border-green-100" : "bg-slate-50 text-slate-500 border-slate-100"
                                                )}>
                                                    Sharpe: {sharpeRatio.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="h-[50px] w-full rounded-xl overflow-hidden bg-slate-50/50 border border-slate-100">
                                            <MiniNavChart fundId={fund.fund_id} />
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 flex justify-between items-center group-hover:bg-blue-50/30 transition-colors">
                                        <span className="text-[10px] font-bold text-slate-400">ID: {fund.fund_id}</span>
                                        <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">Analysis →</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Show More Info */}
                {filteredFunds.length > 30 && (
                    <div className="text-center mt-12 mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                            <InfoIcon className="w-3 h-3" />
                            Showing top 30 of {filteredFunds.length} funds
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {filteredFunds.length === 0 && !isLoading && (
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center max-w-lg mx-auto mt-12">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No matching funds found</h3>
                        <p className="text-slate-500 mb-6">Try adjusting your filters or search terms to find what you're looking for.</p>
                        <button
                            onClick={() => { setSearchTerm(""); setFilterType("All"); }}
                            className="text-blue-600 font-bold text-sm hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}

function InfoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
    )
}
