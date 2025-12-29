"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { fetchTickers, fetchOHLC, fetchFinancials, fetchShareholders, fetchCorporateActions, fetchAnalystRatings, fetchNews, Ticker } from "@/lib/api";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, LineSeries, HistogramSeries, Time } from "lightweight-charts";
import {
    TrendingUp,
    TrendingDown,
    Building2,
    Globe,
    Users,
    BarChart3,
    DollarSign,
    Percent,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    ExternalLink,
    Star,
    Bell,
    Share2,
    Activity,
    Target,
    Newspaper,
    LineChart,
    CandlestickChart,
    AreaChart,
    Zap,
    PieChart,
    TrendingDown as TrendDown,
    ChevronRight,
    Clock,
    RefreshCw,
    AlertCircle
} from "lucide-react";

// API Base for company profile endpoints
const API_BASE = "https://bhidy-financehub-api.hf.space/api/v1";

// Types
interface CompanyProfile {
    business_summary?: string;
    website?: string;
    industry?: string;
    sector?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    employees?: number;
    ceo?: string;
}

// Fetch company profile
async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    try {
        const res = await fetch(`${API_BASE}/api/company/${symbol}/profile`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

// Fetch dividends
async function fetchDividends(symbol: string) {
    try {
        const res = await fetch(`${API_BASE}/api/company/${symbol}/dividends`);
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

// Utility functions
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

// Premium Loading Skeleton
function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white p-6">
            <div className="max-w-[1800px] mx-auto animate-pulse">
                {/* Header Skeleton */}
                <div className="h-32 bg-gradient-to-r from-slate-200 to-slate-100 rounded-3xl mb-6" />

                {/* Stats Row */}
                <div className="grid grid-cols-8 gap-3 mb-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-24 bg-gradient-to-br from-white to-slate-100 rounded-2xl shadow-lg" />
                    ))}
                </div>

                {/* Chart Skeleton */}
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 h-[500px] bg-white rounded-3xl shadow-xl" />
                    <div className="space-y-4">
                        <div className="h-60 bg-white rounded-2xl shadow-lg" />
                        <div className="h-60 bg-white rounded-2xl shadow-lg" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Premium Stat Card Component
function StatCard({ label, value, icon: Icon, trend, gradient }: {
    label: string;
    value: string;
    icon?: any;
    trend?: "up" | "down" | null;
    gradient?: string;
}) {
    const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "";

    return (
        <div className={`relative overflow-hidden bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/50 
            hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-slate-100
            ${gradient || ""}`}>
            {/* Background Decoration */}
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br from-blue-100/50 to-transparent blur-xl" />

            <div className="relative">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</span>
                    {Icon && <Icon className="w-4 h-4 text-blue-400" />}
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xl font-black text-slate-800 font-mono ${trendColor}`}>{value}</span>
                    {trend === "up" && <ArrowUpRight className="w-4 h-4 text-emerald-500" />}
                    {trend === "down" && <ArrowDownRight className="w-4 h-4 text-red-500" />}
                </div>
            </div>
        </div>
    );
}

// Premium Section Header
function SectionHeader({ title, icon: Icon, action, gradient }: {
    title: string;
    icon: any;
    action?: React.ReactNode;
    gradient?: string;
}) {
    return (
        <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${gradient || "bg-gradient-to-br from-blue-500 to-blue-600"} shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            </div>
            {action}
        </div>
    );
}

// Premium Card Wrapper
function PremiumCard({ children, className = "", gradient }: {
    children: React.ReactNode;
    className?: string;
    gradient?: boolean;
}) {
    return (
        <div className={`
            relative overflow-hidden bg-white rounded-3xl p-6 
            shadow-xl shadow-slate-200/50 border border-slate-100/50
            hover:shadow-2xl transition-all duration-300
            ${gradient ? "bg-gradient-to-br from-white via-blue-50/10 to-white" : ""}
            ${className}
        `}>
            {children}
        </div>
    );
}

// Empty State Component
function EmptyState({ message, icon: Icon }: { message: string; icon: any }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Icon className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}

// Main Page Component
export default function SymbolDetailPage() {
    const params = useParams();
    const symbol = params.id as string;
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    const [activeTab, setActiveTab] = useState<"overview" | "financials" | "ownership" | "analysts" | "dividends">("overview");
    const [chartPeriod, setChartPeriod] = useState("1y");
    const [chartStyle, setChartStyle] = useState<"candle" | "line">("candle");

    // Fetch tickers
    const { data: tickers = [], isLoading: tickersLoading } = useQuery({
        queryKey: ["tickers"],
        queryFn: fetchTickers,
        staleTime: 30000,
    });

    // Find current stock
    const stockData = useMemo(() =>
        tickers.find((t: Ticker) => t.symbol === symbol),
        [tickers, symbol]
    );

    // Fetch OHLC data for chart
    const { data: ohlcData = [], isLoading: chartLoading } = useQuery({
        queryKey: ["ohlc", symbol, chartPeriod],
        queryFn: () => fetchOHLC(symbol, chartPeriod),
        enabled: !!symbol,
    });

    // Fetch company profile
    const { data: profile } = useQuery({
        queryKey: ["profile", symbol],
        queryFn: () => fetchCompanyProfile(symbol),
        enabled: !!symbol,
    });

    // Fetch financials
    const { data: financials = [] } = useQuery({
        queryKey: ["financials", symbol],
        queryFn: () => fetchFinancials(symbol),
        enabled: !!symbol,
    });

    // Fetch shareholders
    const { data: shareholders = [] } = useQuery({
        queryKey: ["shareholders", symbol],
        queryFn: () => fetchShareholders(symbol),
        enabled: !!symbol,
    });

    // Fetch analyst ratings
    const { data: analystRatings = [] } = useQuery({
        queryKey: ["analyst-ratings", symbol],
        queryFn: () => fetchAnalystRatings(),
        enabled: !!symbol,
    });

    // Fetch dividends
    const { data: dividends = [] } = useQuery({
        queryKey: ["dividends", symbol],
        queryFn: () => fetchDividends(symbol),
        enabled: !!symbol,
    });

    // Fetch corporate actions
    const { data: corporateActions = [] } = useQuery({
        queryKey: ["corporate-actions", symbol],
        queryFn: () => fetchCorporateActions(symbol),
        enabled: !!symbol,
    });

    // Fetch news
    const { data: news = [] } = useQuery({
        queryKey: ["news", symbol],
        queryFn: () => fetchNews(symbol),
        enabled: !!symbol,
    });

    // Process OHLC data for chart
    const chartData = useMemo(() => {
        if (!ohlcData || ohlcData.length === 0) return [];
        return [...ohlcData]
            .sort((a: any, b: any) => new Date(a.date || a.time).getTime() - new Date(b.date || b.time).getTime())
            .map((item: any) => ({
                time: new Date(item.date || item.time).toISOString().split('T')[0] as Time,
                open: Number(item.open),
                high: Number(item.high),
                low: Number(item.low),
                close: Number(item.close),
                volume: Number(item.volume)
            }));
    }, [ohlcData]);

    // Chart initialization
    useEffect(() => {
        if (!chartContainerRef.current || chartData.length === 0) return;

        // Clear previous chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#64748b',
                fontFamily: "'Inter', sans-serif",
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: '#f1f5f9' },
                horzLines: { color: '#f1f5f9' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: '#e2e8f0'
            },
            rightPriceScale: {
                borderColor: '#e2e8f0'
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: '#3b82f6', width: 1, style: 2 },
                horzLine: { color: '#3b82f6', width: 1, style: 2 }
            }
        });

        chartRef.current = chart;

        try {
            if (chartStyle === "candle") {
                const series = chart.addSeries(CandlestickSeries, {
                    upColor: '#10b981',
                    downColor: '#ef4444',
                    borderUpColor: '#10b981',
                    borderDownColor: '#ef4444',
                    wickUpColor: '#10b981',
                    wickDownColor: '#ef4444',
                });
                series.setData(chartData);
            } else {
                const series = chart.addSeries(LineSeries, {
                    color: '#3b82f6',
                    lineWidth: 2,
                });
                series.setData(chartData.map((d: any) => ({ time: d.time, value: d.close })));
            }

            // Add volume
            const volumeSeries = chart.addSeries(HistogramSeries, {
                color: '#94a3b8',
                priceFormat: { type: 'volume' },
                priceScaleId: '',
            });
            volumeSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.85, bottom: 0 },
            });
            volumeSeries.setData(chartData.map((d: any) => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
            })));

            chart.timeScale().fitContent();
        } catch (err) {
            console.error("Chart error:", err);
        }

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [chartData, chartStyle]);

    // Calculate stats
    const stats = useMemo(() => {
        if (chartData.length < 2) return null;
        const current = chartData[chartData.length - 1];
        const first = chartData[0];
        const all = chartData.slice(-252);
        const high52 = Math.max(...all.map((d: any) => d.high));
        const low52 = Math.min(...all.map((d: any) => d.low));
        const avgVolume = chartData.slice(-30).reduce((sum: number, d: any) => sum + d.volume, 0) / 30;
        const periodReturn = ((current.close - first.close) / first.close) * 100;

        return { high52, low52, avgVolume, periodReturn, current };
    }, [chartData]);

    // Filter analyst ratings for this symbol
    const symbolAnalystRatings = useMemo(() =>
        analystRatings.filter((r: any) => r.symbol === symbol),
        [analystRatings, symbol]
    );

    // Filter news for this symbol
    const symbolNews = useMemo(() =>
        news.filter((n: any) => n.symbol === symbol).slice(0, 5),
        [news, symbol]
    );

    if (tickersLoading) return <LoadingSkeleton />;
    if (!stockData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h2 className="text-2xl font-bold text-slate-600 mb-2">Stock Not Found</h2>
                    <p className="text-slate-400">Symbol: {symbol}</p>
                </div>
            </div>
        );
    }

    const isPositive = Number(stockData.change || 0) >= 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white pb-12">
            {/* ========== PREMIUM HEADER ========== */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-40 shadow-lg shadow-slate-200/20">
                <div className="max-w-[1800px] mx-auto px-6 py-5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Stock Identity */}
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-2xl ${isPositive
                                    ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600"
                                    : "bg-gradient-to-br from-red-400 via-red-500 to-rose-600"
                                }`}>
                                {symbol.slice(0, 2)}
                            </div>
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{symbol}</h1>
                                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border border-blue-200/50 shadow-sm">
                                        {stockData.sector_name || "EQUITY"}
                                    </span>
                                </div>
                                <p className="text-slate-500 font-medium text-lg">{stockData.name_en || stockData.name_ar || "Loading..."}</p>
                            </div>
                        </div>

                        {/* Price Display */}
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-slate-900 font-mono tracking-tight">
                                        {Number(stockData.last_price || 0).toFixed(2)}
                                    </span>
                                    <span className="text-slate-400 text-sm font-bold">SAR</span>
                                </div>
                                <div className={`flex items-center justify-end gap-2 mt-1 ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                                    {isPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                    <span className={`px-3 py-1 rounded-lg font-bold text-sm ${isPositive ? "bg-emerald-50" : "bg-red-50"}`}>
                                        {isPositive ? "+" : ""}{Number(stockData.change || 0).toFixed(2)} ({Number(stockData.change_percent || 0).toFixed(2)}%)
                                    </span>
                                </div>
                            </div>

                            {/* Live Badge */}
                            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 shadow-lg shadow-emerald-100/50">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Live</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-5">
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5">
                            <Star className="w-4 h-4" /> Add to Watchlist
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold border border-slate-200 shadow-md hover:shadow-lg">
                            <Bell className="w-4 h-4" /> Set Alert
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold border border-slate-200 shadow-md hover:shadow-lg">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                    </div>
                </div>
            </div>

            {/* ========== MAIN CONTENT ========== */}
            <div className="max-w-[1800px] mx-auto px-6 py-6">
                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                    <StatCard label="Open" value={Number(stockData.open_price || stats?.current?.open || 0).toFixed(2)} />
                    <StatCard label="High" value={Number(stockData.high || stats?.current?.high || 0).toFixed(2)} trend="up" />
                    <StatCard label="Low" value={Number(stockData.low || stats?.current?.low || 0).toFixed(2)} trend="down" />
                    <StatCard label="Volume" value={formatNumber(stockData.volume)} icon={BarChart3} />
                    <StatCard label="52W High" value={stats?.high52?.toFixed(2) || "-"} icon={TrendingUp} />
                    <StatCard label="52W Low" value={stats?.low52?.toFixed(2) || "-"} icon={TrendDown} />
                    <StatCard label="Market Cap" value={formatCurrency(stockData.market_cap)} icon={Building2} />
                    <StatCard label="Period Return" value={stats?.periodReturn ? `${stats.periodReturn >= 0 ? "+" : ""}${stats.periodReturn.toFixed(2)}%` : "-"} trend={stats?.periodReturn && stats.periodReturn >= 0 ? "up" : "down"} />
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg shadow-slate-200/50 border border-slate-100/50 mb-6 overflow-x-auto">
                    {[
                        { id: "overview", label: "Overview", icon: Activity },
                        { id: "financials", label: "Financials", icon: FileText },
                        { id: "ownership", label: "Ownership", icon: Users },
                        { id: "analysts", label: "Analysts", icon: Target },
                        { id: "dividends", label: "Dividends", icon: DollarSign },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column (2/3) */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Interactive Chart Card */}
                        <PremiumCard gradient>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <SectionHeader title="Price Chart" icon={LineChart} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />

                                <div className="flex items-center gap-3">
                                    {/* Timeframe Selector */}
                                    <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-xl">
                                        {["1m", "3m", "6m", "1y", "5y", "max"].map(tf => (
                                            <button
                                                key={tf}
                                                onClick={() => setChartPeriod(tf)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${chartPeriod === tf
                                                        ? "bg-white text-blue-600 shadow-md"
                                                        : "text-slate-500 hover:text-slate-700"
                                                    }`}
                                            >
                                                {tf.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Chart Style */}
                                    <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-xl">
                                        <button
                                            onClick={() => setChartStyle("candle")}
                                            className={`p-2 rounded-lg transition-all ${chartStyle === "candle" ? "bg-white shadow-md text-emerald-600" : "text-slate-400"}`}
                                        >
                                            <CandlestickChart className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setChartStyle("line")}
                                            className={`p-2 rounded-lg transition-all ${chartStyle === "line" ? "bg-white shadow-md text-blue-600" : "text-slate-400"}`}
                                        >
                                            <LineChart className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Chart Container */}
                            <div className="relative bg-gradient-to-b from-white to-slate-50/50 rounded-2xl overflow-hidden">
                                {chartLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-10">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                                            <span className="text-slate-500 font-medium">Loading Chart...</span>
                                        </div>
                                    </div>
                                )}
                                {chartData.length === 0 && !chartLoading && (
                                    <EmptyState message="No chart data available" icon={BarChart3} />
                                )}
                                <div ref={chartContainerRef} className="w-full h-[400px]" />
                            </div>

                            {/* Chart Stats Footer */}
                            {stats && (
                                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                                    <div className="text-center">
                                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Open</div>
                                        <div className="text-lg font-black text-slate-700 font-mono">{stats.current.open.toFixed(2)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">High</div>
                                        <div className="text-lg font-black text-emerald-600 font-mono">{stats.current.high.toFixed(2)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Low</div>
                                        <div className="text-lg font-black text-red-600 font-mono">{stats.current.low.toFixed(2)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Close</div>
                                        <div className="text-lg font-black text-blue-600 font-mono">{stats.current.close.toFixed(2)}</div>
                                    </div>
                                </div>
                            )}
                        </PremiumCard>

                        {/* Tab Content */}
                        {activeTab === "overview" && (
                            <PremiumCard>
                                <SectionHeader title="About Company" icon={Building2} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
                                <p className="text-slate-600 leading-relaxed mb-4 text-lg">
                                    {profile?.business_summary ||
                                        `${stockData.name_en || symbol} is a publicly traded company on the Saudi Stock Exchange (Tadawul) in the ${stockData.sector_name || "market"} sector.`}
                                </p>
                                {profile?.website && (
                                    <a
                                        href={profile.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                                    >
                                        <Globe className="w-4 h-4" /> Visit Website <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </PremiumCard>
                        )}

                        {activeTab === "financials" && (
                            <PremiumCard>
                                <SectionHeader title="Financial Statements" icon={FileText} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
                                {financials.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b-2 border-slate-200">
                                                    <th className="text-left py-3 px-4 text-slate-500 font-bold text-sm">Period</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-bold text-sm">Revenue</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-bold text-sm">Net Income</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-bold text-sm">Assets</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {financials.slice(0, 10).map((f: any, i: number) => (
                                                    <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                                                        <td className="py-4 px-4 font-bold text-slate-800">{f.end_date} ({f.period_type || "Annual"})</td>
                                                        <td className="py-4 px-4 text-right font-mono text-slate-700">{formatCurrency(f.revenue)}</td>
                                                        <td className="py-4 px-4 text-right font-mono text-slate-700">{formatCurrency(f.net_income)}</td>
                                                        <td className="py-4 px-4 text-right font-mono text-slate-700">{formatCurrency(f.total_assets)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyState message="No financial data available" icon={FileText} />
                                )}
                            </PremiumCard>
                        )}

                        {activeTab === "ownership" && (
                            <PremiumCard>
                                <SectionHeader title="Major Shareholders" icon={Users} gradient="bg-gradient-to-br from-orange-500 to-amber-600" />
                                {shareholders.length > 0 ? (
                                    <div className="space-y-3">
                                        {shareholders.slice(0, 10).map((s: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{s.shareholder_name_en || s.shareholder_name}</p>
                                                        <p className="text-sm text-slate-500">{s.shareholder_type || "Investor"}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-black text-blue-600">{Number(s.ownership_percent || 0).toFixed(2)}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState message="No ownership data available" icon={Users} />
                                )}
                            </PremiumCard>
                        )}

                        {activeTab === "analysts" && (
                            <PremiumCard>
                                <SectionHeader title="Analyst Ratings" icon={Target} gradient="bg-gradient-to-br from-cyan-500 to-blue-600" />
                                {symbolAnalystRatings.length > 0 ? (
                                    <div className="space-y-4">
                                        {symbolAnalystRatings.slice(0, 5).map((r: any, i: number) => {
                                            const total = (r.strong_buy || 0) + (r.buy || 0) + (r.hold || 0) + (r.sell || 0) + (r.strong_sell || 0);
                                            if (total === 0) return null;
                                            return (
                                                <div key={i} className="p-4 bg-slate-50 rounded-xl">
                                                    <p className="text-sm font-bold text-slate-600 mb-2">{r.period}</p>
                                                    <div className="flex h-8 rounded-lg overflow-hidden shadow-inner">
                                                        <div className="bg-emerald-500" style={{ width: `${((r.strong_buy || 0) / total) * 100}%` }} />
                                                        <div className="bg-emerald-300" style={{ width: `${((r.buy || 0) / total) * 100}%` }} />
                                                        <div className="bg-slate-300" style={{ width: `${((r.hold || 0) / total) * 100}%` }} />
                                                        <div className="bg-red-300" style={{ width: `${((r.sell || 0) / total) * 100}%` }} />
                                                        <div className="bg-red-500" style={{ width: `${((r.strong_sell || 0) / total) * 100}%` }} />
                                                    </div>
                                                    <div className="flex justify-between mt-2 text-xs font-bold">
                                                        <span className="text-emerald-600">Strong Buy: {r.strong_buy || 0}</span>
                                                        <span className="text-emerald-500">Buy: {r.buy || 0}</span>
                                                        <span className="text-slate-500">Hold: {r.hold || 0}</span>
                                                        <span className="text-red-500">Sell: {r.sell || 0}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <EmptyState message="No analyst ratings available for this stock" icon={Target} />
                                )}
                            </PremiumCard>
                        )}

                        {activeTab === "dividends" && (
                            <PremiumCard>
                                <SectionHeader title="Dividend History" icon={DollarSign} gradient="bg-gradient-to-br from-green-500 to-emerald-600" />
                                {dividends.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b-2 border-slate-200">
                                                    <th className="text-left py-3 px-4 text-slate-500 font-bold text-sm">Ex-Date</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-bold text-sm">Amount</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-bold text-sm">Yield</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dividends.slice(0, 10).map((d: any, i: number) => (
                                                    <tr key={i} className="border-b border-slate-100 hover:bg-emerald-50/30 transition-colors">
                                                        <td className="py-4 px-4 font-medium text-slate-800">{d.ex_date}</td>
                                                        <td className="py-4 px-4 text-right font-bold text-emerald-600">SAR {Number(d.amount || 0).toFixed(2)}</td>
                                                        <td className="py-4 px-4 text-right font-mono text-slate-600">{Number(d.dividend_yield || 0).toFixed(2)}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyState message="No dividend history available" icon={DollarSign} />
                                )}
                            </PremiumCard>
                        )}
                    </div>

                    {/* Right Sidebar (1/3) */}
                    <div className="space-y-6">
                        {/* Key Metrics Card */}
                        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 text-white shadow-2xl shadow-blue-500/30">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 rounded-xl bg-white/20">
                                    <Target className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold">Key Metrics</h3>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { label: "P/E Ratio", value: stockData.pe_ratio ? `${Number(stockData.pe_ratio).toFixed(2)}x` : "-" },
                                    { label: "P/B Ratio", value: stockData.pb_ratio ? `${Number(stockData.pb_ratio).toFixed(2)}x` : "-" },
                                    { label: "Dividend Yield", value: stockData.dividend_yield ? `${Number(stockData.dividend_yield).toFixed(2)}%` : "-" },
                                    { label: "Beta", value: stockData.beta ? Number(stockData.beta).toFixed(2) : "-" },
                                    { label: "Target Price", value: stockData.target_price ? `SAR ${Number(stockData.target_price).toFixed(2)}` : "-" },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                                        <span className="text-white/70">{item.label}</span>
                                        <span className="font-bold font-mono">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Corporate Actions */}
                        {corporateActions.length > 0 && (
                            <PremiumCard>
                                <SectionHeader title="Corporate Actions" icon={Zap} gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
                                <div className="space-y-3">
                                    {corporateActions.slice(0, 4).map((action: any, i: number) => (
                                        <div key={i} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/50">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-black text-amber-700 uppercase">{action.action_type}</span>
                                                <span className="text-xs text-amber-600">{new Date(action.ex_date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-amber-800 line-clamp-2">{action.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </PremiumCard>
                        )}

                        {/* News Feed */}
                        <PremiumCard>
                            <SectionHeader title="Latest News" icon={Newspaper} gradient="bg-gradient-to-br from-slate-600 to-slate-800" />
                            {symbolNews.length > 0 ? (
                                <div className="space-y-3">
                                    {symbolNews.map((article: any, i: number) => (
                                        <a
                                            key={i}
                                            href={article.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group"
                                        >
                                            <p className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">{article.headline}</p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                                <Clock className="w-3 h-3" />
                                                {new Date(article.published_at).toLocaleDateString()}
                                                <span>•</span>
                                                <span>{article.source}</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState message="No news available" icon={Newspaper} />
                            )}
                        </PremiumCard>

                        {/* Data Stats */}
                        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-white/10">
                                    <PieChart className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Chart Data Points</div>
                                    <div className="text-3xl font-black">{chartData.length.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                                {chartData.length > 0
                                    ? `${chartData[0]?.time} → ${chartData[chartData.length - 1]?.time}`
                                    : "No data range"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
