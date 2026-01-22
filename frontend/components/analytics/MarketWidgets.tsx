"use client";

import { motion } from "framer-motion";
import { Calendar, DollarSign, TrendingUp, TrendingDown, MoreHorizontal, ArrowRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import clsx from "clsx";
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

// ----------------------------------------------------------------------
// DIVIDEND FORECAST (Simplified)
// ----------------------------------------------------------------------
export function DividendForecast() {
    const data = [
        { month: 'Jan', amount: 120 },
        { month: 'Feb', amount: 0 },
        { month: 'Mar', amount: 450 },
        { month: 'Apr', amount: 120 },
        { month: 'May', amount: 80 },
        { month: 'Jun', amount: 600 },
        { month: 'Jul', amount: 120 },
        { month: 'Aug', amount: 0 },
        { month: 'Sep', amount: 480 },
        { month: 'Oct', amount: 150 },
        { month: 'Nov', amount: 0 },
        { month: 'Dec', amount: 900 },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden group"
        >
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-500" />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-500" />
                        Income Forecast
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-1">Projected Dividends (TM)</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Est. Total</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">$3,020</p>
                </div>
            </div>

            <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={12} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff' }}
                        />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                            interval={0}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                <span>Next Payout: <span className="text-slate-900 dark:text-white">Mar 15 (CIB)</span></span>
                <span>$450.00</span>
            </div>
        </motion.div>
    );
}

// ----------------------------------------------------------------------
// MARKET MOVERS (Compact List)
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// MARKET MOVERS (Compact List) with Toggle
// ----------------------------------------------------------------------
import { useState } from "react";

export function TopMoversList() {
    const [viewMode, setViewMode] = useState<'gainers' | 'losers'>('gainers');

    // Mock Data - In real app, this would come from props or API
    const gainers = [
        { symbol: 'CIB', name: 'Commercial Int. Bank', change: 4.2, price: 72.50, trend: [10, 12, 11, 14, 13, 16, 18] },
        { symbol: 'TMGH', name: 'Talaat Moustafa', change: 1.8, price: 44.10, trend: [40, 41, 41, 42, 43, 43, 44] },
        { symbol: 'SWDY', name: 'Elsewedy Electric', change: 1.2, price: 22.30, trend: [20, 20.5, 21, 21.5, 22, 22.1, 22.3] },
    ];

    const losers = [
        { symbol: 'HRHO', name: 'EFG Hermes', change: -2.1, price: 18.20, trend: [18, 17, 18, 16, 15, 15, 14] },
        { symbol: 'FWRY', name: 'Fawry', change: -1.5, price: 5.60, trend: [6, 5.9, 5.8, 5.7, 5.8, 5.7, 5.6] },
        { symbol: 'EAST', name: 'Eastern Company', change: -0.8, price: 15.00, trend: [15.5, 15.4, 15.3, 15.2, 15.1, 15.0, 15.0] },
    ];

    const displayedMovers = viewMode === 'gainers' ? gainers : losers;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="h-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden group flex flex-col"
        >
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-rose-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-rose-500/10 transition-colors duration-500" />

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        {viewMode === 'gainers' ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-rose-500" />}
                        Top {viewMode === 'gainers' ? 'Gainers' : 'Losers'}
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-1">Daily Volatility Impact</p>
                </div>

                {/* Toggle Switch */}
                <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('gainers')}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                            viewMode === 'gainers' ? "bg-white dark:bg-emerald-500 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        )}
                    >
                        Gainers
                    </button>
                    <button
                        onClick={() => setViewMode('losers')}
                        className={clsx(
                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                            viewMode === 'losers' ? "bg-white dark:bg-rose-500 text-slate-900 dark:text-white shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        )}
                    >
                        Losers
                    </button>
                </div>
            </div>

            <div className="space-y-2 flex-1">
                {displayedMovers.map((mover, i) => {
                    const isUp = mover.change >= 0;
                    return (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group/item cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-lg",
                                    isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                )}>
                                    {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{mover.symbol}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{mover.name}</p>
                                </div>
                            </div>

                            {/* Micro Sparkline */}
                            <div className="w-20 h-8 opacity-50 group-hover/item:opacity-100 transition-opacity hidden sm:block">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={mover.trend.map((v, idx) => ({ i: idx, v }))}>
                                        <Area
                                            type="monotone"
                                            dataKey="v"
                                            stroke={isUp ? "#10B981" : "#F43F5E"}
                                            fill={isUp ? "#10B981" : "#F43F5E"}
                                            fillOpacity={0.1}
                                            strokeWidth={2}
                                            isAnimationActive={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="text-right">
                                <p className="font-black text-slate-900 dark:text-white text-sm bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg tabular-nums">
                                    {mover.price.toFixed(2)}
                                </p>
                                <p className={clsx("text-[10px] font-bold mt-1", isUp ? "text-emerald-500" : "text-rose-500")}>
                                    {isUp ? '+' : ''}{mover.change}%
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button className="w-full mt-6 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                View All Market News <ArrowRight className="w-3 h-3" />
            </button>
        </motion.div>
    );
}

// ----------------------------------------------------------------------
// MONTHLY HEATMAP (Mini Calendar Grid)
// ----------------------------------------------------------------------
export function PerformanceHeatmap() {
    // Generate dummy heatmap data
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="h-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden group flex flex-col justify-between"
        >
            {/* Gradient Accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors duration-500" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        Consistency
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-1">Win/Loss Heatmap</p>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3 relative z-10">
                {months.map((m, i) => {
                    // Random win/loss for demo
                    const val = Math.random() > 0.4 ? 1 : -1;
                    const intensity = Math.random() * 0.8 + 0.2; // 0.2 to 1.0 opacity
                    const isWin = val > 0;

                    return (
                        <div key={i} className="group/cell relative">
                            <div
                                className={clsx(
                                    "aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all hover:scale-110 shadow-lg",
                                    isWin
                                        ? "bg-emerald-500 text-emerald-900 dark:text-white"
                                        : "bg-rose-500 text-rose-900 dark:text-white"
                                )}
                                style={{ opacity: intensity < 0.3 ? 0.3 : intensity }}
                            >
                                {m}
                            </div>
                            <div className="opacity-0 group-hover/cell:opacity-100 absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] font-bold px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-20">
                                {isWin ? '+' : '-'}{(Math.random() * 5).toFixed(1)}%
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Win</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Loss</div>
            </div>
        </motion.div>
    )
}
