'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { fetchYahooProfile, fetchTickers, fetchHistory } from '@/lib/api';

import {
    PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, Tooltip, AreaChart, Area, XAxis, YAxis, Legend, BarChart,
    Bar, CartesianGrid, ComposedChart, Line
} from 'recharts';
import {
    TrendingUp, Activity, BarChart2, DollarSign,
    PieChart as PieIcon, List, Building2, Calendar, FileText, CheckCircle2,
    AlertCircle, ShieldCheck, Zap, Globe, MapPin, Users, Plus, Minus, Bookmark,
    Star, Percent, Briefcase, Lock, AlertTriangle, Scale, Wallet, TrendingDown,
    Landmark, Search, ArrowRight, LayoutGrid, Table2, Layers
} from 'lucide-react';
import clsx from 'clsx';
import StockPriceChart from '@/components/egx/StockPriceChart';
import FinancialsTab from '@/components/egx/FinancialsTab';

// ============================================================================
// UTILS & FORMATTERS
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

const THEME = {
    colors: {
        primary: '#3b82f6',    // Blue 500
        secondary: '#6366f1',  // Indigo 500
        success: '#10b981',    // Emerald 500
        warning: '#f59e0b',    // Amber 500
        danger: '#f43f5e',     // Rose 500
        dark: '#0f172a',      // Slate 900
        light: '#f8fafc',     // Slate 50
        grid: '#e2e8f0',      // Slate 200
        gridDark: '#1e293b',  // Slate 800
    }
};

const COLORS = [THEME.colors.primary, THEME.colors.secondary, THEME.colors.success, THEME.colors.warning, THEME.colors.danger];

// ============================================================================
// PREMIUM UI COMPONENTS
// ============================================================================

const Card = ({ children, className, title, icon: Icon, action }: any) => (
    <div className={clsx(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col transition-all duration-300 hover:shadow-md",
        className
    )}>
        {(title || Icon) && (
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <Icon className="w-5 h-5" />
                        </div>
                    )}
                    {title && <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>}
                </div>
                {action}
            </div>
        )}
        <div className="flex-1">{children}</div>
    </div>
);

const StatPill = ({ label, value, trend, trendVal }: any) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <div className="text-right">
            <p className="font-bold text-slate-900 dark:text-slate-100">{value}</p>
            {trend && (
                <p className={clsx("text-xs font-bold flex items-center justify-end gap-1", trend === 'up' ? "text-emerald-500" : "text-rose-500")}>
                    {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {trendVal}
                </p>
            )}
        </div>
    </div>
);

const SectionTab = ({ active, onClick, label, icon: Icon }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300",
            active
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 dark:shadow-white/10 scale-105"
                : "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
    >
        {Icon && <Icon className="w-4 h-4" />}
        {label}
    </button>
);

// ============================================================================
// MAIN PAGE VIEW
// ============================================================================

