'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { fetchYahooProfile, fetchTickers, fetchHistory } from '@/lib/api';

import {
    PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, Tooltip, AreaChart, Area, XAxis, YAxis, Legend, BarChart,
    Bar, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine
} from 'recharts';
import {
    TrendingUp, TrendingDown, Activity, BarChart2, DollarSign,
    PieChart as PieIcon, Building2, Calendar, FileText, Globe, MapPin, Users,
    Star, Briefcase, AlertTriangle, Scale, ChartLine, LayoutDashboard,
    ChartCandlestick, Building, BarChart3, Clock, Banknote, Percent,
    ArrowUpRight, ArrowDownRight, Minus, ExternalLink, Info, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// PREMIUM DESIGN SYSTEM
// ============================================================================

const formatNumber = (n: any, decimals = 2) => {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatPercent = (n: any, already100 = false) => {
    if (n == null || isNaN(n)) return '—';
    const val = already100 ? n : n * 100;
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
};

const formatLarge = (n: any) => {
    if (!n || isNaN(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString();
};

const formatDate = (timestamp: number) => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
};

// ============================================================================
// PREMIUM COMPONENTS
// ============================================================================

const GlassCard = ({ children, className = '', noPadding = false }: any) => (
    <div className={clsx(
        "relative overflow-hidden rounded-3xl",
        "bg-white/70 dark:bg-slate-900/70",
        "backdrop-blur-xl",
        "border border-slate-200/50 dark:border-slate-700/50",
        "shadow-xl shadow-slate-900/5 dark:shadow-black/20",
        !noPadding && "p-6",
        className
    )}>
        {children}
    </div>
);

const StatCard = ({ label, value, subValue, icon: Icon, trend, color = 'default' }: any) => {
    const colors: any = {
        default: 'from-slate-500/10 to-transparent',
        green: 'from-emerald-500/10 to-transparent',
        red: 'from-rose-500/10 to-transparent',
        blue: 'from-blue-500/10 to-transparent',
        purple: 'from-violet-500/10 to-transparent',
    };

    return (
        <div className={clsx(
            "relative p-5 rounded-2xl overflow-hidden",
            "bg-gradient-to-br", colors[color],
            "border border-slate-100 dark:border-slate-800",
            "hover:scale-[1.02] transition-transform duration-300"
        )}>
            <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {label}
                </span>
                {Icon && <Icon className="w-4 h-4 text-slate-400" />}
            </div>
            <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                    {value}
                </span>
                {trend !== undefined && (
                    <span className={clsx(
                        "text-xs font-bold flex items-center gap-0.5 mb-1",
                        trend >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend).toFixed(2)}%
                    </span>
                )}
            </div>
            {subValue && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subValue}</p>
            )}
        </div>
    );
};

const TabButton = ({ active, onClick, label, icon: Icon }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200",
            active
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
    >
        {Icon && <Icon className={clsx("w-4 h-4", active ? "text-blue-400 dark:text-blue-600" : "")} />}
        {label}
    </button>
);

const RangeIndicator = ({ current, low, high, label }: any) => {
    const percent = ((current - low) / (high - low)) * 100;
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>{formatNumber(low)}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                <span>{formatNumber(high)}</span>
            </div>
            <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full"
                    style={{ width: '100%' }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-900 rounded-full border-2 border-blue-600 shadow-lg transition-all"
                    style={{ left: `calc(${Math.min(100, Math.max(0, percent))}% - 8px)` }}
                />
            </div>
        </div>
    );
};

const DataRow = ({ label, value, highlight = false }: any) => (
    <div className={clsx(
        "flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800 last:border-0",
        highlight && "bg-blue-50/50 dark:bg-blue-900/20 -mx-4 px-4 rounded-lg"
    )}>
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">{value}</span>
    </div>
);

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function EnterpriseStockProfile() {
    const params = useParams();
    const symbol = (params?.symbol as string)?.toUpperCase() || '';

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');
    const [isWatched, setIsWatched] = useState(false);
    const [chartRange, setChartRange] = useState('1Y');

    // Data Fetching (Hybrid System)
    useEffect(() => {
        if (!symbol) return;
        setLoading(true);

        const loadData = async () => {
            try {
                const [backendRes, proxyRes] = await Promise.allSettled([
                    fetchYahooProfile(symbol),
                    fetch(`/api/yahoo-service?symbol=${symbol}`).then(r => r.ok ? r.json() : null)
                ]);

                let combined: any = { profile: {}, fundamentals: {}, history: [] };

                if (backendRes.status === 'fulfilled' && backendRes.value) {
                    combined = { ...combined, ...backendRes.value };
                }

                if (proxyRes.status === 'fulfilled' && proxyRes.value) {
                    const p = proxyRes.value;
                    if (p.profile) combined.profile = { ...combined.profile, ...p.profile };
                    if (p.fundamentals) combined.fundamentals = { ...combined.fundamentals, ...p.fundamentals };
                }

                if (Object.keys(combined.profile).length === 0) {
                    const tickers = await fetchTickers().catch(() => []);
                    const tick = tickers.find((t: any) => t.symbol === symbol || t.symbol === `${symbol}.CA`);
                    if (tick) combined.profile = tick;
                }

                if (!combined.history?.length) {
                    const h = await fetchHistory(symbol).catch(() => []);
                    combined.history = h;
                }

                setData(combined);
            } catch (err) {
                console.error("Load Error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();

        const saved = localStorage.getItem('egx_watchlist');
        if (saved && JSON.parse(saved).includes(symbol)) setIsWatched(true);
    }, [symbol]);

    const toggleWatchlist = () => {
        const saved = localStorage.getItem('egx_watchlist');
        let list = saved ? JSON.parse(saved) : [];
        if (list.includes(symbol)) {
            list = list.filter((s: string) => s !== symbol);
            setIsWatched(false);
        } else {
            list.push(symbol);
            setIsWatched(true);
        }
        localStorage.setItem('egx_watchlist', JSON.stringify(list));
    };

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto border-4 border-slate-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Loading market data...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (!data || !data.profile) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0f] flex items-center justify-center p-4">
                <GlassCard className="max-w-md text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Symbol Not Found</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">Unable to retrieve data for {symbol}</p>
                    <a href="/egx" className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                        Back to Market
                    </a>
                </GlassCard>
            </div>
        );
    }

    const p = data.profile;
    const f = data.fundamentals || {};
    const h = data.history || [];

    const isPositive = (p.regularMarketChange || p.change || 0) >= 0;
    const currentPrice = p.regularMarketPrice || p.price || p.last_price;
    const priceChange = p.regularMarketChange || p.change || 0;
    const priceChangePct = p.regularMarketChangePercent || p.change_pct || 0;

    // Chart Data Preparation
    const chartData = useMemo(() => {
        if (!h?.length) return [];
        return h.slice(-252).map((item: any) => ({
            date: item.date?.split('T')[0] || item.date,
            price: item.close,
            volume: item.volume,
            open: item.open,
            high: item.high,
            low: item.low
        }));
    }, [h]);

    const tabs = [
        { id: 'summary', label: 'Summary', icon: LayoutDashboard },
        { id: 'chart', label: 'Chart', icon: ChartLine },
        { id: 'financials', label: 'Financials', icon: Scale },
        { id: 'profile', label: 'Profile', icon: Building },
        { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-[#0a0a0f] dark:via-[#0f0f1a] dark:to-[#0a0a0f]">

            {/* === PREMIUM HEADER === */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                        {/* Left: Company Identity */}
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {symbol.substring(0, 2)}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {p.longName || p.shortName || p.name_en || symbol}
                                    </h1>
                                    <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                                        {symbol}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />
                                        {p.fullExchangeName || 'EGX'}
                                    </span>
                                    <span>•</span>
                                    <span>{p.sector || 'Financial Services'}</span>
                                    <span>•</span>
                                    <span className="uppercase">{p.currency || 'EGP'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Price Display */}
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="flex items-baseline gap-2 justify-end">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                                        {formatNumber(currentPrice)}
                                    </span>
                                    <span className="text-sm font-medium text-slate-400">{p.currency || 'EGP'}</span>
                                </div>
                                <div className={clsx(
                                    "flex items-center gap-2 justify-end font-semibold",
                                    isPositive ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    <span>{formatNumber(priceChange)}</span>
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded text-xs",
                                        isPositive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30"
                                    )}>
                                        {formatPercent(priceChangePct, true)}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={toggleWatchlist}
                                className={clsx(
                                    "p-3 rounded-xl border transition-all",
                                    isWatched
                                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-600"
                                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500"
                                )}
                            >
                                <Star className={clsx("w-5 h-5", isWatched && "fill-current")} />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-1 pb-4 overflow-x-auto">
                        {tabs.map(tab => (
                            <TabButton
                                key={tab.id}
                                active={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                label={tab.label}
                                icon={tab.icon}
                            />
                        ))}
                    </div>
                </div>
            </header>

            {/* === MAIN CONTENT === */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* SUMMARY TAB */}
                {activeTab === 'summary' && (
                    <div className="space-y-6">
                        {/* Key Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <StatCard label="Market Cap" value={formatLarge(p.marketCap || p.market_cap)} icon={Building2} color="blue" />
                            <StatCard label="P/E Ratio" value={formatNumber(p.trailingPE || f.pe_ratio)} icon={Scale} />
                            <StatCard label="EPS (TTM)" value={formatNumber(p.epsTrailingTwelveMonths || f.trailing_eps)} icon={DollarSign} color="green" />
                            <StatCard label="Book Value" value={formatNumber(p.bookValue || f.book_value)} icon={Banknote} />
                            <StatCard label="P/B Ratio" value={formatNumber(p.priceToBook || f.price_to_book)} icon={BarChart2} />
                            <StatCard label="Shares Out" value={formatLarge(p.sharesOutstanding || p.shares_outstanding)} icon={Users} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Price Chart Mini */}
                            <GlassCard className="lg:col-span-2" noPadding>
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="font-bold text-slate-900 dark:text-white">Price Performance</h3>
                                </div>
                                <div className="h-[300px] p-4">
                                    {chartData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                                    tickFormatter={(v) => v.split('-').slice(1).join('/')}
                                                />
                                                <YAxis
                                                    domain={['dataMin - 5', 'dataMax + 5']}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                                    width={50}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#0f172a',
                                                        border: 'none',
                                                        borderRadius: 12,
                                                        color: '#fff'
                                                    }}
                                                    formatter={(value: any) => [formatNumber(value), 'Price']}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="price"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2}
                                                    fill="url(#priceGradient)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-400">
                                            No chart data available
                                        </div>
                                    )}
                                </div>
                            </GlassCard>

                            {/* 52 Week Range + Moving Averages */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Trading Range</h3>

                                <RangeIndicator
                                    current={currentPrice}
                                    low={p.fiftyTwoWeekLow || p.year_low}
                                    high={p.fiftyTwoWeekHigh || p.year_high}
                                    label="52-Week Range"
                                />

                                <div className="mt-8 space-y-4">
                                    <DataRow label="Previous Close" value={formatNumber(p.regularMarketPreviousClose || p.prev_close)} />
                                    <DataRow label="Day Range" value={`${formatNumber(p.dayLow || p.day_low)} - ${formatNumber(p.dayHigh || p.day_high)}`} />
                                    <DataRow label="50-Day Avg" value={formatNumber(p.fiftyDayAverage)} highlight />
                                    <DataRow label="200-Day Avg" value={formatNumber(p.twoHundredDayAverage)} highlight />
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">vs 50D Avg</span>
                                        <span className={clsx(
                                            "font-bold",
                                            (p.fiftyDayAverageChangePercent || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {formatPercent(p.fiftyDayAverageChangePercent)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-2">
                                        <span className="text-slate-500 dark:text-slate-400">vs 200D Avg</span>
                                        <span className={clsx(
                                            "font-bold",
                                            (p.twoHundredDayAverageChangePercent || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {formatPercent(p.twoHundredDayAverageChangePercent)}
                                        </span>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Volume & Trading Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="Volume" value={formatLarge(p.volume || p.regularMarketVolume)} icon={BarChart2} />
                            <StatCard label="Avg Vol (10D)" value={formatLarge(p.averageDailyVolume10Day || p.avg_vol_10d)} icon={Activity} />
                            <StatCard label="Avg Vol (3M)" value={formatLarge(p.averageDailyVolume3Month || p.avg_vol_3m)} icon={BarChart3} />
                            <StatCard
                                label="52W Change"
                                value={formatPercent(p.fiftyTwoWeekChangePercent, true)}
                                icon={TrendingUp}
                                color={(p.fiftyTwoWeekChangePercent || 0) >= 0 ? 'green' : 'red'}
                            />
                        </div>
                    </div>
                )}

                {/* CHART TAB */}
                {activeTab === 'chart' && (
                    <div className="space-y-6">
                        <GlassCard noPadding>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <ChartLine className="w-5 h-5 text-blue-500" />
                                    Price & Volume Chart
                                </h3>
                                <div className="flex gap-1">
                                    {['1M', '3M', '6M', '1Y', 'Max'].map(range => (
                                        <button
                                            key={range}
                                            onClick={() => setChartRange(range)}
                                            className={clsx(
                                                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                                chartRange === range
                                                    ? "bg-blue-600 text-white"
                                                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            {range}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-[500px] p-6">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer>
                                        <ComposedChart data={chartData}>
                                            <defs>
                                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2} />
                                                    <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                                tickFormatter={(v) => v.split('-').slice(1).join('/')}
                                            />
                                            <YAxis
                                                yAxisId="price"
                                                domain={['dataMin - 5', 'dataMax + 5']}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                                orientation="right"
                                            />
                                            <YAxis
                                                yAxisId="volume"
                                                domain={[0, 'dataMax * 3']}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={false}
                                                orientation="left"
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    border: 'none',
                                                    borderRadius: 12,
                                                    color: '#fff'
                                                }}
                                            />
                                            <Bar yAxisId="volume" dataKey="volume" fill="#94a3b8" opacity={0.3} />
                                            <Area
                                                yAxisId="price"
                                                type="monotone"
                                                dataKey="price"
                                                stroke={isPositive ? "#10b981" : "#ef4444"}
                                                strokeWidth={2}
                                                fill="url(#areaGradient)"
                                            />
                                            {p.fiftyDayAverage && (
                                                <ReferenceLine
                                                    yAxisId="price"
                                                    y={p.fiftyDayAverage}
                                                    stroke="#3b82f6"
                                                    strokeDasharray="5 5"
                                                    label={{ value: '50D MA', fill: '#3b82f6', fontSize: 10 }}
                                                />
                                            )}
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">
                                        Chart data unavailable for this security
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* FINANCIALS TAB */}
                {activeTab === 'financials' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Valuation Metrics */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-blue-500" /> Valuation
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="Trailing P/E" value={formatNumber(p.trailingPE || f.pe_ratio)} />
                                    <DataRow label="Forward P/E" value={formatNumber(f.forward_pe)} />
                                    <DataRow label="P/E to Growth (PEG)" value={formatNumber(f.peg_ratio)} />
                                    <DataRow label="Price to Book" value={formatNumber(p.priceToBook || f.price_to_book)} />
                                    <DataRow label="Price to Sales" value={formatNumber(f.price_to_sales)} />
                                    <DataRow label="Enterprise Value" value={formatLarge(f.enterprise_value)} />
                                    <DataRow label="EV/Revenue" value={formatNumber(f.enterprise_to_revenue)} />
                                    <DataRow label="EV/EBITDA" value={formatNumber(f.enterprise_to_ebitda)} />
                                </div>
                            </GlassCard>

                            {/* Profitability */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Percent className="w-5 h-5 text-emerald-500" /> Profitability
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="Gross Margin" value={formatPercent(f.gross_margin)} />
                                    <DataRow label="Operating Margin" value={formatPercent(f.operating_margin)} />
                                    <DataRow label="Profit Margin" value={formatPercent(f.profit_margin)} />
                                    <DataRow label="EBITDA Margin" value={formatPercent(f.ebitda_margin)} />
                                    <DataRow label="Return on Assets" value={formatPercent(f.return_on_assets)} />
                                    <DataRow label="Return on Equity" value={formatPercent(f.return_on_equity)} />
                                </div>
                            </GlassCard>

                            {/* Per Share Data */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-amber-500" /> Per Share Data
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="EPS (Trailing)" value={formatNumber(p.epsTrailingTwelveMonths || f.trailing_eps)} />
                                    <DataRow label="EPS (Forward)" value={formatNumber(f.forward_eps)} />
                                    <DataRow label="Book Value / Share" value={formatNumber(p.bookValue || f.book_value)} />
                                    <DataRow label="Revenue / Share" value={formatNumber(f.revenue_per_share)} />
                                </div>
                            </GlassCard>

                            {/* Dividends */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-green-500" /> Dividends
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="Dividend Rate" value={formatNumber(p.trailingAnnualDividendRate || f.dividend_rate)} />
                                    <DataRow label="Dividend Yield" value={formatPercent((p.trailingAnnualDividendYield || f.dividend_yield) / 100)} />
                                    <DataRow label="Payout Ratio" value={formatPercent(f.payout_ratio)} />
                                    <DataRow label="Ex-Dividend Date" value={formatDate(f.ex_dividend_date)} />
                                </div>
                            </GlassCard>

                            {/* Balance Sheet */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-violet-500" /> Balance Sheet
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="Total Cash" value={formatLarge(f.total_cash)} />
                                    <DataRow label="Total Debt" value={formatLarge(f.total_debt)} />
                                    <DataRow label="Total Revenue" value={formatLarge(f.total_revenue)} />
                                    <DataRow label="Current Ratio" value={formatNumber(f.current_ratio)} />
                                    <DataRow label="Quick Ratio" value={formatNumber(f.quick_ratio)} />
                                    <DataRow label="Debt to Equity" value={formatNumber(f.debt_to_equity)} />
                                </div>
                            </GlassCard>

                            {/* Cash Flow */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-cyan-500" /> Cash Flow
                                </h3>
                                <div className="space-y-1">
                                    <DataRow label="Operating Cash Flow" value={formatLarge(f.operating_cash_flow)} />
                                    <DataRow label="Free Cash Flow" value={formatLarge(f.free_cash_flow)} />
                                </div>
                            </GlassCard>
                        </div>

                        {/* Earnings Calendar */}
                        {p.earningsTimestamp && (
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-500" /> Upcoming Earnings
                                </h3>
                                <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                            {new Date(p.earningsTimestamp * 1000).getDate()}
                                        </p>
                                        <p className="text-xs text-indigo-500 uppercase">
                                            {new Date(p.earningsTimestamp * 1000).toLocaleDateString('en-US', { month: 'short' })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">Earnings Report</p>
                                        <p className="text-sm text-slate-500">
                                            {p.isEarningsDateEstimate ? 'Estimated Date' : 'Confirmed Date'}
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        )}
                    </div>
                )}

                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <GlassCard>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4">About {p.longName || p.shortName || symbol}</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                {p.description || p.longBusinessSummary || "Company description not available for this security."}
                            </p>
                        </GlassCard>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <GlassCard>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4" /> Industry
                                </h4>
                                <DataRow label="Sector" value={p.sector || '—'} />
                                <DataRow label="Industry" value={p.industry || '—'} />
                            </GlassCard>

                            <GlassCard>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Exchange
                                </h4>
                                <DataRow label="Exchange" value={p.fullExchangeName || p.exchange || '—'} />
                                <DataRow label="Market" value={p.market || '—'} />
                                <DataRow label="Timezone" value={p.exchangeTimezoneShortName || '—'} />
                            </GlassCard>

                            <GlassCard>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> Contact
                                </h4>
                                <DataRow label="Currency" value={p.currency || 'EGP'} />
                                <DataRow label="Website" value={p.website ? (
                                    <a href={p.website} target="_blank" rel="noopener" className="text-blue-600 hover:underline flex items-center gap-1">
                                        Visit <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : '—'} />
                            </GlassCard>
                        </div>
                    </div>
                )}

                {/* STATISTICS TAB */}
                {activeTab === 'statistics' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Trading Statistics */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Trading Statistics</h3>
                                <div className="space-y-1">
                                    <DataRow label="Open" value={formatNumber(p.regularMarketOpen || p.open)} />
                                    <DataRow label="Previous Close" value={formatNumber(p.regularMarketPreviousClose || p.prev_close)} />
                                    <DataRow label="Day High" value={formatNumber(p.dayHigh || p.day_high)} />
                                    <DataRow label="Day Low" value={formatNumber(p.dayLow || p.day_low)} />
                                    <DataRow label="52W High" value={formatNumber(p.fiftyTwoWeekHigh || p.year_high)} />
                                    <DataRow label="52W Low" value={formatNumber(p.fiftyTwoWeekLow || p.year_low)} />
                                    <DataRow label="52W Range" value={p.fiftyTwoWeekRange || '—'} />
                                </div>
                            </GlassCard>

                            {/* Moving Averages */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Moving Averages</h3>
                                <div className="space-y-1">
                                    <DataRow label="50-Day Average" value={formatNumber(p.fiftyDayAverage)} />
                                    <DataRow label="50-Day Change" value={formatNumber(p.fiftyDayAverageChange)} />
                                    <DataRow label="50-Day Change %" value={formatPercent(p.fiftyDayAverageChangePercent)} />
                                    <DataRow label="200-Day Average" value={formatNumber(p.twoHundredDayAverage)} />
                                    <DataRow label="200-Day Change" value={formatNumber(p.twoHundredDayAverageChange)} />
                                    <DataRow label="200-Day Change %" value={formatPercent(p.twoHundredDayAverageChangePercent)} />
                                </div>
                            </GlassCard>

                            {/* Volume Analysis */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Volume Analysis</h3>
                                <div className="space-y-1">
                                    <DataRow label="Today's Volume" value={formatLarge(p.volume || p.regularMarketVolume)} />
                                    <DataRow label="10-Day Avg Volume" value={formatLarge(p.averageDailyVolume10Day || p.avg_vol_10d)} />
                                    <DataRow label="3-Month Avg Volume" value={formatLarge(p.averageDailyVolume3Month || p.avg_vol_3m)} />
                                </div>
                            </GlassCard>

                            {/* Shares Information */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Share Statistics</h3>
                                <div className="space-y-1">
                                    <DataRow label="Shares Outstanding" value={formatLarge(p.sharesOutstanding || p.shares_outstanding)} />
                                    <DataRow label="Float Shares" value={formatLarge(p.floatShares || p.float_shares)} />
                                    <DataRow label="Implied Shares" value={formatLarge(p.impliedSharesOutstanding || p.implied_shares)} />
                                    <DataRow label="Short Ratio" value={formatNumber(f.short_ratio)} />
                                    <DataRow label="Insider Ownership" value={formatPercent(f.insider_percent)} />
                                    <DataRow label="Institutional Ownership" value={formatPercent(f.institution_percent)} />
                                </div>
                            </GlassCard>

                            {/* Risk Metrics */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Risk Metrics</h3>
                                <div className="space-y-1">
                                    <DataRow label="Beta" value={formatNumber(f.beta)} />
                                    <DataRow label="Audit Risk" value={f.audit_risk || '—'} />
                                    <DataRow label="Board Risk" value={f.board_risk || '—'} />
                                    <DataRow label="Compensation Risk" value={f.compensation_risk || '—'} />
                                    <DataRow label="Shareholder Rights Risk" value={f.shareholder_rights_risk || '—'} />
                                    <DataRow label="Overall Risk" value={f.overall_risk || '—'} />
                                </div>
                            </GlassCard>

                            {/* Technical Metadata */}
                            <GlassCard>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-6">Technical Data</h3>
                                <div className="space-y-1">
                                    <DataRow label="Quote Type" value={p.quoteType || '—'} />
                                    <DataRow label="Market State" value={p.marketState || '—'} />
                                    <DataRow label="Exchange Delay" value={p.exchangeDataDelayedBy ? `${p.exchangeDataDelayedBy} min` : '—'} />
                                    <DataRow label="Source Interval" value={p.sourceInterval ? `${p.sourceInterval} min` : '—'} />
                                    <DataRow label="First Trade Date" value={p.firstTradeDateMilliseconds ? formatDate(p.firstTradeDateMilliseconds / 1000) : '—'} />
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
