"use client";

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, ISeriesApi, Time, AreaSeries } from 'lightweight-charts';
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import clsx from "clsx";
import { PortfolioSnapshot } from "@/lib/api";

interface PortfolioChartProps {
    history: PortfolioSnapshot[] | undefined;
}

import { useMarketSafe } from "@/contexts/MarketContext";

import { useTheme } from "@/contexts/ThemeContext";

export function PortfolioChart({ history }: PortfolioChartProps) {
    const { config } = useMarketSafe();
    const { theme } = useTheme();
    const currency = config.currency;
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');

    const isDark = theme === 'dark';

    // Tooltip State
    const [tooltipData, setTooltipData] = useState<{
        value: string;
        date: string;
        x: number;
        y: number;
        visible: boolean;
    } | null>(null);

    // Data Processing
    const data = (history || []).map(item => ({
        time: item.snapshot_date as string,
        value: item.total_value
    }));

    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: isDark ? '#94a3b8' : '#64748b',
                fontFamily: 'Inter, system-ui, sans-serif',
            },
            grid: {
                vertLines: { color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)' },
                horzLines: { color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)' },
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
                    color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    width: 1,
                    style: 3,
                },
                horzLine: {
                    labelVisible: false,
                    color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    width: 1,
                    style: 3,
                },
            },
            handleScroll: false,
            handleScale: false,
        });

        const newSeries = chart.addSeries(AreaSeries, {
            lineColor: '#14B8A6',
            topColor: isDark ? 'rgba(20, 184, 166, 0.4)' : 'rgba(20, 184, 166, 0.2)',
            bottomColor: 'rgba(20, 184, 166, 0.0)',
            lineWidth: 3,
        });

        // @ts-ignore
        newSeries.setData(data);
        chart.timeScale().fitContent();

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
                        value: `${currency} ${(price / 1000).toFixed(1)}k`,
                        date: new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                        x: param.point.x,
                        y: param.point.y,
                        visible: true
                    });
                }
            }
        });

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
    }, [data, timeframe, isDark]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/10 dark:shadow-black/60 relative overflow-hidden h-[480px] group transition-colors duration-500"
        >
            {/* Ambient Background Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand-accent/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-brand-accent/10 transition-colors duration-700" />

            {/* Elite Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                        Portfolio Alpha
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        </span>
                    </h3>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Growth Index (NAV)</p>
                </div>

                {/* View Mode & Timeframe Selector */}
                <div className="flex flex-col xl:flex-row gap-4 items-end xl:items-center">
                    {/* View Mode Toggle */}
                    <div className="flex bg-slate-100 dark:bg-white/5 rounded-2xl p-1.5 border border-slate-200 dark:border-white/5 shadow-inner">
                        <button
                            onClick={() => console.log("Total view")} // Placeholder logic
                            className="px-4 py-2 text-xs font-black rounded-xl transition-all duration-500 tracking-tighter bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl"
                        >
                            Total Portfolio
                        </button>
                        <button
                            onClick={() => console.log("Selected view")} // Placeholder logic
                            className="px-4 py-2 text-xs font-black rounded-xl transition-all duration-500 tracking-tighter text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                            Selected Assets
                        </button>
                    </div>

                    {/* Timeframe Selector */}
                    <div className="flex bg-slate-100 dark:bg-white/5 rounded-2xl p-1.5 border border-slate-200 dark:border-white/5 shadow-inner">
                        {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t)}
                                className={clsx(
                                    "px-4 py-2 text-xs font-black rounded-xl transition-all duration-500 tracking-tighter",
                                    timeframe === t
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl scale-105"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart Interactive Zone */}
            <div className="relative w-full h-[350px]">
                {data.length > 0 ? (
                    <>
                        <div ref={chartContainerRef} className="w-full h-full" />

                        {/* Elite Floating Tooltip */}
                        <AnimatePresence>
                            {tooltipData && tooltipData.visible && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute pointer-events-none bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-2xl z-50 flex flex-col items-center min-w-[120px]"
                                    style={{
                                        left: Math.min(Math.max(tooltipData.x - 60, 0), (chartContainerRef.current?.clientWidth || 500) - 120),
                                        top: 10
                                    }}
                                >
                                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{tooltipData.date}</span>
                                    <span className="text-slate-900 dark:text-white text-xl font-black font-mono tracking-tight">{tooltipData.value}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                        <div className="w-20 h-20 rounded-[2rem] bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-6 shadow-xl border border-slate-100 dark:border-white/5">
                            <RefreshCw className="w-10 h-10 animate-spin-slow opacity-20" />
                        </div>
                        <p className="font-bold uppercase tracking-widest text-sm">Aggregating Historical Data...</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