export default function PremiumStockProfile() {
    const params = useParams();
    const id = (params?.symbol as string)?.toUpperCase() || '';

    // State
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('dashboard'); // dashboard, deep-dive, matrix
    const [isWatched, setIsWatched] = useState(false);

    // Initial Fetch Logic (Preserved Hybrid System)
    useEffect(() => {
        if (!id) return;
        setLoading(true);

        const loadData = async () => {
            try {
                // 1. Parallel Fetch: Backend (Reservoir) & Proxy (Live)
                const [backendRes, proxyRes] = await Promise.allSettled([
                    fetchYahooProfile(id),
                    fetch(`/api/yahoo-service?symbol=${id}`).then(r => r.ok ? r.json() : null)
                ]);

                let combined = {
                    profile: {},
                    fundamentals: {},
                    history: [],
                };

                // Backend (Base)
                if (backendRes.status === 'fulfilled' && backendRes.value) {
                    combined = { ...combined, ...backendRes.value };
                }

                // Proxy (Live Overlay)
                if (proxyRes.status === 'fulfilled' && proxyRes.value) {
                    const pData = proxyRes.value;
                    if (pData.profile) combined.profile = { ...combined.profile, ...pData.profile };
                    if (pData.fundamentals) combined.fundamentals = { ...combined.fundamentals, ...pData.fundamentals };
                }

                // Fallback Ticker Check
                if (Object.keys(combined.profile).length === 0) {
                    const tickers = await fetchTickers().catch(() => []);
                    const tick = tickers.find((t: any) => t.symbol === id || t.symbol === `${id}.CA`);
                    if (tick) combined.profile = tick;
                }

                // Missing History Patch
                if (!combined.history || combined.history.length === 0) {
                    const h = await fetchHistory(id).catch(() => []);
                    combined.history = h;
                }

                setData(combined);
            } catch (err) {
                console.error("Data Load Error", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();

        // Watchlist Check
        const saved = localStorage.getItem('egx_watchlist');
        if (saved && JSON.parse(saved).includes(id)) setIsWatched(true);

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

    if (loading) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8">
            <div className="w-20 h-20 border-4 border-slate-200 dark:border-slate-800 border-t-blue-500 rounded-full animate-spin mb-6" />
            <p className="text-slate-400 font-mono tracking-widest text-xs uppercase">Initializing Chief Expert Terminal...</p>
        </div>
    );

    if (!data) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
            <div className="text-center space-y-4">
                <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto" />
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Asset Not Found</h1>
                <p className="text-slate-500">The ticker {id} could not be retrieved from the reservoir.</p>
                <a href="/egx" className="inline-block px-6 py-3 bg-slate-900 rounded-full text-white font-bold">Return to Market</a>
            </div>
        </div>
    );

    const { profile: p, fundamentals: f, history: h } = data;
    const isUp = (p.change >= 0);

    // --- CHART DATA PREP ---
    const radarData = [
        { subject: 'Valuation', A: f.pe_ratio ? Math.min(100, (20 / f.pe_ratio) * 100) : 50 },
        { subject: 'Profit', A: (f.profit_margin || 0) * 100 },
        { subject: 'Health', A: (f.current_ratio || 0) * 50 },
        { subject: 'Growth', A: (f.revenue_growth || 0) * 100 + 50 },
        { subject: 'Income', A: (f.dividend_yield || 0) * 1000 },
        { subject: 'Moat', A: (f.operating_margin || 0) * 100 },
    ];

    const ownershipData = [
        { name: 'Insiders', value: (f.insider_percent || 0) * 100 },
        { name: 'Institutions', value: (f.institution_percent || 0) * 100 },
        { name: 'Public', value: Math.max(0, 100 - (((f.insider_percent || 0) + (f.institution_percent || 0)) * 100)) }
    ].filter(x => x.value > 0);

    const marginData = [
        { name: 'Gross', value: (f.gross_margin || 0) * 100 },
        { name: 'Operating', value: (f.operating_margin || 0) * 100 },
        { name: 'Profit', value: (f.profit_margin || 0) * 100 },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/30">

            {/* HERO HEADER */}
            <div className="relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pb-8 pt-6">
                <div className="max-w-[1600px] mx-auto px-4 md:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">

                        {/* Ticker Info */}
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-slate-800 to-black dark:from-slate-700 dark:to-slate-900 flex items-center justify-center text-white text-2xl font-black shadow-2xl shadow-blue-500/20">
                                {p.symbol?.substring(0, 2)}
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
                                    {p.name_en || p.name_ar || p.symbol}
                                    <span className="text-sm px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold tracking-wider border border-slate-200 dark:border-slate-700">
                                        {p.symbol}
                                    </span>
                                </h1>
                                <div className="flex items-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {p.sector}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {p.industry}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                    <span className="flex items-center gap-1 uppercase"><Landmark className="w-4 h-4" /> {p.currency}</span>
                                </div>
                            </div>
                        </div>

                        {/* Price Action */}
                        <div className="flex items-end gap-6 text-right">
                            <div>
                                <div className="text-5xl font-black tracking-tighter flex items-center justify-end gap-1">
                                    {p.price ? fmt(p.price) : '-'}
                                    <span className="text-lg text-slate-400 font-medium mb-2">EGP</span>
                                </div>
                                <div className={clsx("flex items-center justify-end gap-2 font-bold text-lg", isUp ? "text-emerald-500" : "text-rose-500")}>
                                    {isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                    <span>{fmt(p.change)}</span>
                                    <span className={clsx("px-2 py-0.5 rounded text-sm", isUp ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                                        {fmtPct(p.change_pct)}
                                    </span>
                                </div>
                            </div>
                            <button onClick={toggleWatchlist} className="mb-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 hover:border-amber-500/50 transition-all">
                                <Star className={clsx("w-6 h-6", isWatched && "fill-amber-500 text-amber-500")} />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 mt-10 overflow-x-auto pb-2 scrollbar-none">
                        <SectionTab active={view === 'dashboard'} onClick={() => setView('dashboard')} label="Dashboard" icon={LayoutGrid} />
                        <SectionTab active={view === 'financials'} onClick={() => setView('financials')} label="Financials" icon={DollarSign} />
                        <SectionTab active={view === 'analysis'} onClick={() => setView('analysis')} label="Deep Analysis" icon={Layers} />
                        <SectionTab active={view === 'matrix'} onClick={() => setView('matrix')} label="Data Matrix" icon={Table2} />
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">

                {/* === DASHBOARD VIEW === */}
                {view === 'dashboard' && (
                    <div className="grid grid-cols-12 gap-6">

                        {/* Left Column (Main Chart) - Span 8 */}
                        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                            <Card title="Market Performance" icon={Activity} className="min-h-[500px]">
                                <div className="h-full w-full">
                                    {h && h.length > 0 ? (
                                        <StockPriceChart data={h} symbol={p.symbol} />
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400">
                                            Chart Data Unavailable
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatPill label="Start Price" value={fmt(p.open)} />
                                <StatPill label="Prev Close" value={fmt(p.prev_close)} />
                                <StatPill label="Day High" value={fmt(p.day_high)} trend="up" trendVal={fmt(p.day_high - p.open)} />
                                <StatPill label="Day Low" value={fmt(p.day_low)} trend="down" trendVal={fmt(p.open - p.day_low)} />
                                <StatPill label="Volume" value={fmtLarge(p.volume)} />
                                <StatPill label="Avg Vol (3M)" value={fmtLarge(p.avg_vol_3m)} />
                                <StatPill label="Market Cap" value={fmtLarge(p.market_cap)} />
                                <StatPill label="Shares Out" value={fmtLarge(p.shares_outstanding)} />
                            </div>
                        </div>

                        {/* Right Column (Widgets) - Span 4 */}
                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                            {/* Valuation Radar */}
                            <Card title="AI Valuation Model" icon={Zap} className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#334155" opacity={0.2} />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Score" dataKey="A" stroke={THEME.colors.primary} fill={THEME.colors.primary} fillOpacity={0.3} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </Card>

                            {/* Ownership Donut */}
                            <Card title="Ownership Structure" icon={Users} className="h-[350px]">
                                <div className="h-full relative">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={ownershipData}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {ownershipData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Text */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                        <div className="text-center">
                                            <span className="block text-3xl font-black text-slate-800 dark:text-slate-100">{fmtPct(f.insider_percent + f.institution_percent)}</span>
                                            <span className="text-xs font-bold text-slate-400 uppercase">Controlled</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Profile Summary */}
                            <Card title="About" icon={FileText}>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <p className="line-clamp-6 text-slate-600 dark:text-slate-400">
                                        {p.description || "No description available for this entity."}
                                    </p>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    {p.website && (
                                        <a href={p.website} target="_blank" className="flex-1 py-2 bg-slate-50 dark:bg-slate-800 text-center rounded-xl text-xs font-bold text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
                                            Website
                                        </a>
                                    )}
                                    <div className="flex-1 py-2 bg-slate-50 dark:bg-slate-800 text-center rounded-xl text-xs font-bold text-slate-500">
                                        {p.headquarters_city || 'Cairo'}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* === FINANCIALS VIEW === */}
                {view === 'financials' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-12 lg:col-span-4">
                                <Card title="Profitability Margins" icon={Scale} className="h-[400px]">
                                    <ResponsiveContainer>
                                        <BarChart data={marginData} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff' }} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                                {marginData.map((e, i) => <Cell key={i} fill={COLORS[i]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                            </div>
                            <div className="col-span-12 lg:col-span-8">
                                <Card title="Financial Ratios" icon={Table2}>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { l: 'P/E Ratio', v: f.pe_ratio }, { l: 'Fwd P/E', v: f.forward_pe },
                                            { l: 'P/B Ratio', v: f.price_to_book }, { l: 'PEG Ratio', v: f.peg_ratio },
                                            { l: 'Div Yield', v: fmtPct(f.dividend_yield) }, { l: 'Payout', v: fmtPct(f.payout_ratio) },
                                            { l: 'ROA', v: fmtPct(f.return_on_assets) }, { l: 'ROE', v: fmtPct(f.return_on_equity) },
                                            { l: 'Current Ratio', v: f.current_ratio }, { l: 'Debt/Eq', v: f.debt_to_equity },
                                            { l: 'EPS (TTM)', v: f.trailing_eps }, { l: 'Book Value', v: f.book_value }
                                        ].map((x, i) => (
                                            <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                                <p className="text-xs font-bold text-slate-400 uppercase">{x.l}</p>
                                                <p className="text-lg font-black text-slate-800 dark:text-slate-200">{fmt(x.v)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </div>
                        <FinancialsTab symbol={id} />
                    </div>
                )}

                {/* === ANALYSIS VIEW === */}
                {view === 'analysis' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card title="Risk Analysis" icon={ShieldCheck}>
                            <div className="flex flex-col items-center py-6">
                                <div className="text-6xl font-black text-slate-800 dark:text-slate-100">{f.overall_risk || 'N/A'}</div>
                                <div className="text-sm font-bold text-slate-400 uppercase mt-2">Overall ESG Score</div>
                            </div>
                            <div className="space-y-4">
                                {['Audit', 'Board', 'Shareholder', 'Compensation'].map((r, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-xs font-bold mb-1 text-slate-500">
                                            <span>{r} Risk</span>
                                            <span>{f[`${r.toLowerCase()}_risk`] || '-'}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(f[`${r.toLowerCase()}_risk`] || 0) * 10}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card title="Trading Liquidity" icon={BarChart2}>
                            <div className="space-y-4">
                                <StatPill label="Avg Vol (10D)" value={fmtLarge(p.avg_vol_10d)} />
                                <StatPill label="Avg Vol (3M)" value={fmtLarge(p.avg_vol_3m)} />
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                        <p className="text-xs font-bold text-emerald-500 uppercase">Bid Size</p>
                                        <p className="text-xl font-black text-emerald-600">{fmt(p.bid_size)}</p>
                                    </div>
                                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                                        <p className="text-xs font-bold text-rose-500 uppercase">Ask Size</p>
                                        <p className="text-xl font-black text-rose-600">{fmt(p.ask_size)}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* === DATA MATRIX VIEW (INSPECTOR) === */}
                {view === 'matrix' && (
                    <div className="space-y-8">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl flex items-center gap-4">
                            <div className="p-3 bg-blue-500 text-white rounded-xl">
                                <List className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">Chief Expert Data Matrix</h2>
                                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Raw unformatted access to the Enterprise Reservoir.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card title="Profile Metadata" icon={Building2} className="overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 font-bold">
                                            <tr>
                                                <th className="px-6 py-3">Key</th>
                                                <th className="px-6 py-3">Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {Object.entries(p).map(([k, v]) => (
                                                <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                    <td className="px-6 py-3 font-mono text-slate-500 text-xs">{k}</td>
                                                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">
                                                        {v === null ? <span className="text-slate-300 italic">null</span> : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            <Card title="Financial Metrics" icon={Scale} className="overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 font-bold">
                                            <tr>
                                                <th className="px-6 py-3">Key</th>
                                                <th className="px-6 py-3">Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {Object.entries(f).map(([k, v]) => (
                                                <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                    <td className="px-6 py-3 font-mono text-slate-500 text-xs">{k}</td>
                                                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">
                                                        {v === null ? <span className="text-slate-300 italic">null</span> : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
