"use client";

import { useState, useMemo } from 'react';
import { AreaChart, Area, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from "framer-motion";
import { format, subDays, isAfter } from 'date-fns';
import clsx from "clsx";
import { PortfolioSnapshot } from "@/lib/api";
import { useMarketSafe } from "@/contexts/MarketContext";

interface PortfolioChartProps {
    history?: PortfolioSnapshot[];
}

export function PortfolioChart({ history }: PortfolioChartProps) {
    const { config } = useMarketSafe();
    const [timeRange, setTimeRange] = useState<'1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
    const [hoverValue, setHoverValue] = useState<number | null>(null);
    const [hoverDate, setHoverDate] = useState<string | null>(null);

    // Defensive Data Processing
    // We handle mixed data types here to prevent runtime crashes if API schema drifts
    const charData = useMemo(() => {
        if (!history || !Array.isArray(history) || history.length === 0) return [];

        return history.map(snap => {
            // Backend might send 'snapshot_date' or 'date', handle both
            // @ts-ignore
            const rawDate = snap.snapshot_date || snap.date;

            // Backend sends 'total_value' (or 'total_equity' in older versions)
            // @ts-ignore
            const val = snap.total_value ?? snap.total_equity ?? 0;

            return {
                ...snap,
                resolved_date: rawDate,
                total_value: Number(val)
            };
        })
            .filter(item => item.resolved_date) // Remove items with no date
            .sort((a, b) => new Date(a.resolved_date).getTime() - new Date(b.resolved_date).getTime())
            .filter(snap => {
                if (timeRange === 'ALL') return true;
                try {
                    const date = new Date(snap.resolved_date);
                    const now = new Date();
                    const daysToSub = timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : 365;
                    const cutoff = subDays(now, daysToSub);
                    return isAfter(date, cutoff);
                } catch (e) {
                    return true; // Keep faulty dates rather than crashing
                }
            });
    }, [history, timeRange]);

    // Handle empty state gracefully
    if (!charData || charData.length < 2) {
        return (
            <div className="h-[380px] bg-white dark:bg-[#151925] rounded-[2.5rem] border border-slate-200 dark:border-white/5 flex items-center justify-center p-6 shadow-2xl">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-emerald-500 rounded-full"
                        />
                    </div>
                    <p className="font-black text-slate-900 dark:text-white">Gathering Intelligence</p>
                    <p className="text-xs font-bold text-slate-400">Not enough data to calculate Alpha yet.</p>
                </div>
            </div>
        )
    }

    const latestValue = charData[charData.length - 1].total_value;
    const startValue = charData[0].total_value;
    const isPositive = latestValue >= startValue;
    const growthPercent = startValue > 0 ? ((latestValue - startValue) / startValue) * 100 : 0;

    const displayValue = hoverValue !== null ? hoverValue : latestValue;
    const displayDateRaw = hoverDate || charData[charData.length - 1].resolved_date;

    // Safe date formatting
    let displayDate = "";
    try {
        displayDate = format(new Date(displayDateRaw), "MMM dd, yyyy");
    } catch (e) {
        displayDate = "Unknown Date";
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[380px] bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden flex flex-col group"
        >
            {/* Dynamic Glow Background */}
            <div className={clsx(
                "absolute top-0 right-0 w-[500px] h-[500px] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000 opacity-20 dark:opacity-10",
                isPositive ? "bg-emerald-500" : "bg-rose-500"
            )} />

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Portfolio Alpha</h3>
                        <div className={clsx("w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]", isPositive ? "bg-emerald-500 text-emerald-500" : "bg-rose-500 text-rose-500")} />
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {config.currency} {displayValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className={clsx("text-sm font-bold px-2 py-0.5 rounded-lg", isPositive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
                            {isPositive ? '+' : ''}{growthPercent.toFixed(2)}%
                        </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        {displayDate} • GROWTH INDEX (NAV)
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl flex items-center">
                        {['1W', '1M', '3M', '1Y', 'ALL'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range as any)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                    timeRange === range
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                )}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* CHART AREA */}
            <div className="flex-1 w-full min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={charData}
                        onMouseMove={(e: any) => {
                            if (e.activePayload && e.activePayload.length > 0) {
                                setHoverValue(e.activePayload[0].value as number);
                                setHoverDate(e.activePayload[0].payload.resolved_date);
                            }
                        }}
                        onMouseLeave={() => {
                            setHoverValue(null);
                            setHoverDate(null);
                        }}
                    >
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isPositive ? "#10B981" : "#F43F5E"} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={isPositive ? "#10B981" : "#F43F5E"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />

                        {/* Area */}
                        <Area
                            type="monotone"
                            dataKey="total_value"
                            stroke={isPositive ? "#10B981" : "#F43F5E"}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            isAnimationActive={true}
                        />
                        <Tooltip
                            content={<></>}
                            cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
