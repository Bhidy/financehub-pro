"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { fetchTickers, fetchOHLC, fetchFinancials, fetchShareholders, fetchCorporateActions, fetchAnalystRatings, Ticker } from "@/lib/api";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, LineSeries, HistogramSeries, Time } from "lightweight-charts";
import {
    TrendingUp,
    TrendingDown,
    Building2,
    Users,
    BarChart3,
    DollarSign,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Star,
    Bell,
    Share2,
    Activity,
    Target,
    LineChart,
    CandlestickChart,
    Zap,
    PieChart,
    AlertCircle,
    Wallet,
    Scale,
    Banknote
} from "lucide-react";

// Arabic to English key mapping for financials raw_data
const ARABIC_KEYS: Record<string, string> = {
    "صافى الربح": "net_income",
    "مجمل الربح": "gross_profit",
    "إجمالي الأصول": "total_assets",
    "إجمالي المطلوبات": "total_liabilities",
    "اجمالي حقوق المساهمين مضاف اليها حقوق الاقلية": "total_equity",
    "صافي التغير النقدي من الانشطة الاستثمارية": "investing_cashflow",
    "صافي التدفق النقدي من (المستخدم في) الأنشطة التشغيلية": "operating_cashflow",
    "صافي التدفق النقدي من (المستخدم في) الأنشطة التمويلية": "financing_cashflow",
};

