"use client";

import { PortfolioHolding } from "@/lib/api";
import { ArrowUpRight, ArrowDownRight, Trash2, TrendingUp, MoreHorizontal } from "lucide-react";

import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import clsx from "clsx";

// Extended interface to support Sparklines
export interface AssetCardProps {
    holding: PortfolioHolding & { sparkline_data?: number[] };
    onDelete: (id: number) => void;
    onClick: () => void;
}

export function AssetCard({ holding, onDelete, onClick }: AssetCardProps) {
    const isProfitable = holding.pnl_percent >= 0;

    // Sparkline Data fallback
    // If no real data, we simulate a flat line or 2 points to prevent crashes
    const data = (holding.sparkline_data && holding.sparkline_data.length > 1)
        ? holding.sparkline_data.map((val, i) => ({ i, val }))
        : [{ i: 0, val: holding.current_price }, { i: 1, val: holding.current_price }];

    const color = isProfitable ? "#10B981" : "#EF4444"; // Emerald-500 or Red-500

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onClick}
            className="group relative bg-white dark:bg-[#151925] rounded-3xl border border-slate-100 dark:border-white/5 p-5 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/20 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Background Gradient overlay for premium feel on hover */}
            <div className={clsx(
                "absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none",
                isProfitable ? "bg-emerald-500" : "bg-rose-500"
            )} />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-lg",
                        isProfitable
                            ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/20"
                            : "bg-gradient-to-br from-rose-400 to-red-600 shadow-rose-500/20"
                    )}>
                        {holding.symbol.slice(0, 3)}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{holding.symbol}</h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{holding.quantity} Shares</p>
                    </div>
                </div>

                {/* Context Menu (Delete) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(holding.id); }}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* SPARKLINE AREA */}
            <div className="h-16 -mx-6 mb-4 relative opacity-80 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`grad-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="val"
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#grad-${holding.id})`}
                            isAnimationActive={false} // Performance optimization for lists
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-2 relative z-10">
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Value</p>
                    <p className="text-base font-black text-slate-900 dark:text-white font-mono">
                        {Math.round(holding.current_value).toLocaleString()}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Total P&L</p>
                    <div className={clsx(
                        "text-base font-black font-mono flex items-center justify-end",
                        isProfitable ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {isProfitable ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                        {holding.pnl_percent.toFixed(2)}%
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
