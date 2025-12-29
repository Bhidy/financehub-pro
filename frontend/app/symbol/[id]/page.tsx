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
    TrendingUp, TrendingDown, Building2, Users, BarChart3, DollarSign,
    FileText, ArrowUpRight, ArrowDownRight, Star, Bell, Share2, Activity,
    Target, LineChart, CandlestickChart, Zap, PieChart, AlertCircle, Wallet,
    Briefcase, Calendar, ArrowUp, ArrowDown, Clock, TrendingDown as TrendDown,
    AreaChart, Sparkles
} from "lucide-react";

// Arabic to English key mapping
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

// Loading Skeleton
function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
            <div className="max-w-[1800px] mx-auto animate-pulse">
                <div className="h-28 bg-white/10 rounded-3xl mb-6" />
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/10 rounded-2xl" />)}
                </div>
                <div className="h-[500px] bg-white/10 rounded-3xl" />
            </div>
        </div>
    );
}

// Premium Stat Card
function StatCard({ label, value, icon: Icon, trend, color = "blue" }: {
    label: string; value: string; icon?: any; trend?: "up" | "down" | null; color?: string;
}) {
    const colorMap: Record<string, string> = {
        blue: "from-blue-500 to-blue-600", emerald: "from-emerald-500 to-emerald-600",
        red: "from-red-500 to-red-600", amber: "from-amber-500 to-orange-600",
        violet: "from-violet-500 to-purple-600", cyan: "from-cyan-500 to-teal-600"
    };
    return (
        <div className="relative overflow-hidden bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-300 group">
            <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br ${colorMap[color]} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} />
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-white/60 text-xs font-bold uppercase tracking-wider">{label}</span>
                    {Icon && <div className={`p-2 rounded-lg bg-gradient-to-br ${colorMap[color]} shadow-lg`}><Icon className="w-4 h-4 text-white" /></div>}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white font-mono">{value}</span>
                    {trend === "up" && <ArrowUpRight className="w-5 h-5 text-emerald-400" />}
                    {trend === "down" && <ArrowDownRight className="w-5 h-5 text-red-400" />}
                </div>
            </div>
        </div>
    );
}

// Card Components
function PremiumCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 ${className}`}>{children}</div>;
}

function SectionHeader({ title, icon: Icon, color = "blue" }: { title: string; icon: any; color?: string }) {
    const colorMap: Record<string, string> = {
        blue: "from-blue-500 to-blue-600", emerald: "from-emerald-500 to-teal-600",
        violet: "from-violet-500 to-purple-600", orange: "from-orange-500 to-amber-600",
        cyan: "from-cyan-500 to-blue-600", red: "from-red-500 to-rose-600",
    };
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} shadow-lg shadow-blue-500/30`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return <div className="flex flex-col items-center justify-center py-12 text-white/40">
        <AlertCircle className="w-12 h-12 mb-3 opacity-50" /><p className="text-sm">{message}</p>
    </div>;
}

