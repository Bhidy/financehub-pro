"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
    createChart,
    ColorType,
    IChartApi,
    Time,
    CrosshairMode,
    CandlestickSeries,
    LineSeries,
    AreaSeries,
    HistogramSeries
} from "lightweight-charts";
import { SMA, BollingerBands } from "technicalindicators";

export type ChartType = "candlestick" | "line" | "area";
export type Timeframe = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX";

interface OHLCData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

interface MultiTimeframeChartProps {
    data: OHLCData[];
    symbol: string;
    showVolume?: boolean;
    showIndicators?: boolean;
    colors?: {
        backgroundColor?: string;
        textColor?: string;
        upColor?: string;
        downColor?: string;
    };
}

export function MultiTimeframeChart({
    data = [],
    symbol,
    showVolume = true,
    showIndicators = false,
    colors = {}
}: MultiTimeframeChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    const [chartType, setChartType] = useState<ChartType>("candlestick");
    const [timeframe, setTimeframe] = useState<Timeframe>("1Y");
    const [activeIndicators, setActiveIndicators] = useState<string[]>([]);

    // Filter data based on timeframe
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const timeframeMap: Record<Timeframe, number> = {
            "1M": 30,
            "3M": 90,
            "6M": 180,
            "1Y": 365,
            "3Y": 1095,
            "5Y": 1825,
            "MAX": data.length
        };

        const days = timeframeMap[timeframe];
        return data.slice(-days);
    }, [data, timeframe]);

    // Calculate technical indicators
    const indicators = useMemo(() => {
        if (!filteredData || filteredData.length < 50) return {};

        const closes = filteredData.map(d => d.close);

        return {
            sma50: SMA.calculate({ period: 50, values: closes }),
            sma200: SMA.calculate({ period: 200, values: closes }),
            bb: BollingerBands.calculate({
                period: 20,
                values: closes,
                stdDev: 2
            })
        };
    }, [filteredData]);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current || filteredData.length === 0) return;

        const defaultColors = {
            backgroundColor: colors.backgroundColor || "#ffffff",
            textColor: colors.textColor || "#334155",
            upColor: colors.upColor || "#10b981",
            downColor: colors.downColor || "#ef4444"
        };

        // Clear previous chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        // Create chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: defaultColors.backgroundColor },
                textColor: defaultColors.textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
            grid: {
                vertLines: { color: "#f1f5f9" },
                horzLines: { color: "#f1f5f9" },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: "#e2e8f0"
            },
            rightPriceScale: {
                borderColor: "#e2e8f0"
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            }
        });

        chartRef.current = chart;

        try {
            // Add main price series using v5 API
            if (chartType === "candlestick") {
                const candlestickSeries = chart.addSeries(CandlestickSeries, {
                    upColor: defaultColors.upColor,
                    downColor: defaultColors.downColor,
                    borderUpColor: defaultColors.upColor,
                    borderDownColor: defaultColors.downColor,
                    wickUpColor: defaultColors.upColor,
                    wickDownColor: defaultColors.downColor,
                });

                const formattedData = filteredData.map((d) => ({
                    time: d.time as Time,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                }));

                candlestickSeries.setData(formattedData);
            } else if (chartType === "line") {
                const lineSeries = chart.addSeries(LineSeries, {
                    color: "#3b82f6",
                    lineWidth: 2
                });

                lineSeries.setData(filteredData.map(d => ({
                    time: d.time as Time,
                    value: d.close
                })));
            } else if (chartType === "area") {
                const areaSeries = chart.addSeries(AreaSeries, {
                    topColor: "rgba(59, 130, 246, 0.4)",
                    bottomColor: "rgba(59, 130, 246, 0.0)",
                    lineColor: "#3b82f6",
                    lineWidth: 2
                });

                areaSeries.setData(filteredData.map(d => ({
                    time: d.time as Time,
                    value: d.close
                })));
            }

            // Add volume histogram
            if (showVolume && filteredData[0]?.volume !== undefined) {
                const volumeSeries = chart.addSeries(HistogramSeries, {
                    color: "#94a3b8",
                    priceFormat: {
                        type: "volume",
                    },
                    priceScaleId: "",
                });

                volumeSeries.priceScale().applyOptions({
                    scaleMargins: {
                        top: 0.8,
                        bottom: 0,
                    },
                });

                volumeSeries.setData(filteredData.map(d => ({
                    time: d.time as Time,
                    value: d.volume || 0,
                    color: d.close >= d.open ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)"
                })));
            }

            // Add technical indicators
            if (activeIndicators.includes("sma50") && (indicators?.sma50?.length ?? 0) > 0) {
                const sma50Series = chart.addSeries(LineSeries, {
                    color: "#f59e0b",
                    lineWidth: 1,
                });

                const sma50Data = (indicators?.sma50 || []).map((value: number, index: number) => {
                    const dataIndex = filteredData.length - (indicators?.sma50 || []).length + index;
                    return {
                        time: filteredData[dataIndex].time as Time,
                        value
                    };
                });

                sma50Series.setData(sma50Data);
            }

            if (activeIndicators.includes("sma200") && (indicators?.sma200?.length ?? 0) > 0) {
                const sma200Series = chart.addSeries(LineSeries, {
                    color: "#8b5cf6",
                    lineWidth: 1,
                });

                const sma200Data = (indicators?.sma200 || []).map((value: number, index: number) => {
                    const dataIndex = filteredData.length - (indicators?.sma200 || []).length + index;
                    return {
                        time: filteredData[dataIndex].time as Time,
                        value
                    };
                });

                sma200Series.setData(sma200Data);
            }

            if (activeIndicators.includes("bb") && (indicators?.bb?.length ?? 0) > 0) {
                const upperBandSeries = chart.addSeries(LineSeries, {
                    color: "#06b6d4",
                    lineWidth: 1,
                    lineStyle: 2,
                });

                const lowerBandSeries = chart.addSeries(LineSeries, {
                    color: "#06b6d4",
                    lineWidth: 1,
                    lineStyle: 2,
                });

                const upperBandData = (indicators?.bb || []).map((bb: any, index: number) => {
                    const dataIndex = filteredData.length - (indicators?.bb || []).length + index;
                    return {
                        time: filteredData[dataIndex].time as Time,
                        value: bb.upper
                    };
                });

                const lowerBandData = (indicators?.bb || []).map((bb: any, index: number) => {
                    const dataIndex = filteredData.length - (indicators?.bb || []).length + index;
                    return {
                        time: filteredData[dataIndex].time as Time,
                        value: bb.lower
                    };
                });

                upperBandSeries.setData(upperBandData);
                lowerBandSeries.setData(lowerBandData);
            }

            // Fit content
            chart.timeScale().fitContent();

        } catch (err) {
            console.error("Chart error:", err);
        }

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth
                });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [filteredData, chartType, showVolume, colors, activeIndicators, indicators]);

    const timeframes: Timeframe[] = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "MAX"];
    const chartTypes: { type: ChartType; label: string; icon: string }[] = [
        { type: "candlestick", label: "Candles", icon: "📊" },
        { type: "line", label: "Line", icon: "📈" },
        { type: "area", label: "Area", icon: "📉" }
    ];

    const toggleIndicator = (indicator: string) => {
        setActiveIndicators(prev =>
            prev.includes(indicator)
                ? prev.filter(i => i !== indicator)
                : [...prev, indicator]
        );
    };

    return (
        <div className="relative w-full">
            {/* Controls */}
            <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
                {/* Timeframe Buttons */}
                <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                    {timeframes.map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${timeframe === tf
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                {/* Chart Type Buttons */}
                <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                    {chartTypes.map(({ type, label, icon }) => (
                        <button
                            key={type}
                            onClick={() => setChartType(type)}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1 ${chartType === type
                                ? "bg-blue-500 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            <span>{icon}</span>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {showIndicators && (
                    <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => toggleIndicator("sma50")}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeIndicators.includes("sma50")
                                ? "bg-amber-500 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            SMA 50
                        </button>
                        <button
                            onClick={() => toggleIndicator("sma200")}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeIndicators.includes("sma200")
                                ? "bg-purple-500 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            SMA 200
                        </button>
                        <button
                            onClick={() => toggleIndicator("bb")}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${activeIndicators.includes("bb")
                                ? "bg-cyan-500 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}
                        >
                            BB
                        </button>
                    </div>
                )}
            </div>

            {/* Chart Container */}
            <div ref={chartContainerRef} className="w-full h-[500px]" />

            {/* Info Bar */}
            <div className="mt-2 text-xs font-mono text-slate-500 flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                <div>
                    <span className="font-bold">{symbol}</span> • <span className="text-slate-400">{timeframe}</span> • <span className="text-slate-400">{filteredData.length} bars</span>
                </div>
                {filteredData.length > 0 && (
                    <div className="flex gap-4">
                        <span>O: <span className="text-slate-900">{filteredData[filteredData.length - 1]?.open.toFixed(2)}</span></span>
                        <span>H: <span className="text-emerald-600">{filteredData[filteredData.length - 1]?.high.toFixed(2)}</span></span>
                        <span>L: <span className="text-red-600">{filteredData[filteredData.length - 1]?.low.toFixed(2)}</span></span>
                        <span>C: <span className="font-bold text-slate-900">{filteredData[filteredData.length - 1]?.close.toFixed(2)}</span></span>
                        <span>V: <span className="text-blue-600">{Number(filteredData[filteredData.length - 1]?.volume).toLocaleString()}</span></span>
                    </div>
                )}
            </div>
        </div>
    );
}
