"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, TrendingUp, TrendingDown, Search, RefreshCw, DollarSign } from "lucide-react";
import Link from "next/link";
import { fetchEarnings } from "@/lib/api";

interface Earnings {
    id: number;
    symbol: string;
    announcement_date: string;
    fiscal_period: string;
    eps_actual: number;
    eps_estimate: number;
    revenue_actual: number;
    revenue_estimate: number;
    surprise_percent: number;
}

export default function EarningsPage() {
    const [searchSymbol, setSearchSymbol] = useState("");

    const { data: earnings = [], isLoading, refetch } = useQuery({
        queryKey: ["earnings", searchSymbol],
        queryFn: () => fetchEarnings(searchSymbol || undefined, 200),
    });

    const beatCount = earnings.filter((e: Earnings) => e.surprise_percent > 0).length;
    const missCount = earnings.filter((e: Earnings) => e.surprise_percent < 0).length;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Calendar className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Earnings Calendar</h1>
                            <p className="text-rose-100 font-medium">Quarterly announcements & EPS data for Saudi stocks</p>
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
                                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                            <button
                                onClick={() => refetch()}
                                className="flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh
                            </button>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-rose-600">{earnings.length}</div>
                                <div className="text-xs text-gray-500">Total Records</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{beatCount}</div>
                                <div className="text-xs text-gray-500">Beat Estimates</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{missCount}</div>
                                <div className="text-xs text-gray-500">Missed</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-rose-500 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading earnings...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-bold">Symbol</th>
                                        <th className="px-6 py-4 text-left font-bold">Date</th>
                                        <th className="px-6 py-4 text-left font-bold">Period</th>
                                        <th className="px-6 py-4 text-right font-bold">EPS Actual</th>
                                        <th className="px-6 py-4 text-right font-bold">EPS Est.</th>
                                        <th className="px-6 py-4 text-right font-bold">Surprise</th>
                                        <th className="px-6 py-4 text-right font-bold">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {earnings.map((e: Earnings, idx: number) => {
                                        const isBeat = e.surprise_percent > 0;
                                        const isMiss = e.surprise_percent < 0;

                                        return (
                                            <tr key={idx} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4">
                                                    <Link href={`/symbol/${e.symbol}`} className="font-bold text-rose-600 hover:underline">
                                                        {e.symbol}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {e.announcement_date ? new Date(e.announcement_date).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                                        {e.fiscal_period || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold">
                                                    {e.eps_actual ? Number(e.eps_actual).toFixed(2) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-gray-500">
                                                    {e.eps_estimate ? Number(e.eps_estimate).toFixed(2) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {e.surprise_percent !== null && (
                                                        <span className={`flex items-center justify-end gap-1 font-bold ${isBeat ? 'text-green-600' : isMiss ? 'text-red-600' : 'text-gray-500'}`}>
                                                            {isBeat && <TrendingUp className="w-4 h-4" />}
                                                            {isMiss && <TrendingDown className="w-4 h-4" />}
                                                            {Number(e.surprise_percent).toFixed(1)}%
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-gray-600">
                                                    {e.revenue_actual ? `${(Number(e.revenue_actual) / 1000000).toFixed(1)}M` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {!isLoading && earnings.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-lg">
                        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No earnings data found</p>
                    </div>
                )}
            </div>
        </main>
    );
}
