"use client";

import { useMemo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

interface PortfolioForecastChartProps {
    currentValue: number;
    annualGrowthRate: number; // e.g. 0.08 for 8%
}

export function PortfolioForecastChart({ currentValue, annualGrowthRate }: PortfolioForecastChartProps) {

    const data = useMemo(() => {
        const d = [];
        const currentYear = new Date().getFullYear();
        for (let i = 0; i <= 5; i++) {
            d.push({
                year: currentYear + i,
                value: currentValue * Math.pow(1 + annualGrowthRate, i),
                type: i === 0 ? "Actual" : "Forecast"
            });
        }
        return d;
    }, [currentValue, annualGrowthRate]);

    return (
        <div className="w-full h-[350px]">
            <div className="flex justify-between items-center px-4 mb-2">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    5-Year Value Projection
                </h4>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-emerald-500">
                        {((Math.pow(1 + annualGrowthRate, 5) - 1) * 100).toFixed(0)}%
                    </span>
                    <span className="text-xs text-slate-400 font-bold uppercase">Total Return</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="year"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                        hide
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value: number | undefined) => [value ? `$${(value).toLocaleString()}` : '', "Est. Value"]}
                    />
                    <CartesianGrid vertical={false} stroke="#f1f5f9" opacity={0.5} />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
