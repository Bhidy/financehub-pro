"use client";

import React from "react";
import dynamic from "next/dynamic";
import { translations } from "@/components/chatbot/translations";
import { formatNumber } from "@/lib/utils";

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface RevenueBreakdownProps {
    title?: string;
    data: {
        years: number[];
        currency: string;
        is_bank: boolean;
        components: {
            label: string;
            values: string[];
            raw: number[];
        }[];
    };
    language?: "en" | "ar";
}

export function RevenueBreakdown({ title, data, language = "en" }: RevenueBreakdownProps) {
    if (!data || !data.components || data.components.length === 0) return null;

    const isRtl = language === "ar";

    // The backend returns latest year first (DESC), so we reverse for left-to-right chronological plotting
    const categories = [...data.years].reverse().map(String);

    // We only want to stack the individual components, ignoring totals.
    // For non-banks: Revenue, Cost of Revenue, Gross Profit.
    // Wait, stacking Revenue and Cost of Revenue doesn't make sense since Revenue = Cost + Gross Profit.
    // If it's a bank, the components are the parts of revenue.
    // Let's determine how to plot based on is_bank or component labels.

    let series = [];
    let isStacked = false;

    if (data.is_bank) {
        // Banks have distinct revenue streams that sum up to total revenue
        isStacked = true;
        series = data.components.map(comp => ({
            name: comp.label,
            data: [...comp.raw].reverse()
        }));
    } else {
        // Non-banks return Revenue, Cost of Revenue, Gross Profit. 
        // Better to use a grouped column chart or standard line/bar combo.
        // Grouped column is good here.
        isStacked = false;
        series = data.components.map(comp => ({
            name: comp.label,
            data: [...comp.raw].reverse()
        }));
    }

    const options: any = {
        chart: {
            type: 'bar',
            fontFamily: 'inherit',
            stacked: isStacked,
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
            }
        },
        colors: ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'],
        plotOptions: {
            bar: {
                borderRadius: 4,
                columnWidth: '60%',
                dataLabels: {
                    position: 'top'
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: isStacked ? 0 : 2,
            colors: ['transparent']
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
                formatter: (val: any) => {
                    if (val >= 1000000000) return (val / 1000000000).toFixed(1) + 'B';
                    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
                    return val.toString();
                }
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
            markers: { radius: 12 }, // Used radius instead of shape for compatibility
            itemMargin: { horizontal: 10, vertical: 5 }
        },
        tooltip: {
            theme: 'light',
            y: {
                formatter: (val: any) => formatNumber(val) + " " + data.currency
            }
        }
    };

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden mt-2 p-5" dir={isRtl ? "rtl" : "ltr"}>
            <div className="mb-4">
                <h3 className="font-black text-slate-800 dark:text-white text-lg">{title || "Revenue Breakdown"}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {data.currency} &bull; {categories[0]} - {categories[categories.length - 1]}
                </p>
            </div>
            <div className="h-[280px] w-full" dir="ltr">
                <Chart
                    options={options}
                    series={series}
                    type="bar"
                    height="100%"
                    width="100%"
                />
            </div>
        </div>
    );
}
