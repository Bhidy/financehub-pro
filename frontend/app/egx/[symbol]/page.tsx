'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchYahooProfile, fetchTickers, fetchHistory } from '@/lib/api';

import {
    PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, Tooltip, AreaChart, Area, XAxis, YAxis, Legend, BarChart,
    Bar, CartesianGrid
} from 'recharts';
import {
    ArrowUpRight, ArrowDownRight, TrendingUp, Activity, BarChart2, DollarSign,
    PieChart as PieIcon, List, Building2, Calendar, FileText, CheckCircle2,
    AlertCircle, ShieldCheck, Zap, Globe, MapPin, Users, Plus, Minus, Bookmark,
    Star, Percent, Briefcase, Lock, AlertTriangle, Scale, Wallet, TrendingDown,
    Landmark
} from 'lucide-react';
import clsx from 'clsx';
import StockPriceChart from '@/components/egx/StockPriceChart';
import FinancialsTab from '@/components/egx/FinancialsTab';

// ============================================================================
// CONSTANTS & UTILS
// ============================================================================
const fmt = (n: any, d = 2) => (n == null || isNaN(n)) ? '-' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n: any) => (n == null || isNaN(n)) ? '-' : `${(Number(n) * 100).toFixed(2)}%`;
const fmtLarge = (n: any) => {
    if (!n || isNaN(n)) return '-';
    if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    return Number(n).toLocaleString();
};

const COLORS = {
    blue: '#3B82F6', green: '#10B981', amber: '#F59E0B', purple: '#8B5CF6',
    rose: '#F43F5E', teal: '#14B8A6', slate: '#64748B', indigo: '#6366F1', cyan: '#06B6D4'
};

const RISK_LEVELS = {
    LOW: { color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Low Risk' },
    MED: { color: 'text-amber-500', bg: 'bg-amber-50', label: 'Medium Risk' },
    HIGH: { color: 'text-rose-500', bg: 'bg-rose-50', label: 'High Risk' }
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

const MetricCard = ({ label, value, sub, color = 'blue', icon: Icon, trend, className }: any) => {
    const gradients: Record<string, string> = {
        blue: "from-blue-50/50 to-white hover:border-blue-200",
        green: "from-emerald-50/50 to-white hover:border-emerald-200",
        amber: "from-amber-50/50 to-white hover:border-amber-200",
        purple: "from-purple-50/50 to-white hover:border-purple-200",
        rose: "from-rose-50/50 to-white hover:border-rose-200",
        teal: "from-teal-50/50 to-white hover:border-teal-200",
        slate: "from-slate-50/50 to-white hover:border-slate-200",
        indigo: "from-indigo-50/50 to-white hover:border-indigo-200"
    };

    return (
        <div className={clsx(
            `bg-gradient-to-br ${gradients[color] || gradients.blue} border border-slate-100/80 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden backdrop-blur-sm`,
            className
        )}>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        {label}
                        {trend && <span className={clsx("text-[10px]", trend > 0 ? "text-emerald-600" : "text-rose-600")}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </span>}
                    </p>
                    {Icon && <Icon className={`w-4 h-4 text-${color}-500 opacity-60 group-hover:opacity-100 transition-opacity`} />}
                </div>
                <p className="text-2xl font-black text-slate-800 tracking-tight group-hover:scale-[1.02] transition-transform origin-left">
                    {value}
                </p>
                {sub && <p className="text-xs font-semibold text-slate-400 mt-1">{sub}</p>}
            </div>
            {/* Decorative background element */}
            <div className={`absolute -bottom-4 -right-4 w-20 h-20 bg-${color}-500/5 rounded-full blur-2xl group-hover:bg-${color}-500/10 transition-colors pointer-events-none`} />
        </div>
    );
};

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 border backdrop-blur-sm",
            active
                ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10 transform scale-105"
                : "bg-white/50 text-slate-500 border-slate-200 hover:bg-white hover:text-slate-800 hover:border-slate-300"
        )}
    >
        <Icon className={clsx("w-4 h-4", active ? "text-blue-400" : "text-slate-400")} />
        <span>{label}</span>
    </button>
);

