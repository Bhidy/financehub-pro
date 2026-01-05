"use client";

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import clsx from 'clsx';
import { Loader2, TrendingUp, TrendingDown, Maximize2 } from 'lucide-react';

interface OHLCData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface StockPriceChartProps {
    data: OHLCData[];
    symbol: string;
    change: number;
    changePercent: number;
}

const PERIODS = [
    { label: '1M', days: 30 },
    { label: '3M', days: 90 },
    { label: '6M', days: 180 },
    { label: '1Y', days: 365 },
    { label: 'YTD', days: 0 }, // Special handling
];

const formatDate = (dateStr: string) => {
    try {
        return format(parseISO(dateStr), 'MMM d');
    } catch (e) {
        return dateStr;
    }
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white/90 backdrop-blur-md border border-slate-100 p-4 rounded-xl shadow-xl">
                <p className="text-slate-500 text-xs font-semibold mb-1">{formatDate(data.date)} {new Date(data.date).getFullYear()}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900">{data.close.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 font-bold">EGP</span>
                </div>
                <div className="mt-2 text-xs space-y-1 text-slate-500">
                    <div className="flex justify-between gap-4"><span>High:</span> <span className="font-mono text-slate-700">{data.high}</span></div>
                    <div className="flex justify-between gap-4"><span>Low:</span> <span className="font-mono text-slate-700">{data.low}</span></div>
                    <div className="flex justify-between gap-4"><span>Vol:</span> <span className="font-mono text-slate-700">{(data.volume / 1000).toFixed(1)}K</span></div>
                </div>
            </div>
        );
    }
    return null;
};

export default function StockPriceChart({ data, symbol, change, changePercent }: StockPriceChartProps) {
    const [period, setPeriod] = useState('1Y');
    const [hoverData, setHoverData] = useState<OHLCData | null>(null);

    // Filter data based on period
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Sort by date ascending (oldest first) for the chart
        const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const now = new Date();
        const selectedPeriod = PERIODS.find(p => p.label === period);

        if (!selectedPeriod) return sortedData;

        let startDate: Date;
        if (period === 'YTD') {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else {
            startDate = subDays(now, selectedPeriod.days);
        }

        return sortedData.filter(item => isAfter(parseISO(item.date), startDate));
    }, [data, period]);

    if (!data || data.length === 0) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-3xl border border-slate-100">
                <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
                <p>No chart data available</p>
            </div>
        );
    }

    // Determine trend color
    const first = filteredData[0]?.close || 0;
    const last = filteredData[filteredData.length - 1]?.close || 0;
    const isPositive = last >= first;

    // Gradients
    const color = isPositive ? '#10b981' : '#ef4444'; // Emerald-500 or Red-500
    const gradientId = `chartGradient-${symbol}`;

    const currentPrice = hoverData ? hoverData.close : last;
    const priceChange = hoverData
        ? (hoverData.close - first)
        : (last - first);
    const priceChangePct = (priceChange / first) * 100;

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="flex flex-wrap justify-between items-start mb-8 z-10 relative">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Price Performance</h3>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{period}</span>
                    </div>

                    <div className="mt-2 flex items-baseline gap-3">
                        <span className="text-4xl font-black text-slate-900 tracking-tight">
                            {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xl font-medium text-slate-400">EGP</span>
                    </div>

                    <div className={clsx("flex items-center gap-2 mt-1 font-bold text-sm", isPositive ? "text-emerald-600" : "text-red-600")}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}</span>
                        <span>({priceChangePct.toFixed(2)}%)</span>
                        <span className="text-slate-400 font-normal ml-2">vs {period} start</span>
                    </div>
                </div>

                {/* Period Selector */}
                <div className="flex p-1 bg-slate-100 rounded-xl">
                    {PERIODS.map((p) => (
                        <button
                            key={p.label}
                            onClick={() => setPeriod(p.label)}
                            className={clsx(
                                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                period === p.label
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[350px] w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={filteredData}
                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                        onMouseMove={(e: any) => {
                            if (e.activePayload) {
                                setHoverData(e.activePayload[0].payload);
                            }
                        }}
                        onMouseLeave={() => setHoverData(null)}
                    >
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(val) => formatDate(val)}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                            minTickGap={40}
                            dy={10}
                        />
                        <YAxis
                            domain={['auto', 'auto']}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            tickFormatter={(val) => val.toLocaleString()}
                            dx={-10}
                            orientation="right"
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area
                            type="monotone"
                            dataKey="close"
                            stroke={color}
                            strokeWidth={3}
                            fill={`url(#${gradientId})`}
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
