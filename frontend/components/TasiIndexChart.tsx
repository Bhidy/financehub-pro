"use client";

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

import { fetchHistory } from '@/lib/api';

async function fetchTasiHistory() {
    // improved: use the centralized API client which points to Hetzner
    const data = await fetchHistory('TASI');
    return data;
}

export default function TasiIndexChart() {
    const { data: history, isLoading } = useQuery({
        queryKey: ['tasi-history'],
        queryFn: fetchTasiHistory,
        refetchInterval: 300000 // Refetch every 5 mins
    });

    const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y');

    // Filter data based on period
    const filteredData = history ? history.filter((item: any) => {
        const date = new Date(item.date); // 'time' column comes as 'date' from API
        const now = new Date();
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);

        if (period === '1M') return diffDays <= 30;
        if (period === '3M') return diffDays <= 90;
        if (period === '6M') return diffDays <= 180;
        return true; // 1Y (default limit of API)
    }).reverse() : []; // API returns DESC, chart needs ASC

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!history || history.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-slate-400">
                No historical data available
            </div>
        );
    }

    // Determine trend color based on start/end of period
    const first = filteredData[0]?.close || 0;
    const last = filteredData[filteredData.length - 1]?.close || 0;
    const isPositive = last >= first;
    const color = isPositive ? '#10b981' : '#ef4444'; // Emerald or Red

    return (
        <div className="relative">
            {/* Period Selectors */}
            <div className="absolute top-0 right-0 z-10 flex gap-1">
                {['1M', '3M', '6M', '1Y'].map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p as any)}
                        className={clsx(
                            "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                            period === p
                                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
                        )}
                    >
                        {p}
                    </button>
                ))}
            </div>

            <div className="h-[280px] w-full mt-8">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(val) => format(new Date(val), 'MMM d')}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            minTickGap={40}
                        />
                        <YAxis
                            domain={['auto', 'auto']}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            tickFormatter={(val) => val.toLocaleString()}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(val: any) => [val.toLocaleString(), 'Index']}
                            labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                        />
                        <Area
                            type="monotone"
                            dataKey="close"
                            stroke={color}
                            strokeWidth={2}
                            fill="url(#chartGradient)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
