"use client";

import { X, TrendingUp, DollarSign, Calendar, Sliders } from 'lucide-react';
import { PortfolioHolding } from '@/lib/api';
import clsx from 'clsx';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';

interface HoldingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    holding: (PortfolioHolding & { sparkline_data?: number[] }) | null;
}

export function HoldingDrawer({ isOpen, onClose, holding }: HoldingDrawerProps) {
    // If not open, we can still render nothing, but AnimatePresence handles the exit animation
    // But we need 'holding' to be present during exit animation? 
    // Usually we handle this by keeping the 'selectedHolding' in the parent until exit is done,
    // OR we just render when holding is present. 
    // For simplicity, if holding is null, we return null immediately unless we want fancy exit.
    // Given the logic in page.tsx: `holding={selectedHolding}` where selectedHolding becomes null on close.
    // This removes content instantly. To animate out, we need to keep the content.
    // We'll trust Framer Motion's AnimatePresence in page.tsx? 
    // NO, page.tsx just passes `isOpen={!!selectedHolding}`.
    // If we want animation, we should probably handle it in parent or check if holding is ever null.
    // For now, let's just mimic the previous structure but with Framer Motion.

    if (!holding && !isOpen) return null;

    // Use a fallback or the last holding logic is complex without parent help.
    // Let's assume holding is valid when isOpen is true.
    if (!holding) return null;

    const isProfitable = holding.pnl_percent >= 0;
    const sparklineData = (holding.sparkline_data && holding.sparkline_data.length > 1)
        ? holding.sparkline_data.map((val, i) => ({ i, val }))
        : [{ i: 0, val: holding.current_price }, { i: 1, val: holding.current_price }];

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
                    />

                    {/* Drawer Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white dark:bg-[#151925] shadow-2xl border-l border-slate-200 dark:border-white/10 flex flex-col"
                    >
                        {/* HEADER */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6 shrink-0 relative overflow-hidden">
                            {/* Abstract bg element */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                            <div className="flex items-center justify-between relative z-10">
                                <h2 className="text-sm font-bold text-blue-100 uppercase tracking-wider">
                                    Asset Details
                                </h2>
                                <button
                                    type="button"
                                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    onClick={onClose}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="mt-5 relative z-10">
                                <h1 className="text-4xl font-black text-white tracking-tight">{holding.symbol}</h1>
                                <p className="text-white/80 font-medium text-sm mt-1">{holding.company_name || 'Stock Asset'}</p>
                            </div>
                        </div>

                        {/* CONTENT SCROLL */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">

                            {/* 1. Sparkline */}
                            <div className="h-48 -mx-6 bg-slate-50 dark:bg-black/20 mb-8 relative border-b border-t border-slate-100 dark:border-white/5 py-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sparklineData}>
                                        <defs>
                                            <linearGradient id="drawer-grad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={isProfitable ? "#10B981" : "#EF4444"} stopOpacity={0.25} />
                                                <stop offset="95%" stopColor={isProfitable ? "#10B981" : "#EF4444"} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            type="monotone"
                                            dataKey="val"
                                            stroke={isProfitable ? "#10B981" : "#EF4444"}
                                            strokeWidth={3}
                                            fill="url(#drawer-grad)"
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                                <div className="absolute bottom-3 right-6 bg-white/10 backdrop-blur-md px-2 py-1 rounded-md text-xs font-mono text-slate-500 font-bold border border-slate-200 dark:border-white/5">
                                    7 DAY TREND
                                </div>
                            </div>

                            {/* 2. Position Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Value</span>
                                    </div>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                                        {Math.round(holding.current_value).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">SAR</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">P&L</span>
                                    </div>
                                    <p className={clsx("text-2xl font-black font-mono tracking-tight", isProfitable ? "text-emerald-500" : "text-rose-500")}>
                                        {holding.pnl_percent >= 0 ? '+' : ''}{holding.pnl_percent.toFixed(2)}%
                                    </p>
                                    <p className={clsx("text-xs mt-1 font-medium", isProfitable ? "text-emerald-600/60" : "text-rose-600/60")}>
                                        {holding.pnl_value >= 0 ? '+' : ''}{Math.round(holding.pnl_value).toLocaleString()} SAR
                                    </p>
                                </div>
                            </div>

                            {/* 3. Detailed Breakdown */}
                            <div className="space-y-4 mb-8">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Sliders className="w-4 h-4" /> Position Breakdown
                                </h3>
                                <div className="bg-white dark:bg-[#1a202e] rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
                                    {[
                                        { label: "Current Price", value: `SAR ${holding.current_price}` },
                                        { label: "Avg Buy Price", value: `SAR ${holding.average_price.toFixed(2)}` },
                                        { label: "Quantity", value: `${holding.quantity.toLocaleString()} Shares` },
                                        { label: "Sector", value: holding.sector || 'N/A' },
                                        { label: "Purchase Date", value: holding.purchase_date || 'N/A' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{item.label}</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 4. Transactions Placeholder */}
                            <div className="pb-8">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider mb-4">
                                    <Calendar className="w-4 h-4" /> Recent Transactions
                                </h3>
                                <div className="text-center py-10 bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-blue-400/50 transition-colors">
                                    <p className="text-slate-400 text-sm font-medium">No recent transactions logged.</p>
                                    <button className="mt-3 text-blue-500 text-xs font-bold hover:underline bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors">
                                        + Log trade manually
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
