"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    RefreshCw,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Eye,
    Activity
} from "lucide-react";
import WatchlistTable from "@/components/watchlist/WatchlistTable";

interface WatchlistStock {
    symbol: string;
    description: string;
    last_price: number | null;
    change: number | null;
    change_percent: number | null;
    bid: number | null;
    ask: number | null;
    bid_qty: number | null;
    ask_qty: number | null;
    volume: number | null;
    trades: number | null;
    turnover: number | null;
    updated_at: string | null;
}

interface WatchlistResponse {
    status: string;
    count: number;
    data: WatchlistStock[];
    last_updated: string | null;
}

export default function EGXWatchlistPage() {
    const [data, setData] = useState<WatchlistStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchWatchlist = async () => {
        try {
            setIsRefreshing(true);
            const response = await fetch("/api/v1/egx-watchlist");
            if (!response.ok) throw new Error("Failed to fetch watchlist");
            const result: WatchlistResponse = await response.json();
            setData(result.data || []);
            setLastUpdated(result.last_updated);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchWatchlist();
        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchWatchlist, 60000);
        return () => clearInterval(interval);
    }, []);

    // Calculate summary stats
    const gainers = data.filter(d => (d.change ?? 0) > 0).length;
    const losers = data.filter(d => (d.change ?? 0) < 0).length;
    const unchanged = data.filter(d => d.change === 0 || d.change === null).length;
    const totalVolume = data.reduce((sum, d) => sum + (d.volume ?? 0), 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-200/50">
                            <Eye className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                                EGX Watchlist
                            </h1>
                            <p className="text-slate-500 text-sm mt-0.5">
                                Real-time Egyptian Stock Exchange data • {data.length} stocks
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {lastUpdated && (
                            <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                                <Clock className="w-4 h-4" />
                                <span>Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
                            </div>
                        )}
                        <button
                            onClick={fetchWatchlist}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-rose-200/50 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-100/50 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-600">{gainers}</p>
                            <p className="text-xs text-slate-500 font-medium">Gainers</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-100/50 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                            <ArrowDownRight className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-rose-600">{losers}</p>
                            <p className="text-xs text-slate-500 font-medium">Losers</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-100/50 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                            <Minus className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-600">{unchanged}</p>
                            <p className="text-xs text-slate-500 font-medium">Unchanged</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-100/50 border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">
                                {(totalVolume / 1_000_000).toFixed(1)}M
                            </p>
                            <p className="text-xs text-slate-500 font-medium">Total Volume</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Watchlist Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
            >
                {loading ? (
                    <div className="flex items-center justify-center h-96">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                            <p className="text-slate-500 font-medium">Loading watchlist...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <p className="text-rose-500 font-medium mb-2">Error loading data</p>
                            <p className="text-slate-500 text-sm">{error}</p>
                            <button
                                onClick={fetchWatchlist}
                                className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                ) : (
                    <WatchlistTable data={data} />
                )}
            </motion.div>
        </div>
    );
}
