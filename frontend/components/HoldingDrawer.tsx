"use client";

import { X, TrendingUp, DollarSign, Calendar, Sliders, Info, Briefcase, Activity, ShieldCheck, MapPin, Box } from 'lucide-react';
import { PortfolioHolding } from '@/lib/api';
import clsx from 'clsx';
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { useMarketSafe } from '@/contexts/MarketContext';
import { useTheme } from '@/contexts/ThemeContext';

interface HoldingDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    holding: (PortfolioHolding & { sparkline_data?: number[] }) | null;
}

export function HoldingDrawer({ isOpen, onClose, holding }: HoldingDrawerProps) {
    const { config } = useMarketSafe();
    const { theme } = useTheme();
    const currency = config.currency;
    const isDark = theme === 'dark';

    if (!holding && !isOpen) return null;
    if (!holding) return null;

    const isProfitable = holding.pnl_percent >= 0;
    const sparklineData = (holding.sparkline_data && holding.sparkline_data.length > 1)
        ? holding.sparkline_data.map((val, i) => ({ i, val }))
        : [{ i: 0, val: holding.current_price * 0.95 }, { i: 1, val: holding.current_price * 1.02 }, { i: 2, val: holding.current_price }];

    const brandColor = isProfitable ? "#10B981" : "#F43F5E";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Elite Backdrop Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-[100] transition-opacity duration-500"
                    />

                    {/* Pro Panel Drawer */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0.5 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0.5 }}
                        transition={{ type: 'spring', damping: 35, stiffness: 400 }}
                        className="fixed inset-y-0 right-0 z-[110] w-full max-w-lg bg-white dark:bg-[#0B1121] shadow-[0_0_100px_rgba(0,0,0,0.5)] border-l border-slate-200 dark:border-white/10 flex flex-col overflow-hidden"
                    >
                        {/* 1. INSTITUTIONAL HEADER */}
                        <div className="relative pt-12 pb-8 px-8 overflow-hidden group/header">
                            {/* Decorative Background Accents */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 blur-[100px] rounded-full pointer-events-none -mr-32 -mt-32" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-[60px] rounded-full pointer-events-none -ml-16 -mb-16" />

                            <div className="flex items-center justify-between relative z-10 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-2xl">
                                        <Briefcase className="w-5 h-5 stroke-[2.5]" />
                                    </div>
                                    <div>
                                        <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Asset Intelligence</h2>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">Active Position</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all active:scale-95 border border-slate-200 dark:border-white/5"
                                    onClick={onClose}
                                >
                                    <X className="h-5 w-5 stroke-[3]" />
                                </button>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-baseline gap-3 mb-2">
                                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{holding.symbol}</h1>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border",
                                        isProfitable
                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                    )}>
                                        {isProfitable ? 'Bullish' : 'Bearish'}
                                    </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 font-bold text-lg leading-tight max-w-[80%]">
                                    {holding.company_name || 'Diversified Equity Asset'}
                                </p>
                            </div>
                        </div>

                        {/* 2. ANALYTICS SCROLL AREA */}
                        <div className="flex-1 overflow-y-auto px-8 pb-12 custom-scrollbar space-y-10">

                            {/* Visual Performance Index */}
                            <div className="relative h-56 bg-white dark:bg-[#151925] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl shadow-slate-900/10 dark:shadow-black/60 p-6 overflow-hidden group/viz transition-colors duration-500">
                                <div className="flex justify-between items-start relative z-10 mb-2">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Volatility Index</p>
                                        <h4 className="text-lg font-black text-slate-900 dark:text-white">7D Market Delta</h4>
                                    </div>
                                    <Activity className={clsx("w-5 h-5", isProfitable ? "text-emerald-500" : "text-rose-500")} />
                                </div>

                                <div className="absolute inset-0 pt-16">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={sparklineData}>
                                            <defs>
                                                <linearGradient id="drawer-grad-v2" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={brandColor} stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor={brandColor} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="val"
                                                stroke={brandColor}
                                                strokeWidth={4}
                                                fill="url(#drawer-grad-v2)"
                                                animationDuration={2000}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Position Summary Cards */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-xl transition-all hover:-translate-y-1">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <DollarSign className="w-4 h-4 stroke-[3]" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Market Value</span>
                                    </div>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none mb-2">
                                        <span className="text-xl mr-1 text-slate-400">{currency}</span>
                                        {Math.round(holding.current_value).toLocaleString()}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md w-fit">
                                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                        VERIFIED ASSET
                                    </div>
                                </div>

                                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-xl transition-all hover:-translate-y-1">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                            isProfitable ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                        )}>
                                            <TrendingUp className="w-4 h-4 stroke-[3]" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Yield Focus</span>
                                    </div>
                                    <p className={clsx("text-3xl font-black font-mono tracking-tight leading-none mb-2", isProfitable ? "text-emerald-500" : "text-rose-500")}>
                                        {holding.pnl_percent >= 0 ? '+' : ''}{holding.pnl_percent.toFixed(2)}%
                                    </p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                                        Net {holding.pnl_value >= 0 ? 'Gain' : 'Loss'} of <span className={isProfitable ? "text-emerald-600 dark:text-emerald-400 font-black" : "text-rose-600 dark:text-rose-400 font-black"}>{Math.abs(Math.round(holding.pnl_value)).toLocaleString()} {currency}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Position Technicals */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <Sliders className="w-4 h-4" /> Position Technicals
                                    </h3>
                                    <div className="h-px bg-slate-200 dark:bg-white/5 flex-1 ml-4" />
                                </div>

                                <div className="bg-white dark:bg-[#151925] rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl shadow-slate-900/5 dark:shadow-black/40">
                                    {[
                                        { label: "Execution Price", value: `${currency} ${holding.average_price.toFixed(2)}`, icon: MapPin },
                                        { label: "Current Terminal", value: `${currency} ${holding.current_price}`, icon: Activity },
                                        { label: "Total Inventory", value: `${holding.quantity.toLocaleString()} UNITS`, icon: Box },
                                        { label: "Market Segment", value: holding.sector || 'Equities', icon: Info },
                                        { label: "Inception Date", value: holding.purchase_date || 'Unknown', icon: Calendar },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <item.icon className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-accent transition-colors" />
                                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 transition-colors">{item.label}</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pro Actions Footer */}
                            <div className="pt-4">
                                <button className="w-full py-5 rounded-[2rem] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 dark:shadow-white/10 hover:scale-[1.02] active:scale-95 transition-all">
                                    Detailed Analyst Report
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
