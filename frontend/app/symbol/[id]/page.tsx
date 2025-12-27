"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchTickers, fetchOHLC, fetchFinancials, fetchCorporateActions, fetchRatios, Ticker } from "@/lib/api";
import { useMemo, useState, useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode, Time, CandlestickSeries, LineSeries, AreaSeries, HistogramSeries } from "lightweight-charts";
import clsx from "clsx";
import {
    TrendingUp,
    TrendingDown,
    Activity,
    BarChart3,
    DollarSign,
    Percent,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Volume2,
    Target,
    Zap,
    LineChart,
    CandlestickChart,
    AreaChart,
    RefreshCw,
    Building2,
    PieChart
} from "lucide-react";

type Timeframe = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX";
type ChartStyle = "candle" | "line" | "area";

export default function SymbolPage() {
    const params = useParams();
    const symbol = params.id as string;
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    const [timeframe, setTimeframe] = useState<Timeframe>("1Y");
    const [chartStyle, setChartStyle] = useState<ChartStyle>("candle");

    const { data: tickers = [] } = useQuery({ queryKey: ["tickers"], queryFn: fetchTickers });
    const { data: history = [], isLoading: isLoadingOHLC } = useQuery({
        queryKey: ["ohlc", symbol],
        queryFn: () => fetchOHLC(symbol, "5y"),
        enabled: !!symbol
    });
    const { data: ratios = [] } = useQuery({
        queryKey: ["ratios", symbol],
        queryFn: () => fetchRatios(symbol),
        enabled: !!symbol
    });
    const { data: corporateActions = [] } = useQuery({
        queryKey: ["corporate-actions", symbol],
        queryFn: () => fetchCorporateActions(symbol),
        enabled: !!symbol
    });

    const ticker = useMemo(() => tickers.find((t: Ticker) => t.symbol === symbol), [tickers, symbol]);
    const activeRatios = ratios.length > 0 ? ratios[0] : null;
    const isPositive = (ticker?.change || 0) >= 0;

    // Filter data based on timeframe
    const filteredData = useMemo(() => {
        if (!history || history.length === 0) return [];
        const timeframeMap: Record<Timeframe, number> = {
            "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "3Y": 1095, "5Y": 1825, "MAX": history.length
        };
        const sorted = [...history].sort((a: any, b: any) =>
            new Date(a.date || a.time).getTime() - new Date(b.date || b.time).getTime()
        );
        return sorted.slice(-timeframeMap[timeframe]).map((item: any) => ({
            time: new Date(item.date || item.time).toISOString().split('T')[0] as Time,
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close),
            volume: Number(item.volume)
        }));
    }, [history, timeframe]);

    // Calculate stats
    const stats = useMemo(() => {
        if (filteredData.length < 2) return null;
        const current = filteredData[filteredData.length - 1];
        const first = filteredData[0];
        const high52 = Math.max(...filteredData.slice(-252).map(d => d.high));
        const low52 = Math.min(...filteredData.slice(-252).map(d => d.low));
        const avgVolume = filteredData.slice(-30).reduce((sum, d) => sum + d.volume, 0) / 30;
        const periodReturn = ((current.close - first.close) / first.close) * 100;

        return { high52, low52, avgVolume, periodReturn, current };
    }, [filteredData]);

    // Chart initialization
    useEffect(() => {
        if (!chartContainerRef.current || filteredData.length === 0) return;

        // Clear previous chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#ffffff' },
                textColor: '#64748b',
            },
            width: chartContainerRef.current.clientWidth,
            height: 420,
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
                vertLine: { color: '#10b981', width: 1, style: 2 },
                horzLine: { color: '#10b981', width: 1, style: 2 }
            }
        });

        chartRef.current = chart;

        try {
            // Use lightweight-charts v5 API
            if (chartStyle === "candle") {
                const series = chart.addSeries(CandlestickSeries, {
                    upColor: '#10b981',
                    downColor: '#ef4444',
                    borderUpColor: '#10b981',
                    borderDownColor: '#ef4444',
                    wickUpColor: '#10b981',
                    wickDownColor: '#ef4444',
                });
                series.setData(filteredData);
            } else if (chartStyle === "line") {
                const series = chart.addSeries(LineSeries, {
                    color: '#6366f1',
                    lineWidth: 2,
                });
                series.setData(filteredData.map((d: any) => ({ time: d.time, value: d.close })));
            } else {
                const series = chart.addSeries(AreaSeries, {
                    topColor: 'rgba(99, 102, 241, 0.4)',
                    bottomColor: 'rgba(99, 102, 241, 0.0)',
                    lineColor: '#6366f1',
                    lineWidth: 2,
                });
                series.setData(filteredData.map((d: any) => ({ time: d.time, value: d.close })));
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
            volumeSeries.setData(filteredData.map((d: any) => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
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
    }, [filteredData, chartStyle]);

    const timeframes: Timeframe[] = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "MAX"];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-12">
            {/* Premium Header */}
            <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
                <div className="max-w-[1800px] mx-auto px-6 py-5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Stock Identity */}
                        <div className="flex items-center gap-4">
                            <div className={clsx(
                                "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg",
                                isPositive
                                    ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
                                    : "bg-gradient-to-br from-red-400 to-red-600"
                            )}>
                                {symbol.slice(0, 2)}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{symbol}</h1>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-600 border border-indigo-100">
                                        {ticker?.sector_name || "EQUITY"}
                                    </span>
                                </div>
                                <p className="text-slate-500 font-medium">{ticker?.name_en || "Loading..."}</p>
                            </div>
                        </div>

                        {/* Price Display */}
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-slate-900 tracking-tight font-mono">
                                        {Number(ticker?.last_price || 0).toFixed(2)}
                                    </span>
                                    <span className="text-slate-400 text-sm font-bold">SAR</span>
                                </div>
                                <div className={clsx(
                                    "flex items-center justify-end gap-2 mt-1 text-lg font-bold",
                                    isPositive ? "text-emerald-600" : "text-red-600"
                                )}>
                                    {isPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                    <span>{isPositive ? "+" : ""}{Number(ticker?.change || 0).toFixed(2)}</span>
                                    <span className="text-slate-300">|</span>
                                    <span>{isPositive ? "+" : ""}{Number(ticker?.change_percent || 0).toFixed(2)}%</span>
                                </div>
                            </div>

                            {/* Live Badge */}
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Live</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1800px] mx-auto px-6 mt-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* Chart Section - 9 cols */}
                    <div className="col-span-12 xl:col-span-9">
                        {/* Chart Card */}
                        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
                            {/* Chart Controls */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">
                                {/* Timeframe Selector */}
                                <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-xl">
                                    {timeframes.map(tf => (
                                        <button
                                            key={tf}
                                            onClick={() => setTimeframe(tf)}
                                            className={clsx(
                                                "px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                                                timeframe === tf
                                                    ? "bg-white text-slate-900 shadow-md"
                                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                                            )}
                                        >
                                            {tf}
                                        </button>
                                    ))}
                                </div>

                                {/* Chart Style */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-xl">
                                        {[
                                            { style: "candle" as ChartStyle, icon: CandlestickChart, color: "emerald" },
                                            { style: "line" as ChartStyle, icon: LineChart, color: "indigo" },
                                            { style: "area" as ChartStyle, icon: AreaChart, color: "purple" },
                                        ].map(({ style, icon: Icon, color }) => (
                                            <button
                                                key={style}
                                                onClick={() => setChartStyle(style)}
                                                className={clsx(
                                                    "p-2.5 rounded-lg transition-all",
                                                    chartStyle === style
                                                        ? `bg-white shadow-md text-${color}-600`
                                                        : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                                                )}
                                            >
                                                <Icon className="w-5 h-5" />
                                            </button>
                                        ))}
                                    </div>
                                    <button className="p-2.5 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all">
                                        <RefreshCw className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Chart Container */}
                            <div className="relative bg-white">
                                {isLoadingOHLC && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-10">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
                                            <span className="text-slate-500 font-medium">Loading Chart...</span>
                                        </div>
                                    </div>
                                )}
                                {filteredData.length === 0 && !isLoadingOHLC && (
                                    <div className="h-[420px] flex items-center justify-center text-slate-400">
                                        No data available
                                    </div>
                                )}
                                <div ref={chartContainerRef} className="w-full h-[420px]" />
                            </div>

                            {/* Chart Footer */}
                            {stats && (
                                <div className="grid grid-cols-4 gap-4 p-5 border-t border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">
                                    {[
                                        { label: "Open", value: stats.current.open.toFixed(2), color: "slate" },
                                        { label: "High", value: stats.current.high.toFixed(2), color: "emerald" },
                                        { label: "Low", value: stats.current.low.toFixed(2), color: "red" },
                                        { label: "Close", value: stats.current.close.toFixed(2), color: "blue" },
                                    ].map((item, i) => (
                                        <div key={i} className="text-center">
                                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-bold">{item.label}</div>
                                            <div className={clsx("text-lg font-black font-mono", `text-${item.color}-600`)}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Metric Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                            {[
                                { label: "52W High", value: stats?.high52.toFixed(2) || "—", icon: TrendingUp, gradient: "from-emerald-400 to-teal-500", bg: "bg-emerald-50", text: "text-emerald-700" },
                                { label: "52W Low", value: stats?.low52.toFixed(2) || "—", icon: TrendingDown, gradient: "from-red-400 to-rose-500", bg: "bg-red-50", text: "text-red-700" },
                                { label: "Avg Volume", value: stats ? (stats.avgVolume / 1000000).toFixed(2) + "M" : "—", icon: BarChart3, gradient: "from-blue-400 to-teal-500", bg: "bg-blue-50", text: "text-blue-700" },
                                { label: "Period Return", value: stats?.periodReturn !== undefined ? ((stats.periodReturn >= 0 ? "+" : "") + stats.periodReturn.toFixed(2) + "%") : "—", icon: Percent, gradient: (stats?.periodReturn ?? 0) >= 0 ? "from-emerald-400 to-teal-500" : "from-red-400 to-rose-500", bg: (stats?.periodReturn ?? 0) >= 0 ? "bg-emerald-50" : "bg-red-50", text: (stats?.periodReturn ?? 0) >= 0 ? "text-emerald-700" : "text-red-700" },
                            ].map((metric, i) => (
                                <div
                                    key={i}
                                    className="group relative bg-white rounded-2xl border border-slate-100 p-5 shadow-lg shadow-slate-100/50 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden"
                                >
                                    <div className={clsx("absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 blur-xl bg-gradient-to-br", metric.gradient)} />
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={clsx("p-2.5 rounded-xl", metric.bg)}>
                                            <metric.icon className={clsx("w-5 h-5", metric.text)} />
                                        </div>
                                        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">{metric.label}</span>
                                    </div>
                                    <div className={clsx("text-2xl font-black font-mono", metric.text)}>{metric.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar - 3 cols */}
                    <div className="col-span-12 xl:col-span-3 space-y-6">
                        {/* Valuation Card */}
                        {activeRatios && (
                            <div className="bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl overflow-hidden shadow-xl shadow-blue-200/50 text-white">
                                <div className="p-5 border-b border-white/10">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Target className="w-5 h-5" />
                                        Valuation Metrics
                                    </h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    {[
                                        { label: "P/E Ratio", value: Number(activeRatios.pe_ratio).toFixed(2) + "x" },
                                        { label: "P/B Ratio", value: Number(activeRatios.pb_ratio).toFixed(2) + "x" },
                                        { label: "Dividend Yield", value: Number(activeRatios.dividend_yield).toFixed(2) + "%" },
                                        { label: "Debt/Equity", value: Number(activeRatios.debt_to_equity).toFixed(2) },
                                    ].map((ratio, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                                            <span className="text-white/70 text-sm">{ratio.label}</span>
                                            <span className="font-bold font-mono">{ratio.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trading Info Card */}
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl overflow-hidden shadow-xl shadow-blue-200/50 text-white">
                            <div className="p-5 border-b border-white/10">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Activity className="w-5 h-5" />
                                    Trading Info
                                </h3>
                            </div>
                            <div className="p-5 space-y-4">
                                {[
                                    { label: "Volume", value: Number(ticker?.volume || 0).toLocaleString(), icon: Volume2 },
                                    { label: "Market", value: "TADAWUL", icon: Building2 },
                                    { label: "Currency", value: "SAR", icon: DollarSign },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                                        <div className="flex items-center gap-2 text-white/70 text-sm">
                                            <item.icon className="w-4 h-4" />
                                            {item.label}
                                        </div>
                                        <span className="font-bold font-mono">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Corporate Actions */}
                        {corporateActions.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-lg shadow-slate-100/50">
                                <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                                    <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-amber-500" />
                                        Recent Actions
                                    </h3>
                                </div>
                                <div className="p-4 space-y-3">
                                    {corporateActions.slice(0, 3).map((action: any, i: number) => (
                                        <div key={i} className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-amber-600 uppercase">{action.action_type}</span>
                                                <span className="text-xs text-amber-500">{new Date(action.ex_date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-amber-800 line-clamp-2">{action.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Data Stats Card */}
                        <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-5 text-white shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <PieChart className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Data Points</div>
                                    <div className="text-2xl font-black">{filteredData.length.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500">
                                {filteredData.length > 0
                                    ? `From ${filteredData[0]?.time} to ${filteredData[filteredData.length - 1]?.time}`
                                    : "No data range available"
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
