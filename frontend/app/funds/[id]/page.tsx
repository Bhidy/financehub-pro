"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { fetchFund, fetchFundNav } from "@/lib/api";
import { Loader2, ArrowLeft, TrendingUp, Calendar, DollarSign, User } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import clsx from "clsx";

export default function FundDetailPage() {
    const params = useParams();
    const router = useRouter();
    const fundId = params.id as string;

    // 1. Fetch Fund Metadata
    const { data: fund, isLoading: loadingFund } = useQuery({
        queryKey: ["fund", fundId],
        queryFn: () => fetchFund(fundId),
        enabled: !!fundId
    });

    // 2. Fetch Full History
    const { data: history = [], isLoading: loadingHistory } = useQuery({
        queryKey: ["fund-nav", fundId, "full"],
        queryFn: async () => {
            const data = await fetchFundNav(fundId, 10000);
            // Ensure strict date ascending order for chart
            return Array.isArray(data) ? [...data].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];
        },
        enabled: !!fundId
    });

    if (loadingFund || loadingHistory) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-600">Loading Fund Insights...</h2>
                <p className="text-slate-400 mt-2">Retrieving 20+ years of historical data</p>
            </div>
        );
    }

    if (!fund) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900">Fund Not Found</h1>
                    <button onClick={() => router.back()} className="mt-4 text-blue-600 font-bold hover:underline">Go Back</button>
                </div>
            </div>
        );
    }

    // Calculations
    const latestNav = Number(fund.latest_nav || 0);
    const chartData = history.map((d: any) => ({
        date: d.date,
        nav: Number(d.nav),
        displayDate: new Date(d.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    }));

    // Performance
    const getReturn = (months: number) => {
        if (chartData.length === 0) return 0;
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - months);
        // Find closest data point
        const startPoint = chartData.find((d: any) => new Date(d.date) >= targetDate) || chartData[0];
        if (!startPoint) return 0;
        return ((latestNav - startPoint.nav) / startPoint.nav) * 100;
    };

    const ret1Y = getReturn(12);
    const ret3Y = getReturn(36);
    const ret5Y = getReturn(60);
    const retAll = chartData.length > 0 ? ((latestNav - chartData[0].nav) / chartData[0].nav) * 100 : 0;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-white/80 hover:text-white font-bold mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Funds
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <DollarSign className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Fund Details</h1>
                            <p className="text-blue-100 font-medium">Comprehensive fund analysis and historical data</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Header Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {fund.fund_type}
                                </span>
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                    <User className="w-3 h-3" /> {fund.manager_name}
                                </span>
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900 font-sans tracking-tight mb-2">
                                {fund.fund_name}
                            </h1>
                            <p className="text-slate-500 font-medium">
                                Fund ID: <span className="font-mono text-slate-700">{fund.fund_id}</span>
                            </p>
                        </div>

                        <div className="flex flex-col items-end">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Latest NAV</div>
                            <div className="text-5xl font-bold text-emerald-600 font-mono tracking-tighter">
                                {latestNav.toFixed(2)}
                                <span className="text-lg text-slate-400 ml-2 font-sans">SAR</span>
                            </div>
                            <div className="text-xs font-bold text-slate-400 mt-2 bg-slate-100 px-3 py-1 rounded-full">
                                As of {new Date(fund.last_update || Date.now()).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Chart & Info */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Interactive Chart */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    Historical Performance
                                </h3>
                                {/* Timeframe selectors could go here */}
                            </div>

                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorNav" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(val) => new Date(val).getFullYear().toString()}
                                            minTickGap={50}
                                            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 'bold' }}
                                            axisLine={false}
                                            tickLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 'bold' }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={40}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                            labelStyle={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
                                            formatter={(val: any) => [`SAR ${Number(val).toFixed(2)}`, "Net Asset Value"]}
                                            labelFormatter={(l) => new Date(l).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="nav"
                                            stroke="#2563eb"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorNav)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex justify-between text-xs font-bold text-slate-400 px-4">
                                <span>{chartData[0]?.date ? new Date(chartData[0].date).getFullYear() : ''}</span>
                                <span>Present</span>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Stats & Meta */}
                    <div className="space-y-6">

                        {/* Returns Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Return Analysis</h3>
                            <div className="space-y-4">
                                {[
                                    { label: "YTD", val: fund.ytd_return ?? retAll, isDb: !!fund.ytd_return },
                                    { label: "1 Year", val: fund.one_year_return ?? ret1Y, isDb: !!fund.one_year_return },
                                    { label: "3 Years", val: fund.three_year_return ?? ret3Y, isDb: !!fund.three_year_return },
                                    { label: "5 Years", val: fund.five_year_return ?? ret5Y, isDb: !!fund.five_year_return },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-500">{item.label}</span>
                                            {item.isDb && <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Official</span>}
                                        </div>
                                        <span className={clsx(
                                            "font-mono font-bold text-lg",
                                            (item.val || 0) >= 0 ? "text-emerald-600" : "text-red-500"
                                        )}>
                                            {(item.val || 0) > 0 ? "+" : ""}{Number(item.val || 0).toFixed(2)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Details Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Key Statistics</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Expense Ratio</div>
                                    <div className="text-2xl font-bold text-slate-900 font-mono">{Number(fund.expense_ratio || 0).toFixed(2)}%</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Min Investment</div>
                                    <div className="text-2xl font-bold text-slate-900 font-mono flex items-center gap-1">
                                        {Number(fund.minimum_investment || 0).toLocaleString()} <span className="text-sm text-slate-400">SAR</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Risk Analysis Card (NEW) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-6">Risk Analysis</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sharpe Ratio</div>
                                    <div className={clsx("text-2xl font-bold font-mono", (fund.sharpe_ratio || 0) >= 1 ? "text-emerald-600" : (fund.sharpe_ratio || 0) > 0 ? "text-blue-600" : "text-amber-500")}>
                                        {fund.sharpe_ratio ? Number(fund.sharpe_ratio).toFixed(2) : "N/A"}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">Risk-adjusted return &gt; 1.0 is good</p>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Volatility</div>
                                    <div className="text-2xl font-bold text-slate-900 font-mono">
                                        {fund.standard_deviation ? Number(fund.standard_deviation).toFixed(2) : "N/A"}%
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">Annualized std dev</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </main>
    )
}
