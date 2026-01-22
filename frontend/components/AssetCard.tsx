"use client";

import { PortfolioHolding } from "@/lib/api";
import { ArrowUpRight, ArrowDownRight, Trash2, TrendingUp, MoreHorizontal, Wallet, Box } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import clsx from "clsx";
import { useMarketSafe } from "@/contexts/MarketContext";

export interface AssetCardProps {
    holding: PortfolioHolding & { sparkline_data?: number[] };
    onDelete: (id: number) => void;
    onClick: () => void;
}

export function AssetCard({ holding, onDelete, onClick }: AssetCardProps) {
    const { config } = useMarketSafe();
    const currency = config.currency;
    const isProfitable = holding.pnl_percent >= 0;

    const currentPrice = holding.current_value / holding.quantity;

    const sparkData = (holding.sparkline_data && holding.sparkline_data.length > 1)
        ? holding.sparkline_data.map((val, i) => ({ i, val }))
        : [{ i: 0, val: currentPrice * 0.98 }, { i: 1, val: currentPrice * 1.01 }, { i: 2, val: currentPrice }];

    const color = isProfitable ? "#10B981" : "#F43F5E";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -6, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
            onClick={onClick}
            className="group relative bg-white dark:bg-[#151925] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 shadow-xl shadow-slate-900/5 dark:shadow-black/60 transition-all duration-500 cursor-pointer overflow-hidden backdrop-blur-xl"
        >
            {/* Dynamic Hover Background */}
            <div className={clsx(
                "absolute inset-0 opacity-0 group-hover:opacity-[0.03] dark:group-hover:opacity-[0.07] transition-opacity duration-700 pointer-events-none",
                isProfitable ? "bg-emerald-500" : "bg-rose-500"
            )} />

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-5">
                    <div className={clsx(
                        "w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-black text-white shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                        isProfitable
                            ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/30"
                            : "bg-gradient-to-br from-rose-400 to-red-600 shadow-rose-500/30"
                    )}>
                        {holding.symbol.slice(0, 3)}
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-900 dark:text-white leading-none mb-1.5 tracking-tight group-hover:text-brand-accent transition-colors">{holding.symbol}</h3>
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border border-slate-200/50 dark:border-white/10">
                                {holding.quantity.toLocaleString()} UNIT
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(holding.id); }}
                        className="p-2 rounded-xl text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-300 group/delete opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* INTEGRATED SPARKLINE */}
            <div className="h-20 -mx-6 mb-6 relative group-hover:scale-[1.05] transition-transform duration-700">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                        <defs>
                            <linearGradient id={`grad-card-${holding.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="val"
                            stroke={color}
                            strokeWidth={3}
                            fill={`url(#grad-card-${holding.id})`}
                            isAnimationActive={true}
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* PERFORMANCE GRID */}
            <div className="grid grid-cols-2 gap-4 relative z-10 pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Holdings Value</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white font-mono leading-none tracking-tight">
                        {currency} <span className="text-xl">{Math.round(holding.current_value).toLocaleString()}</span>
                    </p>
                </div>
                <div className="text-right space-y-1">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Total Yield</p>
                    <div className={clsx(
                        "text-xl font-black font-mono leading-none flex items-center justify-end tracking-tight",
                        isProfitable ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {isProfitable ? <ArrowUpRight className="w-4 h-4 mr-1 stroke-[3px]" /> : <ArrowDownRight className="w-4 h-4 mr-1 stroke-[3px]" />}
                        {holding.pnl_percent.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* Interactive Corner Accent */}
            <div className={clsx(
                "absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-br from-transparent to-slate-200/20 dark:to-white/5 rounded-tl-3xl translate-x-4 translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-500",
                isProfitable ? "to-emerald-500/10" : "to-rose-500/10"
            )} />
        </motion.div>
    );
}
