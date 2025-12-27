"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPortfolio, executeTrade } from "@/lib/api";
import clsx from "clsx";
import { useState } from "react";
import Link from "next/link";
import {
    Briefcase,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    BarChart3,
    Target
} from "lucide-react";

export default function PortfolioPage() {
    const queryClient = useQueryClient();
    const [tradeForm, setTradeForm] = useState({ symbol: "", quantity: 100, side: "BUY" as "BUY" | "SELL" });
    const [message, setMessage] = useState("");

    const { data: portfolio, isLoading } = useQuery({
        queryKey: ["portfolio"],
        queryFn: fetchPortfolio,
        refetchInterval: 5000
    });

    const mutation = useMutation({
        mutationFn: (vars: any) => executeTrade(vars.symbol, vars.quantity, vars.side),
        onSuccess: (data) => {
            if (data.error) {
                setMessage(`❌ Error: ${data.error}`);
            } else {
                setMessage(`✅ Trade Executed @ ${data.price}`);
                queryClient.invalidateQueries({ queryKey: ["portfolio"] });
            }
        }
    });

    const handleTrade = (e: any) => {
        e.preventDefault();
        mutation.mutate(tradeForm);
    };

    // Calculate portfolio stats
    const totalPnL = portfolio?.holdings?.reduce((acc: number, h: any) =>
        acc + (h.current_value - (h.quantity * h.average_price)), 0) || 0;
    const totalPnLPercent = portfolio?.holdings?.length > 0
        ? (totalPnL / (portfolio.total_equity - totalPnL)) * 100
        : 0;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
                    <span className="text-slate-500 font-medium">Loading Portfolio...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 pb-12">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white">
                <div className="max-w-[1800px] mx-auto px-6 py-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Briefcase className="w-7 h-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight">Portfolio Tracker</h1>
                                <p className="text-orange-100 font-medium">Paper Trading Engine • Demo Account</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-sm text-orange-200 font-medium">Total Equity</div>
                                <div className="text-3xl font-black font-mono">
                                    SAR {portfolio?.total_equity ? Number(portfolio.total_equity).toLocaleString() : "0"}
                                </div>
                            </div>
                            <div className="w-px h-12 bg-white/20" />
                            <div className="text-right">
                                <div className="text-sm text-orange-200 font-medium">Total P&L</div>
                                <div className={clsx(
                                    "text-2xl font-black font-mono flex items-center gap-1",
                                    totalPnL >= 0 ? "text-white" : "text-red-200"
                                )}>
                                    {totalPnL >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                    {totalPnL >= 0 ? "+" : ""}{totalPnLPercent.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1800px] mx-auto px-6 py-6">
                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-10 mb-8">
                    {[
                        { label: "Cash Balance", value: `SAR ${Number(portfolio?.cash_balance || 0).toLocaleString()}`, icon: Wallet, color: "orange" },
                        { label: "Holdings", value: portfolio?.holdings?.length || 0, icon: PieChart, color: "blue" },
                        { label: "Invested", value: `SAR ${(portfolio?.total_equity - portfolio?.cash_balance || 0).toLocaleString()}`, icon: Target, color: "teal" },
                        { label: "Day P&L", value: totalPnL >= 0 ? `+${totalPnL.toFixed(0)}` : totalPnL.toFixed(0), icon: totalPnL >= 0 ? TrendingUp : TrendingDown, color: totalPnL >= 0 ? "green" : "red" },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-5 flex items-center gap-4">
                            <div className={clsx(
                                "w-12 h-12 rounded-xl flex items-center justify-center",
                                stat.color === "orange" && "bg-orange-100 text-orange-600",
                                stat.color === "blue" && "bg-blue-100 text-blue-600",
                                stat.color === "teal" && "bg-teal-100 text-teal-600",
                                stat.color === "green" && "bg-emerald-100 text-emerald-600",
                                stat.color === "red" && "bg-red-100 text-red-600"
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

                <div className="grid grid-cols-12 gap-6">
                    {/* Holdings Table */}
                    <div className="col-span-12 xl:col-span-8">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <BarChart3 className="w-5 h-5 text-orange-500" />
                                    <h3 className="font-bold text-slate-800">Current Holdings</h3>
                                </div>
                                <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                                    {portfolio?.holdings?.length || 0} Positions
                                </span>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Symbol</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Price</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Current</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-blue-500 uppercase tracking-wider">Value</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">P&L %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {portfolio?.holdings?.map((h: any, i: number) => (
                                        <tr key={h.symbol} className={clsx(
                                            "hover:bg-orange-50/50 transition-colors group",
                                            i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                        )}>
                                            <td className="px-6 py-4">
                                                <Link href={`/symbol/${h.symbol}`} className="flex items-center gap-3">
                                                    <span className={clsx(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white",
                                                        h.pnl_percent >= 0
                                                            ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                                                            : "bg-gradient-to-br from-red-400 to-rose-500"
                                                    )}>
                                                        {h.symbol.slice(0, 2)}
                                                    </span>
                                                    <span className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{h.symbol}</span>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{h.quantity}</td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-500">{Number(h.average_price).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{Number(h.current_price).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-blue-600">{Number(h.current_value).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={clsx(
                                                    "inline-flex items-center gap-1 font-bold",
                                                    h.pnl_percent >= 0 ? "text-emerald-600" : "text-red-600"
                                                )}>
                                                    {h.pnl_percent >= 0
                                                        ? <ArrowUpRight className="w-4 h-4" />
                                                        : <ArrowDownRight className="w-4 h-4" />
                                                    }
                                                    {Number(h.pnl_percent).toFixed(2)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!portfolio?.holdings || portfolio.holdings.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-16 text-center">
                                                <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                                <p className="text-slate-400 font-medium">No active positions</p>
                                                <p className="text-slate-300 text-sm">Use the Trade Execution panel to open positions</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Trade Execution Panel */}
                    <div className="col-span-12 xl:col-span-4">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden sticky top-6">
                            <div className="px-6 py-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-5 h-5" />
                                    <h3 className="font-bold">Trade Execution</h3>
                                </div>
                                <p className="text-orange-100 text-sm mt-1">Place market orders instantly</p>
                            </div>

                            <form onSubmit={handleTrade} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Symbol</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg font-mono font-bold uppercase placeholder-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                        placeholder="e.g. 1010"
                                        value={tradeForm.symbol}
                                        onChange={(e) => setTradeForm({ ...tradeForm, symbol: e.target.value.toUpperCase() })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                                    <input
                                        type="number"
                                        className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg font-mono font-bold placeholder-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                                        value={tradeForm.quantity}
                                        onChange={(e) => setTradeForm({ ...tradeForm, quantity: Number(e.target.value) })}
                                        min="1"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setTradeForm({ ...tradeForm, side: "BUY" })}
                                        className={clsx(
                                            "py-4 rounded-xl font-bold text-sm transition-all border-2",
                                            tradeForm.side === "BUY"
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-100"
                                                : "border-slate-200 text-slate-400 hover:border-slate-300"
                                        )}
                                    >
                                        <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                                        BUY
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTradeForm({ ...tradeForm, side: "SELL" })}
                                        className={clsx(
                                            "py-4 rounded-xl font-bold text-sm transition-all border-2",
                                            tradeForm.side === "SELL"
                                                ? "border-red-500 bg-red-50 text-red-700 shadow-lg shadow-red-100"
                                                : "border-slate-200 text-slate-400 hover:border-slate-300"
                                        )}
                                    >
                                        <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                                        SELL
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={mutation.isPending}
                                    className={clsx(
                                        "w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98]",
                                        tradeForm.side === "BUY"
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200/50 hover:shadow-xl"
                                            : "bg-gradient-to-r from-red-500 to-rose-500 shadow-red-200/50 hover:shadow-xl"
                                    )}
                                >
                                    {mutation.isPending ? "Executing..." : `SUBMIT ${tradeForm.side} ORDER`}
                                </button>
                            </form>

                            {message && (
                                <div className={clsx(
                                    "mx-6 mb-6 p-4 rounded-xl text-center font-bold text-sm",
                                    message.includes("✅")
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-red-50 text-red-700 border border-red-200"
                                )}>
                                    {message}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
