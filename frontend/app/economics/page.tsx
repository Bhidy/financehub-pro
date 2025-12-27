"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEconomicIndicators } from "@/lib/api";
import { TrendingUp, TrendingDown, Fuel, DollarSign, Percent, Globe, BarChart3, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import clsx from "clsx";

interface EconomicIndicator {
    id?: number;
    indicator_code: string;
    value: string | number;
    unit: string;
    date: string;
    source: string;
}

interface IndicatorGroup {
    latest: EconomicIndicator;
    history: EconomicIndicator[];
}

export default function EconomicsPage() {
    // Fetch latest economic indicators via centralized API
    const { data: indicators = [], isLoading } = useQuery({
        queryKey: ["economic-indicators"],
        queryFn: async () => fetchEconomicIndicators(365),
    });

    // Group by indicator code and get latest + history
    const indicatorGroups = useMemo(() => {
        const groups: Record<string, IndicatorGroup> = {};

        if (!Array.isArray(indicators)) return groups;

        indicators.forEach((ind: EconomicIndicator) => {
            if (!groups[ind.indicator_code]) {
                groups[ind.indicator_code] = {
                    latest: ind,
                    history: []
                };
            }
            // Update latest if this record is newer
            // Note: DB returns sorted by date DESC, so first one encountered might be latest if fetching all.
            // But we push all to history and sort later to be safe.
            groups[ind.indicator_code].history.push(ind);
        });

        // Sort history by date ASC for charts, and find true latest
        Object.keys(groups).forEach(code => {
            groups[code].history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            groups[code].latest = groups[code].history[groups[code].history.length - 1];
        });

        return groups;
    }, [indicators]);

    const getIndicatorChange = (code: string) => {
        const history = indicatorGroups[code]?.history || [];
        if (history.length < 2) return 0;
        const latest = Number(history[history.length - 1].value);
        const previous = Number(history[history.length - 2].value);
        if (previous === 0) return 0;
        return ((latest - previous) / previous) * 100;
    };

    const renderIndicatorCard = (code: string, title: string, Icon: React.ElementType, color: string) => {
        const data = indicatorGroups[code];
        if (!data) return null;

        const change = getIndicatorChange(code);
        const latestValue = Number(data.latest.value);

        return (
            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 transition-transform hover:-translate-y-1 hover:shadow-md" style={{ borderLeftColor: color }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-50">
                            <Icon className="w-5 h-5" style={{ color }} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 font-sans tracking-tight">{title}</h3>
                    </div>
                </div>

                <div className="flex items-baseline justify-between mb-4">
                    <div>
                        <div className="text-3xl font-bold text-slate-900 font-mono tracking-tighter">
                            {latestValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{data.latest.unit}</div>
                    </div>
                    <div className={clsx("flex items-center gap-1 text-sm font-bold bg-slate-50 px-2 py-1 rounded", change >= 0 ? "text-emerald-600" : "text-red-500")}>
                        {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(change).toFixed(2)}%
                    </div>
                </div>

                <div className="text-[10px] text-slate-400 font-medium mb-4 flex justify-between">
                    <span>{data.latest.source}</span>
                    <span>{new Date(data.latest.date).toLocaleDateString()}</span>
                </div>

                {/* Mini Chart */}
                <div className="h-16 w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.history.slice(-30)}>
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-600">Loading Economic Data...</h2>
                <p className="text-slate-400 mt-2">Connecting to global data feeds</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Globe className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Economic Command Center</h1>
                            <p className="text-blue-100 font-medium">Real-time tracking of Saudi and global economic indicators</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Summary Banner */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 divide-x divide-slate-100">
                        <div className="px-4 first:pl-0">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Market Status</div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200"></div>
                                <span className="text-xl font-bold text-slate-900">Live Updates</span>
                            </div>
                        </div>
                        <div className="px-4">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Indicators</div>
                            <div className="text-2xl font-bold text-slate-900 font-mono">
                                {Object.keys(indicatorGroups).length}
                            </div>
                        </div>
                        <div className="px-4">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data Points</div>
                            <div className="text-2xl font-bold text-slate-900 font-mono">
                                {indicators?.length || 0}
                            </div>
                        </div>
                        <div className="px-4">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Last Sync</div>
                            <div className="text-xl font-bold text-slate-900">
                                {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Energy & Commodities */}
                <div className="mb-10">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Fuel className="text-orange-500 w-5 h-5" />
                        Energy & Commodities
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {renderIndicatorCard("BRENT_OIL", "Brent Crude", Fuel, "#f97316")}
                        {renderIndicatorCard("WTI_OIL", "WTI Crude", Fuel, "#ea580c")}
                    </div>
                </div>

                {/* Currency Markets */}
                <div className="mb-10">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <DollarSign className="text-emerald-600 w-5 h-5" />
                        Currency Markets
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {renderIndicatorCard("SAR_USD", "SAR / USD", DollarSign, "#10b981")}
                        {renderIndicatorCard("EUR_USD", "EUR / USD", DollarSign, "#059669")}
                    </div>
                </div>

                {/* Interest Rates */}
                <div className="mb-10">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Percent className="text-blue-600 w-5 h-5" />
                        Interest Rates
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {renderIndicatorCard("SAMA_RATE", "SAMA Policy Rate", Percent, "#0ea5e9")}
                        {renderIndicatorCard("US_10Y", "US 10Y Treasury", Percent, "#0284c7")}
                    </div>
                </div>

                {/* Detailed Historical Chart (Featured) */}
                {indicatorGroups["BRENT_OIL"] && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Brent Crude Oil Trend</h2>
                                <p className="text-slate-500 text-sm">Historical price movement (1 Year)</p>
                            </div>
                            <div className="bg-orange-50 text-orange-700 px-3 py-1 rounded font-bold text-sm">
                                Energy Sector
                            </div>
                        </div>

                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={indicatorGroups["BRENT_OIL"].history}>
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#64748b' }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={40}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Price']}
                                        labelFormatter={(date) => new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#f97316"
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Market Insights Context */}
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                        <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                            Energy Markets Analysis
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Oil prices remain the primary driver for Saudi market liquidity. Recent trends in Brent Crude indicate sustained support above $75/barrel, positively impacting the petrochemical sector and government fiscal balance.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                        <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                            Monetary Policy Outlook
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            SAMA's policy rate continues to mirror the US Federal Reserve to maintain the currency peg. With rates stabilizing at 5.75%, banking sector margins remain robust while real estate lending faces moderate headwinds.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