// Parse financials raw_data JSON
function parseFinancialsRawData(rawData: string | null): Record<string, number> {
    if (!rawData) return {};
    try {
        const parsed = JSON.parse(rawData);
        const result: Record<string, number> = {};
        for (const [arabicKey, value] of Object.entries(parsed)) {
            const englishKey = ARABIC_KEYS[arabicKey];
            if (englishKey && typeof value === "number") {
                result[englishKey] = value;
            }
        }
        return result;
    } catch {
        return {};
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
            <div className="max-w-[1800px] mx-auto">
                <div className="animate-pulse">
                    <div className="h-28 bg-gradient-to-r from-slate-200 to-slate-100 rounded-3xl mb-6" />
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-white rounded-2xl shadow-lg" />
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 h-[450px] bg-white rounded-3xl shadow-xl" />
                        <div className="space-y-4">
                            <div className="h-48 bg-white rounded-2xl shadow-lg" />
                            <div className="h-48 bg-white rounded-2xl shadow-lg" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Premium Stat Card Component
function StatCard({ label, value, icon: Icon, trend, color = "blue" }: {
    label: string;
    value: string;
    icon?: any;
    trend?: "up" | "down" | null;
    color?: "blue" | "emerald" | "red" | "amber";
}) {
    const colorMap = {
        blue: "from-blue-500 to-blue-600",
        emerald: "from-emerald-500 to-emerald-600",
        red: "from-red-500 to-red-600",
        amber: "from-amber-500 to-amber-600"
    };

    return (
        <div className="relative overflow-hidden bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/50 
            hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 group">
            <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${colorMap[color]} opacity-10 blur-xl group-hover:opacity-20 transition-opacity`} />

            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</span>
                    {Icon && (
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorMap[color]} shadow-lg`}>
                            <Icon className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-800 font-mono">{value}</span>
                    {trend === "up" && <ArrowUpRight className="w-5 h-5 text-emerald-500" />}
                    {trend === "down" && <ArrowDownRight className="w-5 h-5 text-red-500" />}
                </div>
            </div>
        </div>
    );
}

// Premium Card Wrapper
function PremiumCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 ${className}`}>
            {children}
        </div>
    );
}

// Section Header
function SectionHeader({ title, icon: Icon, color = "blue" }: { title: string; icon: any; color?: string }) {
    const colorMap: Record<string, string> = {
        blue: "from-blue-500 to-blue-600",
        emerald: "from-emerald-500 to-teal-600",
        violet: "from-violet-500 to-purple-600",
        orange: "from-orange-500 to-amber-600",
        cyan: "from-cyan-500 to-blue-600",
    };

    return (
        <div className="flex items-center gap-3 mb-5">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        </div>
    );
}

// Empty State
function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">{message}</p>
        </div>
    );
}

// Main Page Component
export default function SymbolDetailPage() {
    const params = useParams();
    const symbol = params.id as string;
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    const [activeTab, setActiveTab] = useState<"overview" | "financials" | "ownership" | "analysts">("overview");
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

    // Fetch OHLC data
    const { data: ohlcData = [], isLoading: chartLoading } = useQuery({
        queryKey: ["ohlc", symbol, chartPeriod],
        queryFn: () => fetchOHLC(symbol, chartPeriod),
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

    // Fetch corporate actions
    const { data: corporateActions = [] } = useQuery({
        queryKey: ["corporate-actions", symbol],
        queryFn: () => fetchCorporateActions(symbol),
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

    // Parse financials with raw_data
    const parsedFinancials = useMemo(() => {
        return financials.map((f: any) => {
            const rawParsed = parseFinancialsRawData(f.raw_data);
            return {
                ...f,
                net_income: f.net_income || rawParsed.net_income,
                gross_profit: f.gross_profit || rawParsed.gross_profit,
                total_assets: f.total_assets || rawParsed.total_assets,
                total_liabilities: f.total_liabilities || rawParsed.total_liabilities,
                total_equity: f.total_equity || rawParsed.total_equity,
                operating_cashflow: f.operating_cashflow || rawParsed.operating_cashflow,
            };
        });
    }, [financials]);

    // Filter analyst ratings for this symbol
    const symbolAnalystRatings = useMemo(() =>
        analystRatings.filter((r: any) => r.symbol === symbol),
        [analystRatings, symbol]
    );

    // Chart initialization
    useEffect(() => {
        if (!chartContainerRef.current || chartData.length === 0) return;

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
            height: 380,
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

    // Calculate stats from OHLC
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

    if (tickersLoading) return <LoadingSkeleton />;

    if (!stockData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center bg-white p-10 rounded-3xl shadow-xl">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                    <h2 className="text-2xl font-bold text-slate-700 mb-2">Stock Not Found</h2>
                    <p className="text-slate-500">Symbol: <span className="font-mono font-bold">{symbol}</span></p>
                    <p className="text-sm text-slate-400 mt-2">Check the symbol and try again</p>
                </div>
            </div>
        );
    }

    const isPositive = Number(stockData.change || 0) >= 0;
    const lastPrice = Number(stockData.last_price || 0);
    const change = Number(stockData.change || 0);
    const changePercent = Number(stockData.change_percent || 0);
    const volume = Number(stockData.volume || 0);

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
                                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border border-blue-200/50">
                                        {stockData.sector_name || "EQUITY"}
                                    </span>
                                </div>
                                <p className="text-slate-500 font-medium text-lg">{stockData.name_en || stockData.name_ar || symbol}</p>
                            </div>
                        </div>

                        {/* Price Display */}
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-slate-900 font-mono tracking-tight">
                                        {lastPrice.toFixed(2)}
                                    </span>
                                    <span className="text-slate-400 text-sm font-bold">SAR</span>
                                </div>
                                <div className={`flex items-center justify-end gap-2 mt-1 ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                                    {isPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                    <span className={`px-3 py-1 rounded-lg font-bold text-sm ${isPositive ? "bg-emerald-50" : "bg-red-50"}`}>
                                        {isPositive ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>

                            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Live</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 mt-5">
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-bold shadow-lg shadow-blue-500/30">
                            <Star className="w-4 h-4" /> Add to Watchlist
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold border border-slate-200 shadow-md">
                            <Bell className="w-4 h-4" /> Set Alert
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold border border-slate-200 shadow-md">
                            <Share2 className="w-4 h-4" /> Share
                        </button>
                    </div>
                </div>
            </div>

            {/* ========== MAIN CONTENT ========== */}
            <div className="max-w-[1800px] mx-auto px-6 py-6">
                {/* Quick Stats Row - ONLY fields that exist in API */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        label="Volume"
                        value={formatNumber(volume)}
                        icon={BarChart3}
                        color="blue"
                    />
                    <StatCard
                        label="52W High"
                        value={stats?.high52?.toFixed(2) || "-"}
                        icon={TrendingUp}
                        trend="up"
                        color="emerald"
                    />
                    <StatCard
                        label="52W Low"
                        value={stats?.low52?.toFixed(2) || "-"}
                        icon={TrendingDown}
                        trend="down"
                        color="red"
                    />
                    <StatCard
                        label="Period Return"
                        value={stats?.periodReturn ? `${stats.periodReturn >= 0 ? "+" : ""}${stats.periodReturn.toFixed(2)}%` : "-"}
                        trend={stats?.periodReturn && stats.periodReturn >= 0 ? "up" : "down"}
                        color="amber"
                    />
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-lg border border-slate-100 mb-6 overflow-x-auto">
                    {[
                        { id: "overview", label: "Overview", icon: Activity },
                        { id: "financials", label: "Financials", icon: FileText },
                        { id: "ownership", label: "Ownership", icon: Users },
                        { id: "analysts", label: "Analysts", icon: Target },
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
                        {/* Interactive Chart Card - Only on Overview Tab */}
                        {activeTab === "overview" && (
                            <PremiumCard>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <SectionHeader title="Price Chart" icon={LineChart} color="blue" />

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

                                        {/* Chart Style Toggle */}
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
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10">
                                            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                                        </div>
                                    )}
                                    {chartData.length === 0 && !chartLoading && (
                                        <EmptyState message="No chart data available" />
                                    )}
                                    <div ref={chartContainerRef} className="w-full h-[380px]" />
                                </div>

                                {/* OHLC Stats Footer */}
                                {stats && (
                                    <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                                        {[
                                            { label: "Open", value: stats.current.open.toFixed(2), color: "slate" },
                                            { label: "High", value: stats.current.high.toFixed(2), color: "emerald" },
                                            { label: "Low", value: stats.current.low.toFixed(2), color: "red" },
                                            { label: "Close", value: stats.current.close.toFixed(2), color: "blue" },
                                        ].map((item, i) => (
                                            <div key={i} className="text-center">
                                                <div className="text-xs text-slate-400 uppercase font-bold mb-1">{item.label}</div>
                                                <div className={`text-lg font-black font-mono text-${item.color}-600`}>{item.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </PremiumCard>
                        )}

                        {/* Overview Tab - Stock Information */}
                        {activeTab === "overview" && (
                            <PremiumCard>
                                <SectionHeader title="Stock Information" icon={Building2} color="emerald" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-sm text-slate-500 mb-1">Name</p>
                                        <p className="font-bold text-slate-800">{stockData.name_en || stockData.name_ar || symbol}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-sm text-slate-500 mb-1">Sector</p>
                                        <p className="font-bold text-slate-800">{stockData.sector_name || "N/A"}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-sm text-slate-500 mb-1">Market</p>
                                        <p className="font-bold text-slate-800">Tadawul (Saudi Exchange)</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-sm text-slate-500 mb-1">Currency</p>
                                        <p className="font-bold text-slate-800">SAR (Saudi Riyal)</p>
                                    </div>
                                </div>
                            </PremiumCard>
                        )}

                        {/* Financials Tab - Using parsed raw_data */}
                        {activeTab === "financials" && (
                            <PremiumCard>
                                <SectionHeader title="Financial Statements" icon={FileText} color="violet" />
                                {parsedFinancials.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b-2 border-slate-200">
                                                    <th className="text-left py-3 px-4 text-slate-500 font-bold text-sm">Period</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-bold text-sm">Net Income</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-bold text-sm">Total Assets</th>
                                                    <th className="text-right py-3 px-4 text-slate-500 font-bold text-sm">Total Equity</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedFinancials.slice(0, 8).map((f: any, i: number) => (
                                                    <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                                                        <td className="py-4 px-4">
                                                            <span className="font-bold text-slate-800">{f.period_type} {f.fiscal_year}</span>
                                                        </td>
                                                        <td className="py-4 px-4 text-right font-mono text-emerald-600 font-bold">
                                                            {formatCurrency(f.net_income)}
                                                        </td>
                                                        <td className="py-4 px-4 text-right font-mono text-slate-700">
                                                            {formatCurrency(f.total_assets)}
                                                        </td>
                                                        <td className="py-4 px-4 text-right font-mono text-slate-700">
                                                            {formatCurrency(f.total_equity)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyState message="No financial data available" />
                                )}
                            </PremiumCard>
                        )}

                        {/* Ownership Tab */}
                        {activeTab === "ownership" && (
                            <PremiumCard>
                                <SectionHeader title="Major Shareholders" icon={Users} color="orange" />
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
                                    <EmptyState message="No ownership data available" />
                                )}
                            </PremiumCard>
                        )}

                        {/* Analysts Tab - Showing actual rating data */}
                        {activeTab === "analysts" && (
                            <PremiumCard>
                                <SectionHeader title="Analyst Recommendations" icon={Target} color="cyan" />
                                {symbolAnalystRatings.length > 0 ? (
                                    <div className="space-y-4">
                                        {symbolAnalystRatings.map((r: any, i: number) => (
                                            <div key={i} className="p-5 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-bold text-slate-800">{r.analyst_firm || "Analyst"}</span>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${r.rating?.toUpperCase() === "BUY" ? "bg-emerald-100 text-emerald-700" :
                                                        r.rating?.toUpperCase() === "SELL" ? "bg-red-100 text-red-700" :
                                                            "bg-amber-100 text-amber-700"
                                                        }`}>
                                                        {r.rating || "N/A"}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-slate-500">Target Price</p>
                                                        <p className="text-xl font-bold text-blue-600">SAR {Number(r.target_price || 0).toFixed(2)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-slate-500">Current Price</p>
                                                        <p className="text-xl font-bold text-slate-700">SAR {Number(r.current_price || lastPrice).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                {r.target_price && lastPrice && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                                        <p className="text-sm text-slate-500">Potential Upside</p>
                                                        <p className={`text-lg font-bold ${Number(r.target_price) > lastPrice ? "text-emerald-600" : "text-red-600"}`}>
                                                            {(((Number(r.target_price) - lastPrice) / lastPrice) * 100).toFixed(2)}%
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState message="No analyst ratings available" />
                                )}
                            </PremiumCard>
                        )}
                    </div>

                    {/* Right Sidebar (1/3) */}
                    <div className="space-y-6">
                        {/* Trading Info Card */}
                        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 text-white shadow-2xl shadow-blue-500/30">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 rounded-xl bg-white/20">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold">Trading Info</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-white/70">Last Price</span>
                                    <span className="font-bold font-mono">SAR {lastPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-white/70">Change</span>
                                    <span className={`font-bold font-mono ${isPositive ? "text-emerald-300" : "text-red-300"}`}>
                                        {isPositive ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/10">
                                    <span className="text-white/70">Volume</span>
                                    <span className="font-bold font-mono">{volume.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-white/70">Market</span>
                                    <span className="font-bold">TADAWUL</span>
                                </div>
                            </div>
                        </div>

                        {/* Corporate Actions */}
                        {corporateActions.length > 0 && (
                            <PremiumCard>
                                <SectionHeader title="Corporate Actions" icon={Zap} color="orange" />
                                <div className="space-y-3">
                                    {corporateActions.slice(0, 4).map((action: any, i: number) => (
                                        <div key={i} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-black text-amber-700 uppercase">{action.action_type}</span>
                                                <span className="text-xs text-amber-600">{action.ex_date}</span>
                                            </div>
                                            <p className="text-sm text-amber-800">{action.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </PremiumCard>
                        )}

                        {/* Chart Stats */}
                        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-white/10">
                                    <PieChart className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 uppercase font-bold">Chart Data</div>
                                    <div className="text-3xl font-black">{chartData.length.toLocaleString()}</div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">Historical data points</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
