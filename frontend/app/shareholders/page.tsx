"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Building2, TrendingUp, Search, RefreshCw } from "lucide-react";
import Link from "next/link";
import { fetchShareholders } from "@/lib/api";

interface Shareholder {
    id: number;
    symbol: string;
    shareholder_name: string;
    ownership_percent: number;
    shares_held: number;
    shareholder_type: string;
    nationality: string;
}

export default function ShareholdersPage() {
    const [searchSymbol, setSearchSymbol] = useState("");

    const { data: shareholders = [], isLoading, refetch } = useQuery({
        queryKey: ["shareholders", searchSymbol],
        queryFn: () => fetchShareholders(searchSymbol || undefined, 200)
    });

    const groupedBySymbol = shareholders.reduce((acc: Record<string, Shareholder[]>, sh: Shareholder) => {
        if (!acc[sh.symbol]) acc[sh.symbol] = [];
        acc[sh.symbol].push(sh);
        return acc;
    }, {});

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Users className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Major Shareholders</h1>
                            <p className="text-amber-100 font-medium">Ownership structure and institutional holdings</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Search & Stats Bar */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by symbol (e.g., 1010)"
                                    value={searchSymbol}
                                    onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            <button
                                onClick={() => refetch()}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh
                            </button>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-amber-600">{shareholders.length}</div>
                                <div className="text-xs text-gray-500">Total Records</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{Object.keys(groupedBySymbol).length}</div>
                                <div className="text-xs text-gray-500">Unique Stocks</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-500 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading shareholders...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(groupedBySymbol).map(([symbol, holders]) => (
                            <div key={symbol} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition">
                                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <Link href={`/symbol/${symbol}`} className="text-white font-bold text-xl hover:underline">
                                            {symbol}
                                        </Link>
                                        <span className="bg-white/20 text-white text-xs px-2 py-1 rounded">
                                            {(holders as Shareholder[]).length} holders
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                                    {(holders as Shareholder[]).slice(0, 5).map((sh, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-800 text-sm truncate max-w-[180px]">
                                                    {sh.shareholder_name || "Unknown"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {sh.shareholder_type || "Investor"}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-amber-600">
                                                    {sh.ownership_percent ? `${Number(sh.ownership_percent).toFixed(2)}%` : '-'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && shareholders.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No shareholders found</p>
                    </div>
                )}
            </div>
        </main>
    );
}