const SectionHeader = ({ icon: Icon, title, subtitle }: any) => (
    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{subtitle}</p>}
        </div>
    </div>
);

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function EGXStockProfilePage() {
    const params = useParams();
    const id = (params?.symbol as string)?.toUpperCase() || '';

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('overview');
    const [isWatched, setIsWatched] = useState(false);

    // Watchlist Logic
    useEffect(() => {
        const saved = localStorage.getItem('egx_watchlist');
        if (saved) {
            const list = JSON.parse(saved);
            setIsWatched(list.includes(id));
        }
    }, [id]);

    const toggleWatchlist = () => {
        const saved = localStorage.getItem('egx_watchlist');
        let list = saved ? JSON.parse(saved) : [];
        if (list.includes(id)) {
            list = list.filter((s: string) => s !== id);
            setIsWatched(false);
        } else {
            list.push(id);
            setIsWatched(true);
        }
        localStorage.setItem('egx_watchlist', JSON.stringify(list));
    };

    // Data Fetching Logic with Robust Hybrid Fallback
    useEffect(() => {
        if (!id) return;
        setLoading(true);

        const loadData = async () => {
            try {
                // 1. Parallel Fetch: Backend (DB) & Proxy (Live)
                const [backendRes, proxyRes] = await Promise.allSettled([
                    fetchYahooProfile(id), // Backend [DB + logic]
                    fetch(`/api/yahoo-service?symbol=${id}`).then(r => r.ok ? r.json() : null) // Vercel Proxy [Live Yahoo]
                ]);

                let combined = {
                    profile: {},
                    fundamentals: {},
                    history: [],
                    financials_full: {}
                };

                // Process Backend Result
                if (backendRes.status === 'fulfilled' && backendRes.value) {
                    combined = { ...combined, ...backendRes.value };
                }

                // Process Proxy Result (High Priority Overrides)
                if (proxyRes.status === 'fulfilled' && proxyRes.value) {
                    const pData = proxyRes.value;
                    if (pData.profile) {
                        // Merge profile fields, preferring Proxy for live data
                        combined.profile = {
                            ...combined.profile,
                            ...pData.profile,
                            // Keep DB names if Yahoo missing
                            name_en: combined.profile.name_en || pData.profile.name_en
                        };
                    }
                    if (pData.fundamentals) {
                        combined.fundamentals = { ...combined.fundamentals, ...pData.fundamentals };
                    }
                }

                // Fallback: If absolutely no data, try Tickers list
                if (Object.keys(combined.profile).length === 0) {
                    console.warn("Both APIs failed, using static fallback.");
                    const tickers = await fetchTickers().catch(() => []);
                    const ticker = tickers.find((t: any) =>
                        t.symbol === id || t.symbol === `${id}.CA`
                    );
                    if (ticker) {
                        combined.profile = ticker;
                    } else {
                        throw new Error("Detailed stock data unavailable.");
                    }
                }

                if (!combined.history || combined.history.length === 0) {
                    // Try fetch history separately if missing
                    const h = await fetchHistory(id).catch(() => []);
                    combined.history = h;
                }

                setData(combined);
                setError('');
            } catch (err: any) {
                console.error("Hybrid Fetch Error:", err);
                setError("Unable to load stock data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-200 rounded-full" />
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
                </div>
                <div className="text-center">
                    <p className="text-slate-900 font-bold text-lg">Gathering Market Intelligence</p>
                    <p className="text-slate-400 text-sm">Syncing with Exchange...</p>
                </div>
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="text-center max-w-md w-full bg-white rounded-3xl p-10 shadow-xl border border-rose-100">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Ticker Not Found</h2>
                <p className="text-slate-500 mb-8 leading-relaxed">We could not locate data for <span className="font-bold text-slate-900">{id}</span>. It may be delisted or inactive.</p>
                <div className="flex gap-3 justify-center">
                    <a href="/egx" className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                        Back to Market
                    </a>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-200">
                        Try Again
                    </button>
                </div>
            </div>
        </div>
    );

    const { profile: p, fundamentals: f, history: h } = data;
    const isPositive = (p.change_pct || 0) >= 0;

    // Derived Metrics for Radar Chart
    const radarData = [
        { subject: 'Valuation', A: f.pe_ratio ? Math.min(100, (20 / f.pe_ratio) * 100) : 50, fullMark: 100 },
        { subject: 'Profit', A: (f.profit_margin || 0) * 200, fullMark: 100 },
        { subject: 'Health', A: (f.current_ratio || 0) * 40, fullMark: 100 },
        { subject: 'Efficiency', A: (f.return_on_equity || 0) * 300, fullMark: 100 },
        { subject: 'Dividend', A: (f.dividend_yield || 0) * 1000, fullMark: 100 },
        { subject: 'Growth', A: (f.revenue_growth || 0) * 200 + 50, fullMark: 100 },
    ];

    // Ownership Distribution Data
    const ownershipData = [
        { name: 'Insiders', value: (f.insider_percent || 0) * 100, color: COLORS.purple },
        { name: 'Institutions', value: (f.institution_percent || 0) * 100, color: COLORS.blue },
        { name: 'Public/Float', value: 100 - ((f.insider_percent || 0) * 100 + (f.institution_percent || 0) * 100), color: COLORS.slate },
    ].filter(d => d.value > 0);

    return (
        <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans pb-24 selection:bg-blue-100">
            {/* HERITAGE HEADER */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm support-backdrop-blur:bg-white/95">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-5">
                            <div className="relative group cursor-pointer">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-black flex items-center justify-center text-white text-xl font-black shadow-xl shadow-slate-300">
                                    {p.symbol?.substring(0, 2)}
                                </div>
                                <div className="absolute inset-0 border-2 border-white/10 rounded-2xl" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-black tracking-tight text-slate-900">{p.name_en || p.symbol}</h1>
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border border-slate-200">
                                        {p.symbol}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                                    <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">
                                        <Briefcase className="w-3 h-3" /> {p.sector || 'Main Market'}
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                                        <Landmark className="w-3 h-3" /> {p.currency}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <button
                                onClick={toggleWatchlist}
                                className={clsx(
                                    "px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300",
                                    isWatched
                                        ? "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100"
                                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                )}
                            >
                                <Star className={clsx("w-4 h-4", isWatched ? "fill-amber-500 text-amber-500" : "text-slate-400")} />
                                <span>{isWatched ? 'Watching' : 'Watchlist'}</span>
                            </button>

                            <div className="text-right pl-6 border-l border-slate-200">
                                <div className="flex items-baseline justify-end gap-2">
                                    <span className="text-4xl font-black tracking-tighter text-slate-900 drop-shadow-sm">
                                        {fmt(p.last_price || p.price)}
                                    </span>
                                    <span className="text-sm font-bold text-slate-400 uppercase">EGP</span>
                                </div>
                                <div className={clsx("flex items-center justify-end gap-1 text-sm font-bold mt-0.5", isPositive ? "text-emerald-600" : "text-rose-600")}>
                                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    <span>{isPositive ? '+' : ''}{fmt(p.change)}</span>
                                    <span className="bg-current/10 px-1.5 py-0.5 rounded text-[11px] ml-1">
                                        {fmt(p.change_pct)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8 overflow-x-auto pb-2 scrollbar-none mask-fade-right">
                        {[
                            { id: 'overview', icon: Activity, label: 'Overview' },
                            { id: 'financials', icon: DollarSign, label: 'Financials' },
                            { id: 'ownership', icon: ShieldCheck, label: 'Ownership & Risk' },
                            { id: 'profile', icon: Building2, label: 'Profile' },
                            { id: 'inspector', icon: List, label: 'Deep Data' }
                        ].map(t => <TabButton key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />)}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* ======================= OVERVIEW TAB ======================= */}
                {tab === 'overview' && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Key Metrics Grid */}
                            <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4 h-fit">
                                <MetricCard label="Market Cap" value={fmtLarge(p.market_cap)} sub="Total Value" color="indigo" icon={Building2} />
                                <MetricCard label="Volume" value={fmtLarge(p.volume)} sub="Shared Traded" color="amber" icon={BarChart2} />
                                <MetricCard label="Day High/Low" value={`${fmt(p.day_high)} - ${fmt(p.day_low)}`} sub="Intraday Range" color="teal" icon={Activity} />
                                <MetricCard label="Year High/Low" value={`${fmt(p.year_high)} - ${fmt(p.year_low)}`} sub="52 Week Range" color="purple" icon={Calendar} />
                            </div>

                            {/* Main Chart */}
                            <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-blue-500" />
                                        Performance Chart
                                    </h3>
                                    <div className="flex gap-2 text-xs font-bold text-slate-500">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Price</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Volume</span>
                                    </div>
                                </div>
                                <div className="flex-1 w-full relative">
                                    {h && h.length > 0 ? (
                                        <StockPriceChart data={h} symbol={p.symbol} />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-300">
                                            <BarChart2 className="w-16 h-16 mb-4 opacity-20" />
                                            <p className="font-bold text-sm">Chart Data Unavailable</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Analysis Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Valuation */}
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col">
                                <SectionHeader icon={Scale} title="Valuation" subtitle="Attractiveness" />
                                <div className="h-48 relative mb-4">
                                    <ResponsiveContainer>
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                            <Radar name="Score" dataKey="A" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.2} />
                                            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                    <MetricCard className="!p-3 !bg-slate-50" label="P/E Ratio" value={fmt(f.pe_ratio)} color="slate" />
                                    <MetricCard className="!p-3 !bg-slate-50" label="P/B Ratio" value={fmt(f.price_to_book)} color="slate" />
                                </div>
                            </div>

                            {/* Dividends */}
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col">
                                <SectionHeader icon={Wallet} title="Dividends" subtitle="Income" />

                                <div className="flex-1 flex flex-col justify-center items-center text-center my-4">
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-full border-[6px] border-emerald-100 flex items-center justify-center">
                                            <div>
                                                <p className="text-3xl font-black text-emerald-600">{fmtPct(f.dividend_yield)}</p>
                                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Yield</p>
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                            <DollarSign className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 mt-auto">
                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                        <span className="text-slate-500 font-medium">Payout Ratio</span>
                                        <span className="font-bold text-slate-800">{fmtPct(f.payout_ratio)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                        <span className="text-slate-500 font-medium">Ex-Div Date</span>
                                        <span className="font-bold text-slate-800">{f.ex_dividend_date ? new Date(f.ex_dividend_date * 1000).toLocaleDateString() : '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Liquidity */}
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col">
                                <SectionHeader icon={ArrowUpRight} title="Liquidity" subtitle="Trading" />
                                <div className="space-y-4">
                                    <MetricCard label="Avg Vol (10D)" value={fmtLarge(p.avg_vol_10d)} color="blue" />
                                    <MetricCard label="Avg Vol (3M)" value={fmtLarge(p.avg_vol_3m)} color="indigo" />
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                                            <p className="text-[10px] font-bold text-red-500 uppercase">Ask</p>
                                            <p className="text-lg font-black text-red-700">{fmt(p.ask)}</p>
                                        </div>
                                        <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
                                            <p className="text-[10px] font-bold text-teal-500 uppercase">Bid</p>
                                            <p className="text-lg font-black text-teal-700">{fmt(p.bid)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Strength */}
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col">
                                <SectionHeader icon={ShieldCheck} title="Strength" subtitle="Financials" />
                                <ul className="space-y-0 divide-y divide-slate-100">
                                    {[
                                        { l: 'Profit Margin', v: fmtPct(f.profit_margin), c: 'text-emerald-600' },
                                        { l: 'Return Equity', v: fmtPct(f.return_on_equity), c: 'text-blue-600' },
                                        { l: 'Current Ratio', v: fmt(f.current_ratio), c: 'text-slate-700' },
                                        { l: 'Debt/Equity', v: fmt(f.debt_to_equity), c: 'text-rose-600' },
                                        { l: 'Op. Margin', v: fmtPct(f.operating_margin), c: 'text-slate-700' },
                                        { l: 'Beta (Vol.)', v: fmt(f.beta), c: 'text-purple-600' },
                                    ].map((i, idx) => (
                                        <li key={idx} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                                            <span className="text-sm font-medium text-slate-500">{i.l}</span>
                                            <span className={`text-sm font-bold font-mono ${i.c}`}>{i.v}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </>
                )}

                {/* ======================= FINANCIALS TAB ======================= */}
                {tab === 'financials' && <FinancialsTab symbol={id} />}

                {/* ======================= OWNERSHIP & RISK TAB ======================= */}
                {tab === 'ownership' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Ownership Structure */}
                        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                            <SectionHeader icon={PieIcon} title="Ownership Structure" subtitle="Distribution" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div className="h-64 relative">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={ownershipData}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {ownershipData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-400 font-bold uppercase">Holders</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            <h4 className="font-bold text-slate-700">Institutions</h4>
                                        </div>
                                        <p className="text-3xl font-black text-slate-900">{fmtPct(f.institution_percent)}</p>
                                        <p className="text-sm text-slate-500 mt-1">Smart money holdings</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                            <h4 className="font-bold text-slate-700">Insiders</h4>
                                        </div>
                                        <p className="text-3xl font-black text-slate-900">{fmtPct(f.insider_percent)}</p>
                                        <p className="text-sm text-slate-500 mt-1">Management & Board</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-slate-400" />
                                    Short Interest & Float
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <MetricCard label="Short Ratio" value={fmt(f.short_ratio)} color="rose" />
                                    <MetricCard label="Shares Out." value={fmtLarge(p.shares_outstanding)} color="slate" />
                                    <MetricCard label="Float" value={fmtLarge(p.float_shares)} color="blue" />
                                    <MetricCard label="Implied" value={fmtLarge(p.implied_shares)} color="slate" />
                                </div>
                            </div>
                        </div>

                        {/* Risk Governance */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                                <SectionHeader icon={ShieldCheck} title="ESG Risk" subtitle="Sustainability" />
                                <div className="flex flex-col items-center justify-center py-6">
                                    <div className="text-5xl font-black text-slate-800 mb-2">{f.overall_risk || 'N/A'}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                                        Overall Score
                                    </div>
                                </div>
                                <div className="space-y-4 mt-4">
                                    <div>
                                        <div className="flex justify-between text-sm font-bold mb-1">
                                            <span className="text-slate-500">Board Risk</span>
                                            <span className="text-slate-800">{f.board_risk || '-'}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(f.board_risk || 0) * 10}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm font-bold mb-1">
                                            <span className="text-slate-500">Audit Risk</span>
                                            <span className="text-slate-800">{f.audit_risk || '-'}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(f.audit_risk || 0) * 10}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm font-bold mb-1">
                                            <span className="text-slate-500">Compensation</span>
                                            <span className="text-slate-800">{f.compensation_risk || '-'}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(f.compensation_risk || 0) * 10}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ======================= PROFILE TAB ======================= */}
                {tab === 'profile' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                            <SectionHeader icon={FileText} title={`About ${p.name_en}`} />
                            <div className="prose prose-slate max-w-none">
                                <p className="text-slate-600 leading-relaxed text-lg bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                    {p.description || "No company description available."}
                                </p>
                            </div>
                            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Briefcase className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sector</p>
                                    </div>
                                    <p className="font-bold text-slate-800 text-lg">{p.sector}</p>
                                </div>
                                <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Industry</p>
                                    </div>
                                    <p className="font-bold text-slate-800 text-lg">{p.industry}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                                <SectionHeader icon={Globe} title="Contact Info" />
                                <ul className="space-y-6">
                                    <li className="flex gap-4 group">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Headquarters</p>
                                            <p className="text-slate-700 font-medium leading-tight">{p.headquarters_city || 'Cairo'}, Egypt</p>
                                            <p className="text-xs text-slate-400 mt-1">{p.address}</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4 group">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Website</p>
                                            <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline truncate block">
                                                {p.website || 'N/A'}
                                            </a>
                                        </div>
                                    </li>
                                    <li className="flex gap-4 group">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Employees</p>
                                            <p className="text-slate-700 font-bold">{p.employees ? p.employees.toLocaleString() : '-'}</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* ======================= INSPECTOR TAB (DEEP DATA) ======================= */}
                {tab === 'inspector' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                <List className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-blue-900">Chief Expert Data Inspector</h3>
                                <p className="text-blue-700 mt-1 leading-relaxed">
                                    Displaying all raw data points extracted from the Enterprise Data Reservoir.
                                    This view bypasses standard filters to show the complete dataset available for deep analysis.
                                </p>
                            </div>
                        </div>

                        {/* Profile Raw Data */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                            <SectionHeader icon={Building2} title="Full Profile Metadata" subtitle="Raw Attributes" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(p).map(([key, value]) => (
                                    <div key={key} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 break-all hover:bg-slate-50 transition-colors">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                            {key.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-sm font-semibold text-slate-800 font-mono leading-relaxed">
                                            {value === null || value === undefined ? <span className="text-slate-300 italic">null</span> :
                                                typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fundamentals Raw Data */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                            <SectionHeader icon={Activity} title="Financial Indicators" subtitle="Raw Metrics" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(f).map(([key, value]) => (
                                    <div key={key} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 break-all hover:bg-slate-50 transition-colors">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-300"></div>
                                            {key.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-sm font-semibold text-slate-800 font-mono leading-relaxed">
                                            {value === null || value === undefined ? <span className="text-slate-300 italic">null</span> :
                                                typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
