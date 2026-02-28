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
                        className="fixed inset-y-0 right-0 z-[110] w-full max-w-lg bg-white dark:bg-[#1A222C] shadow-lg border-l border-slate-200 dark:border-[#2E3A47] flex flex-col overflow-hidden"
                    >
                        {/* 1. INSTITUTIONAL HEADER */}
                        <div className="relative pt-12 pb-8 px-8 overflow-hidden group/header">
                            <div className="flex items-center justify-between relative z-10 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-md bg-[#F1F5F9] dark:bg-[#24303F] text-[#3C50E0] flex items-center justify-center border border-slate-200 dark:border-[#2E3A47]">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Asset Intelligence</h2>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">Active Position</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="p-2 rounded-md bg-white dark:bg-[#24303F] hover:bg-slate-50 dark:hover:bg-[#1A222C] text-slate-600 dark:text-slate-300 transition-all active:scale-95 border border-slate-200 dark:border-[#2E3A47]"
                                    onClick={onClose}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-baseline gap-3 mb-2">
                                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{holding.symbol}</h1>
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
                            <div className="relative h-56 bg-white dark:bg-[#24303F] rounded-md border border-slate-200 dark:border-[#2E3A47] shadow-sm p-6 overflow-hidden transition-colors duration-300">
                                <div className="flex justify-between items-start relative z-10 mb-2">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Volatility Index</p>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">7D Market Delta</h4>
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
                                <div className="p-6 rounded-md bg-white dark:bg-[#24303F] border border-slate-200 dark:border-[#2E3A47] shadow-sm transition-all hover:shadow-md">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-md bg-[#F1F5F9] dark:bg-[#1A222C] flex items-center justify-center text-[#3C50E0]">
                                            <DollarSign className="w-4 h-4 stroke-[3]" />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Market Value</span>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                        <span className="text-xl mr-1 text-slate-400">{currency}</span>
                                        {Math.round(holding.current_value).toLocaleString()}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md w-fit">
                                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                        VERIFIED ASSET
                                    </div>
                                </div>

                                <div className="p-6 rounded-md bg-white dark:bg-[#24303F] border border-slate-200 dark:border-[#2E3A47] shadow-sm transition-all hover:shadow-md">
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

                                <div className="bg-white dark:bg-[#24303F] rounded-md border border-slate-200 dark:border-[#2E3A47] overflow-hidden shadow-sm">
                                    {[
                                        { label: "Execution Price", value: `${currency} ${holding.average_price.toFixed(2)}`, icon: MapPin },
                                        { label: "Current Terminal", value: `${currency} ${holding.current_price}`, icon: Activity },
                                        { label: "Total Inventory", value: `${holding.quantity.toLocaleString()} UNITS`, icon: Box },
                                        { label: "Market Segment", value: holding.sector || 'Equities', icon: Info },
                                        { label: "Inception Date", value: holding.purchase_date || 'Unknown', icon: Calendar },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-[#2E3A47] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1A222C] transition-all group">
                                            <div className="flex items-center gap-3">
                                                <item.icon className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-brand-accent transition-colors" />
                                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 transition-colors">{item.label}</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pro Actions Footer */}
                            <div className="pt-4">
                                <button className="w-full py-3 rounded-md bg-[#3C50E0] hover:bg-[#3C50E0]/90 text-white font-medium text-sm transition-all shadow-sm">
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