// Main Page
export default function SymbolDetailPage() {
    const params = useParams();
    const symbol = params.id as string;
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    const [activeTab, setActiveTab] = useState<"overview" | "financials" | "ownership" | "analysts" | "earnings" | "insider">("overview");
    const [chartPeriod, setChartPeriod] = useState("1y");
    const [chartStyle, setChartStyle] = useState<"candle" | "line" | "area">("area");
    const [isIntraday, setIsIntraday] = useState(false);

    // Data Fetching
    const { data: tickers = [], isLoading: tickersLoading } = useQuery({
        queryKey: ["tickers"], queryFn: fetchTickers, staleTime: 30000,
    });
    const stockData = useMemo(() => tickers.find((t: Ticker) => t.symbol === symbol), [tickers, symbol]);

    const { data: ohlcData = [], isLoading: chartLoading } = useQuery({
        queryKey: ["ohlc", symbol, chartPeriod], queryFn: () => fetchOHLC(symbol, chartPeriod), enabled: !!symbol && !isIntraday,
    });

    const { data: intradayData = [], isLoading: intradayLoading } = useQuery({
        queryKey: ["intraday", symbol], queryFn: () => fetchIntraday(symbol, "1h", 100), enabled: !!symbol && isIntraday,
    });

    const { data: financials = [] } = useQuery({ queryKey: ["financials", symbol], queryFn: () => fetchFinancials(symbol), enabled: !!symbol });
    const { data: shareholders = [] } = useQuery({ queryKey: ["shareholders", symbol], queryFn: () => fetchShareholders(symbol), enabled: !!symbol });
    const { data: allAnalystRatings = [] } = useQuery({ queryKey: ["analyst-ratings"], queryFn: () => fetchAnalystRatings(), enabled: !!symbol });
    const { data: corporateActions = [] } = useQuery({ queryKey: ["corporate-actions", symbol], queryFn: () => fetchCorporateActions(symbol), enabled: !!symbol });
    const { data: allInsiderTrading = [] } = useQuery({ queryKey: ["insider-trading"], queryFn: () => fetchInsiderTrading(), enabled: !!symbol });
    const { data: allEarnings = [] } = useQuery({ queryKey: ["earnings"], queryFn: () => fetchEarnings(), enabled: !!symbol });
    const { data: allFairValues = [] } = useQuery({ queryKey: ["fair-values"], queryFn: () => fetchFairValues(), enabled: !!symbol });
    const { data: marketBreadth = [] } = useQuery({ queryKey: ["market-breadth"], queryFn: () => fetchMarketBreadth(), enabled: !!symbol });

    // Filter data for this symbol
    const analystRatings = useMemo(() => allAnalystRatings.filter((r: any) => r.symbol === symbol), [allAnalystRatings, symbol]);
    const insiderTrades = useMemo(() => allInsiderTrading.filter((t: any) => t.symbol === symbol), [allInsiderTrading, symbol]);
    const earnings = useMemo(() => allEarnings.filter((e: any) => e.symbol === symbol), [allEarnings, symbol]);
    const fairValue = useMemo(() => allFairValues.find((f: any) => f.symbol === symbol), [allFairValues, symbol]);
    const latestBreadth = marketBreadth[0];

    // Parse financials
    const parsedFinancials = useMemo(() => financials.map((f: any) => {
        const rp = parseFinancialsRawData(f.raw_data);
        return { ...f, net_income: f.net_income || rp.net_income, total_assets: f.total_assets || rp.total_assets, total_equity: f.total_equity || rp.total_equity };
    }), [financials]);

    // Chart data
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

    // Stats from OHLC
    const stats = useMemo(() => {
        if (chartData.length < 2) return null;
        const current = chartData[chartData.length - 1];
        const first = chartData[0];
        const all = chartData;
        const high52 = Math.max(...all.map((d: any) => d.high));
        const low52 = Math.min(...all.map((d: any) => d.low));
        const periodReturn = ((current.close - first.close) / first.close) * 100;
        return { high52, low52, periodReturn, current };
    }, [chartData]);

    // Chart Effect - ULTRA PREMIUM
    useEffect(() => {
        if (!chartContainerRef.current || chartData.length === 0) return;
        if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: 'rgba(255,255,255,0.6)',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            },
            width: chartContainerRef.current.clientWidth,
            height: 450,
            grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(255,255,255,0.1)',
                rightOffset: 5
            },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: 'rgba(59, 130, 246, 0.5)', width: 1, style: 2, labelBackgroundColor: '#3b82f6' },
                horzLine: { color: 'rgba(59, 130, 246, 0.5)', width: 1, style: 2, labelBackgroundColor: '#3b82f6' }
            }
        });
        chartRef.current = chart;

        try {
            if (chartStyle === "candle") {
                const series = chart.addSeries(CandlestickSeries, {
                    upColor: '#10b981', downColor: '#ef4444',
                    borderUpColor: '#10b981', borderDownColor: '#ef4444',
                    wickUpColor: '#10b981', wickDownColor: '#ef4444'
                });
                series.setData(chartData);
            } else if (chartStyle === "line") {
                const series = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 3 });
                series.setData(chartData.map((d: any) => ({ time: d.time, value: d.close })));
            } else {
                const series = chart.addSeries(AreaSeries, {
                    topColor: 'rgba(59, 130, 246, 0.56)',
                    bottomColor: 'rgba(59, 130, 246, 0.04)',
                    lineColor: 'rgba(59, 130, 246, 1)',
                    lineWidth: 2,
                });
                series.setData(chartData.map((d: any) => ({ time: d.time, value: d.close })));
            }

            // Volume
            const volumeSeries = chart.addSeries(HistogramSeries, { color: 'rgba(255,255,255,0.1)', priceFormat: { type: 'volume' }, priceScaleId: '' });
            volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
            volumeSeries.setData(chartData.map((d: any) => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' })));
            chart.timeScale().fitContent();
        } catch (err) { console.error("Chart error:", err); }

        const handleResize = () => { if (chartContainerRef.current && chartRef.current) chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth }); };
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; } };
    }, [chartData, chartStyle]);

    if (tickersLoading) return <LoadingSkeleton />;
    if (!stockData) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
            <div className="text-center bg-white/5 p-10 rounded-3xl border border-white/10">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                <h2 className="text-2xl font-bold text-white mb-2">Stock Not Found</h2>
                <p className="text-white/60">Symbol: <span className="font-mono font-bold text-blue-400">{symbol}</span></p>
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 pb-12">
            {/* PREMIUM HEADER */}
            <div className="bg-gradient-to-r from-slate-900/95 via-blue-950/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
                <div className="max-w-[1800px] mx-auto px-6 py-5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-2xl ${isPositive ? "bg-gradient-to-br from-emerald-400 to-teal-600" : "bg-gradient-to-br from-red-400 to-rose-600"}`}>
                                {symbol.slice(0, 2)}
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-3xl font-black text-white">{symbol}</h1>
                                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">{stockData.sector_name || "EQUITY"}</span>
                                </div>
                                <p className="text-white/60 font-medium text-lg">{stockData.name_en || stockData.name_ar || symbol}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-white font-mono">{lastPrice.toFixed(2)}</span>
                                    <span className="text-white/40 text-sm font-bold">SAR</span>
                                </div>
                                <div className={`flex items-center justify-end gap-2 mt-1 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                                    {isPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                    <span className={`px-3 py-1 rounded-lg font-bold text-sm ${isPositive ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                                        {isPositive ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                                <span className="text-xs font-bold text-emerald-300 uppercase">Live</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-5">
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30"><Star className="w-4 h-4" /> Watchlist</button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-xl font-bold border border-white/10"><Bell className="w-4 h-4" /> Alert</button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-xl font-bold border border-white/10"><Share2 className="w-4 h-4" /> Share</button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="max-w-[1800px] mx-auto px-6 py-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    <StatCard label="Volume" value={formatNumber(volume)} icon={BarChart3} color="blue" />
                    <StatCard label="52W High" value={stats?.high52?.toFixed(2) || "-"} icon={TrendingUp} trend="up" color="emerald" />
                    <StatCard label="52W Low" value={stats?.low52?.toFixed(2) || "-"} icon={TrendDown} trend="down" color="red" />
                    <StatCard label="Period Return" value={stats?.periodReturn ? `${stats.periodReturn >= 0 ? "+" : ""}${stats.periodReturn.toFixed(2)}%` : "-"} trend={stats?.periodReturn && stats.periodReturn >= 0 ? "up" : "down"} color="amber" />
                    <StatCard label="Open" value={stats?.current?.open?.toFixed(2) || "-"} color="cyan" />
                    <StatCard label="Close" value={stats?.current?.close?.toFixed(2) || "-"} color="violet" />
                </div>

                {/* Tab Navigation - 6 TABS */}
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl rounded-2xl p-2 border border-white/10 mb-6 overflow-x-auto">
                    {[
                        { id: "overview", label: "Overview", icon: Activity },
                        { id: "financials", label: "Financials", icon: FileText },
                        { id: "ownership", label: "Ownership", icon: Users },
                        { id: "analysts", label: "Analysts", icon: Target },
                        { id: "earnings", label: "Earnings", icon: Calendar },
                        { id: "insider", label: "Insider", icon: Briefcase },
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
                            <tab.icon className="w-4 h-4" />{tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column (2/3) */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* OVERVIEW TAB - ULTRA PREMIUM CHART */}
                        {activeTab === "overview" && (
                            <>
                                <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/50 via-blue-900/30 to-slate-800/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
                                    {/* Decorative Elements */}
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                                    <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />

                                    <div className="relative">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/30">
                                                    <Sparkles className="w-5 h-5 text-white" />
                                                </div>
                                                <h2 className="text-lg font-bold text-white">Price Chart</h2>
                                                <span className="text-xs text-white/40 font-mono">{chartData.length} data points</span>
                                            </div>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {/* Intraday / Daily Toggle */}
                                                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                                                    <button onClick={() => setIsIntraday(true)} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isIntraday ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : "text-white/50 hover:text-white"}`}>
                                                        <Clock className="w-4 h-4 inline mr-1" />1D
                                                    </button>
                                                    {["1m", "3m", "6m", "1y", "5y"].map(tf => (
                                                        <button key={tf} onClick={() => { setIsIntraday(false); setChartPeriod(tf); }}
                                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${!isIntraday && chartPeriod === tf ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" : "text-white/50 hover:text-white"}`}>
                                                            {tf.toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                                {/* Chart Style */}
                                                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                                                    <button onClick={() => setChartStyle("area")} className={`p-2 rounded-lg transition-all ${chartStyle === "area" ? "bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg" : ""}`}><AreaChart className={`w-5 h-5 ${chartStyle === "area" ? "text-white" : "text-white/40"}`} /></button>
                                                    <button onClick={() => setChartStyle("candle")} className={`p-2 rounded-lg transition-all ${chartStyle === "candle" ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg" : ""}`}><CandlestickChart className={`w-5 h-5 ${chartStyle === "candle" ? "text-white" : "text-white/40"}`} /></button>
                                                    <button onClick={() => setChartStyle("line")} className={`p-2 rounded-lg transition-all ${chartStyle === "line" ? "bg-gradient-to-r from-violet-500 to-purple-500 shadow-lg" : ""}`}><LineChart className={`w-5 h-5 ${chartStyle === "line" ? "text-white" : "text-white/40"}`} /></button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Chart Container */}
                                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-transparent to-slate-900/50">
                                            {loading && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10"><div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" /></div>}
                                            {chartData.length === 0 && !loading && <EmptyState message="No chart data available" />}
                                            <div ref={chartContainerRef} className="w-full h-[450px]" />
                                        </div>

                                        {/* OHLC Display */}
                                        {stats && (
                                            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/10">
                                                {[{ l: "Open", v: stats.current.open, c: "white" }, { l: "High", v: stats.current.high, c: "emerald" }, { l: "Low", v: stats.current.low, c: "red" }, { l: "Close", v: stats.current.close, c: "blue" }].map((i, idx) => (
                                                    <div key={idx} className="text-center p-3 bg-white/5 rounded-xl">
                                                        <div className="text-xs text-white/40 uppercase font-bold mb-1">{i.l}</div>
                                                        <div className={`text-xl font-black font-mono ${i.c === "emerald" ? "text-emerald-400" : i.c === "red" ? "text-red-400" : i.c === "blue" ? "text-blue-400" : "text-white"}`}>{i.v.toFixed(2)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Stock Info */}
                                <PremiumCard>
                                    <SectionHeader title="Stock Information" icon={Building2} color="emerald" />
                                    <div className="grid grid-cols-2 gap-4">
                                        {[{ l: "Name", v: stockData.name_en || symbol }, { l: "Sector", v: stockData.sector_name || "N/A" }, { l: "Market", v: "Tadawul" }, { l: "Currency", v: "SAR" }].map((i, idx) => (
                                            <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-sm text-white/50 mb-1">{i.l}</p><p className="font-bold text-white">{i.v}</p></div>
                                        ))}
                                    </div>
                                </PremiumCard>
                            </>
                        )}

                        {/* FINANCIALS TAB */}
                        {activeTab === "financials" && (
                            <PremiumCard>
                                <SectionHeader title="Financial Statements" icon={FileText} color="violet" />
                                {parsedFinancials.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead><tr className="border-b border-white/10">
                                                <th className="text-left py-3 px-4 text-white/50 font-bold text-sm">Period</th>
                                                <th className="text-right py-3 px-4 text-white/50 font-bold text-sm">Net Income</th>
                                                <th className="text-right py-3 px-4 text-white/50 font-bold text-sm">Total Assets</th>
                                                <th className="text-right py-3 px-4 text-white/50 font-bold text-sm">Total Equity</th>
                                            </tr></thead>
                                            <tbody>
                                                {parsedFinancials.slice(0, 10).map((f: any, i: number) => (
                                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="py-4 px-4 font-bold text-white">{f.period_type} {f.fiscal_year}</td>
                                                        <td className="py-4 px-4 text-right font-mono text-emerald-400 font-bold">{formatCurrency(f.net_income)}</td>
                                                        <td className="py-4 px-4 text-right font-mono text-white/70">{formatCurrency(f.total_assets)}</td>
                                                        <td className="py-4 px-4 text-right font-mono text-white/70">{formatCurrency(f.total_equity)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <EmptyState message="No financial data for this stock" />}
                            </PremiumCard>
                        )}

                        {/* OWNERSHIP TAB */}
                        {activeTab === "ownership" && (
                            <PremiumCard>
                                <SectionHeader title="Major Shareholders" icon={Users} color="orange" />
                                {shareholders.length > 0 ? (
                                    <div className="space-y-3">
                                        {shareholders.slice(0, 10).map((s: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">{i + 1}</div>
                                                    <div><p className="font-bold text-white">{s.shareholder_name_en || s.shareholder_name}</p><p className="text-sm text-white/50">{s.shareholder_type}</p></div>
                                                </div>
                                                <span className="text-2xl font-black text-blue-400">{Number(s.ownership_percent || 0).toFixed(2)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <EmptyState message="No ownership data for this stock" />}
                            </PremiumCard>
                        )}

                        {/* ANALYSTS TAB */}
                        {activeTab === "analysts" && (
                            <PremiumCard>
                                <SectionHeader title="Analyst Recommendations" icon={Target} color="cyan" />
                                {analystRatings.length > 0 ? (
                                    <div className="space-y-4">
                                        {analystRatings.map((r: any, i: number) => (
                                            <div key={i} className="p-5 bg-white/5 rounded-xl border border-white/5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-bold text-white">{r.analyst_firm || "Analyst"}</span>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${r.rating?.toUpperCase() === "BUY" ? "bg-emerald-500/20 text-emerald-300" : r.rating?.toUpperCase() === "SELL" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>{r.rating}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><p className="text-sm text-white/50">Target</p><p className="text-xl font-bold text-blue-400">SAR {Number(r.target_price || 0).toFixed(2)}</p></div>
                                                    <div><p className="text-sm text-white/50">Current</p><p className="text-xl font-bold text-white">{lastPrice.toFixed(2)}</p></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <EmptyState message="No analyst ratings for this stock" />}
                            </PremiumCard>
                        )}

                        {/* EARNINGS TAB */}
                        {activeTab === "earnings" && (
                            <PremiumCard>
                                <SectionHeader title="Earnings History" icon={Calendar} color="violet" />
                                {earnings.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead><tr className="border-b border-white/10">
                                                <th className="text-left py-3 px-4 text-white/50 font-bold text-sm">Quarter</th>
                                                <th className="text-right py-3 px-4 text-white/50 font-bold text-sm">EPS</th>
                                                <th className="text-right py-3 px-4 text-white/50 font-bold text-sm">Revenue</th>
                                            </tr></thead>
                                            <tbody>
                                                {earnings.slice(0, 8).map((e: any, i: number) => (
                                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="py-4 px-4 font-bold text-white">{e.fiscal_quarter}</td>
                                                        <td className="py-4 px-4 text-right font-mono font-bold text-violet-400">{e.eps_actual || "-"}</td>
                                                        <td className="py-4 px-4 text-right font-mono text-white/70">{formatNumber(e.revenue_actual)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <EmptyState message="No earnings data for this stock. Try symbol 1111 or 1182." />}
                            </PremiumCard>
                        )}

                        {/* INSIDER TAB */}
                        {activeTab === "insider" && (
                            <PremiumCard>
                                <SectionHeader title="Insider Transactions" icon={Briefcase} color="red" />
                                {insiderTrades.length > 0 ? (
                                    <div className="space-y-3">
                                        {insiderTrades.slice(0, 10).map((t: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.transaction_type === "BUY" ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                                                        {t.transaction_type === "BUY" ? <ArrowUp className="w-5 h-5 text-emerald-400" /> : <ArrowDown className="w-5 h-5 text-red-400" />}
                                                    </div>
                                                    <div><p className="font-bold text-white">{t.insider_name}</p><p className="text-sm text-white/50">{t.transaction_date}</p></div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-lg font-bold ${t.transaction_type === "BUY" ? "text-emerald-400" : "text-red-400"}`}>{t.transaction_type}</span>
                                                    <p className="text-sm text-white/50">{formatNumber(t.shares)} shares</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <EmptyState message="No insider transactions for this stock. Try symbol 1301." />}
                            </PremiumCard>
                        )}
                    </div>

                    {/* Right Sidebar (1/3) */}
                    <div className="space-y-6">
                        {/* Trading Info */}
                        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 shadow-2xl shadow-blue-500/20 border border-blue-500/30">
                            <div className="flex items-center gap-3 mb-5"><div className="p-2.5 rounded-xl bg-white/20"><Wallet className="w-5 h-5 text-white" /></div><h3 className="text-lg font-bold text-white">Trading Info</h3></div>
                            <div className="space-y-4">
                                {[{ l: "Last Price", v: `SAR ${lastPrice.toFixed(2)}` }, { l: "Change", v: `${isPositive ? "+" : ""}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`, c: isPositive ? "text-emerald-300" : "text-red-300" }, { l: "Volume", v: volume.toLocaleString() }, { l: "Market", v: "TADAWUL" }].map((i, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                                        <span className="text-white/70">{i.l}</span><span className={`font-bold font-mono ${i.c || "text-white"}`}>{i.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fair Value */}
                        {fairValue && (
                            <PremiumCard>
                                <SectionHeader title="Fair Value" icon={Target} color="cyan" />
                                <div className="text-center py-4">
                                    <p className="text-4xl font-black text-blue-400">SAR {Number(fairValue.target_price || fairValue.fair_value || 0).toFixed(2)}</p>
                                    <p className="text-sm text-white/50 mt-2">Analyst Consensus</p>
                                </div>
                            </PremiumCard>
                        )}

                        {/* Market Breadth */}
                        {latestBreadth && (
                            <PremiumCard>
                                <SectionHeader title="Market Breadth" icon={PieChart} color="emerald" />
                                <div className="space-y-3">
                                    <div className="flex justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><span className="text-emerald-300">Advancing</span><span className="font-bold text-emerald-300">{latestBreadth.advancing}</span></div>
                                    <div className="flex justify-between p-3 bg-red-500/10 rounded-xl border border-red-500/20"><span className="text-red-300">Declining</span><span className="font-bold text-red-300">{latestBreadth.declining}</span></div>
                                    <div className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/10"><span className="text-white/70">Unchanged</span><span className="font-bold text-white">{latestBreadth.unchanged}</span></div>
                                </div>
                            </PremiumCard>
                        )}

                        {/* Corporate Actions */}
                        {corporateActions.length > 0 && (
                            <PremiumCard>
                                <SectionHeader title="Corporate Actions" icon={Zap} color="orange" />
                                <div className="space-y-3">
                                    {corporateActions.slice(0, 4).map((a: any, i: number) => (
                                        <div key={i} className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                            <div className="flex items-center justify-between mb-1"><span className="text-xs font-black text-amber-300 uppercase">{a.action_type}</span><span className="text-xs text-amber-400">{a.ex_date}</span></div>
                                            <p className="text-sm text-amber-200/80">{a.description}</p>
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
