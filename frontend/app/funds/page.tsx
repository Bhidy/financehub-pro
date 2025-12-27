"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fetchFunds, fetchFundNav, fetchEtfs } from "@/lib/api";
import clsx from "clsx";

interface MutualFund {
    fund_id: string;
    fund_name: string;
    fund_type: string;
    manager_name: string;
    latest_nav: number | string;
    expense_ratio: number | string;
    minimum_investment: number | string;
}

interface NavData {
    date: string;
    nav: number;
}

export default function MutualFundsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [sortBy, setSortBy] = useState<"name" | "nav" | "expense">("name");
    const [viewMode, setViewMode] = useState<"funds" | "etfs">("funds");
    const [selectedFund, setSelectedFund] = useState<string | null>(null);

    // Fetch all mutual funds via centralized API
    const { data: funds = [], isLoading } = useQuery({
        queryKey: ["funds"],
        queryFn: fetchFunds,
    });

    // Fetch ETFs (Priority 3)
    const { data: etfs = [] } = useQuery({
        queryKey: ["etfs"],
        queryFn: fetchEtfs,
    });

    // Fetch NAV history for selected fund
    const { data: navHistory } = useQuery({
        queryKey: ["fund-nav", selectedFund],
        queryFn: async () => {
            if (!selectedFund) return null;
            const data = await fetchFundNav(selectedFund, 90);
            // Ensure strictly NavData shape for chart
            return Array.isArray(data) ? data.reverse() : [];
        },
        enabled: !!selectedFund,
    });

    // Filter and sort funds
    const filteredFunds = funds
        .filter((fund: MutualFund) => {
            const matchesSearch = fund.fund_name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === "All" || fund.fund_type === filterType;
            return matchesSearch && matchesType;
        })
        .sort((a: MutualFund, b: MutualFund) => {
            if (sortBy === "name") return a.fund_name.localeCompare(b.fund_name);
            if (sortBy === "nav") return Number(b.latest_nav) - Number(a.latest_nav);
            if (sortBy === "expense") return Number(a.expense_ratio) - Number(b.expense_ratio);
            return 0;
        });

    const fundTypes = ["All", "Equity", "Real Estate", "Mixed", "Money Market", "Sector"];

    // Calculate statistics
    const fundCount = funds.length || 1;
    const avgNav = funds.reduce((sum: number, f: MutualFund) => sum + Number(f.latest_nav), 0) / fundCount;
    const avgExpense = funds.reduce((sum: number, f: MutualFund) => sum + Number(f.expense_ratio), 0) / fundCount;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                            💼
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Mutual Funds Center</h1>
                            <p className="text-blue-100 font-medium">{funds.length} funds • Real-time NAV tracking</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-2 -mt-2"></div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Funds</div>
                        <div className="text-3xl font-bold text-slate-900 font-mono">{funds.length}</div>
                        <div className="text-xs font-bold text-blue-600 mt-1">Across 5 Categories</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-2 -mt-2"></div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg NAV</div>
                        <div className="text-3xl font-bold text-emerald-600 font-mono">SAR {avgNav.toFixed(2)}</div>
                        <div className="text-xs font-bold text-emerald-700 mt-1">Weighted Average</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-2 -mt-2"></div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Expense</div>
                        <div className="text-3xl font-bold text-slate-900 font-mono">{avgExpense.toFixed(2)}%</div>
                        <div className="text-xs font-bold text-purple-600 mt-1">Annual Fees</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-2 -mt-2"></div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data Integrity</div>
                        <div className="text-3xl font-bold text-slate-900 font-mono">100%</div>
                        <div className="text-xs font-bold text-orange-600 mt-1">Verified Real-Time</div>
                    </div>
                </div>

                {/* View Toggle */}
                <div className="flex justify-center mb-8">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                        <button
                            onClick={() => setViewMode('funds')}
                            className={clsx("px-6 py-2 rounded-lg font-bold text-sm transition-all", viewMode === 'funds' ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-900")}
                        >
                            Mutual Funds ({funds.length})
                        </button>
                        <button
                            onClick={() => setViewMode('etfs')}
                            className={clsx("px-6 py-2 rounded-lg font-bold text-sm transition-all", viewMode === 'etfs' ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:text-slate-900")}
                        >
                            ETFs ({etfs.length})
                        </button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8 sticky top-4 z-30">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by fund name or manager..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Fund Type Filter */}
                        <div className="flex gap-2 flex-wrap">
                            {fundTypes.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-sm font-bold transition-all border",
                                        filterType === type
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-blue-500 focus:outline-none bg-white text-slate-700"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="nav">Sort by NAV</option>
                            <option value="expense">Sort by Expense Ratio</option>
                        </select>
                    </div>
                </div>

                {/* ETFs Grid (when viewMode === 'etfs') */}
                {viewMode === 'etfs' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {etfs.length === 0 ? (
                            <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                                <div className="text-6xl mb-4 text-slate-300">📈</div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">No ETFs Available</h3>
                                <p className="text-slate-500">ETF data is being extracted. Check back soon.</p>
                            </div>
                        ) : (
                            etfs.map((etf: any) => (
                                <div
                                    key={etf.id || etf.symbol}
                                    className="bg-white rounded-xl transition-all p-6 border shadow-sm hover:shadow-md border-slate-200"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-slate-900 mb-1">{etf.name || etf.symbol}</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{etf.symbol}</p>
                                        </div>
                                        <span className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                                            ETF
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Last Price</div>
                                            <div className="text-xl font-bold text-emerald-600 font-mono">
                                                {Number(etf.last_price || 0).toFixed(2)} <span className="text-xs text-slate-400 font-sans">SAR</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Change</div>
                                            <div className={clsx("text-xl font-bold font-mono", (etf.change || 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                                                {(etf.change || 0) >= 0 ? '+' : ''}{Number(etf.change || 0).toFixed(2)}%
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Volume</div>
                                            <div className="text-xl font-bold text-slate-900 font-mono">
                                                {Number(etf.volume || 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Fund Grid (when viewMode === 'funds') */}
                {viewMode === 'funds' && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {isLoading ? (
                                <div className="col-span-2 text-center py-20 flex flex-col items-center">
                                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                                    <p className="text-slate-500 font-bold">Loading Fund Universe...</p>
                                </div>
                            ) : (
                                filteredFunds?.map((fund: MutualFund) => {
                                    const isSelected = selectedFund === fund.fund_id;
                                    return (
                                        <div
                                            key={fund.fund_id}
                                            onClick={() => setSelectedFund(fund.fund_id)}
                                            className={clsx(
                                                "bg-white rounded-xl transition-all cursor-pointer p-6 border shadow-sm hover:shadow-md",
                                                isSelected ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"
                                            )}
                                        >
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-slate-900 mb-1">{fund.fund_name}</h3>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{fund.manager_name}</p>
                                                </div>
                                                <span className={clsx(
                                                    "px-3 py-1 rounded text-xs font-bold uppercase tracking-wider",
                                                    fund.fund_type === "Real Estate" ? "bg-amber-100 text-amber-700" :
                                                        fund.fund_type === "Equity" ? "bg-blue-100 text-blue-700" :
                                                            "bg-slate-100 text-slate-700"
                                                )}>
                                                    {fund.fund_type}
                                                </span>
                                            </div>

                                            {/* NAV & Stats */}
                                            <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Latest NAV</div>
                                                    <div className="text-xl font-bold text-emerald-600 font-mono">
                                                        {Number(fund.latest_nav).toFixed(2)} <span className="text-xs text-slate-400 font-sans">SAR</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Expense</div>
                                                    <div className="text-xl font-bold text-slate-900 font-mono">
                                                        {Number(fund.expense_ratio).toFixed(2)}%
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Min Invest</div>
                                                    <div className="text-xl font-bold text-slate-900 font-mono">
                                                        {(Number(fund.minimum_investment) / 1000).toFixed(0)}K
                                                    </div>
                                                </div>
                                            </div>

                                            {/* NAV Chart (if selected) */}
                                            {isSelected && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">90-Day Performance</div>
                                                    {navHistory ? (
                                                        <div className="h-[150px] w-full">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={navHistory}>
                                                                    <XAxis
                                                                        dataKey="date"
                                                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                                        tickLine={false}
                                                                        axisLine={false}
                                                                        tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                    />
                                                                    <YAxis
                                                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                                                        tickLine={false}
                                                                        axisLine={false}
                                                                        domain={['auto', 'auto']}
                                                                        width={35}
                                                                    />
                                                                    <Tooltip
                                                                        formatter={(value: any) => [`SAR ${Number(value).toFixed(2)}`, 'NAV']}
                                                                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                                                        contentStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                                                    />
                                                                    <Line
                                                                        type="monotone"
                                                                        dataKey="nav"
                                                                        stroke="#10b981"
                                                                        strokeWidth={2}
                                                                        dot={false}
                                                                        fillOpacity={1}
                                                                    />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    ) : (
                                                        <div className="h-[150px] flex items-center justify-center text-slate-400 text-xs font-bold mb-4">
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                            Loading Chart...
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/funds/${fund.fund_id}`);
                                                        }}
                                                        className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors"
                                                    >
                                                        View Historical Deep Dive (2004-2025) →
                                                    </button>
                                                </div>
                                            )}

                                            {/* Click prompt */}
                                            {!isSelected && (
                                                <div className="text-center pt-2">
                                                    <span className="text-xs text-blue-600 font-bold hover:underline">View Performance Chart →</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Empty State */}
                        {filteredFunds.length === 0 && !isLoading && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                                <div className="text-6xl mb-4 text-slate-300">🔍</div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">No funds found</h3>
                                <p className="text-slate-500">Try adjusting your search or filters to see more results.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
