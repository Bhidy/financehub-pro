
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, DollarSign, Activity, BarChart2, Calendar, FileText, ChevronRight } from "lucide-react";
import { PortfolioHolding } from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from "clsx";

interface HoldingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    holding: PortfolioHolding & {
        sparkline_data?: number[];
        market_cap?: number;
        pe_ratio?: number;
        volume?: number;
        high?: number;
        low?: number;
    } | null;
}

export function HoldingDrawer({ isOpen, onClose, holding }: HoldingDrawerProps) {
    if (!holding) return null;

    const isProfitable = holding.pnl_percent >= 0;
    const sparklineData = holding.sparkline_data && holding.sparkline_data.length > 0
        ? holding.sparkline_data.map((v, i) => ({
            date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString(),
            value: v
        }))
        : [];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-50 dark:bg-[#0B1121] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#151925]">
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-lg",
                                    isProfitable
                                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20"
                                        : "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20"
                                )}>
                                    {holding.symbol.slice(0, 2)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{holding.symbol}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{holding.company_name || holding.sector}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                            {/* P&L Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-[#151925] p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">My Equity</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                                        <span className="text-sm text-slate-400 font-normal mr-1">SAR</span>
                                        {Math.round(holding.current_value).toLocaleString()}
                                    </p>
                                    <div className={clsx(
                                        "inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-lg text-xs font-bold",
                                        isProfitable ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                    )}>
                                        {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {holding.pnl_percent.toFixed(2)}%
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-[#151925] p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Profit</p>
                                    <p className={clsx(
                                        "text-2xl font-black",
                                        isProfitable ? "text-emerald-500" : "text-red-500"
                                    )}>
                                        {isProfitable ? '+' : ''}{Math.round(holding.pnl_value).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Avg Buy: {holding.average_price.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Chart (7 Days) */}
                            {sparklineData.length > 0 && (
                                <div className="bg-white dark:bg-[#151925] p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-lg shadow-black/20">
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-blue-500" />
                                        Performance (7 Days)
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={sparklineData}>
                                                <defs>
                                                    <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={isProfitable ? "#10B981" : "#EF4444"} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={isProfitable ? "#10B981" : "#EF4444"} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="date" hide />
                                                <YAxis domain={['auto', 'auto']} hide />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                    itemStyle={{ color: '#fff' }}
                                                    formatter={(val: number) => [val.toFixed(2), 'Price']}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke={isProfitable ? "#10B981" : "#EF4444"}
                                                    strokeWidth={3}
                                                    fill="url(#chartColor)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <BarChart2 className="w-4 h-4 text-violet-500" />
                                    Key Statistics
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: "Market Cap", value: holding.market_cap ? (holding.market_cap / 1e9).toFixed(2) + 'B' : 'N/A' },
                                        { label: "P/E Ratio", value: holding.pe_ratio?.toFixed(2) || 'N/A' },
                                        { label: "Volume", value: holding.volume?.toLocaleString() || 'N/A' },
                                        { label: "Day Range", value: `${holding.low || 0} - ${holding.high || 0}` },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-white dark:bg-[#151925] p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Transactions Placeholder (Phase 3) */}
                            <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-6 text-center">
                                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                                <h4 className="font-bold text-slate-700 dark:text-slate-300">Transaction History</h4>
                                <p className="text-xs text-slate-500 mt-1">Detailed buy/sell records coming soon.</p>
                            </div>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Helper for scrollbar
const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 20px;
  }
`;
