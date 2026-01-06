'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    Tooltip, AreaChart, Area, XAxis, YAxis, Legend, BarChart, Bar, CartesianGrid
} from 'recharts';
import {
    ArrowUpRight, ArrowDownRight, TrendingUp, Activity, BarChart2, DollarSign, PieChart as PieIcon,
    List, Building2, Calendar, FileText, CheckCircle2, AlertCircle, ShieldCheck, Zap
} from 'lucide-react';
import clsx from 'clsx';
import StockPriceChart from '@/components/egx/StockPriceChart';
import FinancialsTab from '@/components/egx/FinancialsTab';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const fmt = (n: number | null | undefined, d = 2) => (n == null || isNaN(n)) ? '-' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n: number | null | undefined) => (n == null || isNaN(n)) ? '-' : `${(n * 100).toFixed(2)}%`;
const fmtLarge = (n: number | null | undefined) => {
    if (!n || isNaN(n)) return '-';
    if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    return n.toLocaleString();
};

const COLORS = {
    blue: '#3B82F6', green: '#10B981', amber: '#F59E0B', purple: '#8B5CF6', rose: '#F43F5E', teal: '#14B8A6',
    slate: '#64748B', indigo: '#6366F1', cyan: '#06B6D4'
};

const RADAR_THEME = { stroke: '#8884d8', fill: '#8884d8', fillOpacity: 0.6 };

// ============================================================================
// UI COMPONENTS
// ============================================================================

const TabButton = ({ active, onClick, icon: Icon, label, count }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300",
            active
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-[1.02]"
                : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-slate-100"
        )}
    >
        <Icon className={clsx("w-4 h-4", active ? "text-blue-400" : "text-slate-400")} />
        <span>{label}</span>
        {count !== undefined && (
            <span className={clsx("px-1.5 py-0.5 rounded text-[10px]", active ? "bg-white/20" : "bg-slate-100")}>{count}</span>
        )}
    </button>
);

