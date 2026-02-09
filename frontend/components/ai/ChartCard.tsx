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
    language?: "en" | "ar";
}

export function ChartCard({ chart, height = 350, language = "en" }: ChartCardProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const isRtl = language === "ar";
    const locale = isRtl ? "ar-EG" : "en-US";
    const chartFontFamily = isRtl ? "Cairo, sans-serif" : "Inter, sans-serif";
    const ui = useMemo(() => (
        isRtl
            ? {
                unknown: "غير معروف",
                value: "القيمة",
                score: "النتيجة",
                marketHeatmap: "خريطة حرارة السوق",
                loss: "خسارة",
                neutral: "محايد",
                gain: "مكسب",
                metric: "مؤشر",
                revenue: "الإيرادات",
                netIncome: "صافي الربح",
                billion: "مليار",
                million: "مليون",
                performance: "الأداء (%)",
                price: "السعر",
                noChartData: "لا توجد بيانات للرسم البياني",
            }
            : {
                unknown: "Unknown",
                value: "Value",
                score: "Score",
                marketHeatmap: "Market Heatmap",
                loss: "Loss",
                neutral: "Neutral",
                gain: "Gain",
                metric: "Metric",
                revenue: "Revenue",
                netIncome: "Net Income",
                billion: "Billion",
                million: "Million",
                performance: "Performance (%)",
                price: "Price",
                noChartData: "No chart data available",
            }
    ), [isRtl]);

    const { chartOptions, chartSeries } = useMemo(() => {
        if (!chart?.data?.length) {
            return { chartOptions: null, chartSeries: null };
        }

        const isCandlestick = chart.type === "candlestick";
        const isPieOrDonut = chart.type === "pie" || chart.type === "donut";
        const isBarOrColumn = chart.type === "bar" || chart.type === "column";
        const isFinancialGrowth = chart.type === "financial_growth";

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
                    background: "transparent",
                    fontFamily: chartFontFamily
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                title: {
                    text: chart.title || `${chart.symbol} - ${chart.range}`,
                    align: isRtl ? "right" : "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor, fontFamily: chartFontFamily }
                },
                xaxis: {
                    type: "datetime",
                    labels: { style: { colors: secondaryTextColor, fontFamily: chartFontFamily } }
                },
                yaxis: {
                    labels: {
                        formatter: (val) => val.toFixed(2),
                        style: { colors: secondaryTextColor, fontFamily: chartFontFamily }
                    }
                },
                grid: { borderColor }
            };
            return { chartOptions: options, chartSeries: series };

        } else if (isPieOrDonut) {
            const series = chart.data.map((d: any) => d.value || 0);
            const labels = chart.data.map((d: any) => d.label || ui.unknown);

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: chart.type as "pie" | "donut",
                    height,
                    toolbar: { show: true },
                    animations: { enabled: true },
                    background: "transparent",
                    fontFamily: chartFontFamily
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                labels: labels,
                title: {
                    text: chart.title,
                    align: isRtl ? "right" : "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor, fontFamily: chartFontFamily }
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
            // Updated to handle both single series and multi-series (grouped)
            // Backend sends: [{ label: 'Net Margin', 'COMI': 20, 'TMGH': 15 }, ...]

            let series: any[] = [];
            let categories: string[] = [];

            if (chart.data && chart.data.length > 0) {
                const firstItem = chart.data[0];
                // Extract keys excluding standard label fields
                // We cast to any to bypass strict type checks on the 'protected' interface
                const safeItem = firstItem as any;
                const dataKeys = Object.keys(safeItem).filter(k =>
                    k !== 'label' && k !== 'metric' && k !== 'time' && k !== 'value'
                );

                categories = chart.data.map((d: any) => d.label || d.metric || "");

                if (dataKeys.length > 0) {
                    // Multi-Series (Grouped) from Keys
                    series = dataKeys.map(key => ({
                        name: key,
                        data: chart.data.map((d: any) => d[key] || 0)
                    }));
                } else {
                    // Single Series (Standard 'value' field)
                    series = [{
                        name: "Value",
                        data: chart.data.map((d: any) => d.value || 0)
                    }];
                }
            }

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "bar",
                    height,
                    toolbar: { show: true },
                    background: "transparent",
                    stacked: false, // Grouped bars side-by-side
                    fontFamily: chartFontFamily
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                plotOptions: {
                    bar: {
                        horizontal: chart.type === "bar", // 'bar' is horizontal, 'column' is vertical in Apex
                        borderRadius: 4,
                        columnWidth: '55%',
                        dataLabels: {
                            position: 'top', // top, center, bottom
                        },
                    }
                },
                xaxis: {
                    categories: categories,
                    labels: { style: { fontSize: "11px", colors: secondaryTextColor, fontFamily: chartFontFamily } }
                },
                yaxis: {
                    labels: { style: { colors: secondaryTextColor, fontFamily: chartFontFamily } }
                },
                title: {
                    text: chart.title,
                    align: isRtl ? "right" : "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor, fontFamily: chartFontFamily }
                },
                dataLabels: {
                    enabled: true,
                        formatter: function (val: number) {
                            return val.toFixed(1) + "%";
                        },
                        offsetY: -20,
                        style: {
                            fontSize: '10px',
                            colors: [primaryTextColor],
                            fontFamily: chartFontFamily
                        }
                    },
                grid: { borderColor },
                colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
                legend: {
                    position: 'top',
                    labels: { colors: primaryTextColor }
                }
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
                    background: "transparent",
                    fontFamily: chartFontFamily
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                xaxis: {
                    categories: categories,
                    labels: {
                        style: {
                            fontSize: "11px",
                            fontFamily: chartFontFamily,
                            colors: [secondaryTextColor]
                        }
                    }
                },
                yaxis: { show: false },
                title: {
                    text: chart.title,
                    align: isRtl ? "right" : "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor, fontFamily: chartFontFamily }
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
                name: ui.marketHeatmap,
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
                    background: "transparent",
                    fontFamily: chartFontFamily
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                plotOptions: {
                    heatmap: {
                        shadeIntensity: 0.5,
                        radius: 4,
                        useFillColorAsStroke: false,
                        colorScale: {
                            ranges: [
                                { from: -100, to: -2, color: '#ef4444', name: ui.loss },
                                { from: -2, to: 2, color: isDark ? '#475569' : '#94a3b8', name: ui.neutral },
                                { from: 2, to: 100, color: '#10b981', name: ui.gain }
                            ]
                        }
                    }
                },
                dataLabels: { enabled: false },
                title: {
                    text: chart.title,
                    align: isRtl ? "right" : "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor, fontFamily: chartFontFamily }
                }
            };
            return { chartOptions: options, chartSeries: series };

        } else if (chart.type === "radialBar" || chart.type === "gauge") {
            const series = chart.data.map((d: any) => d.value || 0);
            const labels = chart.data.map((d: any) => d.label || ui.metric);

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "radialBar",
                    height,
                    animations: { enabled: true },
                    background: "transparent",
                    fontFamily: chartFontFamily
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
                                fontSize: '14px',
                                fontFamily: chartFontFamily
                            },
                            value: {
                                offsetY: 5,
                                color: primaryTextColor,
                                fontSize: '24px',
                                show: true,
                                fontFamily: chartFontFamily
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
                    style: { fontSize: "16px", fontWeight: 600, color: primaryTextColor, fontFamily: chartFontFamily }
                }
            };
            return { chartOptions: options, chartSeries: series };

        } else if (isFinancialGrowth) {
            const series = [
                {
                    name: ui.revenue,
                    data: chart.data.map((d: any) => ({
                        x: d.time || d.label,
                        y: d.revenue || 0
                    }))
                },
                {
                    name: ui.netIncome,
                    data: chart.data.map((d: any) => ({
                        x: d.time || d.label,
                        y: d.net_income || 0
                    }))
                }
            ];

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "area",
                    height,
                    toolbar: { show: true },
                    zoom: { enabled: false },
                    background: "transparent",
                    stacked: false,
                    fontFamily: chartFontFamily
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                title: {
                    text: chart.title,
                    align: isRtl ? "right" : "left",
                    style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor, fontFamily: chartFontFamily }
                },
                xaxis: {
                    categories: chart.data.map((d: any) => d.time || d.label),
                    labels: { style: { fontSize: "11px", colors: secondaryTextColor, fontFamily: chartFontFamily } },
                    tooltip: { enabled: false }
                },
                yaxis: {
                    labels: {
                        formatter: (val) => {
                            if (val >= 1000000000) return (val / 1000000000).toFixed(2) + "B";
                            if (val >= 1000000) return (val / 1000000).toFixed(2) + "M";
                            if (val >= 1000) return (val / 1000).toFixed(2) + "K";
                            return val.toFixed(0);
                        },
                        style: { colors: secondaryTextColor, fontSize: "10px", fontFamily: chartFontFamily }
                    }
                },
                dataLabels: { enabled: false },
                stroke: {
                    curve: 'smooth',
                    width: [3, 3]
                },
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.6,
                        opacityTo: 0.1,
                        stops: [0, 90, 100]
                    }
                },
                colors: ["#3b82f6", "#10b981"], // Blue for Revenue, Green (Profit) for Net Income
                grid: {
                    borderColor: borderColor,
                    strokeDashArray: 4,
                    yaxis: { lines: { show: true } }
                },
                tooltip: {
                    theme: isDark ? 'dark' : 'light',
                    y: {
                        formatter: function (val: number) {
                            if (val >= 1000000000) return `${(val / 1000000000).toFixed(2)} ${ui.billion}`;
                            if (val >= 1000000) return `${(val / 1000000).toFixed(2)} ${ui.million}`;
                            return val.toLocaleString(locale);
                        }
                    }
                },
                legend: {
                    position: 'top',
                    horizontalAlign: 'right',
                    labels: { colors: primaryTextColor }
                }
            };
            return { chartOptions: options, chartSeries: series };

        } else if (chart.type === "line" && chart.symbol.includes(" vs ")) {
            // Multi-Series Comparison Chart
            // Data format: [{ time: '...', SYMB1: 10.2, SYMB2: 12.5 }]
            if (!chart.data || chart.data.length === 0) return { chartOptions: null, chartSeries: null };

            // Extract keys from first data point (excluding 'time')
            const keys = Object.keys(chart.data[0]).filter(k => k !== 'time');

            const series = keys.map(key => ({
                name: key,
                data: chart.data.map((d: any) => ({
                    x: new Date(d.time).getTime(),
                    y: d[key] || 0
                }))
            }));

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "line",
                    height,
                    toolbar: { show: true },
                    zoom: { enabled: true },
                    background: "transparent",
                    fontFamily: chartFontFamily
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                title: { text: chart.title, align: isRtl ? "right" : "left", style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor, fontFamily: chartFontFamily } },
                xaxis: {
                    type: "datetime",
                    labels: { style: { colors: secondaryTextColor, fontSize: '11px', fontFamily: chartFontFamily } },
                    tooltip: { enabled: false }
                },
                yaxis: {
                    labels: {
                        formatter: (val) => val.toFixed(2) + "%",
                        style: { colors: secondaryTextColor, fontSize: '11px', fontFamily: chartFontFamily }
                    },
                    title: { text: ui.performance, style: { color: secondaryTextColor, fontSize: '10px', fontFamily: chartFontFamily } }
                },
                grid: {
                    borderColor: borderColor,
                    strokeDashArray: 4,
                    yaxis: { lines: { show: true } },
                    xaxis: { lines: { show: false } }
                },
                stroke: { curve: "smooth", width: 3 },
                colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
                legend: {
                    position: 'top',
                    labels: { colors: primaryTextColor }
                },
                tooltip: {
                    theme: isDark ? 'dark' : 'light',
                    y: {
                        formatter: (val) => val.toFixed(2) + "%"
                    }
                }
            };
            return { chartOptions: options, chartSeries: series };

        } else {
            const series = [{
                name: ui.price,
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
                    background: "transparent",
                    fontFamily: chartFontFamily
                },
                theme: { mode: isDark ? 'dark' : 'light' },
                title: { text: chart.title, align: isRtl ? "right" : "left", style: { fontSize: "14px", fontWeight: 600, color: primaryTextColor, fontFamily: chartFontFamily } },
                xaxis: {
                    type: "datetime",
                    labels: { style: { colors: secondaryTextColor, fontSize: '11px', fontFamily: chartFontFamily } },
                    axisBorder: { show: false },
                    axisTicks: { show: false }
                },
                yaxis: {
                    labels: {
                        formatter: (val) => val.toFixed(2),
                        style: { colors: secondaryTextColor, fontSize: '11px', fontFamily: chartFontFamily }
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
    }, [chart, height, isDark, chartFontFamily, isRtl, locale, ui]);

    if (!chartOptions || !chartSeries) {
        return (
            <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-xl text-center text-slate-500 dark:text-slate-400">
                {ui.noChartData}
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
                                            chart.type === "radialBar" ? "radialBar" :
                                                chart.type === "financial_growth" ? "area" : "area"}
                    height={height}
                />
            </div>

        </div>
    );
}

export default ChartCard;
