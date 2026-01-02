"use client";

import React from "react";
import {
    TrendingUp, TrendingDown, BarChart3, DollarSign, Activity,
    Clock, Users, Zap, Target, Flame, Sparkles, ArrowUpRight,
    ArrowDownRight, PieChart, Wallet, Building2, LineChart,
    AlertCircle, CheckCircle, XCircle, Info, Star
} from "lucide-react";
import clsx from "clsx";

// ============================================================================
// PREMIUM ICON SYSTEM - Ultra Modern Vector Icons
// Replaces all Unicode emojis with styled Lucide vectors
// ============================================================================

interface IconBadgeProps {
    type: 'price' | 'change' | 'volume' | 'time' | 'trend' | 'fire' | 'sparkle' | 'chart' | 'target' | 'wallet';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const iconConfigs = {
    price: { icon: DollarSign, gradient: "from-emerald-400 to-teal-500", shadow: "shadow-emerald-500/30" },
    change: { icon: TrendingUp, gradient: "from-blue-400 to-indigo-500", shadow: "shadow-blue-500/30" },
    volume: { icon: BarChart3, gradient: "from-violet-400 to-purple-500", shadow: "shadow-violet-500/30" },
    time: { icon: Clock, gradient: "from-amber-400 to-orange-500", shadow: "shadow-amber-500/30" },
    trend: { icon: Activity, gradient: "from-cyan-400 to-blue-500", shadow: "shadow-cyan-500/30" },
    fire: { icon: Flame, gradient: "from-orange-400 to-red-500", shadow: "shadow-orange-500/30" },
    sparkle: { icon: Sparkles, gradient: "from-pink-400 to-rose-500", shadow: "shadow-pink-500/30" },
    chart: { icon: LineChart, gradient: "from-indigo-400 to-blue-500", shadow: "shadow-indigo-500/30" },
    target: { icon: Target, gradient: "from-red-400 to-rose-500", shadow: "shadow-red-500/30" },
    wallet: { icon: Wallet, gradient: "from-green-400 to-emerald-500", shadow: "shadow-green-500/30" },
};

const sizeClasses = {
    sm: { container: "w-6 h-6", icon: "w-3.5 h-3.5" },
    md: { container: "w-8 h-8", icon: "w-4.5 h-4.5" },
    lg: { container: "w-10 h-10", icon: "w-5 h-5" },
};

/**
 * Premium Icon Badge - Gradient vector icons to replace emojis
 */
export function IconBadge({ type, size = 'md', className }: IconBadgeProps) {
    const config = iconConfigs[type];
    const sizes = sizeClasses[size];
    const Icon = config.icon;

    return (
        <div className={clsx(
            "rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
            config.gradient, config.shadow, sizes.container, className
        )}>
            <Icon className={clsx("text-white drop-shadow", sizes.icon)} />
        </div>
    );
}

/**
 * Premium Stat Row - Icon + Label + Value with modern styling
 */
export function StatRow({
    icon,
    label,
    value,
    trend,
    highlight = false
}: {
    icon: 'price' | 'change' | 'volume' | 'time' | 'trend' | 'chart' | 'wallet',
    label: string,
    value: string,
    trend?: 'up' | 'down',
    highlight?: boolean
}) {
    return (
        <div className={clsx(
            "flex items-center gap-3 p-3 rounded-2xl transition-all",
            highlight ? "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100" : "bg-slate-50/80"
        )}>
            <IconBadge type={icon} size="sm" />
            <span className="text-sm text-slate-500 min-w-[80px]">{label}</span>
            <span className="text-sm font-bold text-slate-900 flex-1">{value}</span>
            {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
            {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500" />}
        </div>
    );
}

/**
 * Premium Price Card - Hero style price display
 */
export function PremiumPriceCard({
    symbol,
    name,
    price,
    change,
    isPositive
}: {
    symbol: string,
    name: string,
    price: string,
    change: string,
    isPositive: boolean
}) {
    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6 text-white">
            {/* Decorative blurs */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl" />

            <div className="relative z-10">
                {/* Symbol badge */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">{symbol}</div>
                        <div className="text-sm font-semibold text-white/90">{name}</div>
                    </div>
                </div>

                {/* Price */}
                <div className="flex items-end gap-4 mb-4">
                    <div className="text-4xl font-black tracking-tight">{price}</div>
                    <div className="text-lg text-slate-400 mb-1">SAR</div>
                </div>

                {/* Change badge */}
                <div className={clsx(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold",
                    isPositive
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                )}>
                    {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {change}%
                </div>
            </div>
        </div>
    );
}

/**
 * Premium Verdict Card - Animated verdict with icon
 */
export function VerdictCard({
    verdict,
    text
}: {
    verdict: 'bullish' | 'bearish' | 'neutral',
    text: string
}) {
    const configs = {
        bullish: {
            icon: TrendingUp,
            bg: "bg-gradient-to-r from-emerald-500 to-teal-500",
            label: "Looking Good!",
            shadow: "shadow-emerald-500/25"
        },
        bearish: {
            icon: TrendingDown,
            bg: "bg-gradient-to-r from-red-500 to-rose-500",
            label: "Heads Up!",
            shadow: "shadow-red-500/25"
        },
        neutral: {
            icon: AlertCircle,
            bg: "bg-gradient-to-r from-slate-500 to-slate-600",
            label: "Mixed Signals",
            shadow: "shadow-slate-500/25"
        }
    };

    const config = configs[verdict];
    const Icon = config.icon;

    return (
        <div className={clsx(
            "inline-flex items-center gap-4 px-5 py-4 rounded-2xl text-white shadow-xl",
            config.bg, config.shadow
        )}>
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <div className="text-base font-black">{config.label}</div>
                <div className="text-sm opacity-90">{text}</div>
            </div>
        </div>
    );
}

/**
 * Premium Stats Grid - Glass morphism stat cards
 */
export function StatsGrid({ stats }: {
    stats: Array<{ icon: 'price' | 'volume' | 'chart' | 'time' | 'wallet', label: string, value: string }>
}) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-lg shadow-slate-200/50">
                    <IconBadge type={stat.icon} size="md" />
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                        <div className="text-base font-black text-slate-900">{stat.value}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Premium Timestamp - Modern time display
 */
export function Timestamp({ time }: { time: string }) {
    return (
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {time}</span>
        </div>
    );
}

/**
 * Metric Pill - Compact inline metric with icon
 */
export function MetricPill({
    icon,
    label,
    value
}: {
    icon: 'price' | 'volume' | 'change' | 'time',
    label: string,
    value: string
}) {
    const config = iconConfigs[icon];
    const Icon = config.icon;

    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-xs">
            <Icon className={clsx("w-3.5 h-3.5", `text-${icon === 'price' ? 'emerald' : icon === 'volume' ? 'violet' : icon === 'change' ? 'blue' : 'amber'}-500`)} />
            <span className="text-slate-500">{label}</span>
            <span className="font-bold text-slate-700">{value}</span>
        </span>
    );
}
