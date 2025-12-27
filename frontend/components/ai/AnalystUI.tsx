"use client";

import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Target, ShieldCheck, Activity, BarChart3 } from "lucide-react";
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
                    <XAxis
                        dataKey="date"
                        hide={true}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        hide={true}
                    />
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
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                    />
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
