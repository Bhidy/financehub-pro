"use client";

import React from "react";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface RatioHistoryChartProps {
    title?: string;
    data: {
        years: number[];
        currency: string;
        metric: string;
        series: {
            name: string;
            data: number[];
            format: string;
        }[];
    };
    language?: "en" | "ar";
}

export function RatioHistoryChart({ title, data, language = "en" }: RatioHistoryChartProps) {
    if (!data || !data.series || data.series.length === 0) return null;

    const isRtl = language === "ar";

    // Years are DESC from backend, reverse them
    const categories = [...data.years].reverse().map(String);

    const series = data.series.map(s => ({
        name: s.name,
        data: [...s.data].reverse(),
        format: s.format
    }));

    // Determine Y-axis formatting based on the majority format or first series format
    const primaryFormat = series[0]?.format || 'number';

    const formatAxisValue = (val: number, format: string) => {
        if (format === 'percent') return (val * 100).toFixed(1) + '%';
        if (format === 'currency') {
            const num = Number(val);
            if (Math.abs(num) >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
            if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
            return val.toFixed(0);
        }
        if (format === 'ratio') return val.toFixed(2) + 'x';
        return val.toFixed(2);
    };

    const options: ApexCharts.ApexOptions = {
        chart: {
            type: 'line',
            fontFamily: 'inherit',
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
            },
            dropShadow: {
                enabled: true,
                color: '#000',
                top: 18,
                left: 7,
                blur: 10,
                opacity: 0.05
            }
        },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
        stroke: {
            curve: 'smooth',
            width: 3
        },
        markers: {
            size: 4,
            colors: ['#fff'],
            strokeColors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
            strokeWidth: 2,
            hover: {
                size: 7
            }
        },
        xaxis: {
            categories: categories,
            labels: {
                style: { colors: '#94a3b8', fontWeight: 600 }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                style: { colors: '#94a3b8', fontWeight: 500 },
                formatter: (val) => formatAxisValue(val, primaryFormat)
            },
        },
        grid: {
            borderColor: 'rgba(148, 163, 184, 0.1)',
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
            padding: { top: 0, right: 0, bottom: 0, left: 10 }
        },
        legend: {
            position: 'top',
            horizontalAlign: isRtl ? 'right' : 'left',
            fontFamily: 'inherit',
            fontWeight: 600,
            itemMargin: { horizontal: 10, vertical: 5 }
        },
        tooltip: {
            theme: 'light',
            y: {
                formatter: function (val, { seriesIndex }) {
                    const fmt = series[seriesIndex].format;
                    if (fmt === 'currency') return formatNumber(val) + " " + data.currency;
                    return formatAxisValue(val, fmt);
                }
            }
        }
    };

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden mt-2 p-5" dir={isRtl ? "rtl" : "ltr"}>
            <div className="mb-4">
                <h3 className="font-black text-slate-800 dark:text-white text-lg">{title || "Trend History"}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {data.currency} &bull; {categories[0]} - {categories[categories.length - 1]}
                </p>
            </div>
            <div className="h-[300px] w-full" dir="ltr">
                <Chart
                    options={options}
                    series={series}
                    type="line"
                    height="100%"
                    width="100%"
                />
            </div>
        </div>
    );
}
