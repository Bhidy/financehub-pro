"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from "clsx";
import { motion } from "framer-motion";
import { PortfolioSnapshot } from "@/lib/api";

interface PortfolioChartProps {
    history: PortfolioSnapshot[] | undefined;
}

export function PortfolioChart({ history }: PortfolioChartProps) {
    const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');

    // Filter Logic (Simplified - assumes backend handles standard history or we filter client side)
    // For now, we just pass all data but in a real app we'd slice the array based on timeframe
    const data = history || [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#151925] border border-white/5 rounded-[32px] p-8 shadow-2xl shadow-black/40 relative overflow-hidden"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Portfolio Performance
                        {/* Live Indicator */}
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                    </h3>
                    <p className="text-sm font-medium text-slate-400">Net Asset Value (NAV) History</p>
                </div>

                {/* Timeframe Toggles */}
                <div className="flex bg-white/5 rounded-xl p-1.5 border border-white/5">
                    {(['1W', '1M', '3M', '1Y', 'ALL'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            className={clsx(
                                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300",
                                timeframe === t
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[350px] w-full">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                            <XAxis
                                dataKey="snapshot_date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                minTickGap={50}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                tickFormatter={(val) => `SAR ${(val / 1000).toFixed(0)}k`}
                                domain={['auto', 'auto']}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    color: '#f8fafc',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                                    backdropFilter: 'blur(10px)'
                                }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                formatter={(val: any) => [`SAR ${Number(val).toLocaleString()}`, 'Portfolio Value']}
                                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                cursor={{ stroke: '#3B82F6', strokeWidth: 2, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total_value"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <span className="text-2xl">📉</span>
                        </div>
                        <p className="font-medium">No history data available yet</p>
                        <p className="text-xs opacity-60">Check back tomorrow for trend analysis</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
