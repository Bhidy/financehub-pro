"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CashflowWaterfallProps {
    title?: string;
    data: {
        years: number[];
        currency: string;
        waterfall: {
            year: number;
            operating: number;
            investing: number;
            financing: number;
            fx: number;
            net: number;
            beginning: number;
            ending: number;
        }[];
    };
    language?: "en" | "ar";
}

export function CashflowWaterfall({ title, data, language = "en" }: CashflowWaterfallProps) {
    const [selectedIdx, setSelectedIdx] = useState(0); // Default to newest year (index 0 since DESC)

    if (!data || !data.waterfall || data.waterfall.length === 0) return null;

    const isRtl = language === "ar";
    const currentData = data.waterfall[selectedIdx];

    // ApexCharts Waterfall expects data like:
    // { x: 'Operating', y: 100 }, { x: 'Investing', y: -50 }, etc.
    const chartData = [
        {
            x: isRtl ? "رصيد البداية" : 'Beginning Cash',
            y: currentData.beginning,
            fillColor: '#64748b'
        },
        {
            x: isRtl ? "تشغيلي" : 'Operating',
            y: currentData.operating
        },
        {
            x: isRtl ? "استثماري" : 'Investing',
            y: currentData.investing
        },
        {
            x: isRtl ? "تمويلي" : 'Financing',
            y: currentData.financing
        }
    ];

    if (currentData.fx !== 0) {
        chartData.push({
            x: isRtl ? "فروق عملة" : 'FX Effect',
            y: currentData.fx
        });
    }

    chartData.push({
        x: isRtl ? "صافي التغير" : 'Net Change',
        y: currentData.net
    });

    chartData.push({
        x: isRtl ? "رصيد النهاية" : 'Ending Cash',
        y: currentData.ending,
        fillColor: '#0f172a'
    });

    const series = [{
        name: isRtl ? 'التدفقات النقدية' : 'Cash Flow',
        data: chartData
    }];

    const options: ApexCharts.ApexOptions = {
        chart: {
            type: 'bar',
            fontFamily: 'inherit',
            toolbar: { show: false },
            zoom: { enabled: false }
        },
        plotOptions: {
            bar: {
                colors: {
                    ranges: [
                        { from: -9999999999999, to: -0.01, color: '#ef4444' }, // Red for negative
                        { from: 0.01, to: 9999999999999, color: '#10b981' }   // Green for positive
                    ]
                },
                columnWidth: '60%',
                borderRadius: 4
            }
        },
        dataLabels: {
            enabled: true,
            formatter: (val) => {
                const num = Number(val);
                if (Math.abs(num) >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
                if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(0) + 'M';
                return formatNumber(num);
            },
            style: {
                colors: ['#fff'],
                fontSize: '10px'
            }
        },
        xaxis: {
            type: 'category',
            labels: {
                style: { colors: '#64748b', fontWeight: 600, fontSize: '11px' }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                style: { colors: '#94a3b8', fontWeight: 500 },
                formatter: (val) => {
                    if (Math.abs(val) >= 1000000000) return (val / 1000000000).toFixed(1) + 'B';
                    if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                    return val.toString();
                }
            }
        },
        grid: {
            borderColor: 'rgba(148, 163, 184, 0.1)',
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } }
        },
        tooltip: {
            theme: 'light',
            y: {
                formatter: (val) => formatNumber(val) + " " + data.currency
            }
        }
    };

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden mt-2" dir={isRtl ? "rtl" : "ltr"}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-teal-50/50 to-white dark:from-teal-900/10 dark:to-transparent flex items-center justify-between">
                <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-lg">{title || (isRtl ? "شلال التدفقات النقدية" : "Cash Flow Waterfall")}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {data.currency} &bull; {isRtl ? "السنة المالية" : "Fiscal Year"} {currentData.year}
                    </p>
                </div>
                {data.years.length > 1 && (
                    <select
                        className="text-sm font-bold bg-white dark:bg-[#1A1F2E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-teal-500"
                        value={selectedIdx}
                        onChange={(e) => setSelectedIdx(Number(e.target.value))}
                        dir="ltr"
                    >
                        {data.waterfall.map((w, i) => (
                            <option key={i} value={i}>{w.year}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="p-4 h-[300px] w-full" dir="ltr">
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
