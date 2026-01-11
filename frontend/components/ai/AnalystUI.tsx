"use client";

// ============================================================================
// PROOF OF LIFE: VERSION BANNER
// ============================================================================
// This banner MUST be visible on production to confirm deployment success.
// Build Timestamp: 2026-01-11 23:00
// ============================================================================
const PROOF_OF_LIFE_VERSION = "v2.1.0-ENTERPRISE";


import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Target, ShieldCheck, Activity, BarChart3, Zap, DollarSign, Users, Clock, ArrowUpRight, ArrowDownRight, Sparkles, Flame, AlertCircle } from "lucide-react";
import clsx from "clsx";

/**
 * 📈 PriceChart Component
 * Renders OHLC history in a premium area chart
 */
export function PriceChart({ data, symbol }: { data: any[], symbol: string }) {
    if (!data || data.length === 0) return null;

    // Format data for Recharts (reverse to get chronological order)
    const chartData = [...data].reverse().map(item => ({
        date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        price: item.close,
    }));

    return (
        <div className="h-48 w-full mt-4 bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
            <div className="flex justify-between items-start mb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="w-3 h-3" />
                    Price Momentum • {symbol}
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" hide={true} />
                    <YAxis domain={['auto', 'auto']} hide={true} />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-mono shadow-xl border border-slate-800">
                                        <div className="opacity-60 mb-0.5">{payload[0].payload.date}</div>
                                        <div className="font-bold">SAR {Number(payload[0].value).toFixed(2)}</div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Area type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/**
 * 📊 FinancialTable Component
 * Renders professional financial data grids
 */
export function FinancialTable({ financials }: { financials: any[] }) {
    if (!financials || financials.length === 0) return null;

    return (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100 bg-white">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Period</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Net Income</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Assets</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right text-blue-600">ROE</th>
                    </tr>
                </thead>
                <tbody>
                    {financials.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-bold text-slate-700">{row.period} {row.fiscal_year}</td>
                            <td className="px-4 py-3 text-xs font-mono text-right text-slate-900">
                                {row.net_income_billions ? `${row.net_income_billions}B` : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-right text-slate-900">
                                {row.total_assets_billions ? `${row.total_assets_billions}B` : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-right font-bold text-blue-600">
                                {row.roe ? `${row.roe}%` : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * 🛡️ IndicatorBadge Component
 * Renders analyst signals (Buy/Sell, Sentiment)
 */
export function IndicatorBadge({ label, value, type }: { label: string, value: string, type: 'bullish' | 'bearish' | 'neutral' }) {
    const configs = {
        bullish: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: TrendingUp },
        bearish: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: TrendingDown },
        neutral: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: BarChart3 }
    };

    const config = configs[type];
    const Icon = config.icon;

    return (
        <div className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold", config.bg, config.text, config.border)}>
            <Icon className="w-3.5 h-3.5" />
            <span className="opacity-70">{label}:</span>
            <span>{value}</span>
        </div>
    );
}

// ============================================================================
// ULTRA PREMIUM UI COMPONENTS 
// ============================================================================

/**
 * 💎 MetricCard - Glass morphism stat card with icon
 */
export function MetricCard({
    icon: Icon,
    label,
    value,
    subValue,
    gradient = "from-blue-500 to-indigo-600"
}: {
    icon: React.ComponentType<{ className?: string }>,
    label: string,
    value: string,
    subValue?: string,
    gradient?: string
}) {
    return (
        <div className="group relative p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-0.5">
            {/* Glass effect overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 pointer-events-none" />

            <div className="relative flex items-center gap-3">
                <div className={clsx("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", gradient)}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
                    <div className="text-lg font-black text-slate-900 truncate">{value}</div>
                    {subValue && <div className="text-xs text-slate-500">{subValue}</div>}
                </div>
            </div>
        </div>
    );
}

/**
 * 🔥 VerdictBadge - Animated verdict display with emoji-style icon
 */
export function VerdictBadge({
    verdict,
    explanation
}: {
    verdict: 'bullish' | 'bearish' | 'neutral' | 'hot',
    explanation: string
}) {
    const configs = {
        bullish: {
            bg: 'bg-gradient-to-r from-emerald-500 to-teal-600',
            icon: TrendingUp,
            label: 'Looking good!',
            glow: 'shadow-emerald-500/30'
        },
        bearish: {
            bg: 'bg-gradient-to-r from-red-500 to-rose-600',
            icon: TrendingDown,
            label: 'Heads up!',
            glow: 'shadow-red-500/30'
        },
        neutral: {
            bg: 'bg-gradient-to-r from-slate-500 to-slate-600',
            icon: AlertCircle,
            label: 'Mixed vibes',
            glow: 'shadow-slate-500/30'
        },
        hot: {
            bg: 'bg-gradient-to-r from-orange-500 to-red-500',
            icon: Flame,
            label: 'On fire!',
            glow: 'shadow-orange-500/30'
        }
    };

    const config = configs[verdict];
    const Icon = config.icon;

    return (
        <div className={clsx(
            "inline-flex items-center gap-3 px-5 py-3 rounded-2xl text-white font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-500",
            config.bg, config.glow
        )}>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <div className="text-sm font-black">{config.label}</div>
                <div className="text-xs opacity-90">{explanation}</div>
            </div>
        </div>
    );
}

/**
 * ⚡ DataChip - Compact stat with icon (replaces emoji bullets)
 */
export function DataChip({
    icon: Icon,
    label,
    value,
    trend
}: {
    icon: React.ComponentType<{ className?: string }>,
    label: string,
    value: string,
    trend?: 'up' | 'down' | 'neutral'
}) {
    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-100">
            <Icon className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-sm font-bold text-slate-800">{value}</span>
            {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
            {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500" />}
        </div>
    );
}

/**
 * 💰 PriceHero - Large hero-style price display
 */
export function PriceHero({
    symbol,
    name,
    price,
    change,
    changePercent
}: {
    symbol: string,
    name: string,
    price: string,
    change?: string,
    changePercent?: string
}) {
    const isPositive = parseFloat(changePercent || '0') >= 0;

    return (
        <div className="relative p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl" />

            <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs font-mono">{symbol}</span>
                    <span className="text-slate-400 text-sm truncate">{name}</span>
                </div>

                <div className="flex items-end gap-4">
                    <div className="text-4xl font-black tracking-tight">{price} <span className="text-lg text-slate-400">SAR</span></div>
                    {changePercent && (
                        <div className={clsx(
                            "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold",
                            isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        )}>
                            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {changePercent}%
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * ✨ QuickStats - Row of icon-based stats
 */
export function QuickStats({ stats }: { stats: { icon: React.ComponentType<{ className?: string }>, label: string, value: string }[] }) {
    return (
        <div className="flex flex-wrap gap-2 mt-4">
            {stats.map((stat, i) => (
                <DataChip key={i} icon={stat.icon} label={stat.label} value={stat.value} />
            ))}
        </div>
    );
}
