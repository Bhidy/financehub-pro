"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Search, Loader2, TrendingUp, Sparkles, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Globe, Shield, LayoutGrid, List, Filter } from "lucide-react";
import { ResponsiveContainer, Area, AreaChart } from "recharts";
import { fetchFunds } from "@/lib/api";
import { useMarketSafe } from "@/contexts/MarketContext";
import clsx from "clsx";
import FundsTable from "@/components/funds/FundsTable";
import MiniNavChart from "@/components/funds/MiniNavChart";

// Helpers for safety (Enterprise Standard)
const safeNumber = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isFinite(num) ? num : null;
};

interface MutualFund {
    fund_id: string;
    fund_name: string;
    fund_name_en: string | null;
    fund_type: string | null;
    manager_name: string;
    manager_name_en: string | null;
    manager: string | null;
    latest_nav: number | string;
    expense_ratio: number | string | null;
    minimum_investment: number | string | null;
    ytd_return: number | string | null;
    one_year_return: number | string | null;
    three_year_return: number | string | null;
    five_year_return: number | string | null;
    profit_3month: number | string | null;
    sharpe_ratio: number | string | null;
    standard_deviation: number | string | null;
    market_code: string | null;
    eligibility: string | null;
    investment_strategy: string | null;
    establishment_date: string | null;
    last_update_date: string | null;

    // Decypha Fields
    aum_millions: number | string | null;
    is_shariah: boolean | null;
    currency: string | null;
    returns_3m: number | string | null;
    returns_1y: number | string | null;
    returns_ytd: number | string | null;
    returns_3y: number | string | null;
    returns_5y: number | string | null;
    issuer: string | null;
}

// Sorting & Period options
type SortOption = "name" | "nav" | "performance";
type PeriodOption = "3m" | "ytd" | "1y" | "3y" | "5y";
type ViewMode = "grid" | "table";

// Metric Config (Mapped to preferred columns)
const metricConfig: Record<PeriodOption, { label: string, key: keyof MutualFund | string }> = {
    "3m": { label: "3 Months Return", key: "returns_3m" },
    "ytd": { label: "YTD Return", key: "returns_ytd" },
    "1y": { label: "1 Year Return", key: "returns_1y" },
    "3y": { label: "3 Years Return", key: "three_year_return" },
    "5y": { label: "5 Years Return", key: "five_year_return" },
};

// Helper to get metric value with fallback to legacy columns
const getMetric = (fund: MutualFund, period: PeriodOption): number => {
    let val: any = null;
    if (period === "3m") val = fund.returns_3m ?? fund.profit_3month;
    else if (period === "ytd") val = fund.returns_ytd ?? fund.ytd_return;
    else if (period === "1y") val = fund.returns_1y ?? fund.one_year_return;
    else if (period === "3y") val = fund.returns_3y ?? fund.three_year_return;
    else if (period === "5y") val = fund.returns_5y ?? fund.five_year_return;

    return safeNumber(val) || 0;
};

