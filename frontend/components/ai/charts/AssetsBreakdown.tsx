"use client";

import React from "react";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AssetsBreakdownProps {
    title?: string;
    data: {
        years: number[];
        currency: string;
        total_assets: string;
        current_assets: string;
        composition: {
            label: string;
            value: number;
            formatted: string;
            percent: number;
        }[];
    };
    language?: "en" | "ar";
}

export function AssetsBreakdown({ title, data, language = "en" }: AssetsBreakdownProps) {
    if (!data || !data.composition || data.composition.length === 0) return null;

    const isRtl = language === "ar";

    const series = data.composition.map(c => c.value);
    const labels = data.composition.map(c => c.label);

    const options: any = {
        chart: {
            type: 'donut',
            fontFamily: 'inherit',
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
            }
        },
        labels: labels,
        colors: ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'],
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: '11px',
                            fontFamily: 'inherit',
                            fontWeight: 600,
                            color: '#64748b'
                        },
                        value: {
                            show: true,
                            fontSize: '18px',
                            fontFamily: 'inherit',
                            fontWeight: 900,
                            color: '#0f172a',
                            formatter: (val: any) => {
                                const num = Number(val);
                                if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
                                if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                                return formatNumber(num);
                            }
                        },
                        total: {
                            show: true,
                            showAlways: true,
                            label: isRtl ? 'إجمالي الأصول' : 'Total Assets',
                            fontSize: '10px',
                            fontFamily: 'inherit',
                            fontWeight: 800,
                            color: '#94a3b8',
                            formatter: function (w: any) {
                                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                                if (total >= 1000000000) return (total / 1000000000).toFixed(1) + 'B';
                                if (total >= 1000000) return (total / 1000000).toFixed(1) + 'M';
                                return formatNumber(total);
                            }
                        }
                    }
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: true,
            colors: ['transparent'],
            width: 2
        },
        legend: {
            position: 'right',
            horizontalAlign: isRtl ? 'right' : 'left',
            fontFamily: 'inherit',
            fontWeight: 600,
            fontSize: '12px',
            itemMargin: { vertical: 6 }
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
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-blue-50/50 to-white dark:from-blue-900/10 dark:to-transparent flex items-center justify-between">
                <div>
                    <h3 className="font-black text-slate-800 dark:text-white text-lg">{title || (isRtl ? "تحليل الأصول" : "Assets Breakdown")}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {data.currency} &bull; {isRtl ? "الأحدث" : "Latest"} ({data.years[0]})
                    </p>
                </div>
            </div>

            <div className="p-4 flex justify-center items-center h-[280px] w-full" dir="ltr">
                <Chart
                    options={options}
                    series={series}
                    type="donut"
                    height="100%"
                    width="100%"
                />
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                <div className="bg-white dark:bg-[#1A1F2E] p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{isRtl ? "أصول متداولة" : "Current Assets"}</div>
                    <div className="text-base font-black text-blue-600 dark:text-blue-400">{data.current_assets} {data.currency}</div>
                </div>
                <div className="bg-white dark:bg-[#1A1F2E] p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{isRtl ? "إجمالي الأصول" : "Total Assets"}</div>
                    <div className="text-base font-black text-slate-800 dark:text-white">{data.total_assets} {data.currency}</div>
                </div>
            </div>
        </div>
    );
}
