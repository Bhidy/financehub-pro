"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ChartPayload } from "@/hooks/useAIChat";

// Dynamic import to prevent SSR issues with ApexCharts
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ChartCardProps {
    chart: ChartPayload;
    height?: number;
}

export function ChartCard({ chart, height = 350 }: ChartCardProps) {
    const { chartOptions, chartSeries } = useMemo(() => {
        if (!chart?.data?.length) {
            return { chartOptions: null, chartSeries: null };
        }

        const isCandlestick = chart.type === "candlestick";
        const isPieOrDonut = chart.type === "pie" || chart.type === "donut";
        const isBarOrColumn = chart.type === "bar" || chart.type === "column";

        if (isCandlestick) {
            // Candlestick Logic (Keep existing)
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
                title: {
                    text: chart.title || `${chart.symbol} - ${chart.range}`,
                    align: "left",
                    style: { fontSize: "14px", fontWeight: 600, color: "#1e293b" }
                },
                xaxis: { type: "datetime" },
                yaxis: { labels: { formatter: (val) => val.toFixed(2) } }
            };
            return { chartOptions: options, chartSeries: series };

        } else if (isPieOrDonut) {
            // Pie/Donut Logic
            const series = chart.data.map((d: any) => d.value || 0);
            const labels = chart.data.map((d: any) => d.label || "Unknown");

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: chart.type as "pie" | "donut",
                    height,
                    toolbar: { show: true },
                    animations: { enabled: true }
                },
                labels: labels,
                title: {
                    text: chart.title,
                    align: "left",
                    style: { fontSize: "14px", fontWeight: 600, color: "#1e293b" }
                },
                legend: { position: 'bottom' },
                dataLabels: { enabled: true },
                colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
            };
            return { chartOptions: options, chartSeries: series };

        } else if (isBarOrColumn) {
            // ... existing bar logic ...
            // (Copy existing logic here or ensure it matches view)
            // Bar/Column Logic (Categorical)
            const series = [{
                name: "Value",
                data: chart.data.map((d: any) => d.value || 0)
            }];
            const categories = chart.data.map((d: any) => d.label || "");

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "bar",
                    height,
                    toolbar: { show: true }
                },
                plotOptions: {
                    bar: {
                        horizontal: chart.type === "bar", // Bar is horizontal, Column is vertical
                        borderRadius: 4,
                        columnWidth: '50%'
                    }
                },
                xaxis: {
                    categories: categories,
                    labels: { style: { fontSize: "11px" } }
                },
                title: {
                    text: chart.title,
                    align: "left",
                    style: { fontSize: "14px", fontWeight: 600, color: "#1e293b" }
                },
                colors: ["#3b82f6"]
            };
            return { chartOptions: options, chartSeries: series };

        } else if (chart.type === "radar") {
            // Radar Chart Logic (Enhanced)
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
                    animations: { enabled: true }
                },
                xaxis: {
                    categories: categories,
                    labels: {
                        style: {
                            fontSize: "11px",
                            fontFamily: "Inter, sans-serif",
                            colors: ["#64748b"]
                        }
                    }
                },
                yaxis: { show: false },
                title: {
                    text: chart.title,
                    align: "left",
                    style: { fontSize: "14px", fontWeight: 600, color: "#1e293b" }
                },
                fill: {
                    opacity: 0.2,
                    colors: ["#8b5cf6"]
                },
                stroke: {
                    show: true,
                    width: 2,
                    colors: ["#8b5cf6"],
                    dashArray: 0
                },
                markers: {
                    size: 4,
                    colors: ["#8b5cf6"],
                    strokeColors: "#fff",
                    strokeWidth: 2
                },
                colors: ["#8b5cf6"]
            };
            return { chartOptions: options, chartSeries: series };

        } else if (chart.type === "heatmap" || (chart.type as any) === "treemap") {
            // Heatmap/Treemap Logic (New)
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
                    toolbar: { show: false }
                },
                plotOptions: {
                    heatmap: {
                        shadeIntensity: 0.5,
                        radius: 4,
                        useFillColorAsStroke: false,
                        colorScale: {
                            ranges: [
                                { from: -100, to: -2, color: '#ef4444', name: 'Loss' },
                                { from: -2, to: 2, color: '#94a3b8', name: 'Neutral' },
                                { from: 2, to: 100, color: '#10b981', name: 'Gain' }
                            ]
                        }
                    }
                },
                dataLabels: { enabled: false },
                title: {
                    text: chart.title,
                    align: "left",
                    style: { fontSize: "14px", fontWeight: 600, color: "#1e293b" }
                }
            };
            return { chartOptions: options, chartSeries: series };

        } else {
            // Line/Area Logic (Fallback)
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
                    zoom: { enabled: false }
                },
                title: { text: chart.title, style: { fontSize: "14px", fontWeight: 600, color: "#1e293b" } },
                xaxis: {
                    type: "datetime",
                    labels: { style: { colors: '#64748b', fontSize: '11px' } },
                    axisBorder: { show: false },
                    axisTicks: { show: false }
                },
                yaxis: {
                    labels: {
                        formatter: (val) => val.toFixed(2),
                        style: { colors: '#64748b', fontSize: '11px' }
                    }
                },
                grid: {
                    borderColor: '#f1f5f9',
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
    }, [chart, height]);

    if (!chartOptions || !chartSeries) {
        return (
            <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-500">
                No chart data available
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4">
                <Chart
                    options={chartOptions}
                    series={chartSeries}
                    type={chart.type === "candlestick" ? "candlestick" :
                        chart.type === "donut" ? "donut" :
                            chart.type === "pie" ? "pie" :
                                chart.type === "bar" ? "bar" :
                                    chart.type === "radar" ? "radar" :
                                        chart.type === "heatmap" ? "heatmap" : "area"}
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
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
