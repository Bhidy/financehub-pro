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
    const stats = [
        {
            label: "Total Value",
            value: `SAR ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: Wallet,
            color: "blue",
            subtext: `${holdingsCount} holdings`
        },
        {
            label: "Total P&L",
            value: totalPnl >= 0
                ? `+SAR ${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : `-SAR ${Math.abs(totalPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
            color: totalPnl >= 0 ? "green" : "red",
            subtext: `${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%`
        },
        {
            label: "Today's Change",
            value: dailyPnl >= 0
                ? `+SAR ${dailyPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : `-SAR ${Math.abs(dailyPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: Activity,
            color: dailyPnl >= 0 ? "emerald" : "rose",
            subtext: `${dailyPnlPercent >= 0 ? '+' : ''}${dailyPnlPercent.toFixed(2)}%`
        },
        {
            label: "Cash Balance",
            value: `SAR ${cashBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            icon: DollarSign,
            color: "violet",
            subtext: "Available"
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-10 mb-8 relative z-10">
            {stats.map((stat, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white/80 dark:bg-[#151925]/80 backdrop-blur-xl rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/20 p-5 hover:transform hover:scale-[1.02] transition-transform duration-300"
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className={clsx(
                            "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner",
                            stat.color === "blue" && "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
                            stat.color === "green" && "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                            stat.color === "red" && "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400",
                            stat.color === "emerald" && "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                            stat.color === "rose" && "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
                            stat.color === "violet" && "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
                        )}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">{stat.label}</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white mb-1">{stat.value}</div>
                    <div className={clsx(
                        "text-xs font-medium",
                        stat.subtext.includes('+') ? "text-emerald-600 dark:text-emerald-400" :
                            stat.subtext.includes('-') && !stat.subtext.includes('holdings') ? "text-rose-600 dark:text-rose-400" :
                                "text-slate-500 dark:text-slate-400"
                    )}>
                        {stat.subtext}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