const MetricCard = ({ label, value, sub, color = 'blue', icon: Icon, trend }: any) => {
    const gradients: Record<string, string> = {
        blue: "from-blue-50 to-white border-blue-100 hover:shadow-blue-100",
        green: "from-emerald-50 to-white border-emerald-100 hover:shadow-emerald-100",
        amber: "from-amber-50 to-white border-amber-100 hover:shadow-amber-100",
        purple: "from-purple-50 to-white border-purple-100 hover:shadow-purple-100",
        rose: "from-rose-50 to-white border-rose-100 hover:shadow-rose-100",
    };

    return (
        <div className={`bg-gradient-to-br ${gradients[color] || gradients.blue} border rounded-2xl p-5 hover:shadow-xl transition-all duration-300 group`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        {label}
                        {trend && <span className={clsx("text-[10px]", trend > 0 ? "text-green-500" : "text-red-500")}>({trend > 0 ? '+' : ''}{trend}%)</span>}
                    </p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight group-hover:scale-105 transition-transform origin-left">{value}</p>
                    {sub && <p className="text-xs font-medium text-slate-500 mt-1">{sub}</p>}
                </div>
                {Icon && <div className={`p-2 rounded-lg bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 text-${color}-500`} />
                </div>}
            </div>
        </div>
    );
};

const GaugeRing = ({ value, label, score }: any) => {
    const color = score >= 70 ? COLORS.green : score >= 40 ? COLORS.amber : COLORS.rose;
    const r = 36;
    const c = 2 * Math.PI * r;
    const off = c - ((score / 100) * c);

    return (
        <div className="flex flex-col items-center bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-slate-100 hover:shadow-xl transition-all">
            <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r={r} stroke="#f1f5f9" strokeWidth="8" fill="none" />
                    <circle cx="64" cy="64" r={r} stroke={color} strokeWidth="8" fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-800">{score}</span>
                </div>
            </div>
            <p className="font-bold text-slate-700 mt-2">{label}</p>
            <p className="text-xs text-slate-400">{value}</p>
        </div>
    );
};

const ProgressBar = ({ label, value, color = 'blue' }: any) => (
    <div className="mb-4">
        <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-slate-600">{label}</span>
            <span className="text-slate-800">{value}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full bg-${color}-500 transition-all duration-1000`}
                style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
            />
        </div>
    </div>
);

// ============================================================================
// PAGE
// ============================================================================

export default function EGXStockProfilePage() {
    const params = useParams();
    const symbol = (params?.symbol as string)?.toUpperCase() || '';

    // State
    const [stock, setStock] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [ohlc, setOhlc] = useState<any[]>([]);
    const [dividends, setDividends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    // Fetch Data
    useEffect(() => {
        if (!symbol) return;
        (async () => {
            setLoading(true);
            try {
                const [stockR, statsR, ohlcR, divR] = await Promise.all([
                    fetch(`${API_BASE}/api/v1/egx/stock/${symbol}`),
                    fetch(`${API_BASE}/api/v1/egx/statistics/${symbol}`),
                    fetch(`${API_BASE}/api/v1/egx/ohlc/${symbol}?limit=365`),
                    fetch(`${API_BASE}/api/v1/egx/dividends/${symbol}`)
                ]);

                if (stockR.ok) setStock(await stockR.json());
                if (statsR.ok) setStats(await statsR.json());
                if (ohlcR.ok) setOhlc(await ohlcR.json());
                if (divR.ok) setDividends(await divR.json());
            } catch (e) { console.error("Data fetch error", e); }
            setLoading(false);
        })();
    }, [symbol]);

    // Data Processing for Visualizations
    const ownershipData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'Institutions', value: stats.institutional_ownership || 0, color: COLORS.blue },
            { name: 'Public', value: 1 - (stats.institutional_ownership || 0) - (stats.insider_ownership || 0), color: COLORS.green },
            { name: 'Insiders', value: stats.insider_ownership || 0, color: COLORS.amber },
        ].filter(d => d.value > 0);
    }, [stats]);

    const radarData = useMemo(() => {
        if (!stats) return [];
        // Normalize scores to 0-100 scale for radar
        return [
            { subject: 'Valuation', A: Math.min(100, (15 / (stats.pe_ratio || 15)) * 100), fullMark: 100 },
            { subject: 'Health', A: Math.min(100, (stats.current_ratio || 0) * 50), fullMark: 100 },
            { subject: 'Profit', A: Math.min(100, (stats.roe || 0) * 400), fullMark: 100 },
            { subject: 'Growth', A: Math.min(100, (stats.revenue_growth || 0) * 300), fullMark: 100 },
            { subject: 'Div', A: Math.min(100, (stats.dividend_yield || 0) * 1000), fullMark: 100 },
        ];
    }, [stats]);

    const marginData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'Gross', value: (stats.gross_margin || 0) * 100, fill: COLORS.blue },
            { name: 'Operating', value: (stats.operating_margin || 0) * 100, fill: COLORS.purple },
            { name: 'Net', value: (stats.profit_margin || 0) * 100, fill: COLORS.green },
        ];
    }, [stats]);

    // Dividend Trend Data
    const divTrendData = useMemo(() => {
        if (!dividends.length) return [];
        // Group by year
        const yearMap = new Map();
        dividends.forEach(d => {
            const y = new Date(d.ex_date).getFullYear();
            yearMap.set(y, (yearMap.get(y) || 0) + d.dividend_amount);
        });
        return Array.from(yearMap.entries())
            .map(([year, amount]) => ({ year, amount }))
            .sort((a, b) => a.year - b.year);
    }, [dividends]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse">Loading Premium Profile...</p>
            </div>
        </div>
    );

    if (!stock) return <div className="p-12 text-center">Stock not found</div>;

    const marketColor = stock.change_percent >= 0 ? 'emerald' : 'rose';
    const isPositive = stock.change_percent >= 0;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* HERDER */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 bg-white/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 transition-all duration-300">
                    <div className="flex flex-wrap justify-between items-start gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-slate-900/20">
                                {symbol.substring(0, 2)}
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{stock.name_en}</h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider">{symbol}</span>
                                    <span className="text-slate-400 text-sm">•</span>
                                    <span className="text-slate-500 text-sm font-medium">{stock.sector_name}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="flex items-baseline justify-end gap-3">
                                <span className="text-5xl font-black text-slate-900 tracking-tighter">{fmt(stock.last_price)}</span>
                                <span className="text-lg font-bold text-slate-400">EGP</span>
                            </div>
                            <div className={`flex items-center justify-end gap-2 mt-2 px-3 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'} inline-flex`}>
                                {isPositive ? <TrendingUp className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                <span className="font-bold">{isPositive ? '+' : ''}{fmt(stock.change)} ({fmt(stock.change_percent)}%)</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-8 overflow-x-auto pb-2 scrollbar-none">
                        {[
                            { id: 'overview', label: 'Overview', icon: Activity },
                            { id: 'statistics', label: 'Statistics', icon: BarChart2, count: 43 },
                            { id: 'financials', label: 'Financials', icon: DollarSign },
                            { id: 'dividends', label: 'Dividends', icon: PieIcon },
                            { id: 'history', label: 'Price History', icon: Calendar },
                            { id: 'profile', label: 'Profile', icon: Building2 },
                        ].map(t => <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} {...t} />)}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {/* OVERVIEW TAB */}
                {tab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* 1. Main Price Chart */}
                        <StockPriceChart
                            data={ohlc}
                            symbol={symbol}
                            change={stock.change}
                            changePercent={stock.change_percent}
                            lastPrice={stock.last_price}
                        />

                        {/* 2. Key Metrics Grid (Restored 8-grid plus gauges) */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard label="Market Cap" value={fmtLarge(stock.market_cap)} sub="EGP" color="blue" icon={Building2} />
                            <MetricCard label="P/E Ratio" value={fmt(stats?.pe_ratio, 2)} sub="Trailing 12M" color="purple" icon={Activity} />
                            <MetricCard label="Div Yield" value={fmtPct(stats?.dividend_yield)} sub="Annualized" color="green" icon={PieIcon} />
                            <MetricCard label="Volume" value={fmtLarge(stock.volume)} sub="Daily Avg" color="amber" icon={BarChart2} />

                            <MetricCard label="EPS (TTM)" value={fmt(stats?.eps_ttm)} sub="Earnings Per Share" color="teal" />
                            <MetricCard label="P/B Ratio" value={fmt(stats?.pb_ratio)} sub="Price to Book" color="blue" />
                            <MetricCard label="ROE" value={fmtPct(stats?.roe)} sub="Return on Equity" color="rose" />
                            <MetricCard label="Beta" value={fmt(stats?.beta)} sub="Volatility" color="slate" />
                        </div>

                        {/* 3. Visual Analysis Row (Pie + Radar + Gauges) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Ownership Pie */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Ownership Structure</h3>
                                <div className="h-48 w-full relative">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={ownershipData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                                {ownershipData.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Text */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                        <Building2 className="w-6 h-6 text-slate-300" />
                                    </div>
                                </div>
                            </div>

                            {/* Health Radar */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Financial Health</h3>
                                <div className="h-48 w-full">
                                    <ResponsiveContainer>
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar name={symbol} dataKey="A" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.4} />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Score Gauges */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-center gap-6">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Valuation</p>
                                        <p className="font-bold text-slate-800">
                                            {stats?.pe_ratio < 15 ? 'Undervalued' : stats?.pe_ratio > 25 ? 'Overvalued' : 'Fair'}
                                        </p>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${stats?.pe_ratio < 15 ? 'bg-green-500' : stats?.pe_ratio > 25 ? 'bg-red-500' : 'bg-amber-500'}`} />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Profitability</p>
                                        <p className="font-bold text-slate-800">
                                            {stats?.roe > 0.15 ? 'High' : stats?.roe > 0.08 ? 'Moderate' : 'Low'}
                                        </p>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${stats?.roe > 0.15 ? 'bg-green-500' : 'bg-amber-500'}`} />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Financial Strength</p>
                                        <p className="font-bold text-slate-800">
                                            {stats?.current_ratio > 1.2 ? 'Strong' : 'Weak'}
                                        </p>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${stats?.current_ratio > 1.2 ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STATISTICS TAB */}
                {tab === 'statistics' && stats && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Top Visual Row (Margins Donut + Progress) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Margins Breakdown */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Margin Analysis</h3>
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="h-48 w-48 relative">
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={marginData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                                    {marginData.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(val: number) => val.toFixed(2) + '%'} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xl font-black text-slate-700">{fmtPct(stats?.profit_margin)}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full space-y-4">
                                        <ProgressBar label="Gross Margin" value={(stats.gross_margin || 0) * 100} color="blue" />
                                        <ProgressBar label="Operating Margin" value={(stats.operating_margin || 0) * 100} color="purple" />
                                        <ProgressBar label="Net Profit Margin" value={(stats.profit_margin || 0) * 100} color="green" />
                                    </div>
                                </div>
                            </div>

                            {/* Balance Sheet Highlights */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Balance Sheet Highlights</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-400 uppercase font-bold">Total Cash</p>
                                        <p className="text-lg font-black text-slate-800">{fmtLarge(stats.total_cash)}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-400 uppercase font-bold">Total Debt</p>
                                        <p className="text-lg font-black text-slate-800">{fmtLarge(stats.total_debt)}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-400 uppercase font-bold">Book Value</p>
                                        <p className="text-lg font-black text-slate-800">{fmtLarge(stats.book_value)}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-400 uppercase font-bold">Working Cap</p>
                                        <p className="text-lg font-black text-slate-800">{fmtLarge(stats.total_cash - stats.total_debt)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Metrics Grid (All 43 Fields) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {[
                                {
                                    title: "Valuation Metrics", icon: DollarSign, color: "blue",
                                    items: [
                                        { l: "P/E Ratio", v: fmt(stats.pe_ratio) },
                                        { l: "Forward P/E", v: fmt(stats.forward_pe) },
                                        { l: "P/S Ratio", v: fmt(stats.ps_ratio) },
                                        { l: "P/B Ratio", v: fmt(stats.pb_ratio) },
                                        { l: "EV/EBITDA", v: fmt(stats.ev_ebitda) },
                                        { l: "PEG Ratio", v: fmt(stats.peg_ratio) }
                                    ]
                                },
                                {
                                    title: "Profitability", icon: Activity, color: "green",
                                    items: [
                                        { l: "ROE", v: fmtPct(stats.roe) },
                                        { l: "ROA", v: fmtPct(stats.roa) },
                                        { l: "ROIC", v: fmtPct(stats.roic) },
                                        { l: "Gross Margin", v: fmtPct(stats.gross_margin) },
                                        { l: "Operating Margin", v: fmtPct(stats.operating_margin) },
                                        { l: "Net Margin", v: fmtPct(stats.profit_margin) }
                                    ]
                                },
                                {
                                    title: "Financial Health", icon: ShieldCheck, color: "amber",
                                    items: [
                                        { l: "Current Ratio", v: fmt(stats.current_ratio) },
                                        { l: "Quick Ratio", v: fmt(stats.quick_ratio) },
                                        { l: "Debt/Equity", v: fmt(stats.debt_equity) },
                                        { l: "Interest Coverage", v: fmt(stats.interest_coverage) },
                                        { l: "Altman Z-Score", v: fmt(stats.altman_z_score) },
                                        { l: "Piotroski F-Score", v: stats.piotroski_f_score }
                                    ]
                                },
                                {
                                    title: "Ownership & Share", icon: PieIcon, color: "purple",
                                    items: [
                                        { l: "Shares Outstanding", v: fmtLarge(stats.shares_outstanding) },
                                        { l: "Float Shares", v: fmtLarge(stats.float_shares) },
                                        { l: "Insider Ownership", v: fmtPct(stats.insider_ownership) },
                                        { l: "Inst. Ownership", v: fmtPct(stats.institutional_ownership) },
                                        { l: "Book Value/Share", v: fmt(stats.bvps) },
                                        { l: "EPS (TTM)", v: fmt(stats.eps_ttm) }
                                    ]
                                }
                            ].map((section, i) => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                                        <div className={`p-2 rounded-lg bg-${section.color}-50 text-${section.color}-500`}>
                                            <section.icon className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-slate-800">{section.title}</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                        {section.items.map((item, j) => (
                                            <div key={j} className="flex justify-between items-baseline group">
                                                <span className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">{item.l}</span>
                                                <span className="font-mono text-sm font-bold text-slate-800">{item.v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FINANCIALS TAB */}
                {tab === 'financials' && (
                    <FinancialsTab symbol={symbol} />
                )}

                {/* DIVIDENDS TAB */}
                {tab === 'dividends' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <MetricCard label="Dividend Yield" value={fmtPct(stats?.dividend_yield)} color="green" icon={PieIcon} />
                            <MetricCard label="Annual Payout" value={fmt(stats?.dps)} sub="EGP / Share" color="blue" icon={DollarSign} />
                            <MetricCard label="Payout Ratio" value={fmtPct(stats?.payout_ratio)} color="purple" icon={Activity} />
                        </div>

                        {/* Dividend Trend Chart (Restored) */}
                        {divTrendData.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Dividend Growth History</h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer>
                                        <AreaChart data={divTrendData}>
                                            <defs>
                                                <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="year" axisLine={false} tickLine={false} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <Tooltip formatter={(val: number) => `EGP ${val}`} contentStyle={{ borderRadius: '12px' }} />
                                            <Area type="monotone" dataKey="amount" stroke={COLORS.green} fill="url(#divGrad)" strokeWidth={3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                            <div className="p-4 bg-slate-50 font-bold text-slate-700 flex justify-between">
                                <span>Timeline</span>
                                <button className="text-xs bg-white px-2 py-1 rounded border shadow-sm text-slate-600">Export CSV</button>
                            </div>
                            <table className="w-full">
                                <thead className="bg-white border-b border-slate-100 text-xs uppercase text-slate-400 font-bold">
                                    <tr>
                                        <th className="py-3 px-6 text-left">Ex-Date</th>
                                        <th className="py-3 px-6 text-right">Amount (EGP)</th>
                                        <th className="py-3 px-6 text-right">Pay Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {dividends.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-6 text-sm font-medium text-slate-700">{d.ex_date}</td>
                                            <td className="py-3 px-6 text-right font-bold text-emerald-600">{fmt(d.dividend_amount)}</td>
                                            <td className="py-3 px-6 text-right text-sm text-slate-500">{d.pay_date || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* HISTORY TAB */}
                {tab === 'history' && (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm animate-in fade-in duration-500">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-700">Historical Price Data</h3>
                            <span className="text-xs font-mono text-slate-400">{ohlc.length} Days Loaded</span>
                        </div>
                        <div className="max-h-[600px] overflow-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 sticky top-0 z-10 text-xs uppercase text-slate-500 font-bold shadow-sm">
                                    <tr>
                                        <th className="py-3 px-6 text-left">Date</th>
                                        <th className="py-3 px-6 text-right">Open</th>
                                        <th className="py-3 px-6 text-right">High</th>
                                        <th className="py-3 px-6 text-right">Low</th>
                                        <th className="py-3 px-6 text-right">Close</th>
                                        <th className="py-3 px-6 text-right">Vol</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {ohlc.map((d, i) => (
                                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="py-2 px-6 text-sm font-medium text-slate-700">{d.date}</td>
                                            <td className="py-2 px-6 text-right text-sm text-slate-500">{fmt(d.open)}</td>
                                            <td className="py-2 px-6 text-right text-sm text-slate-500">{fmt(d.high)}</td>
                                            <td className="py-2 px-6 text-right text-sm text-slate-500">{fmt(d.low)}</td>
                                            <td className="py-2 px-6 text-right text-sm font-bold text-slate-800">{fmt(d.close)}</td>
                                            <td className="py-2 px-6 text-right text-sm text-slate-400 font-mono">{d.volume.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* PROFILE TAB */}
                {tab === 'profile' && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm animate-in fade-in duration-500">
                        <h3 className="text-2xl font-black text-slate-900 mb-6">About {stock.name_en}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Registered Name</p>
                                    <p className="font-bold text-slate-800">{stock.name_en}</p>
                                    <p className="text-sm text-slate-500">{stock.name_ar}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Sector & Market</p>
                                    <p className="font-bold text-slate-800">{stock.sector_name}</p>
                                    <p className="text-sm text-slate-500">EGX Main Market</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Data Updated</p>
                                    <p className="font-mono text-sm text-slate-600">{new Date(stock.last_updated).toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Currency</p>
                                    <p className="font-bold text-slate-800">EGP (Egyptian Pound)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
