"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchScreener, fetchSectors } from "@/lib/api";
import clsx from "clsx";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
    ScanLine,
    Filter,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Download,
    ChevronUp,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { useMarketSafe } from "@/contexts/MarketContext";

export default function ScreenerPage() {
    const { market, isEgypt } = useMarketSafe();

    const [filters, setFilters] = useState({
        min_price: 0,
        max_price: 500,
        sector: "All",
        sort_by: "volume",
        order: "desc"
    });

    const { data: sectors = [] } = useQuery({ queryKey: ["sectors", market], queryFn: fetchSectors });
    const { data: allResults = [], isLoading } = useQuery({
        queryKey: ["screener", filters, market],
        queryFn: () => fetchScreener({
            ...filters,
            // Pass market context to Backend to fix pagination/filtering
            market_code: isEgypt ? 'EGX' : 'TDWL'
        })
    });

    // Filter results by selected market
    const results = useMemo(() => {
        if (!allResults || allResults.length === 0) return [];
        return allResults.filter((r: any) =>
            isEgypt
                ? r.market_code === 'EGX' || (r.symbol && /^[A-Z]{3,5}$/.test(r.symbol))
                : r.market_code !== 'EGX' // Permissive: Include NULL (Saudi) and TASI
        );
    }, [allResults, isEgypt]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const toggleOrder = () => {
        setFilters(prev => ({ ...prev, order: prev.order === "desc" ? "asc" : "desc" }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white">
                <div className="max-w-[1800px] mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <ScanLine className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Stock Screener</h1>
                            <p className="text-blue-100 font-medium">Advanced filtering with institutional-grade criteria • <span className="text-blue-200 text-sm">Prices delayed 5 min</span></p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1800px] mx-auto px-6 py-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 -mt-10">
                    {[
                        { label: "Matches Found", value: results.length, icon: Filter, color: "blue" },
                        { label: "Avg Change", value: results.length ? (results.reduce((a: number, r: any) => a + Number(r.change_percent || 0), 0) / results.length).toFixed(2) + "%" : "—", icon: TrendingUp, color: "emerald" },
                        { label: "Sectors", value: sectors.length, icon: BarChart3, color: "teal" },
                        { label: "Sort", value: filters.sort_by.replace('_', ' ').toUpperCase(), icon: filters.order === "desc" ? ChevronDown : ChevronUp, color: "orange" },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-5 flex items-center gap-4">
                            <div className={clsx(
                                "w-12 h-12 rounded-xl flex items-center justify-center",
                                stat.color === "blue" && "bg-blue-100 text-blue-600",
                                stat.color === "emerald" && "bg-emerald-100 text-emerald-600",
                                stat.color === "teal" && "bg-teal-100 text-teal-600",
                                stat.color === "orange" && "bg-orange-100 text-orange-600"
                            )}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{stat.label}</div>
                                <div className="text-xl font-black text-slate-900">{stat.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters Bar */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100/50 p-5 mb-6">
                    <div className="flex flex-wrap items-end gap-4">
                        {/* Sector */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sector</label>
                            <select
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={filters.sector}
                                onChange={(e) => handleFilterChange("sector", e.target.value)}
                            >
                                <option value="All">All Sectors</option>
                                {sectors.map((s: any) => (
                                    <option key={s.sector_name} value={s.sector_name}>{s.sector_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Price Range */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Price Range (SAR)</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="number"
                                    className="flex-1 p-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Min"
                                    value={filters.min_price}
                                    onChange={(e) => handleFilterChange("min_price", Number(e.target.value))}
                                />
                                <span className="text-slate-300 font-bold">→</span>
                                <input
                                    type="number"
                                    className="flex-1 p-3 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Max"
                                    value={filters.max_price}
                                    onChange={(e) => handleFilterChange("max_price", Number(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Sort By */}
                        <div className="flex-1 min-w-[300px]">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sort By</label>
                            <div className="flex gap-2">
                                {[
                                    { key: 'volume', label: 'Volume', color: 'blue' },
                                    { key: 'last_price', label: 'Price', color: 'teal' },
                                    { key: 'change_percent', label: 'Change %', color: 'emerald' },
                                    { key: 'pe_ratio', label: 'P/E', color: 'orange' }
                                ].map((field) => (
                                    <button
                                        key={field.key}
                                        onClick={() => handleFilterChange("sort_by", field.key)}
                                        className={clsx(
                                            "flex-1 px-4 py-3 text-xs font-bold rounded-xl border transition-all",
                                            filters.sort_by === field.key
                                                ? field.color === 'blue' ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200"
                                                    : field.color === 'teal' ? "bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-200"
                                                        : field.color === 'emerald' ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200"
                                                            : "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200"
                                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                        )}
                                    >
                                        {field.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={toggleOrder}
                                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all"
                            >
                                {filters.order === "desc" ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                            </button>
                            <button className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200/50 hover:shadow-xl transition-all flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Symbol</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Sector</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Change</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-blue-500 uppercase tracking-wider">Volume</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-orange-500 uppercase tracking-wider">P/E</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-teal-500 uppercase tracking-wider">Mkt Cap</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                                            <span className="text-slate-400 font-medium">Loading screening results...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : results.map((r: any, i: number) => {
                                // Route EGX stocks (3-5 letters) to /egx/, Saudi (4 digits) to /symbol/
                                const isEgxStock = /^[A-Z]{3,5}$/.test(r.symbol?.toUpperCase() || '');
                                const profileUrl = isEgxStock ? `/egx/${r.symbol}` : `/symbol/${r.symbol}`;

                                return (
                                    <tr key={r.symbol} className={clsx(
                                        "hover:bg-blue-50/50 transition-colors group cursor-pointer",
                                        i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                    )}>
                                        <td className="px-6 py-4">
                                            <Link href={profileUrl} className="flex items-center gap-3">
                                                <span className={clsx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white",
                                                    Number(r.change_percent) >= 0
                                                        ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                                                        : "bg-gradient-to-br from-red-400 to-rose-500"
                                                )}>
                                                    {r.symbol.slice(0, 2)}
                                                </span>
                                                <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{r.symbol}</span>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700 max-w-[200px] truncate">{r.name_en}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                                {r.sector_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                                            {Number(r.last_price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1 font-bold",
                                                Number(r.change_percent) >= 0 ? "text-emerald-600" : "text-red-600"
                                            )}>
                                                {Number(r.change_percent) >= 0
                                                    ? <ArrowUpRight className="w-4 h-4" />
                                                    : <ArrowDownRight className="w-4 h-4" />
                                                }
                                                {Number(r.change_percent).toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-blue-600 font-bold">
                                            {(r.volume / 1000000).toFixed(2)}M
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-orange-600 font-bold">
                                            {r.pe_ratio || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-teal-600 font-bold">
                                            {r.market_cap_b || "—"}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {results.length === 0 && !isLoading && (
                        <div className="p-16 text-center">
                            <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">No stocks match your filters. Try adjusting the criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
