"use client";

import { useMemo } from "react";
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from "recharts";

interface GrowthDataPoint {
    year: number | string;
    revenue: number;
    earnings: number;
    isForecast: boolean;
}

interface FutureGrowthChartProps {
    data: GrowthDataPoint[];
}

export function FutureGrowthChart({ data }: FutureGrowthChartProps) {

    return (
        <div className="w-full h-[350px]">
            <div className="flex justify-between items-center px-4 mb-2">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Revenue & Earnings Forecast</h4>
                <div className="flex gap-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span> Revenue</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-sky-400 rounded-full"></span> Earnings</span>
                    <span className="flex items-center gap-1 opacity-50"><span className="w-2 h-2 border border-slate-400 border-dashed rounded-full"></span> Forecast</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="year"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                        yAxisId="left"
                        hide
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        tickFormatter={(val) => `${(val / 1e9).toFixed(0)}B`}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value: number | undefined) => [value ? `${(value / 1e6).toFixed(1)}M` : '', ""]}
                    />

                    {/* Revenue Bars */}
                    <Bar yAxisId="right" dataKey="revenue" barSize={32} radius={[6, 6, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-rev-${index}`}
                                fill={entry.isForecast ? "rgba(99, 102, 241, 0.3)" : "#6366f1"}
                                stroke={entry.isForecast ? "#6366f1" : "none"}
                                strokeDasharray={entry.isForecast ? "4 4" : "0"}
                            />
                        ))}
                    </Bar>

                    {/* Earnings Line (Smoothed) */}
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="earnings"
                        stroke="#38bdf8"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#38bdf8", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