export default function MutualFundsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [isShariahOnly, setIsShariahOnly] = useState(false);

    // Use global MarketContext (synced with sidebar selection)
    const { market, setMarket, config, isEgypt, isSaudi } = useMarketSafe();

    // Explicitly separate Sort By and Period View
    const [sortBy, setSortBy] = useState<SortOption>("performance");
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("ytd");

    // Fetch mutual funds with market filter (Uses sidebar selection)
    const { data: funds = [], isLoading } = useQuery({
        queryKey: ["funds", market],
        queryFn: () => fetchFunds(isEgypt ? "EGX" : "TDWL"),
    });

    // Filter and sort funds
    const filteredFunds = funds
        .filter((fund: MutualFund) => {
            const matchesSearch = fund.fund_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                fund.manager_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                fund.manager?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = filterType === "All" || (fund.fund_type && fund.fund_type.includes(filterType));
            const matchesShariah = !isShariahOnly || fund.is_shariah;

            return matchesSearch && matchesType && matchesShariah;
        })
        .sort((a: MutualFund, b: MutualFund) => {
            if (sortBy === "name") return a.fund_name.localeCompare(b.fund_name);
            if (sortBy === "nav") return (Number(b.latest_nav) || 0) - (Number(a.latest_nav) || 0);

            // Sort by Performance based on SELECTED PERIOD
            const valA = getMetric(a, selectedPeriod);
            const valB = getMetric(b, selectedPeriod);
            return valB - valA;
        });

    const fundTypes = ["All", "Equity", "Fixed Income", "Real Estate", "Mixed", "Money Market", "Islamic"];

    // Dynamic stats based on selected period
    const currentMetricInfo = metricConfig[selectedPeriod];

    // Calculate Averages for the selected period across visible funds
    const fundsWithData = funds.filter((f: MutualFund) => safeNumber(getMetric(f, selectedPeriod)) !== null);
    const avgReturn = fundsWithData.length > 0
        ? fundsWithData.reduce((sum: number, f: MutualFund) => sum + (getMetric(f, selectedPeriod) || 0), 0) / fundsWithData.length
        : 0;

    const positiveCount = fundsWithData.filter((f: MutualFund) => (getMetric(f, selectedPeriod) || 0) > 0).length;
    const negativeCount = fundsWithData.filter((f: MutualFund) => (getMetric(f, selectedPeriod) || 0) < 0).length;

    const avgNav = funds.length > 0
        ? funds.reduce((sum: number, f: MutualFund) => sum + (Number(f.latest_nav) || 0), 0) / funds.length
        : 0;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-[#0B1121] dark:via-[#0F1629] dark:to-[#0B1121] pb-12">
            {/* Premium Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white shadow-lg pb-12">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg border border-white/20">
                                💼
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight">Mutual Funds Center</h1>
                                <p className="text-blue-100 font-medium">{funds.length} {isEgypt ? "Egypt" : "Saudi"} funds • Real-time analytics</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Link href='/funds/statistics' className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20 text-white font-bold text-sm transition-all flex items-center gap-2 group">
                                <BarChart3 className="w-4 h-4" />
                                <span className="hidden md:inline">Market Statistics</span>
                                <ArrowUpRight className="w-3 h-3 text-blue-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </Link>

                            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20 flex items-center gap-2">
                                <span className="text-lg font-bold">{isEgypt ? "🇪🇬 Egypt" : "🇸🇦 KSA"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Summary Statistics (Dynamic based on selected period) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 -mt-16 relative z-20">
                    <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl shadow-xl border border-slate-100 dark:border-white/5 p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100" />
                        <BarChart3 className="w-5 h-5 text-blue-500 mb-2" />
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Funds</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">{funds.length}</div>
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">Active Universe</div>
                    </div>

                    <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl shadow-xl border border-slate-100 dark:border-white/5 p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100" />
                        <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Avg NAV</div>
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{config.currency} {avgNav.toFixed(2)}</div>
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-500 mt-1">Weighted Average</div>
                    </div>

                    <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl shadow-xl border border-slate-100 dark:border-white/5 p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100" />
                        <Sparkles className="w-5 h-5 text-orange-500 mb-2" />
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Avg {currentMetricInfo.label}</div>
                        <div className={clsx(
                            "text-3xl font-black font-mono",
                            avgReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        )}>
                            {avgReturn >= 0 ? "+" : ""}{avgReturn.toFixed(2)}%
                        </div>
                        <div className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1">Market Average</div>
                    </div>

                    <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl shadow-xl border border-slate-100 dark:border-white/5 p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100" />
                        <PieChart className="w-5 h-5 text-purple-500 mb-2" />
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{currentMetricInfo.label.split(' ')[0]} Performance</div>
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center">{positiveCount} <ArrowUpRight className="w-3 h-3 ml-0.5" /></span>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <span className="text-lg font-black text-red-600 dark:text-red-400 flex items-center">{negativeCount} <ArrowDownRight className="w-3 h-3 ml-0.5" /></span>
                        </div>
                        <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1">Gainers vs Losers</div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl shadow-lg border border-slate-100 dark:border-white/5 p-4 mb-6 sticky top-4 z-40">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Search */}
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search funds or managers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-white/10 dark:bg-white/5 rounded-xl text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
                                dir="auto"
                            />
                        </div>

                        {/* Controls */}
                        <div className="flex gap-3 overflow-x-auto max-w-full pb-1 md:pb-0 items-center">

                            {/* View Toggle */}
                            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={clsx(
                                        "p-2 rounded-lg transition-all",
                                        viewMode === "grid" ? "bg-white dark:bg-[#151925] text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    )}
                                    title="Grid View"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("table")}
                                    className={clsx(
                                        "p-2 rounded-lg transition-all",
                                        viewMode === "table" ? "bg-white dark:bg-[#151925] text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    )}
                                    title="Table View"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Sort By (Only for Grid) */}
                            {viewMode === "grid" && (
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:border-blue-500 focus:outline-none bg-white dark:bg-[#1A1F2E] text-slate-700 dark:text-white cursor-pointer hover:border-blue-400 transition-colors"
                                >
                                    <option value="performance">Highest Return</option>
                                    <option value="nav">Highest NAV</option>
                                    <option value="name">Name (A-Z)</option>
                                </select>
                            )}

                            {/* Shariah Toggle */}
                            <button
                                onClick={() => setIsShariahOnly(!isShariahOnly)}
                                className={clsx(
                                    "px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all shrink-0",
                                    isShariahOnly
                                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                                        : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20"
                                )}
                            >
                                <Shield className="w-4 h-4" />
                                <span className="hidden sm:inline">Shariah</span>
                            </button>

                            {/* Period Selector (The user request) */}
                            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                {Object.keys(metricConfig).map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedPeriod(key as PeriodOption)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase",
                                            selectedPeriod === key
                                                ? "bg-white dark:bg-[#151925] text-blue-600 dark:text-blue-400 shadow-sm"
                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10"
                                        )}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Fund Categories */}
                    <div className="flex gap-2 overflow-x-auto mt-4 pb-2 border-t border-slate-50 dark:border-white/5 pt-4 scrollbar-hide items-center">
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2">
                            <Filter className="w-3 h-3" />
                            Type
                        </div>
                        {fundTypes.map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap",
                                    filterType === type
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                                        : "bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fund Content - Grid or Table */}
                {isLoading ? (
                    <div className="col-span-3 text-center py-20 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                        <p className="text-slate-500 font-bold text-lg">Loading Market Data...</p>
                    </div>
                ) : filteredFunds.length === 0 ? (
                    <div className="bg-white dark:bg-[#1A1F2E] rounded-3xl shadow-xl border border-slate-100 dark:border-white/5 p-16 text-center max-w-lg mx-auto mt-12">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No matching funds found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">Try adjusting your filters or search terms to find what you're looking for.</p>
                        <button
                            onClick={() => { setSearchTerm(""); setFilterType("All"); setIsShariahOnly(false); }}
                            className="text-blue-600 dark:text-blue-400 font-bold text-sm hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : viewMode === "table" ? (
                    <FundsTable funds={filteredFunds} />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredFunds?.slice(0, 30).map((fund: MutualFund) => {
                            const returnValue = getMetric(fund, selectedPeriod);
                            const hasReturnValue = returnValue !== null && returnValue !== 0; // approximate check
                            const isPositive = returnValue >= 0;

                            const sharpeRatio = safeNumber(fund.sharpe_ratio);

                            return (
                                <div
                                    key={fund.fund_id}
                                    onClick={() => router.push(`/funds/${fund.fund_id}`)}
                                    className="group relative bg-white dark:bg-[#1A1F2E] rounded-2xl transition-all duration-300 cursor-pointer border border-slate-200/60 dark:border-white/5 shadow-lg hover:shadow-2xl hover:border-blue-300/50 dark:hover:border-blue-500/30 hover:-translate-y-2 overflow-hidden"
                                >
                                    {/* Premium Gradient Header Band */}
                                    <div className={clsx(
                                        "h-2 w-full",
                                        fund.fund_type?.includes("Equity") ? "bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400" :
                                            fund.fund_type?.includes("Real Estate") ? "bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-400" :
                                                fund.fund_type?.includes("Money") ? "bg-gradient-to-r from-emerald-500 via-green-400 to-teal-400" :
                                                    fund.fund_type?.includes("Fixed") ? "bg-gradient-to-r from-purple-500 via-violet-400 to-indigo-400" :
                                                        "bg-gradient-to-r from-slate-500 via-slate-400 to-slate-300"
                                    )} />

                                    {/* Card Content */}
                                    <div className="p-5">
                                        {/* Header Row: Name + Badges */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 pr-3">
                                                <h3 className="text-base font-extrabold text-slate-800 dark:text-white mb-1.5 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug" dir="auto">
                                                    {fund.fund_name_en || fund.fund_name}
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                                                    <span className="truncate max-w-[140px]">{fund.manager || fund.manager_name_en || fund.manager_name || 'Unknown'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 items-end shrink-0">
                                                <span className={clsx(
                                                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                                                    fund.fund_type?.includes("Real Estate") ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                                                        fund.fund_type?.includes("Equity") ? "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" :
                                                            fund.fund_type?.includes("Money") ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                                                                fund.fund_type?.includes("Fixed") ? "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400" :
                                                                    "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                                                )}>
                                                    {fund.fund_type?.split(' ')[0] || 'Fund'}
                                                </span>
                                                {fund.is_shariah && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-green-100 text-green-700 flex items-center gap-0.5">
                                                        <Shield className="w-2.5 h-2.5" /> Shariah
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Premium Metrics Glass Cards */}
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {/* NAV Card */}
                                            <div className="relative bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-white/5 dark:to-white/5 rounded-xl p-3.5 border border-slate-200/50 dark:border-white/5 overflow-hidden">
                                                <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-xl" />
                                                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">Latest NAV</div>
                                                <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                                                    {Number(fund.latest_nav || 0).toFixed(2)}
                                                </div>
                                                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{config.currency}</div>
                                            </div>

                                            {/* Return Card */}
                                            <div className={clsx(
                                                "relative rounded-xl p-3.5 border overflow-hidden",
                                                isPositive
                                                    ? "bg-gradient-to-br from-emerald-50 to-green-50/50 dark:from-emerald-500/10 dark:to-emerald-900/10 border-emerald-200/50 dark:border-emerald-500/20"
                                                    : "bg-gradient-to-br from-red-50 to-rose-50/50 dark:from-red-500/10 dark:to-red-900/10 border-red-200/50 dark:border-red-500/20"
                                            )}>
                                                <div className={clsx(
                                                    "absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl",
                                                    isPositive ? "bg-emerald-200/30 dark:bg-emerald-500/20" : "bg-red-200/30 dark:bg-red-500/20"
                                                )} />
                                                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1">{currentMetricInfo.label.split(' ')[0]}</div>
                                                <div className={clsx(
                                                    "text-2xl font-black font-mono tracking-tight flex items-center gap-1",
                                                    hasReturnValue ? (isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400") : "text-slate-300 dark:text-slate-600"
                                                )}>
                                                    {hasReturnValue ? (
                                                        <>
                                                            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                                            {isPositive ? "+" : ""}{returnValue.toFixed(1)}%
                                                        </>
                                                    ) : (
                                                        <span className="text-lg">—</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sparkline Chart */}
                                        <div className="mb-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">30-Day Performance</span>
                                                {sharpeRatio !== null && (
                                                    <span className={clsx(
                                                        "text-[9px] font-bold px-2 py-0.5 rounded-full",
                                                        sharpeRatio >= 1 ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                                                    )}>
                                                        Sharpe {sharpeRatio.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="h-12 w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-white/5 dark:to-white/5 border border-slate-100 dark:border-white/5">
                                                <MiniNavChart fundId={fund.fund_id} ytdReturn={fund.ytd_return} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Premium Action Footer */}
                                    <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 via-slate-50 to-blue-50/30 dark:from-white/5 dark:via-white/5 dark:to-blue-900/10 border-t border-slate-100 dark:border-white/5 flex justify-between items-center group-hover:from-blue-50/50 dark:group-hover:from-blue-900/20 group-hover:to-cyan-50/30 dark:group-hover:to-cyan-900/20 transition-all">
                                        <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">{fund.fund_id}</span>
                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                                            View Details <ArrowUpRight className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Show More Info */}
                {filteredFunds.length > 30 && viewMode === "grid" && (
                    <div className="text-center mt-12 mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-xs font-bold">
                            <InfoIcon className="w-3 h-3" />
                            Showing top 30 of {filteredFunds.length} funds
                        </div>
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
    );
}
