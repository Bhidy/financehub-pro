"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, TrendingUp, TrendingDown, BarChart3, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { fetchMarketBreadth } from "@/lib/api";

export default function MarketPulsePage() {
    // Fetch market breadth
    const { data: breadth, isLoading } = useQuery({
        queryKey: ["market-breadth"],
        queryFn: async () => {
            const data = await fetchMarketBreadth(30);
            return data.slice().reverse(); // Oldest to newest for chart, but note: API might return sorted. Original code revered.
            // Original code: return data.reverse(); 
            // Warning: .reverse() mutates in place. fetchMarketBreadth returns data.
            // If data is array, we should clone it before reversing if we want to be safe, or just reverse.
        },
    });

    // Get latest day
    const latest = breadth?.[breadth.length - 1];
    const advanceRatio = latest ? (latest.advancing / latest.total_stocks) * 100 : 50;
    const volumeRatio = latest ? (latest.advance_volume / (latest.advance_volume + latest.decline_volume)) * 100 : 50;

    // Calculate advance/decline line (cumulative)
    const adLine = breadth?.map((day: any, idx: number) => {
        const netAdvances = day.advancing - day.declining;
        const cumulativeAD = breadth.slice(0, idx + 1).reduce((sum: number, d: any) => sum + (d.advancing - d.declining), 0);
        return {
            date: day.date,
            ad_line: cumulativeAD,
            advancing: day.advancing,
            declining: day.declining,
            new_highs: day.new_highs,
            new_lows: day.new_lows,
        };
    });

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Activity className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Market Pulse Dashboard</h1>
                            <p className="text-blue-100 font-medium">Real-time market health indicators • 30 days tracked</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Market Health Score */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-slate-100">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Market Health Score</h2>
                        <div className={`text-7xl font-bold ${advanceRatio > 60 ? 'text-green-600' :
                            advanceRatio > 40 ? 'text-yellow-600' :
                                'text-red-600'
                            }`}>
                            {advanceRatio.toFixed(0)}%
                        </div>
                        <p className="text-lg text-slate-600 mt-2">
                            {advanceRatio > 60 ? '🟢 Bullish Market' :
                                advanceRatio > 40 ? '🟡 Neutral Market' :
                                    '🔴 Bearish Market'}
                        </p>
                    </div>

                    {/* Gauge Visual */}
                    <div className="relative mt-6">
                        <div className="h-6 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"></div>
                        <div
                            className="absolute top-0 h-6 w-2 bg-slate-900 rounded-full"
                            style={{ left: `${advanceRatio}%`, transform: 'translateX(-50%)' }}
                        ></div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-600">
                        <span>Bearish</span>
                        <span>Neutral</span>
                        <span>Bullish</span>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm text-slate-500">Advancing Stocks</div>
                            <TrendingUp className="text-green-600 w-6 h-6" />
                        </div>
                        <div className="text-4xl font-bold text-green-600">{latest?.advancing || 0}</div>
                        <div className="text-xs text-slate-600 mt-1">
                            {advanceRatio.toFixed(1)}% of market
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm text-slate-500">Declining Stocks</div>
                            <TrendingDown className="text-red-600 w-6 h-6" />
                        </div>
                        <div className="text-4xl font-bold text-red-600">{latest?.declining || 0}</div>
                        <div className="text-xs text-slate-600 mt-1">
                            {(100 - advanceRatio).toFixed(1)}% of market
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-emerald-500">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm text-slate-500">New 52-Week Highs</div>
                            <BarChart3 className="text-emerald-600 w-6 h-6" />
                        </div>
                        <div className="text-4xl font-bold text-emerald-600">{latest?.new_highs || 0}</div>
                        <div className="text-xs text-slate-600 mt-1">Strong momentum</div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm text-slate-500">New 52-Week Lows</div>
                            <BarChart3 className="text-orange-600 w-6 h-6 rotate-180" />
                        </div>
                        <div className="text-4xl font-bold text-orange-600">{latest?.new_lows || 0}</div>
                        <div className="text-xs text-slate-600 mt-1">Weak momentum</div>
                    </div>
                </div>

                {/* Advance/Decline Line Chart */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Activity className="text-blue-600" />
                        Advance/Decline Line (30 Days)
                    </h2>
                    {isLoading ? (
                        <div className="text-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={adLine}>
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: any, name: any) => {
                                        if (name === 'ad_line') return [value, 'Cumulative A/D'];
                                        return [value, name];
                                    }}
                                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="ad_line"
                                    stroke="#0ea5e9"
                                    strokeWidth={3}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Volume Analysis */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Volume Flow Analysis</h2>
                    <div className="mb-4">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-semibold text-green-700">Advancing Volume</span>
                            <span className="text-sm text-slate-600">
                                {latest ? (latest.advance_volume / 1000000).toFixed(1) : 0}M SAR
                            </span>
                        </div>
                        <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500"
                                style={{ width: `${volumeRatio}%` }}
                            ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-semibold text-red-700">Declining Volume</span>
                            <span className="text-sm text-slate-600">
                                {latest ? (latest.decline_volume / 1000000).toFixed(1) : 0}M SAR
                            </span>
                        </div>
                        <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-500"
                                style={{ width: `${100 - volumeRatio}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="text-blue-600 w-5 h-5" />
                            <span className="text-sm font-semibold text-blue-900">
                                Money is flowing {volumeRatio > 50 ? 'INTO' : 'OUT OF'} the market
                                ({volumeRatio.toFixed(1)}% advancing volume)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Daily Breadth History */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Daily Breadth History</h2>
                    <div className="space-y-3">
                        {breadth?.slice().reverse().slice(0, 10).map((day: any) => {
                            const dayRatio = (day.advancing / day.total_stocks) * 100;
                            return (
                                <div key={day.date} className="border border-slate-200 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-900">
                                            {new Date(day.date).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${dayRatio > 60 ? 'bg-green-100 text-green-700' :
                                            dayRatio > 40 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {dayRatio.toFixed(0)}% Up
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                                        <div>
                                            <div className="text-xs text-slate-500">Adv</div>
                                            <div className="font-bold text-green-600">{day.advancing}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Dec</div>
                                            <div className="font-bold text-red-600">{day.declining}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Highs</div>
                                            <div className="font-bold text-emerald-600">{day.new_highs}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500">Lows</div>
                                            <div className="font-bold text-orange-600">{day.new_lows}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
}
