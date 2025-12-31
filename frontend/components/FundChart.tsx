ho"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart3 } from "lucide-react";
import clsx from "clsx";

interface FundChartProps {
    data: any[];
    period: string;
    colorId: string;
    dateRangeOrLabel?: { start: string, end: string };
}

// Separate component for strict client-side rendering
export default function FundChart({ data, period, colorId, dateRangeOrLabel }: FundChartProps) {
    if (!data || data.length < 2) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <BarChart3 className="w-12 h-12 mb-2 opacity-20" />
                <p className="font-bold text-sm">Insufficient data for this period</p>
            </div>
        );
    }

    return (
        <>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={colorId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(val) => {
                            // val is passed as string from the processing logic in parent
                            // We construct new Date(val). safeDate logic was applied in parent filter
                            // But here we just formatting.
                            const d = new Date(val);
                            if (isNaN(d.getTime())) return "";

                            if (period === "1M" || period === "3M") {
                                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            }
                            return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                        }}
                        minTickGap={50}
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                        tickFormatter={(val) => `${Number(val).toFixed(0)}`}
                        dx={-10}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            padding: '12px 16px'
                        }}
                        itemStyle={{ color: '#0f172a', fontWeight: 'bold', fontSize: '14px' }}
                        labelStyle={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(val: any) => [`SAR ${Number(val).toFixed(4)}`, "NAV"]}
                        labelFormatter={(l) => {
                            const d = new Date(l);
                            return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { dateStyle: 'full' });
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="nav"
                        stroke="#2563eb"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill={`url(#${colorId})`}
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                        animationDuration={1000}
                    />
                </AreaChart>
            </ResponsiveContainer>
            {/* Range Labels Overlay */}
            {dateRangeOrLabel && (
                <div className="absolute bottom-0 left-0 right-0 px-6 py-3 flex justify-between text-xs font-bold text-slate-400 pointer-events-none">
                    <span>{dateRangeOrLabel.start}</span>
                    <span>{dateRangeOrLabel.end}</span>
                </div>
            )}
        </>
    );
}
