"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from "recharts";

interface ValuationChartProps {
    currentPrice: number;
    fairValue: number;
    currency?: string;
}

export function ValuationChart({ currentPrice, fairValue, currency = "SAR" }: ValuationChartProps) {

    // Calculate percentage difference
    const diffPercent = ((fairValue - currentPrice) / currentPrice) * 100;
    const isUndervalued = diffPercent > 0;
    const color = isUndervalued ? "#10B981" : "#EF4444"; // Emerald vs Red

    const data = [
        { name: "Current", value: currentPrice, type: "Current Price", color: "#64748b" },
        { name: "Fair Value", value: fairValue, type: "Fair Value (DCF)", color: color }
    ];

    return (
        <div className="w-full h-[300px] flex flex-col justify-center">
            <div className="text-center mb-4">
                <span className={`text-4xl font-black font-mono tracking-tighter`} style={{ color }}>
                    {Math.abs(diffPercent).toFixed(1)}%
                </span>
                <span className="text-slate-500 font-bold ml-2 uppercase text-sm tracking-widest">
                    {isUndervalued ? "Undervalued" : "Overvalued"}
                </span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    barSize={40}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.1)" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fill: '#64748b', fontWeight: 'bold', fontSize: 12 }}
                        width={80}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff' }}
                        formatter={(value: number | undefined) => [value ? `${currency} ${value.toFixed(2)}` : '', 'Price']}
                    />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <p className="text-center text-xs text-slate-400 mt-2 max-w-sm mx-auto">
                Fair value calculated using 2-Stage Discounted Cash Flow (DCF) model based on analyst free cash flow forecasts.
            </p>
        </div>
    );
}
