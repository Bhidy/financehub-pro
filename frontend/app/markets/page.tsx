'use client';

import { useState, useEffect } from 'react';
import {
    Circle, TrendingUp, TrendingDown, ArrowRight, BarChart2, Activity, Zap
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import clsx from 'clsx';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const fmt = (n: any, d = 2) => (n == null || isNaN(n)) ? '-' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtLarge = (n: any) => {
    if (!n || isNaN(n)) return '-';
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    return Number(n).toLocaleString();
};

const StatCard = ({ title, count, color, total, sub }: any) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-12 opacity-5 rounded-full bg-${color}-500 transform translate-x-4 -translate-y-4`} />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-slate-800">{count}</h3>
            {total && <span className="text-slate-400 text-sm font-bold">/ {total}</span>}
        </div>
        {sub && <p className={`text-xs font-bold mt-2 text-${color}-600`}>{sub}</p>}
    </div>
);

const StockRow = ({ stock, rank }: any) => {
    const isPos = (stock.change_pct || 0) >= 0;
    return (
        <Link href={`/egx/${stock.symbol}`} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors group">
            <div className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-slate-300">#{rank}</span>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-700">
                    {stock.symbol.substring(0, 2)}
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{stock.symbol}</h4>
                    <p className="text-xs text-slate-500 truncate max-w-[120px]">{stock.name_en}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{fmt(stock.last_price)}</p>
                <span className={clsx("text-xs font-bold", isPos ? "text-emerald-500" : "text-rose-500")}>
                    {isPos ? '+' : ''}{fmt(stock.change_pct)}%
                </span>
            </div>
        </Link>
    );
};

export default function MarketOverviewPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/api/v1/yahoo/market`)
            .then(res => res.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!data) return null;

    const { market_pulse, top_gainers, top_losers, most_active, sectors } = data;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Market Command</h1>
                    <p className="text-slate-500 font-medium">Real-time overview of the Egyptian Exchange (EGX)</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* PULSE GRID */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Market Status" count="OPEN" color="emerald" sub="Live Trading" />
                    <StatCard title="Advancers" count={market_pulse.up} total={market_pulse.count} color="emerald" sub={`${((market_pulse.up / market_pulse.count) * 100).toFixed(0)}% Bullish`} />
                    <StatCard title="Decliners" count={market_pulse.down} total={market_pulse.count} color="rose" />
                    <StatCard title="Volume" count={fmtLarge(market_pulse.volume_total)} color="blue" sub="Shares Traded" />
                </section>

                {/* SECTORS */}
                <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-500" />
                        Sector Performance
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sectors.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fontWeight: 600 }} />
                                <Bar dataKey="performance" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                    {sectors.slice(0, 10).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.performance >= 0 ? '#10b981' : '#f43f5e'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* TOP LISTS GRID */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* GAINERS */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                        <h3 className="font-bold text-emerald-600 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Top Gainers
                        </h3>
                        <div className="space-y-1">
                            {top_gainers.map((s: any, i: number) => <StockRow key={i} stock={s} rank={i + 1} />)}
                        </div>
                    </div>

                    {/* LOSERS */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                        <h3 className="font-bold text-rose-600 mb-4 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" /> Top Losers
                        </h3>
                        <div className="space-y-1">
                            {top_losers.map((s: any, i: number) => <StockRow key={i} stock={s} rank={i + 1} />)}
                        </div>
                    </div>

                    {/* ACTIVE */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                        <h3 className="font-bold text-blue-600 mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Most Active (Vol)
                        </h3>
                        <div className="space-y-1">
                            {most_active.map((s: any, i: number) => <StockRow key={i} stock={s} rank={i + 1} />)}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
