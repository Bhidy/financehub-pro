"use client";

import { motion } from "framer-motion";
import { Calendar, DollarSign, TrendingUp, TrendingDown, Layers, ArrowRight, Zap } from "lucide-react";
import clsx from "clsx";
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { PortfolioHolding, PortfolioSnapshot } from "@/lib/api";
import { useMarketSafe } from "@/contexts/MarketContext";
import { useState } from "react";

// ==============================================================================
// 1. DIVIDEND FORECAST (Real Data Logic)
// ==============================================================================
interface DividendForecastProps {
    holdings: PortfolioHolding[];
}

export function DividendForecast({ holdings }: DividendForecastProps) {
    const { config } = useMarketSafe();

    // Guard against undefined holdings
    const safeHoldings = holdings || [];

    const totalValue = safeHoldings.reduce((sum, h) => sum + h.current_value, 0);
    const estimatedAnnualPassiceIncome = totalValue * 0.042; // 4.2% yield assumption

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const isQuarterly = (i + 1) % 3 === 0;
        const baseAmt = (estimatedAnnualPassiceIncome / 12) * 0.3;
        const amt = isQuarterly ? (estimatedAnnualPassiceIncome / 4) : baseAmt;

        return {
            month: monthNames[i],
            amount: amt,
            isPayout: isQuarterly
        };
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/40 relative overflow-hidden group flex flex-col justify-between"
        >
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Income Forecast</h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">Projected Yield (TM)</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Est. Annual</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">{config.currency} {estimatedAnnualPassiceIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
            </div>

            <div className="h-40 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.6} />
                            </linearGradient>
                            <linearGradient id="barGradientLight" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.5} />
                                <stop offset="100%" stopColor="#94A3B8" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>
                        <Bar dataKey="amount" radius={[4, 4, 4, 4]} barSize={8}>
                            {monthlyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.isPayout ? "url(#barGradient)" : "url(#barGradientLight)"} />
                            ))}
                        </Bar>
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-slate-900 text-white text-xs font-bold p-2 rounded-lg shadow-xl border border-white/10">
                                            <p className="mb-1">{payload[0].payload.month}</p>
                                            <p className="text-blue-400">{config.currency} {Number(payload[0].value).toFixed(0)}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                            interval={0}
                            dy={10}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Next Payout
                </span>
                <span className="text-slate-900 dark:text-white">Mar 15 (Est.)</span>
            </div>
        </motion.div>
    );
}

// ==============================================================================
// 2. MARKET MOVERS (Real Data Logic)
// ==============================================================================
interface TopMoversProps {
    holdings: PortfolioHolding[];
}

