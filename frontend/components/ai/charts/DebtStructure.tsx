"use client";

import React from "react";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DebtStructureProps {
    title?: string;
    data: {
        years: number[];
        currency: string;
        debt_to_equity?: number;
        components: {
            label: string;
            values: string[];
            raw: number[];
        }[];
    };
    language?: "en" | "ar";
}

export function DebtStructure({ title, data, language = "en" }: DebtStructureProps) {
    if (!data || !data.components || data.components.length === 0) return null;

    const isRtl = language === "ar";

    // Years are DESC from backend, reverse them
    const categories = [...data.years].reverse().map(String);

    // We only want to plot the actual debt components in the stacked bar chart, not the Total or Net Cash/Debt row
    const plotLabels = ["Short-Term Debt", "Current Portion LTD", "Long-Term Debt"];
    const plotLabelsAr = ["ديون قصيرة الأجل", "الجزء المتداول من الديون طويلة الأجل", "ديون طويلة الأجل"];

    const series = data.components
        .filter(comp => plotLabels.includes(comp.label) || plotLabelsAr.includes(comp.label))
        .map(comp => ({
            name: comp.label,
            data: [...comp.raw].reverse()
        }));

    // Find Total Debt for the KPI display
    const totalDebtData = data.components.find(c => c.label === "Total Debt" || c.label === "إجمالي الديون");
    const netCashData = data.components.find(c => c.label === "Net Cash/Debt" || c.label === "صافي النقد/الديون");

    const latestTotalDebt = totalDebtData?.raw[0] || 0;
    const latestNetCash = netCashData?.raw[0] || 0;

    const options: any = {
        chart: {
            type: 'bar',
            stacked: true,
            fontFamily: 'inherit',
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
            }
        },
        colors: ['#f59e0b', '#f97316', '#ef4444'], // Orange to Red for debt
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 4,
                barHeight: '50%',
                dataLabels: {
                    position: 'center' // Place labels inside bars
                }
            },
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            width: 1,
            colors: ['#fff']
        },
        xaxis: {
            categories: categories,
            labels: {
                style: { colors: '#94a3b8', fontWeight: 600 },
                formatter: (val: any) => {
                    const num = Number(val);
                    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
                    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                    return val.toString();
                }
            },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            labels: {
                style: { colors: '#64748b', fontWeight: 600 }
            }
        },
        grid: {
            borderColor: 'rgba(148, 163, 184, 0.1)',
            strokeDashArray: 4,
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: false } }
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
                formatter: (val: any) => formatNumber(val) + " " + data.currency
            }
        }
    };

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden mt-2" dir={isRtl ? "rtl" : "ltr"}>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-orange-50/50 to-white dark:from-orange-900/10 dark:to-transparent flex items-center justify-between">
                <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-lg">{title || (isRtl ? "هيكل الديون" : "Debt Structure")}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {data.currency} &bull; {isRtl ? "السنوات" : "Years"} {categories[0]} - {categories[categories.length - 1]}
                    </p>
                </div>
                {data.debt_to_equity !== undefined && (
                    <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{isRtl ? "نسبة الدين لحقوق الملكية" : "Debt / Equity"}</span>
                        <span className={`text-xl font-black ${data.debt_to_equity > 2 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {data.debt_to_equity.toFixed(2)}x
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                <div className="bg-white dark:bg-[#1A1F2E] p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{isRtl ? "إجمالي الديون (الحديث)" : "Total Debt (Latest)"}</div>
                    <div className="text-lg font-black text-slate-800 dark:text-white">{formatNumber(latestTotalDebt)} {data.currency}</div>
                </div>
                <div className="bg-white dark:bg-[#1A1F2E] p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{isRtl ? "صافي النقد/الديون" : "Net Cash/Debt"}</div>
                    <div className={`text-lg font-black ${latestNetCash < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {formatNumber(latestNetCash)} {data.currency}
                    </div>
                </div>
            </div>

            <div className="p-4 h-[280px] w-full" dir="ltr">
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
