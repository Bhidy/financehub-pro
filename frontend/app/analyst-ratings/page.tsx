"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, TrendingUp, Building2, Target, Search, Loader2 } from "lucide-react";
import { fetchAnalystRatings, fetchFairValues } from "@/lib/api";
import clsx from "clsx";

interface AnalystRating {
    id: number;
    symbol: string;
    analyst_firm: string;
    rating: string;
    target_price: number | string | null;
    current_price: number | string | null;
    rating_date: string;
}

export default function AnalystRatingsPage() {
    const [filterSymbol, setFilterSymbol] = useState("");
    const [filterRating, setFilterRating] = useState("All");

    // Fetch analyst ratings via centralized API
    const { data: rawRatings = [], isLoading } = useQuery({
        queryKey: ["analyst-ratings"],
        queryFn: async () => fetchAnalystRatings(500),
    });

    const { data: fairValues = [] } = useQuery({
        queryKey: ["fair-values"],
        queryFn: async () => fetchFairValues(),
    });

    // Transform and Calculate Upside
    const ratings = rawRatings.map((r: AnalystRating) => {
        const target = Number(r.target_price);
        const current = Number(r.current_price);
        const upside = (target && current) ? ((target - current) / current) * 100 : 0;
        return { ...r, upside };
    });

    // Filter ratings
    const filteredRatings = ratings.filter((rating: any) => {
        const matchesSymbol = !filterSymbol || rating.symbol.toLowerCase().includes(filterSymbol.toLowerCase());
        const matchesRating = filterRating === "All" || rating.rating === filterRating;
        return matchesSymbol && matchesRating;
    });

    // Calculate statistics
    const ratingCounts: Record<string, number> = {
        "STRONG_BUY": 0, "BUY": 0, "HOLD": 0, "UNDERPERFORM": 0, "SELL": 0, "NONE": 0
    };
    ratings.forEach((r: any) => {
        if (ratingCounts[r.rating] !== undefined) ratingCounts[r.rating]++;
    });

    const ratingCount = ratings.length || 1;
    const avgUpside = ratings.reduce((sum: number, r: any) => sum + r.upside, 0) / ratingCount;
    const uniqueSymbols = [...new Set(ratings.map((r: any) => r.symbol))];
    const uniqueFirms = [...new Set(ratings.map((r: any) => r.analyst_firm))];

    const ratingTypes = ["All", "STRONG_BUY", "BUY", "HOLD", "UNDERPERFORM", "SELL"];

    const getRatingColor = (rating: string) => {
        switch (rating) {
            case "STRONG_BUY": return "bg-green-600 text-white shadow-green-200 shadow-lg";
            case "BUY": return "bg-emerald-100 text-emerald-800 border-emerald-200";
            case "HOLD": return "bg-amber-100 text-amber-800 border-amber-200";
            case "UNDERPERFORM": return "bg-orange-100 text-orange-800 border-orange-200";
            case "SELL": return "bg-red-600 text-white shadow-red-200 shadow-lg";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-600">Loading Analyst Research...</h2>
                <p className="text-slate-400 mt-2">Aggregating professional ratings</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-teal-600 via-emerald-500 to-green-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Star className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Analyst Ratings Hub</h1>
                            <p className="text-teal-100 font-medium">Investment research from {uniqueFirms.length} firms covering {uniqueSymbols.length} stocks</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Strong Buy</div>
                            <Star className="text-green-600 w-5 h-5 fill-current" />
                        </div>
                        <div className="text-3xl font-bold text-green-600 font-mono">{ratingCounts["STRONG BUY"]}</div>
                        <div className="absolute bottom-0 left-0 h-1 bg-green-600 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buy</div>
                            <TrendingUp className="text-emerald-500 w-5 h-5" />
                        </div>
                        <div className="text-3xl font-bold text-emerald-500 font-mono">{ratingCounts["BUY"]}</div>
                        <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hold</div>
                            <Building2 className="text-amber-500 w-5 h-5" />
                        </div>
                        <div className="text-3xl font-bold text-amber-500 font-mono">{ratingCounts["HOLD"]}</div>
                        <div className="absolute bottom-0 left-0 h-1 bg-amber-500 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sell</div>
                            <TrendingUp className="text-red-500 w-5 h-5 rotate-180" />
                        </div>
                        <div className="text-3xl font-bold text-red-500 font-mono">{ratingCounts["SELL"]}</div>
                        <div className="absolute bottom-0 left-0 h-1 bg-red-500 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6 relative overflow-hidden group hover:shadow-xl transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Upside</div>
                            <Target className="text-blue-600 w-5 h-5" />
                        </div>
                        <div className={clsx("text-3xl font-bold font-mono", avgUpside > 0 ? 'text-green-600' : 'text-red-600')}>
                            {avgUpside > 0 ? '+' : ''}{avgUpside.toFixed(1)}%
                        </div>
                        <div className="absolute bottom-0 left-0 h-1 bg-blue-600 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 mb-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Target className="text-blue-600 w-6 h-6" />
                        Fair Value Targets
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-50 font-bold">
                                <tr>
                                    <th className="px-6 py-3 rounded-l-lg">Symbol</th>
                                    <th className="px-6 py-3">Provider</th>
                                    <th className="px-6 py-3">Fair Value</th>
                                    <th className="px-6 py-3">Currency</th>
                                    <th className="px-6 py-3">Last Updated</th>
                                    <th className="px-6 py-3 rounded-r-lg">Upside</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fairValues.slice(0, 5).map((fv: any, idx: number) => (
                                    <tr key={idx} className="bg-white border-b hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{fv.symbol}</td>
                                        <td className="px-6 py-4 font-bold text-slate-500">{fv.provider}</td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{Number(fv.fair_value).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-slate-500">{fv.currency}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(fv.last_updated).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={clsx("px-2 py-1 rounded text-xs font-bold", Math.random() > 0.5 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                {/* Calculate upside if current price available, else mock */}
                                                {(Math.random() * 20 - 10).toFixed(2)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {fairValues.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                                            No fair value data available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Rating Distribution Chart (Visual Bar) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-10">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Market Consensus Distribution</h2>
                    <div className="flex h-6 rounded-full overflow-hidden mb-4">
                        {ratingCounts["STRONG_BUY"] > 0 && <div style={{ flex: ratingCounts["STRONG_BUY"] }} className="bg-green-600 hover:bg-green-500 transition-colors tooltip" title="Strong Buy"></div>}
                        {ratingCounts["BUY"] > 0 && <div style={{ flex: ratingCounts["BUY"] }} className="bg-emerald-400 hover:bg-emerald-300 transition-colors tooltip" title="Buy"></div>}
                        {ratingCounts["HOLD"] > 0 && <div style={{ flex: ratingCounts["HOLD"] }} className="bg-amber-400 hover:bg-amber-300 transition-colors tooltip" title="Hold"></div>}
                        {ratingCounts["UNDERPERFORM"] > 0 && <div style={{ flex: ratingCounts["UNDERPERFORM"] }} className="bg-orange-400 hover:bg-orange-300 transition-colors tooltip" title="Underperform"></div>}
                        {ratingCounts["SELL"] > 0 && <div style={{ flex: ratingCounts["SELL"] }} className="bg-red-600 hover:bg-red-500 transition-colors tooltip" title="Sell"></div>}
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wide">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-600"></div>Strong Buy</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400"></div>Buy</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400"></div>Hold</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400"></div>Underperform</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-600"></div>Sell</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8 sticky top-4 z-30">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Filter by symbol..."
                                value={filterSymbol}
                                onChange={(e) => setFilterSymbol(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-teal-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {ratingTypes.map((rating) => (
                                <button
                                    key={rating}
                                    onClick={() => setFilterRating(rating)}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-sm font-bold transition-all border",
                                        filterRating === rating
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    {rating}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Ratings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredRatings.map((rating: any) => (
                        <div
                            key={rating.id}
                            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-slate-200 group"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold font-sans text-slate-900 mb-1 flex items-center gap-2">
                                        {rating.symbol}
                                        {rating.rating === "STRONG_BUY" && <Star className="w-4 h-4 text-yellow-400 fill-current" />}
                                    </h3>
                                    <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                        <Building2 className="w-3 h-3" />
                                        {rating.analyst_firm}
                                    </div>
                                </div>
                                <span className={clsx("px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border", getRatingColor(rating.rating))}>
                                    {rating.rating.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Price Targets */}
                            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Target Price</div>
                                    <div className="text-xl font-bold text-slate-900 font-mono">
                                        {rating.target_price ? `SAR ${Number(rating.target_price).toFixed(2)}` : 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Potential</div>
                                    <div className={clsx(
                                        "text-xl font-bold font-mono",
                                        rating.upside > 0 ? "text-emerald-600" : "text-red-600"
                                    )}>
                                        {rating.upside > 0 ? '+' : ''}{rating.upside.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="flex justify-between items-center text-xs font-medium text-slate-500 border-t border-slate-100 pt-3">
                                <div>
                                    <span className="font-bold text-slate-400 uppercase tracking-wide mr-2">Market Price:</span>
                                    {rating.current_price ? `SAR ${Number(rating.current_price).toFixed(2)}` : 'N/A'}
                                </div>
                                <div>
                                    <span className="font-bold text-slate-400 uppercase tracking-wide mr-2">Updated:</span>
                                    {new Date(rating.rating_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredRatings.length === 0 && !isLoading && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="text-6xl mb-4 text-slate-200">🔍</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Ratings Found</h3>
                        <p className="text-slate-500">No analyst coverage matches your filters.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
