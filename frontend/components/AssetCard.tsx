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

    // Type Safety: Ensure we have valid current price for fallback
    // The API might return it as current_price or we fall back to average_price
    const currentPrice = holding.current_value / holding.quantity;

    // Sparkline Data fallback
    const sparkData = (holding.sparkline_data && holding.sparkline_data.length > 1)
        ? holding.sparkline_data.map((val, i) => ({ i, val }))
        : [{ i: 0, val: currentPrice }, { i: 1, val: currentPrice }];

    const color = isProfitable ? "#10B981" : "#F43F5E"; // Emerald-500 or Rose-500

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onClick}
            className="group relative bg-[#1A1F2E] rounded-3xl border border-white/5 p-5 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-sm"
        >
            {/* Background Gradient overlay for premium feel on hover */}
            <div className={clsx(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none duration-500",
                isProfitable ? "bg-gradient-to-br from-emerald-500 via-transparent to-transparent" : "bg-gradient-to-br from-rose-500 via-transparent to-transparent"
            )} />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={clsx(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-lg ring-1 ring-white/10",
                        isProfitable
                            ? "bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/20"
                            : "bg-gradient-to-br from-rose-500 to-red-700 shadow-rose-500/20"
                    )}>
                        {holding.symbol.slice(0, 3)}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white leading-tight tracking-tight">{holding.symbol}</h3>
                        <p className="text-xs font-semibold text-slate-400">{holding.quantity.toLocaleString()} Shares</p>
                    </div>
                </div>

                {/* Flexible Action Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(holding.id); }}
                    className="p-2 -mr-2 -mt-2 rounded-xl text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-white/5 transition-all duration-200"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* SPARKLINE AREA */}
            <div className="h-16 -mx-5 mb-4 relative opacity-60 group-hover:opacity-100 transition-all duration-500">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                        <defs>
                            <linearGradient id={`grad-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
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
            <div className="grid grid-cols-2 gap-2 relative z-10 border-t border-white/5 pt-3">
                <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Value</p>
                    <p className="text-base font-black text-white font-mono tracking-tight">
                        {Math.round(holding.current_value).toLocaleString()}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Total P&L</p>
                    <div className={clsx(
                        "text-base font-black font-mono flex items-center justify-end",
                        isProfitable ? "text-emerald-400" : "text-rose-400"
                    )}>
                        {isProfitable ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                        {holding.pnl_percent.toFixed(2)}%
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
