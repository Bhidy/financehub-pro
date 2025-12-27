"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, TrendingDown, Users, AlertCircle, Search, Loader2 } from "lucide-react";
import { fetchInsiderTrading } from "@/lib/api";
import clsx from "clsx";

interface InsiderTransaction {
    id: number;
    symbol: string;
    insider_name: string;
    insider_role: string;
    transaction_type: 'BUY' | 'SELL';
    transaction_date: string;
    filing_date: string;
    shares: number;
    price: number;
    value: number;
    shares_held_after: number;
}

export default function InsiderTradingPage() {
    const [filterType, setFilterType] = useState("All");
    const [filterSymbol, setFilterSymbol] = useState("");

    // Fetch insider trades via centralized API
    const { data: rawTrades = [], isLoading } = useQuery({
        queryKey: ["insider-trading"],
        queryFn: async () => fetchInsiderTrading(100),
    });

    // Map DB fields to UI fields
    const trades = rawTrades.map((t: any) => ({
        ...t,
        price: Number(t.price_per_share || 0),
        value: Number(t.value || (Number(t.price_per_share || 0) * Number(t.shares || 0))),
        shares_held_after: Number(t.holdings_after || 0),
        filing_date: t.filing_date || t.transaction_date,
        insider_role: t.insider_role || "Insider",
    }));

    // Filter trades
    const filteredTrades = trades.filter((trade: InsiderTransaction) => {
        const matchesType = filterType === "All" || trade.transaction_type === filterType;
        const matchesSymbol = !filterSymbol || trade.symbol.toLowerCase().includes(filterSymbol.toLowerCase());
        return matchesType && matchesSymbol;
    });

    // Calculate statistics
    const buyCount = trades.filter((t: InsiderTransaction) => t.transaction_type === "BUY").length;
    const sellCount = trades.filter((t: InsiderTransaction) => t.transaction_type === "SELL").length;
    const totalTransactions = trades.length;

    // ... rest of logic
    const totalValue = trades.reduce((sum: number, t: InsiderTransaction) => sum + Number(t.value), 0);
    const avgValue = totalTransactions ? totalValue / totalTransactions : 0;
    const buyRatio = totalTransactions > 0 ? (buyCount / totalTransactions) * 100 : 0;

    const uniqueSymbols = [...new Set(trades.map((t: InsiderTransaction) => t.symbol))];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-600">Loading Insider Activity...</h2>
                <p className="text-slate-400 mt-2">Connecting to regulatory filings</p>
            </div>
        );
    }

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
                            <h1 className="text-3xl font-black tracking-tight">Insider Trading Tracker</h1>
                            <p className="text-amber-100 font-medium">Monitor corporate insider activity from verified filings</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-2 -mt-2"></div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Transactions</div>
                        <div className="text-3xl font-bold text-slate-900 font-mono">{trades.length}</div>
                        <div className="text-xs font-bold text-amber-600 mt-1">{uniqueSymbols.length} Companies</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-2 -mt-2"></div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Buying Activity</div>
                            <TrendingUp className="text-emerald-500 w-4 h-4" />
                        </div>
                        <div className="text-3xl font-bold text-emerald-600 font-mono">{buyCount}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">{buyRatio.toFixed(1)}% of Total</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-2 -mt-2"></div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selling Activity</div>
                            <TrendingDown className="text-red-500 w-4 h-4" />
                        </div>
                        <div className="text-3xl font-bold text-red-600 font-mono">{sellCount}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">{(100 - buyRatio).toFixed(1)}% of Total</div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-2 -mt-2"></div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Transaction</div>
                        <div className="text-3xl font-bold text-slate-900 font-mono">
                            {(avgValue / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-xs font-bold text-blue-600 mt-1">SAR per trade</div>
                    </div>
                </div>

                {/* Sentiment Gauge */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-10">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <AlertCircle className="text-amber-600 w-5 h-5" />
                        Insider Sentiment Indicator
                    </h2>
                    <div className="relative pt-6 pb-2">
                        <div className="h-4 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full w-full shadow-inner"></div>

                        {/* Indicator Arrow */}
                        <div
                            className="absolute top-0 h-full w-1"
                            style={{ left: `${buyRatio}%`, transition: 'all 1s ease-out' }}
                        >
                            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                                <div className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold whitespace-nowrap mb-1 shadow-lg">
                                    {buyRatio.toFixed(1)}% Bullish
                                </div>
                                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-900"></div>
                            </div>
                        </div>

                        <div className="flex justify-between mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <span>Strongly Bearish</span>
                            <span>Neutral</span>
                            <span>Strongly Bullish</span>
                        </div>
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
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-amber-500 focus:outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            {["All", "BUY", "SELL"].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={clsx(
                                        "px-6 py-2 rounded-lg text-sm font-bold transition-all border",
                                        filterType === type
                                            ? type === "BUY" ? "bg-green-600 text-white border-green-600 shadow-md" :
                                                type === "SELL" ? "bg-red-600 text-white border-red-600 shadow-md" :
                                                    "bg-slate-900 text-white border-slate-900 shadow-md"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Transactions Feed */}
                <div className="space-y-4">
                    {filteredTrades.map((trade: InsiderTransaction) => (
                        <div
                            key={trade.id}
                            className={clsx(
                                "bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border-l-4",
                                trade.transaction_type === 'BUY' ? "border-emerald-500" : "border-red-500"
                            )}
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                <div className="flex-1">
                                    {/* Header */}
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className="text-2xl font-bold font-sans text-slate-900">{trade.symbol}</span>
                                        <span
                                            className={clsx(
                                                "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 uppercase tracking-wide",
                                                trade.transaction_type === 'BUY'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                            )}
                                        >
                                            {trade.transaction_type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {trade.transaction_type}
                                        </span>
                                    </div>

                                    {/* Insider Info */}
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="bg-slate-100 p-1.5 rounded-full">
                                                <Users className="w-4 h-4 text-slate-500" />
                                            </div>
                                            <span className="font-bold text-slate-800 text-lg">{trade.insider_name}</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-400 pl-9 uppercase tracking-wider">{trade.insider_role}</p>
                                    </div>
                                </div>

                                <div className="w-full md:w-auto grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Shares</div>
                                        <div className="text-base font-bold text-slate-900 font-mono">
                                            {Number(trade.shares).toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Price</div>
                                        <div className="text-base font-bold text-slate-900 font-mono">
                                            {Number(trade.price).toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Value</div>
                                        <div className="text-base font-bold text-emerald-600 font-mono">
                                            {(Number(trade.value) / 1000000).toFixed(2)}M
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Post-Trade</div>
                                        <div className="text-base font-bold text-blue-600 font-mono">
                                            {(Number(trade.shares_held_after) / 1000).toFixed(0)}K
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Dates */}
                            <div className="flex gap-8 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                                <div>
                                    <span className="font-bold text-slate-400 uppercase tracking-wide mr-2">Trade Date:</span>
                                    {new Date(trade.transaction_date).toLocaleDateString(undefined, {
                                        month: 'long', day: 'numeric', year: 'numeric'
                                    })}
                                </div>
                                <div>
                                    <span className="font-bold text-slate-400 uppercase tracking-wide mr-2">Filed:</span>
                                    {new Date(trade.filing_date).toLocaleDateString(undefined, {
                                        month: 'long', day: 'numeric', year: 'numeric'
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredTrades.length === 0 && !isLoading && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="text-6xl mb-4 text-slate-200">🔍</div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">No Transactions Found</h3>
                        <p className="text-slate-500">No insider activity matches your current filters.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
