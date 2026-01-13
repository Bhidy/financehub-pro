'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { fetchYahooProfile } from '@/lib/api';

import {
    PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    Tooltip, AreaChart, Area, XAxis, YAxis, Legend, BarChart, Bar, CartesianGrid
} from 'recharts';
import {
    ArrowUpRight, ArrowDownRight, TrendingUp, Activity, BarChart2, DollarSign, PieChart as PieIcon,
    List, Building2, Calendar, FileText, CheckCircle2, AlertCircle, ShieldCheck, Zap, Globe, MapPin, Users,
    Plus, Minus, Bookmark, Star
} from 'lucide-react';
import clsx from 'clsx';
// Component imports assumed to exist or we use inline for now to ensure robustness
import StockPriceChart from '@/components/egx/StockPriceChart';
import FinancialsTab from '@/components/egx/FinancialsTab';

// ============================================================================
// CONSTANTS
// ============================================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
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
    blue: '#3B82F6', green: '#10B981', amber: '#F59E0B', purple: '#8B5CF6', rose: '#F43F5E', teal: '#14B8A6',
    slate: '#64748B', indigo: '#6366F1', cyan: '#06B6D4'
};

// ============================================================================
// UI COMPONENTS (Inline for atomic perfection)
// ============================================================================

const MetricCard = ({ label, value, sub, color = 'blue', icon: Icon, trend }: any) => {
    const gradients: Record<string, string> = {
        blue: "from-blue-50 to-white", green: "from-emerald-50 to-white",
        amber: "from-amber-50 to-white", purple: "from-purple-50 to-white",
        rose: "from-rose-50 to-white", teal: "from-teal-50 to-white",
        slate: "from-slate-50 to-white"
    };

    return (
        <div className={`bg-gradient-to-br ${gradients[color] || gradients.blue} border border-slate-100 rounded-2xl p-5 hover:shadow-xl transition-all duration-300 group relative overflow-hidden`}>
            {/* <div className={`absolute top-0 right-0 p-8 opacity-5 rounded-full bg-${color}-500 transform translate-x-4 -translate-y-4`} /> */}
            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        {label}
                        {trend && <span className={clsx("text-[10px]", trend > 0 ? "text-green-500" : "text-red-500")}>({trend > 0 ? '+' : ''}{trend}%)</span>}
                    </p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight group-hover:scale-105 transition-transform origin-left">{value}</p>
                    {sub && <p className="text-xs font-medium text-slate-500 mt-1">{sub}</p>}
                </div>
                {Icon && <div className={`p-2 rounded-xl bg-white/80 backdrop-blur shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 border",
            active
                ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20 scale-105"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
        )}
    >
        <Icon className={clsx("w-4 h-4", active ? "text-blue-400" : "text-slate-400")} />
        <span>{label}</span>
    </button>
);

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function EGXStockProfilePage() {
    const params = useParams();
    const id = (params?.symbol as string)?.toUpperCase() || '';

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('overview');
    const [isWatched, setIsWatched] = useState(false);

    // Initial check for watchlist
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

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        // UNIFIED ARCHITECTURE: Direct Facade Call
        fetchYahooProfile(id)
            .then((res: any) => {
                setData(res);
                setError('');
            })
            .catch(e => setError(e.message || "Failed to load stock data"))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm font-bold animate-pulse">Loading Premium Data...</p>
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-xl">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Stock Not Found</h2>
                <p className="text-slate-500">{error || "We could not retrieve data for this ticker."}</p>
                <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold">Try Again</button>
            </div>
        </div>
    );

    const { profile: p, fundamentals: f } = data;
    const isPositive = (p.change_pct || 0) >= 0;

    const radarData = [
        { subject: 'Valuation', A: f.pe_ratio ? Math.min(100, (15 / f.pe_ratio) * 100) : 50, fullMark: 100 },
        { subject: 'Profit', A: (f.profit_margin || 0) * 200, fullMark: 100 },
        { subject: 'Health', A: (f.current_ratio || 0) * 50, fullMark: 100 },
        { subject: 'Efficiency', A: (f.return_on_equity || 0) * 300, fullMark: 100 },
        { subject: 'Dividend', A: (f.dividend_yield || 0) * 1000, fullMark: 100 },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
            {/* HEADER */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white text-xl font-black shadow-lg">
                                {(p.symbol || id).substring(0, 2)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-tight">
                                    {p.name_en || p.symbol || id}
                                </h1>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{p.symbol}</span>
                                    <span>•</span>
                                    <span>{p.sector || 'Main Market'}</span>
                                    <span>•</span>
                                    <span>{p.currency || 'EGP'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleWatchlist}
                                className={clsx(
                                    "px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg",
                                    isWatched
                                        ? "bg-amber-100 text-amber-700 border border-amber-200 shadow-amber-100"
                                        : "bg-blue-600 text-white border border-blue-500 shadow-blue-200 hover:bg-blue-700"
                                )}
                            >
                                {isWatched ? <Star className="w-4 h-4 fill-amber-500" /> : <Plus className="w-4 h-4" />}
                                {isWatched ? "Watched" : "Watchlist"}
                            </button>
                            <div className="text-right">
                                <div className="flex items-baseline justify-end gap-2">
                                    <span className="text-4xl font-black tracking-tighter text-slate-900">{fmt(p.last_price)}</span>
                                    <span className="text-sm font-bold text-slate-400">EGP</span>
                                </div>
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {isPositive ? '+' : ''}{fmt(p.change)} ({fmt(p.change_pct)}%)
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-6 overflow-x-auto pb-1 scrollbar-none">
                        {[
                            { id: 'overview', icon: Activity, label: 'Overview' },
                            { id: 'financials', icon: DollarSign, label: 'Financials' },
                            { id: 'profile', icon: Building2, label: 'Profile' },
                        ].map(t => <TabButton key={t.id} {...t} active={tab === t.id} onClick={() => setTab(t.id)} />)}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">

                {tab === 'overview' && (
                    <>
                        <section className="bg-white rounded-3xl p-1 shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                    Price Action
                                </h3>
                                <div className="flex gap-2">
                                    <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-500">1D</span>
                                    <span className="text-xs font-bold px-2 py-1 bg-blue-500 text-white rounded shadow-sm shadow-blue-200">1W</span>
                                </div>
                            </div>
                            <div className="h-[400px] w-full bg-white">
                                {data.history && data.history.length > 0 ? (
                                    <StockPriceChart
                                        data={data.history}
                                        symbol={p.symbol}
                                        change={p.change}
                                        changePercent={p.change_pct}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-300 font-bold flex-col gap-2">
                                        <BarChart2 className="w-12 h-12 opacity-50" />
                                        <span>No History Data Available</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard label="Volume" value={fmtLarge(p.volume)} color="amber" icon={BarChart2} />
                            <MetricCard label="Avg Vol (10D)" value={fmtLarge(p.avg_vol_10d)} color="amber" />
                            <MetricCard label="Avg Vol (3M)" value={fmtLarge(p.avg_vol_3m)} color="amber" />

                            <MetricCard label="Market Cap" value={fmtLarge(p.market_cap)} color="blue" icon={Building2} />
                            <MetricCard label="P/E Ratio" value={fmt(f.pe_ratio)} color="purple" icon={Zap} />
                            <MetricCard label="Div Yield" value={fmtPct(f.dividend_yield)} color="green" icon={PieIcon} />

                            <MetricCard label="Day High" value={fmt(p.day_high)} color="slate" />
                            <MetricCard label="Day Low" value={fmt(p.day_low)} color="slate" />
                            <MetricCard label="52W High" value={fmt(p.year_high)} color="indigo" />
                            <MetricCard label="52W Low" value={fmt(p.year_low)} color="indigo" />

                            <MetricCard label="Bid" value={fmt(p.bid)} color="teal" />
                            <MetricCard label="Ask" value={fmt(p.ask)} color="rose" />
                        </section>

                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Fundamental Strength</h3>
                                <div className="h-64 relative">
                                    <ResponsiveContainer>
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                            <PolarGrid stroke="#f1f5f9" />
                                            <PolarAngleAxis dataKey="subject" tick={(props: any) => <text x={props.x} y={props.y} textAnchor={props.textAnchor} fill="#64748b" fontSize={10} fontWeight={700}>{props.payload.value}</text>} />
                                            <Radar name="Score" dataKey="A" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.2} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Financial Ratios</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
                                    {[
                                        { l: 'EPS (Trailing)', v: fmt(f.trailing_eps) },
                                        { l: 'B/V per Share', v: fmt(f.book_value) },
                                        { l: 'Price / Book', v: fmt(f.price_to_book) },
                                        { l: 'Profit Margin', v: fmtPct(f.profit_margin) },
                                        { l: 'Operating Margin', v: fmtPct(f.operating_margin) },
                                        { l: 'Return on Equity', v: fmtPct(f.return_on_equity) },
                                        { l: 'Current Ratio', v: fmt(f.current_ratio) },
                                        { l: 'Debt / Equity', v: fmt(f.total_debt / (f.total_cash + 1)) },
                                        { l: 'Beta', v: fmt(f.beta) },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-end border-b border-slate-50 pb-2">
                                            <span className="text-slate-500 text-sm font-medium">{item.l}</span>
                                            <span className="text-slate-800 font-bold font-mono">{item.v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {tab === 'financials' && (
                    <FinancialsTab symbol={id} />
                )}

                {tab === 'profile' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in hover:none">
                        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                <Building2 className="w-6 h-6 text-blue-500" />
                                About {p.name_en}
                            </h3>
                            <p className="text-slate-600 leading-relaxed text-lg">
                                {p.description || "No description available."}
                            </p>
                            <div className="mt-8 grid grid-cols-2 gap-6">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Sector</p>
                                    <p className="font-bold text-slate-800">{p.sector}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Industry</p>
                                    <p className="font-bold text-slate-800">{p.industry}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-400" />
                                    Contact
                                </h4>
                                <ul className="space-y-4 text-sm">
                                    <li className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                                        <span className="text-slate-600">{p.headquarters_city || 'Cairo, Egypt'}</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <Globe className="w-4 h-4 text-slate-400" />
                                        <a href={p.website} target="_blank" className="text-blue-600 hover:underline truncate">
                                            {p.website || 'N/A'}
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    Employees
                                </h4>
                                <p className="text-2xl font-black text-slate-800">{p.employees ? p.employees.toLocaleString() : '-'}</p>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
