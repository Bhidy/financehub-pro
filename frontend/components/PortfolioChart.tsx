"use client";

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, ISeriesApi, Time, AreaSeries } from 'lightweight-charts';
import { motion } from "framer-motion";
import clsx from "clsx";
import { PortfolioSnapshot } from "@/lib/api";

interface PortfolioChartProps {
    history: PortfolioSnapshot[] | undefined;
}

export function PortfolioChart({ history }: PortfolioChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');

    // Tooltip State
    const [tooltipData, setTooltipData] = useState<{
        value: string;
        date: string;
        x: number;
        y: number;
        visible: boolean;
    } | null>(null);

    // Data Processing
    // We expect history sorted by date ASC
    const data = (history || []).map(item => ({
        time: item.snapshot_date as string, // lightweight-charts handles 'YYYY-MM-DD' string
        value: item.total_value
    }));

    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 350,
            timeScale: {
                borderVisible: false,
                timeVisible: true,
            },
            rightPriceScale: {
                borderVisible: false,
            },
            crosshair: {
                vertLine: {
                    labelVisible: false,
                    color: 'rgba(255, 255, 255, 0.2)',
                    width: 1,
                    style: 3, // Dashed
                },
                horzLine: {
                    labelVisible: false,
                    color: 'rgba(255, 255, 255, 0.2)',
                    width: 1,
                    style: 3, // Dashed
                },
            },
            handleScroll: false,
            handleScale: false,
        });

        const newSeries = chart.addSeries(AreaSeries, {
            lineColor: '#3B82F6', // Blue-500
            topColor: 'rgba(59, 130, 246, 0.4)',
            bottomColor: 'rgba(59, 130, 246, 0.0)',
            lineWidth: 3,
        });

        // @ts-ignore - LW Charts time type mismatch fix
        newSeries.setData(data);

        // Fit Content
        chart.timeScale().fitContent();

        // Tooltip Logic
        chart.subscribeCrosshairMove(param => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > chartContainerRef.current!.clientWidth ||
                param.point.y < 0 ||
                param.point.y > chartContainerRef.current!.clientHeight
            ) {
                setTooltipData(null);
            } else {
                const price = param.seriesData.get(newSeries) as number | undefined;
                if (price !== undefined) {
                    const dateStr = param.time as string;
                    setTooltipData({
                        value: `SAR ${(price / 1000).toFixed(1)}k`,
                        date: new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                        x: param.point.x,
                        y: param.point.y,
                        visible: true
                    });
                }
            }
        });

        // Resize Observer
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, timeframe]); // Re-create on data change

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#151925] border border-white/5 rounded-[32px] p-8 shadow-2xl shadow-black/40 relative overflow-hidden h-[480px]"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 relative z-10">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Portfolio Performance
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                    </h3>
                    <p className="text-sm font-medium text-slate-400">Net Asset Value (NAV)</p>
                </div>

                {/* Timeframe Toggles */}
                <div className="flex bg-white/5 rounded-xl p-1.5 border border-white/5">
                    {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            className={clsx(
                                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300",
                                timeframe === t
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Area */}
            <div className="relative w-full h-[350px]">
                {data.length > 0 ? (
                    <>
                        <div ref={chartContainerRef} className="w-full h-full" />

                        {/* Custom Floating Tooltip */}
                        {tooltipData && tooltipData.visible && (
                            <div
                                className="absolute pointer-events-none bg-slate-800/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl z-50 flex flex-col items-center min-w-[100px]"
                                style={{
                                    left: Math.min(Math.max(tooltipData.x - 50, 0), (chartContainerRef.current?.clientWidth || 500) - 100),
                                    top: 10 // Fixed top position is cleaner than following Y
                                }}
                            >
                                <span className="text-slate-400 text-xs font-bold uppercase">{tooltipData.date}</span>
                                <span className="text-white text-lg font-black font-mono">{tooltipData.value}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <span className="text-2xl">📉</span>
                        </div>
                        <p className="font-medium">No history data available yet</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
