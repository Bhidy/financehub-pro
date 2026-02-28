"use client";

import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Activity,
    DollarSign
} from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";

import { useMarketSafe } from "@/contexts/MarketContext";

interface PortfolioSummaryProps {
    totalValue: number;
    totalPnl: number;
    totalPnlPercent: number;
    dailyPnl: number;
    dailyPnlPercent: number;
    cashBalance: number;
    holdingsCount: number;
}

export function PortfolioSummary({
    totalValue,
    totalPnl,
    totalPnlPercent,
    dailyPnl,
    dailyPnlPercent,
    cashBalance,
    holdingsCount
}: PortfolioSummaryProps) {
    const { config } = useMarketSafe();
    const currency = config.currency;

    const stats = [
        {
            label: "Total Worth",
            value: `${currency} ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: Wallet,
            color: "blue",
            subtext: `${holdingsCount} Asset Positions`,
            glow: "blue"
        },
        {
            label: "Total Net P&L",
            value: totalPnl >= 0
                ? `+${currency} ${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : `-${currency} ${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
            color: totalPnl >= 0 ? "emerald" : "rose",
            subtext: `${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}% Performance`,
            glow: totalPnl >= 0 ? "emerald" : "rose"
        },
        {
            label: "Intraday Delta",
            value: dailyPnl >= 0
                ? `+${currency} ${dailyPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : `-${currency} ${Math.abs(dailyPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: Activity,
            color: dailyPnl >= 0 ? "brand-accent" : "rose",
            subtext: `${dailyPnlPercent >= 0 ? '+' : ''}${dailyPnlPercent.toFixed(2)}% Today`,
            glow: dailyPnl >= 0 ? "brand-accent" : "rose"
        },
        {
            label: "Available Cash",
            value: `${currency} ${cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: DollarSign,
            color: "violet",
            subtext: "Ready for Allocation",
            glow: "violet"
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="group relative"
                >
                    <div className="premium-glass rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-6 flex flex-col h-full transition-all duration-300 group-hover:shadow-xl hover:-translate-y-1">

                        <div className="flex items-start justify-between mb-6">
                            <div className={clsx(
                                "w-10 h-10 rounded-md flex items-center justify-center shadow-sm",
                                stat.color === "blue" && "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                stat.color === "emerald" && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                stat.color === "rose" && "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
                                stat.color === "brand-accent" && "bg-brand-accent/10 text-brand-accent dark:text-brand-accent",
                                stat.color === "violet" && "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                            )}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>

                        <div>
                            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 leading-none">
                                {stat.label}
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-none">
                                {stat.value}
                            </div>
                            <div className={clsx(
                                "flex items-center gap-1.5 text-xs font-black uppercase tracking-wider",
                                stat.subtext.includes('+') ? "text-emerald-600 dark:text-emerald-400" :
                                    stat.subtext.includes('-') && !stat.label.includes('worth') ? "text-rose-600 dark:text-rose-400" :
                                        "text-slate-500 dark:text-slate-400"
                            )}>
                                {stat.subtext}
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
