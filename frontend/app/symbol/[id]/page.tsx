"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import {
    fetchTickers, fetchOHLC, fetchFinancials, fetchShareholders,
    fetchCorporateActions, fetchAnalystRatings, fetchInsiderTrading,
    fetchEarnings, fetchFairValues, fetchMarketBreadth, fetchIntraday,
    Ticker
} from "@/lib/api";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, LineSeries, HistogramSeries, AreaSeries, Time } from "lightweight-charts";
import {
    TrendingUp, TrendingDown, Building2, Users, BarChart3,
    FileText, ArrowUpRight, ArrowDownRight, Star, Bell, Share2, Activity,
    Target, LineChart, CandlestickChart, Zap, PieChart, AlertCircle, Wallet,
    Briefcase, Calendar, ArrowUp, ArrowDown, Clock, TrendingDown as TrendDown,
    AreaChart, Sparkles, Globe, Award
} from "lucide-react";

// Arabic key mapping for financials
const ARABIC_KEYS: Record<string, string> = {
    "صافى الربح": "net_income", "مجمل الربح": "gross_profit",
    "إجمالي الأصول": "total_assets", "إجمالي المطلوبات": "total_liabilities",
    "اجمالي حقوق المساهمين مضاف اليها حقوق الاقلية": "total_equity",
};

function parseFinancialsRawData(rawData: string | null): Record<string, number> {
    if (!rawData) return {};
    try {
        const parsed = JSON.parse(rawData);
        const result: Record<string, number> = {};
        for (const [k, v] of Object.entries(parsed)) {
            const ek = ARABIC_KEYS[k];
            if (ek && typeof v === "number") result[ek] = v;
        }
        return result;
    } catch { return {}; }
}

function formatNumber(num: number | string | null | undefined): string {
    if (num === null || num === undefined || num === "") return "-";
    const n = typeof num === "string" ? parseFloat(num) : num;
    if (isNaN(n)) return "-";
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "K";
    return n.toFixed(2);
}

function formatCurrency(num: number | string | null | undefined): string {
    if (num === null || num === undefined || num === "") return "-";
    return `SAR ${formatNumber(num)}`;
}

// Loading Skeleton with animations
function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/30 p-6">
            <div className="max-w-[1800px] mx-auto">
                <div className="animate-pulse space-y-6">
                    <div className="h-32 bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-3xl" />
                    <div className="grid grid-cols-6 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl shadow-lg" />)}</div>
                    <div className="h-[500px] bg-white rounded-3xl shadow-xl" />
                </div>
            </div>
        </div>
    );
}

// Ultra Premium Animated Stat Card
function StatCard({ label, value, icon: Icon, trend, color = "blue", delay = 0 }: {
    label: string; value: string; icon?: any; trend?: "up" | "down" | null; color?: string; delay?: number;
}) {
    const colorStyles: Record<string, { bg: string; icon: string; text: string; glow: string }> = {
        blue: { bg: "from-blue-500 to-blue-600", icon: "bg-blue-500", text: "text-blue-600", glow: "shadow-blue-500/20" },
        emerald: { bg: "from-emerald-500 to-teal-600", icon: "bg-emerald-500", text: "text-emerald-600", glow: "shadow-emerald-500/20" },
        red: { bg: "from-red-500 to-rose-600", icon: "bg-red-500", text: "text-red-600", glow: "shadow-red-500/20" },
        amber: { bg: "from-amber-500 to-orange-600", icon: "bg-amber-500", text: "text-amber-600", glow: "shadow-amber-500/20" },
        violet: { bg: "from-violet-500 to-purple-600", icon: "bg-violet-500", text: "text-violet-600", glow: "shadow-violet-500/20" },
        cyan: { bg: "from-cyan-500 to-teal-600", icon: "bg-cyan-500", text: "text-cyan-600", glow: "shadow-cyan-500/20" },
    };
    const style = colorStyles[color] || colorStyles.blue;

    return (
        <div
            className={`relative overflow-hidden bg-white rounded-2xl p-5 shadow-xl ${style.glow} border border-slate-100 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 group animate-fade-in-up`}
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Animated gradient background */}
            <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${style.bg} opacity-10 blur-3xl group-hover:opacity-30 group-hover:scale-150 transition-all duration-700`} />
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${style.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</span>
                    {Icon && (
                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${style.bg} shadow-lg ${style.glow} transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500`}>
                            <Icon className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-2xl font-black ${style.text} font-mono`}>{value}</span>
                    {trend === "up" && <ArrowUpRight className="w-5 h-5 text-emerald-500 animate-bounce" />}
                    {trend === "down" && <ArrowDownRight className="w-5 h-5 text-red-500 animate-bounce" />}
                </div>
            </div>
        </div>
    );
}

// Premium Card with glow effects
function PremiumCard({ children, className = "", gradient = false }: { children: React.ReactNode; className?: string; gradient?: boolean }) {
    return (
        <div className={`relative overflow-hidden bg-white rounded-3xl p-6 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-500 ${className}`}>
            {gradient && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />}
            {children}
        </div>
    );
}

// Section Header with animated icon
function SectionHeader({ title, icon: Icon, color = "blue" }: { title: string; icon: any; color?: string }) {
    const colorMap: Record<string, string> = {
        blue: "from-blue-500 to-blue-600 shadow-blue-500/30",
        emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
        violet: "from-violet-500 to-purple-600 shadow-violet-500/30",
        orange: "from-orange-500 to-amber-600 shadow-orange-500/30",
        cyan: "from-cyan-500 to-blue-600 shadow-cyan-500/30",
        red: "from-red-500 to-rose-600 shadow-red-500/30",
    };
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} shadow-lg animate-pulse-slow`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                <AlertCircle className="w-16 h-16 mb-4 relative" />
            </div>
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}