export function TopMoversList({ holdings }: TopMoversProps) {
    const [viewMode, setViewMode] = useState<'gainers' | 'losers'>('gainers');
    const { config } = useMarketSafe();

    const safeHoldings = holdings || [];

    const sortedMovers = [...safeHoldings].sort((a, b) => b.pnl_percent - a.pnl_percent);

    // Logic: if viewMode is gainers, take top 3 positive. If losers, take bottom 3 (reversed).
    // If user clicks toggle, we switch list.

    const topGainers = sortedMovers.filter(h => h.pnl_percent >= 0).slice(0, 3);
    const topLosers = [...sortedMovers].filter(h => h.pnl_percent < 0).reverse().slice(0, 3);
    // Wait, strictly sort descending: [10, 5, -2, -8]
    // Gainers: 10, 5
    // Losers: -8, -2? Or just bottom of list?
    // Let's just slice head and tail.

    const gainersList = sortedMovers.slice(0, 3);
    const losersList = [...sortedMovers].reverse().slice(0, 3);

    const displayList = viewMode === 'gainers' ? gainersList : losersList;
    const isGainersView = viewMode === 'gainers';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="h-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/40 relative overflow-hidden group flex flex-col"
        >
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className={clsx("p-2 rounded-xl", isGainersView ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                            {isGainersView ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Top Movers</h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">Portfolio Volatility Drivers</p>
                </div>
                {/* Toggle */}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl h-fit">
                    <button onClick={() => setViewMode('gainers')} className={clsx("p-1.5 rounded-lg transition-all", viewMode === 'gainers' ? "bg-white dark:bg-slate-700 shadow-sm text-emerald-500" : "text-slate-400")}>
                        <TrendingUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('losers')} className={clsx("p-1.5 rounded-lg transition-all", viewMode === 'losers' ? "bg-white dark:bg-slate-700 shadow-sm text-rose-500" : "text-slate-400")}>
                        <TrendingDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-3 flex-1">
                {displayList.map((mover, i) => {
                    const isUp = mover.pnl_percent >= 0;
                    return (
                        <div key={mover.id || i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer group/item border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-sm transition-transform group-hover/item:scale-110",
                                    isUp ? "bg-white dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-white dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                )}>
                                    {mover.symbol ? mover.symbol[0] : '?'}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{mover.symbol}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[80px]">{mover.company_name || 'Stock'}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="font-black text-slate-900 dark:text-white text-sm tabular-nums">
                                    {config.currency} {mover.average_price.toFixed(2)}
                                </p>
                                <div className={clsx("flex items-center justify-end gap-1 text-[10px] font-bold mt-0.5", isUp ? "text-emerald-500" : "text-rose-500")}>
                                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {isUp ? '+' : ''}{mover.pnl_percent.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    );
                })}

                {displayList.length === 0 && (
                    <div className="flex items-center justify-center h-full text-xs font-bold text-slate-400 italic">
                        No active positions
                    </div>
                )}
            </div>

            <button className="w-full mt-6 py-3 rounded-xl border border-dashed border-slate-300 dark:border-white/20 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/40 transition-all flex items-center justify-center gap-2">
                View All Analytics <ArrowRight className="w-3 h-3" />
            </button>
        </motion.div>
    );
}

// ==============================================================================
// 3. MONTHLY HEATMAP (Real Data Logic)
// ==============================================================================
interface ConsistencyProps {
    history?: PortfolioSnapshot[];
}

export function PerformanceHeatmap({ history }: ConsistencyProps) {
    // Process history to determine daily "Win/Loss" status
    // A "Win" is if total_pnl > previous_total_pnl (or total_value increase)

    // We'll take the last 12 days for the grid.
    const safeHistory = history || [];
    const sortedHistory = [...safeHistory].sort((a, b) => {
        // @ts-ignore
        const da = new Date(a.snapshot_date || a.date).getTime();
        // @ts-ignore
        const db = new Date(b.snapshot_date || b.date).getTime();
        return da - db;
    });

    const last12 = sortedHistory.slice(-13); // Get 13 to calc 12 differences if needed

    // Fill with dummy data if not enough history
    const displayPoints = Array.from({ length: 12 }, (_, i) => {
        // Calculate difference logic
        // Index in last12 corresponding to display i ? 
        // We want the LATEST 12 days.
        // Let's just create array of results.

        if (last12.length < 2) {
            return { label: `D${i + 1}`, status: 'neutral', val: 0 };
        }

        // If we have history points
        // Let's assume last12 has [D-12, ... D-1, Today]
        // But we need 12 blocks.
        // Let's map from the end.

        const currentIdx = last12.length - 1 - (11 - i); // i=11 (last) => last element
        const prevIdx = currentIdx - 1;

        if (currentIdx <= 0 || prevIdx < 0) {
            return { label: '-', status: 'neutral', val: 0 };
        }

        const curr = last12[currentIdx];
        const prev = last12[prevIdx];

        // @ts-ignore
        const currVal = curr.total_pnl ?? curr.total_equity ?? 0;
        // @ts-ignore
        const prevVal = prev.total_pnl ?? prev.total_equity ?? 0;

        const change = currVal - prevVal;
        const isWin = change >= 0;

        // @ts-ignore
        const d = new Date(curr.snapshot_date || curr.date);

        return {
            label: d.getDate(),
            status: isWin ? 'win' : 'loss',
            val: Math.abs(change)
        };
    });

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="h-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/40 relative overflow-hidden group flex flex-col justify-between"
        >
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                            <Zap className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Consistency</h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">12-Day Win Streak</p>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3 relative z-10 mb-2">
                {displayPoints.map((point, i) => (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4 + (i * 0.05) }}
                        key={i}
                        className="group/cell relative"
                    >
                        <div
                            className={clsx(
                                "aspect-square rounded-2xl flex items-center justify-center text-xs font-black transition-all hover:scale-110 shadow-sm cursor-default border",
                                point.status === 'win'
                                    ? "bg-emerald-500 text-white border-emerald-400"
                                    : point.status === 'loss' ? "bg-rose-500 text-white border-rose-400" : "bg-slate-100 dark:bg-white/10 text-slate-400 border-transparent"
                            )}
                        >
                            {point.label}
                        </div>
                        {/* Tooltip */}
                        {point.status !== 'neutral' && (
                            <div className="opacity-0 group-hover/cell:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-xl transition-opacity">
                                {point.status === 'win' ? '+' : '-'}{Number(point.val).toLocaleString()}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                <span>Last 12 Days</span>
                <div className="flex gap-3">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Win</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Loss</span>
                </div>
            </div>
        </motion.div>
    )
}
