"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ChartPayload } from "@/hooks/useAIChat";
import { useTheme } from "@/contexts/ThemeContext";

// Dynamic import to prevent SSR issues with ApexCharts
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ChartCardProps {
    chart: ChartPayload;
    height?: number;
}

export function ChartCard({ chart, height = 350 }: ChartCardProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const { chartOptions, chartSeries } = useMemo(() => {
        if (!chart?.data?.length) {
            return { chartOptions: null, chartSeries: null };
        }

        const isCandlestick = chart.type === "candlestick";
        const isPieOrDonut = chart.type === "pie" || chart.type === "donut";
        const isBarOrColumn = chart.type === "bar" || chart.type === "column";

        const primaryTextColor = isDark ? "#f8fafc" : "#1e293b";
        const secondaryTextColor = isDark ? "#94a3b8" : "#64748b";
        const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9";

        if (isCandlestick) {
            const series = [{
                name: chart.symbol,
                data: chart.data.map((d: any) => ({
                    x: new Date(d.time).getTime(),
                    y: [d.open || 0, d.high || 0, d.low || 0, d.close || 0]
                }))
            }];

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "candlestick",
                    height,
                    toolbar: { show: true },
                    animations: { enabled: true, speed: 500 },
                    background: "transparent"
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                title: {
                    text: chart.title || `${chart.symbol} - ${chart.range}`,
                    align: "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor }
                },
                xaxis: {
                    type: "datetime",
                    labels: { style: { colors: secondaryTextColor } }
                },
                yaxis: {
                    labels: {
                        formatter: (val) => val.toFixed(2),
                        style: { colors: secondaryTextColor }
                    }
                },
                grid: { borderColor }
            };
            return { chartOptions: options, chartSeries: series };

        } else if (isPieOrDonut) {
            const series = chart.data.map((d: any) => d.value || 0);
            const labels = chart.data.map((d: any) => d.label || "Unknown");

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: chart.type as "pie" | "donut",
                    height,
                    toolbar: { show: true },
                    animations: { enabled: true },
                    background: "transparent"
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                labels: labels,
                title: {
                    text: chart.title,
                    align: "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor }
                },
                legend: {
                    position: 'bottom',
                    labels: { colors: primaryTextColor }
                },
                dataLabels: { enabled: true },
                colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
            };
            return { chartOptions: options, chartSeries: series };

        } else if (isBarOrColumn) {
            const series = [{
                name: "Value",
                data: chart.data.map((d: any) => d.value || 0)
            }];
            const categories = chart.data.map((d: any) => d.label || "");

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "bar",
                    height,
                    toolbar: { show: true },
                    background: "transparent"
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                plotOptions: {
                    bar: {
                        horizontal: chart.type === "bar",
                        borderRadius: 4,
                        columnWidth: '50%'
                    }
                },
                xaxis: {
                    categories: categories,
                    labels: { style: { fontSize: "11px", colors: secondaryTextColor } }
                },
                yaxis: {
                    labels: { style: { colors: secondaryTextColor } }
                },
                title: {
                    text: chart.title,
                    align: "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor }
                },
                grid: { borderColor },
                colors: ["#3b82f6"]
            };
            return { chartOptions: options, chartSeries: series };

        } else if (chart.type === "radar") {
            const series = [{
                name: "Score",
                data: chart.data.map((d: any) => d.value || 0)
            }];
            const categories = chart.data.map((d: any) => d.label || "");

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "radar",
                    height,
                    toolbar: { show: false },
                    animations: { enabled: true },
                    background: "transparent"
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                xaxis: {
                    categories: categories,
                    labels: {
                        style: {
                            fontSize: "11px",
                            fontFamily: "Inter, sans-serif",
                            colors: [secondaryTextColor]
                        }
                    }
                },
                yaxis: { show: false },
                title: {
                    text: chart.title,
                    align: "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor }
                },
                fill: { opacity: 0.2, colors: ["#8b5cf6"] },
                stroke: { show: true, width: 2, colors: ["#8b5cf6"] },
                markers: {
                    size: 4,
                    colors: ["#8b5cf6"],
                    strokeColors: isDark ? "#0f172a" : "#fff",
                    strokeWidth: 2
                },
                colors: ["#8b5cf6"]
            };
            return { chartOptions: options, chartSeries: series };

        } else if (chart.type === "heatmap" || (chart.type as any) === "treemap") {
            const series = [{
                name: "Market Heatmap",
                data: chart.data.map((d: any) => ({
                    x: d.label || d.symbol,
                    y: d.value || 0
                }))
            }];

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "heatmap",
                    height,
                    toolbar: { show: false },
                    background: "transparent"
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                plotOptions: {
                    heatmap: {
                        shadeIntensity: 0.5,
                        radius: 4,
                        useFillColorAsStroke: false,
                        colorScale: {
                            ranges: [
                                { from: -100, to: -2, color: '#ef4444', name: 'Loss' },
                                { from: -2, to: 2, color: isDark ? '#475569' : '#94a3b8', name: 'Neutral' },
                                { from: 2, to: 100, color: '#10b981', name: 'Gain' }
                            ]
                        }
                    }
                },
                dataLabels: { enabled: false },
                title: {
                    text: chart.title,
                    align: "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor }
                }
            };
            return { chartOptions: options, chartSeries: series };

        } else if (chart.type === "radialBar" || chart.type === "gauge") {
            const series = chart.data.map((d: any) => d.value || 0);
            const labels = chart.data.map((d: any) => d.label || "Metric");

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "radialBar",
                    height,
                    animations: { enabled: true },
                    background: "transparent"
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                plotOptions: {
                    radialBar: {
                        startAngle: -135,
                        endAngle: 135,
                        hollow: {
                            margin: 15,
                            size: '60%',
                        },
                        dataLabels: {
                            show: true,
                            name: {
                                offsetY: -10,
                                show: true,
                                color: secondaryTextColor,
                                fontSize: '14px'
                            },
                            value: {
                                offsetY: 5,
                                color: primaryTextColor,
                                fontSize: '24px',
                                show: true,
                            }
                        }
                    }
                },
                labels: labels,
                fill: {
                    type: 'gradient',
                    gradient: {
                        shade: isDark ? 'dark' : 'light',
                        type: 'horizontal',
                        shadeIntensity: 0.5,
                        gradientToColors: ['#ABE5A1'],
                        inverseColors: true,
                        opacityFrom: 1,
                        opacityTo: 1,
                        stops: [0, 100]
                    }
                },
                stroke: { lineCap: 'round' },
                colors: ['#20E647'],
                title: {
                    text: chart.title,
                    align: "center",
                    style: { fontSize: "16px", fontWeight: 600, color: primaryTextColor }
                }
            };
            return { chartOptions: options, chartSeries: series };

        } else {
            const series = [{
                name: "Price",
                data: chart.data.map((d: any) => ({
                    x: new Date(d.time).getTime(),
                    y: d.close || d.value || 0
                }))
            }];

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "area",
                    height,
                    toolbar: { show: false },
                    zoom: { enabled: false },
                    background: "transparent"
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                title: { text: chart.title, style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor } },
                xaxis: {
                    type: "datetime",
                    labels: { style: { colors: secondaryTextColor, fontSize: '11px' } },
                    axisBorder: { show: false },
                    axisTicks: { show: false }
                },
                yaxis: {
                    labels: {
                        formatter: (val) => val.toFixed(2),
                        style: { colors: secondaryTextColor, fontSize: '11px' }
                    }
                },
                grid: {
                    borderColor: borderColor,
                    strokeDashArray: 4,
                    yaxis: { lines: { show: true } },
                    xaxis: { lines: { show: false } }
                },
                fill: {
                    type: "gradient",
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.4,
                        opacityTo: 0.05,
                        stops: [0, 100]
                    }
                },
                stroke: { curve: "smooth", width: 2 },
                colors: ["#3b82f6"]
            };
            return { chartOptions: options, chartSeries: series };
        }
    }, [chart, height, isDark]);

    if (!chartOptions || !chartSeries) {
        return (
            <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-xl text-center text-slate-500 dark:text-slate-400">
                No chart data available
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-xl border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="p-4">
                <Chart
                    options={chartOptions}
                    series={chartSeries}
                    type={chart.type === "candlestick" ? "candlestick" :
                        chart.type === "donut" ? "donut" :
                            chart.type === "pie" ? "pie" :
                                chart.type === "bar" ? "bar" :
                                    chart.type === "radar" ? "radar" :
                                        chart.type === "heatmap" ? "heatmap" :
                                            chart.type === "radialBar" ? "radialBar" : "area"}
                    height={height}
                />
            </div>
            {/* Range selector buttons */}
            <div className="flex items-center gap-2 px-4 pb-4">
                {["1D", "1W", "1M", "1Y", "MAX"].map((range) => (
                    <button
                        key={range}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors
                            ${chart.range === range
                                ? "bg-blue-500 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                    >
                        {range}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default ChartCard;