// Main Page
export default function SymbolDetailPage() {
    const params = useParams();
    const symbol = params.id as string;
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    const [activeTab, setActiveTab] = useState<"overview" | "financials" | "ownership" | "analysts" | "earnings" | "insider">("overview");
    const [chartPeriod, setChartPeriod] = useState("1m");
    const [chartStyle, setChartStyle] = useState<"candle" | "line" | "area">("area");
    const [isIntraday, setIsIntraday] = useState(false);

    // Data Fetching
    const { data: tickers = [], isLoading: tickersLoading } = useQuery({ queryKey: ["tickers"], queryFn: fetchTickers, staleTime: 30000 });
    const stockData = useMemo(() => tickers.find((t: Ticker) => t.symbol === symbol), [tickers, symbol]);
    const { data: ohlcData = [], isLoading: chartLoading } = useQuery({ queryKey: ["ohlc", symbol, chartPeriod], queryFn: () => fetchOHLC(symbol, chartPeriod), enabled: !!symbol && !isIntraday });
    const { data: intradayData = [], isLoading: intradayLoading } = useQuery({ queryKey: ["intraday", symbol], queryFn: () => fetchIntraday(symbol, "1h", 100), enabled: !!symbol && isIntraday });
    const { data: financials = [] } = useQuery({ queryKey: ["financials", symbol], queryFn: () => fetchFinancials(symbol), enabled: !!symbol });
    const { data: shareholders = [] } = useQuery({ queryKey: ["shareholders", symbol], queryFn: () => fetchShareholders(symbol), enabled: !!symbol });
    const { data: allAnalystRatings = [] } = useQuery({ queryKey: ["analyst-ratings"], queryFn: () => fetchAnalystRatings(), enabled: !!symbol });
    const { data: corporateActions = [] } = useQuery({ queryKey: ["corporate-actions", symbol], queryFn: () => fetchCorporateActions(symbol), enabled: !!symbol });
    const { data: allInsiderTrading = [] } = useQuery({ queryKey: ["insider-trading"], queryFn: () => fetchInsiderTrading(), enabled: !!symbol });
    const { data: allEarnings = [] } = useQuery({ queryKey: ["earnings"], queryFn: () => fetchEarnings(), enabled: !!symbol });
    const { data: allFairValues = [] } = useQuery({ queryKey: ["fair-values"], queryFn: () => fetchFairValues(), enabled: !!symbol });
    const { data: marketBreadth = [] } = useQuery({ queryKey: ["market-breadth"], queryFn: () => fetchMarketBreadth(), enabled: !!symbol });

    const analystRatings = useMemo(() => allAnalystRatings.filter((r: any) => r.symbol === symbol), [allAnalystRatings, symbol]);
    const insiderTrades = useMemo(() => allInsiderTrading.filter((t: any) => t.symbol === symbol), [allInsiderTrading, symbol]);
    const earnings = useMemo(() => allEarnings.filter((e: any) => e.symbol === symbol), [allEarnings, symbol]);
    const fairValue = useMemo(() => allFairValues.find((f: any) => f.symbol === symbol), [allFairValues, symbol]);
    const latestBreadth = marketBreadth[0];

    const parsedFinancials = useMemo(() => financials.map((f: any) => {
        const rp = parseFinancialsRawData(f.raw_data);
        return { ...f, net_income: f.net_income || rp.net_income, total_assets: f.total_assets || rp.total_assets, total_equity: f.total_equity || rp.total_equity };
    }), [financials]);

    const rawData = isIntraday ? intradayData : ohlcData;
    const chartData = useMemo(() => {
        if (!rawData || rawData.length === 0) return [];
        const dateField = isIntraday ? "timestamp" : "date";
        return [...rawData].sort((a: any, b: any) => new Date(a[dateField] || a.time).getTime() - new Date(b[dateField] || b.time).getTime())
            .map((item: any) => ({
                time: (isIntraday ? Math.floor(new Date(item.timestamp).getTime() / 1000) : new Date(item.date || item.time).toISOString().split('T')[0]) as Time,
                open: Number(item.open), high: Number(item.high), low: Number(item.low), close: Number(item.close), volume: Number(item.volume)
            }));
    }, [rawData, isIntraday]);

    const stats = useMemo(() => {
        if (chartData.length < 2) return null;
        const current = chartData[chartData.length - 1];
        const first = chartData[0];
        const high52 = Math.max(...chartData.map((d: any) => d.high));
        const low52 = Math.min(...chartData.map((d: any) => d.low));
        const periodReturn = ((current.close - first.close) / first.close) * 100;
        return { high52, low52, periodReturn, current };
    }, [chartData]);

    // Chart Effect
    useEffect(() => {
        if (!chartContainerRef.current || chartData.length === 0) return;
        if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

        const chart = createChart(chartContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#64748b', fontFamily: "'Inter', -apple-system, sans-serif" },
            width: chartContainerRef.current.clientWidth, height: 420,
            grid: { vertLines: { color: 'rgba(148, 163, 184, 0.1)' }, horzLines: { color: 'rgba(148, 163, 184, 0.1)' } },
            timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(148, 163, 184, 0.2)', rightOffset: 5 },
            rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.2)' },
            crosshair: { mode: CrosshairMode.Normal, vertLine: { color: 'rgba(99, 102, 241, 0.5)', width: 1, style: 2, labelBackgroundColor: '#6366f1' }, horzLine: { color: 'rgba(99, 102, 241, 0.5)', width: 1, style: 2, labelBackgroundColor: '#6366f1' } }
        });
        chartRef.current = chart;

        try {
            if (chartStyle === "candle") {
                const series = chart.addSeries(CandlestickSeries, { upColor: '#10b981', downColor: '#ef4444', borderUpColor: '#10b981', borderDownColor: '#ef4444', wickUpColor: '#10b981', wickDownColor: '#ef4444' });
                series.setData(chartData);
            } else if (chartStyle === "line") {
                const series = chart.addSeries(LineSeries, { color: '#6366f1', lineWidth: 3 });
                series.setData(chartData.map((d: any) => ({ time: d.time, value: d.close })));
            } else {
                const series = chart.addSeries(AreaSeries, { topColor: 'rgba(99, 102, 241, 0.4)', bottomColor: 'rgba(99, 102, 241, 0.02)', lineColor: '#6366f1', lineWidth: 3 });
                series.setData(chartData.map((d: any) => ({ time: d.time, value: d.close })));
            }
            const volumeSeries = chart.addSeries(HistogramSeries, { color: 'rgba(148,163,184,0.2)', priceFormat: { type: 'volume' }, priceScaleId: '' });
            volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
            volumeSeries.setData(chartData.map((d: any) => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)' })));
            chart.timeScale().fitContent();
        } catch (err) { console.error("Chart error:", err); }

        const handleResize = () => { if (chartContainerRef.current && chartRef.current) chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth }); };
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; } };
    }, [chartData, chartStyle]);

    if (tickersLoading) return <LoadingSkeleton />;
    if (!stockData) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-indigo-50">
            <div className="text-center bg-white p-12 rounded-3xl shadow-2xl border border-slate-100 animate-fade-in">
                <div className="relative inline-block"><div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" /><AlertCircle className="w-20 h-20 text-red-400 relative" /></div>
                <h2 className="text-3xl font-black text-slate-800 mt-6 mb-2">Stock Not Found</h2>
                <p className="text-slate-500">Symbol: <span className="font-mono font-bold text-indigo-600">{symbol}</span></p>
            </div>
        </div>
    );

    const isPositive = Number(stockData.change || 0) >= 0;
    const lastPrice = Number(stockData.last_price || 0);
    const change = Number(stockData.change || 0);
    const changePercent = Number(stockData.change_percent || 0);
    const volume = Number(stockData.volume || 0);
    const loading = isIntraday ? intradayLoading : chartLoading;

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 pb-12">
            {/* Add custom animations */}
            <style jsx global>{`
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
                .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
                .animate-fade-in { animation: fade-in-up 0.5s ease-out forwards; }
                .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
            `}</style>

            {/* ULTRA PREMIUM HEADER */}
            <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-40 shadow-lg shadow-slate-200/20">
                {/* Animated gradient line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />

                <div className="max-w-[1800px] mx-auto px-6 py-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-5">
                            {/* Animated stock badge */}
                            <div className={`relative w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-black text-white shadow-2xl transform hover:scale-110 hover:rotate-3 transition-all duration-500 ${isPositive ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-emerald-500/30" : "bg-gradient-to-br from-red-400 via-red-500 to-rose-600 shadow-red-500/30"}`}>
                                <div className="absolute inset-0 bg-white/20 rounded-3xl animate-pulse-slow" />
                                <span className="relative">{symbol.slice(0, 2)}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-4xl font-black bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">{symbol}</h1>
                                    <span className="px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 border border-indigo-200/50 shadow-sm">{stockData.sector_name || "EQUITY"}</span>
                                </div>
                                <p className="text-slate-500 font-medium text-lg mt-1">{stockData.name_en || stockData.name_ar || symbol}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-slate-900 font-mono tracking-tighter">{lastPrice.toFixed(2)}</span>
                                    <span className="text-slate-400 text-lg font-bold">SAR</span>
                                </div>
                                <div className={`flex items-center justify-end gap-2 mt-2 ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                                    {isPositive ? <ArrowUpRight className="w-6 h-6 animate-bounce" /> : <ArrowDownRight className="w-6 h-6 animate-bounce" />}
                                    <span className={`px-4 py-2 rounded-xl font-bold text-sm ${isPositive ? "bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200" : "bg-gradient-to-r from-red-50 to-rose-50 border border-red-200"}`}>
                                        {isPositive ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                            <div className="hidden md:flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300/50 shadow-lg shadow-blue-500/10">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-bold text-blue-700">Delayed 5 min</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-6">
                        <button className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300">
                            <Star className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Watchlist
                        </button>
                        <button className="group flex items-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-2xl font-bold border-2 border-slate-200 shadow-lg hover:shadow-xl hover:border-amber-300 hover:-translate-y-0.5 transition-all duration-300">
                            <Bell className="w-5 h-5 group-hover:animate-bounce" /> Alert
                        </button>
                        <button className="group flex items-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-2xl font-bold border-2 border-slate-200 shadow-lg hover:shadow-xl hover:border-purple-300 hover:-translate-y-0.5 transition-all duration-300">
                            <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" /> Share
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="max-w-[1800px] mx-auto px-6 py-8">
                {/* Stats Row - Animated */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <StatCard label="Volume" value={formatNumber(volume)} icon={BarChart3} color="blue" delay={0} />
                    <StatCard label="52W High" value={stats?.high52?.toFixed(2) || "-"} icon={TrendingUp} trend="up" color="emerald" delay={100} />
                    <StatCard label="52W Low" value={stats?.low52?.toFixed(2) || "-"} icon={TrendDown} trend="down" color="red" delay={200} />
                    <StatCard label="Return" value={stats?.periodReturn ? `${stats.periodReturn >= 0 ? "+" : ""}${stats.periodReturn.toFixed(1)}%` : "-"} trend={stats?.periodReturn && stats.periodReturn >= 0 ? "up" : "down"} color="amber" delay={300} />
                    <StatCard label="Open" value={stats?.current?.open?.toFixed(2) || "-"} icon={Clock} color="cyan" delay={400} />
                    <StatCard label="Close" value={stats?.current?.close?.toFixed(2) || "-"} icon={Target} color="violet" delay={500} />
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 bg-white rounded-3xl p-2.5 shadow-xl border border-slate-100 mb-8 overflow-x-auto">
                    {[
                        { id: "overview", label: "Overview", icon: Activity, color: "from-blue-500 to-indigo-500" },
                        { id: "financials", label: "Financials", icon: FileText, color: "from-violet-500 to-purple-500" },
                        { id: "ownership", label: "Ownership", icon: Users, color: "from-orange-500 to-amber-500" },
                        { id: "analysts", label: "Analysts", icon: Target, color: "from-cyan-500 to-blue-500" },
                        { id: "earnings", label: "Earnings", icon: Calendar, color: "from-pink-500 to-rose-500" },
                        { id: "insider", label: "Insider", icon: Briefcase, color: "from-teal-500 to-emerald-500" },
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all duration-300 whitespace-nowrap ${activeTab === tab.id ? `bg-gradient-to-r ${tab.color} text-white shadow-lg transform scale-105` : "text-slate-600 hover:bg-slate-100 hover:scale-105"}`}>
                            <tab.icon className="w-5 h-5" />{tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left Column (2/3) */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* OVERVIEW TAB */}
                        {activeTab === "overview" && (
                            <>
                                <div className="relative overflow-hidden bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
                                    <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl" />

                                    <div className="relative">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                            <SectionHeader title="Price Chart" icon={Sparkles} color="blue" />
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-2xl">
                                                    <button onClick={() => setIsIntraday(true)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isIntraday ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-700"}`}>
                                                        <Clock className="w-4 h-4 inline mr-1" />1D
                                                    </button>
                                                    {["1w", "1m", "3m", "6m", "1y", "5y"].map(tf => (
                                                        <button key={tf} onClick={() => { setIsIntraday(false); setChartPeriod(tf); }}
                                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${!isIntraday && chartPeriod === tf ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-700"}`}>
                                                            {tf.toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-2xl">
                                                    <button onClick={() => setChartStyle("area")} className={`p-2.5 rounded-xl transition-all ${chartStyle === "area" ? "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg" : ""}`}><AreaChart className={`w-5 h-5 ${chartStyle === "area" ? "text-white" : "text-slate-400"}`} /></button>
                                                    <button onClick={() => setChartStyle("candle")} className={`p-2.5 rounded-xl transition-all ${chartStyle === "candle" ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg" : ""}`}><CandlestickChart className={`w-5 h-5 ${chartStyle === "candle" ? "text-white" : "text-slate-400"}`} /></button>
                                                    <button onClick={() => setChartStyle("line")} className={`p-2.5 rounded-xl transition-all ${chartStyle === "line" ? "bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg" : ""}`}><LineChart className={`w-5 h-5 ${chartStyle === "line" ? "text-white" : "text-slate-400"}`} /></button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative rounded-2xl overflow-hidden">
                                            {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10"><div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" /></div>}
                                            {chartData.length === 0 && !loading && <EmptyState message="No chart data available" />}
                                            <div ref={chartContainerRef} className="w-full h-[420px]" />
                                        </div>

                                        {stats && (
                                            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                                                {[{ l: "Open", v: stats.current.open, c: "slate", bg: "bg-slate-50" }, { l: "High", v: stats.current.high, c: "emerald", bg: "bg-emerald-50" }, { l: "Low", v: stats.current.low, c: "red", bg: "bg-red-50" }, { l: "Close", v: stats.current.close, c: "indigo", bg: "bg-indigo-50" }].map((i, idx) => (
                                                    <div key={idx} className={`text-center p-4 ${i.bg} rounded-2xl transition-all hover:scale-105`}>
                                                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">{i.l}</div>
                                                        <div className={`text-2xl font-black font-mono text-${i.c}-600`}>{i.v.toFixed(2)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <PremiumCard gradient>
                                    <SectionHeader title="Stock Information" icon={Building2} color="emerald" />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[{ l: "Name", v: stockData.name_en || symbol, icon: Award }, { l: "Sector", v: stockData.sector_name || "N/A", icon: PieChart }, { l: "Market", v: "Tadawul", icon: Globe }, { l: "Currency", v: "SAR", icon: Wallet }].map((i, idx) => (
                                            <div key={idx} className="relative overflow-hidden p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 hover:shadow-lg transition-all group">
                                                <div className="absolute -top-4 -right-4 p-3 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <i.icon className="w-6 h-6 text-slate-300" />
                                                </div>
                                                <p className="text-sm text-slate-500 mb-2 font-medium">{i.l}</p>
                                                <p className="font-bold text-lg text-slate-800">{i.v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </PremiumCard>
                            </>
                        )}

                        {/* OTHER TABS - Same white theme styling */}
                        {activeTab === "financials" && (
                            <PremiumCard gradient>
                                <SectionHeader title="Financial Statements" icon={FileText} color="violet" />
                                {parsedFinancials.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead><tr className="border-b-2 border-slate-100">
                                                <th className="text-left py-4 px-4 text-slate-500 font-bold text-sm">Period</th>
                                                <th className="text-right py-4 px-4 text-slate-500 font-bold text-sm">Net Income</th>
                                                <th className="text-right py-4 px-4 text-slate-500 font-bold text-sm">Total Assets</th>
                                                <th className="text-right py-4 px-4 text-slate-500 font-bold text-sm">Total Equity</th>
                                            </tr></thead>
                                            <tbody>
                                                {parsedFinancials.slice(0, 10).map((f: any, i: number) => (
                                                    <tr key={i} className="border-b border-slate-50 hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-purple-50/50 transition-all">
                                                        <td className="py-5 px-4 font-bold text-slate-800">{f.period_type} {f.fiscal_year}</td>
                                                        <td className="py-5 px-4 text-right font-mono text-emerald-600 font-bold">{formatCurrency(f.net_income)}</td>
                                                        <td className="py-5 px-4 text-right font-mono text-slate-700">{formatCurrency(f.total_assets)}</td>
                                                        <td className="py-5 px-4 text-right font-mono text-slate-700">{formatCurrency(f.total_equity)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <EmptyState message="No financial data for this stock" />}
                            </PremiumCard>
                        )}

                        {activeTab === "ownership" && (
                            <PremiumCard gradient>
                                <SectionHeader title="Major Shareholders" icon={Users} color="orange" />
                                {shareholders.length > 0 ? (
                                    <div className="space-y-4">
                                        {shareholders.slice(0, 10).map((s: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-500/30">{i + 1}</div>
                                                    <div><p className="font-bold text-slate-800 text-lg">{s.shareholder_name_en || s.shareholder_name}</p><p className="text-sm text-slate-500">{s.shareholder_type}</p></div>
                                                </div>
                                                <span className="text-3xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{Number(s.ownership_percent || 0).toFixed(2)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <EmptyState message="No ownership data" />}
                            </PremiumCard>
                        )}

                        {activeTab === "analysts" && (
                            <PremiumCard gradient>
                                <SectionHeader title="Analyst Recommendations" icon={Target} color="cyan" />
                                {analystRatings.length > 0 ? (
                                    <div className="space-y-4">
                                        {analystRatings.map((r: any, i: number) => (
                                            <div key={i} className="p-6 bg-gradient-to-r from-slate-50 to-cyan-50/30 rounded-2xl border border-slate-100 hover:shadow-lg transition-all">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="font-bold text-slate-800 text-lg">{r.analyst_firm || "Analyst"}</span>
                                                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${r.rating?.toUpperCase() === "BUY" ? "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700" : r.rating?.toUpperCase() === "SELL" ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-700" : "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700"}`}>{r.rating}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="p-4 bg-white rounded-xl"><p className="text-sm text-slate-500 mb-1">Target</p><p className="text-2xl font-black text-cyan-600">SAR {Number(r.target_price || 0).toFixed(2)}</p></div>
                                                    <div className="p-4 bg-white rounded-xl"><p className="text-sm text-slate-500 mb-1">Current</p><p className="text-2xl font-black text-slate-700">{lastPrice.toFixed(2)}</p></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <EmptyState message="No analyst ratings" />}
                            </PremiumCard>
                        )}

                        {activeTab === "earnings" && (
                            <PremiumCard gradient>
                                <SectionHeader title="Earnings History" icon={Calendar} color="violet" />
                                {earnings.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead><tr className="border-b-2 border-slate-100">
                                                <th className="text-left py-4 px-4 text-slate-500 font-bold">Quarter</th>
                                                <th className="text-right py-4 px-4 text-slate-500 font-bold">EPS</th>
                                                <th className="text-right py-4 px-4 text-slate-500 font-bold">Revenue</th>
                                            </tr></thead>
                                            <tbody>
                                                {earnings.slice(0, 8).map((e: any, i: number) => (
                                                    <tr key={i} className="border-b border-slate-50 hover:bg-pink-50/30 transition-all">
                                                        <td className="py-5 px-4 font-bold text-slate-800">{e.fiscal_quarter}</td>
                                                        <td className="py-5 px-4 text-right font-mono font-bold text-pink-600">{e.eps_actual || "-"}</td>
                                                        <td className="py-5 px-4 text-right font-mono text-slate-700">{formatNumber(e.revenue_actual)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <EmptyState message="No earnings data. Try symbol 1111 or 1182." />}
                            </PremiumCard>
                        )}

                        {activeTab === "insider" && (
                            <PremiumCard gradient>
                                <SectionHeader title="Insider Transactions" icon={Briefcase} color="red" />
                                {insiderTrades.length > 0 ? (
                                    <div className="space-y-4">
                                        {insiderTrades.slice(0, 10).map((t: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-5 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-100 hover:shadow-lg transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.transaction_type === "BUY" ? "bg-gradient-to-br from-emerald-100 to-teal-100" : "bg-gradient-to-br from-red-100 to-rose-100"}`}>
                                                        {t.transaction_type === "BUY" ? <ArrowUp className="w-6 h-6 text-emerald-600" /> : <ArrowDown className="w-6 h-6 text-red-600" />}
                                                    </div>
                                                    <div><p className="font-bold text-slate-800">{t.insider_name}</p><p className="text-sm text-slate-500">{t.transaction_date}</p></div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-lg font-bold ${t.transaction_type === "BUY" ? "text-emerald-600" : "text-red-600"}`}>{t.transaction_type}</span>
                                                    <p className="text-sm text-slate-500">{formatNumber(t.shares)} shares</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <EmptyState message="No insider data. Try symbol 1301." />}
                            </PremiumCard>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-6">
                        {/* Trading Info - Colorful Gradient */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-6 shadow-2xl shadow-indigo-500/30">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-5"><div className="p-3 rounded-2xl bg-white/20"><Wallet className="w-6 h-6 text-white" /></div><h3 className="text-xl font-bold text-white">Trading Info</h3></div>
                                <div className="space-y-4">
                                    {[{ l: "Last Price", v: `SAR ${lastPrice.toFixed(2)}` }, { l: "Change", v: `${isPositive ? "+" : ""}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`, c: isPositive ? "text-emerald-300" : "text-red-300" }, { l: "Volume", v: volume.toLocaleString() }, { l: "Market", v: "TADAWUL" }].map((i, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                                            <span className="text-white/70 font-medium">{i.l}</span><span className={`font-bold font-mono ${i.c || "text-white"}`}>{i.v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Market Breadth */}
                        {latestBreadth && (
                            <PremiumCard gradient>
                                <SectionHeader title="Market Breadth" icon={PieChart} color="emerald" />
                                <div className="space-y-3">
                                    <div className="flex justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200"><span className="text-emerald-700 font-medium">Advancing</span><span className="font-black text-emerald-700 text-xl">{latestBreadth.advancing}</span></div>
                                    <div className="flex justify-between p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl border border-red-200"><span className="text-red-700 font-medium">Declining</span><span className="font-black text-red-700 text-xl">{latestBreadth.declining}</span></div>
                                    <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200"><span className="text-slate-700 font-medium">Unchanged</span><span className="font-black text-slate-700 text-xl">{latestBreadth.unchanged}</span></div>
                                </div>
                            </PremiumCard>
                        )}

                        {/* Corporate Actions */}
                        {corporateActions.length > 0 && (
                            <PremiumCard gradient>
                                <SectionHeader title="Corporate Actions" icon={Zap} color="orange" />
                                <div className="space-y-3">
                                    {corporateActions.slice(0, 4).map((a: any, i: number) => (
                                        <div key={i} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 hover:shadow-lg transition-all">
                                            <div className="flex items-center justify-between mb-2"><span className="text-xs font-black text-amber-700 uppercase">{a.action_type}</span><span className="text-xs text-amber-600 font-medium">{a.ex_date}</span></div>
                                            <p className="text-sm text-amber-800">{a.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </PremiumCard>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
