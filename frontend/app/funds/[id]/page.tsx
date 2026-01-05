"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import dynamic from 'next/dynamic';
import { fetchFund, fetchFundNav } from "@/lib/api";
import { Loader2, ArrowLeft, TrendingUp, DollarSign, User, Shield, AlertTriangle, Info } from "lucide-react";
import clsx from "clsx";

// Dynamically import Chart to disable SSR and prevent hydration mismatch
const FundChart = dynamic(() => import('@/components/FundChart'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-50/50">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
    )
});

// --- Enterprise-Grade Helpers for Data Safety ---

const safeDate = (dateInput: any): Date | null => {
    if (dateInput === null || dateInput === undefined) return null;
    try {
        const d = new Date(dateInput);
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
};

const safeNumber = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isFinite(num) ? num : null;
};

type ChartPeriod = "1M" | "3M" | "1Y" | "3Y" | "5Y" | "ALL";

export default function FundDetailPage() {
    const params = useParams();
    const router = useRouter();
    const fundId = params?.id as string;
    const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("ALL");

    // 1. Fetch Fund Metadata
    const { data: fund, isLoading: loadingFund, isError: isFundError } = useQuery({
        queryKey: ["fund", fundId],
        queryFn: async () => {
            if (!fundId) throw new Error("No Fund ID");
            return fetchFund(fundId);
        },
        enabled: !!fundId,
        staleTime: 1000 * 60 * 5,
    });

    // 2. Fetch Full History
    const { data: history = [], isLoading: loadingHistory } = useQuery({
        queryKey: ["fund-nav", fundId, "full"],
        queryFn: async () => {
            if (!fundId) return [];
            try {
                const data = await fetchFundNav(fundId, 10000);
                if (!Array.isArray(data)) return [];
                return [...data]
                    .filter(item => safeDate(item.date) !== null && safeNumber(item.nav) !== null)
                    .sort((a: any, b: any) => {
                        const tA = safeDate(a.date)?.getTime() || 0;
                        const tB = safeDate(b.date)?.getTime() || 0;
                        return tA - tB;
                    });
            } catch (error) {
                console.error("Failed to fetch fund history:", error);
                return [];
            }
        },
        enabled: !!fundId,
        staleTime: 1000 * 60 * 60,
    });

    // 3. Filter and Memoize Chart Data
    const filteredChartData = useMemo(() => {
        if (!history || !Array.isArray(history) || history.length === 0) return [];

        let chartData = history.map((d: any) => ({
            date: d.date,
            nav: safeNumber(d.nav) ?? 0,
        }));

        if (chartPeriod !== "ALL") {
            const now = new Date();
            let startDate = new Date();

            switch (chartPeriod) {
                case "1M": startDate.setMonth(now.getMonth() - 1); break;
                case "3M": startDate.setMonth(now.getMonth() - 3); break;
                case "1Y": startDate.setFullYear(now.getFullYear() - 1); break;
                case "3Y": startDate.setFullYear(now.getFullYear() - 3); break;
                case "5Y": startDate.setFullYear(now.getFullYear() - 5); break;
            }

            chartData = chartData.filter(d => {
                const date = safeDate(d.date);
                return date && date >= startDate;
            });
        }

        if (chartData.length > 2000) {
            const step = Math.ceil(chartData.length / 2000);
            chartData = chartData.filter((_, i) => i % step === 0);
        }

        return chartData;
    }, [history, chartPeriod]);

    const latestNav = safeNumber(fund?.latest_nav) ?? 0;

    // Performance Calculations
    const getReturn = (months: number) => {
        if (!history || history.length === 0 || latestNav === 0) return null;
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() - months);
        const startPoint = history.find((d: any) => {
            const date = safeDate(d.date);
            return date && date >= targetDate;
        });
        if (!startPoint) return null;
        const startNav = safeNumber(startPoint.nav);
        if (!startNav || startNav === 0) return null;
        return ((latestNav - startNav) / startNav) * 100;
    };

    const ret1Y = getReturn(12);
    const ret3Y = getReturn(36);
    const ret5Y = getReturn(60);

    const chartPerformance = useMemo(() => {
        if (filteredChartData.length < 2) return null;
        const first = filteredChartData[0].nav;
        const last = filteredChartData[filteredChartData.length - 1].nav;
        if (first === 0) return null;
        return ((last - first) / first) * 100;
    }, [filteredChartData]);

    const dateRangeLabel = useMemo(() => {
        if (filteredChartData.length === 0) return { start: "", end: "" };
        const s = safeDate(filteredChartData[0]?.date);
        const e = safeDate(filteredChartData[filteredChartData.length - 1]?.date);
        return {
            start: s?.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) ?? "",
            end: e?.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) ?? ""
        };
    }, [filteredChartData]);

    // UI States
    if (loadingFund) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-600">Loading Fund Insights...</h2>
            </div>
        );
    }

    if (isFundError || !fund) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full">
                    <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Fund Not Found</h1>
                    <button onClick={() => router.back()} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl mt-4">
                        Back to Funds
                    </button>
                </div>
            </div>
        );
    }

    const sharpeRatio = safeNumber(fund.sharpe_ratio);
    const stdDev = safeNumber(fund.standard_deviation);
    const isValidSharpe = sharpeRatio !== null && Math.abs(sharpeRatio) < 100;
    const isValidStdDev = stdDev !== null && stdDev > 0 && stdDev < 1000;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-12" suppressHydrationWarning>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-6 md:py-8">
                    <button onClick={() => router.back()} className="flex items-center text-white/90 hover:text-white font-bold mb-6 transition-colors group">
                        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Funds
                    </button>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
                                <DollarSign className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight" dir="auto">
                                    {fund.fund_name_en || fund.fund_name}
                                </h1>
                                <p className="text-blue-50 font-medium text-base mt-1 opacity-90">
                                    {fund.symbol || fund.fund_id} • {fund.currency || 'EGP'}
                                </p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 min-w-[160px]">
                            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Latest NAV</p>
                            <div className="text-3xl font-black font-mono tracking-tight flex items-baseline gap-1">
                                {latestNav.toFixed(2)}
                                <span className="text-sm font-sans font-bold opacity-70">{fund.currency || 'EGP'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Meta Info with more details */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-8 flex flex-wrap gap-4 justify-between items-center">
                    <div className="flex flex-wrap gap-3">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-blue-100">
                            {fund.classification || fund.fund_type || "Mutual Fund"}
                        </span>
                        {fund.eligibility && (
                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-emerald-100">
                                {fund.eligibility}
                            </span>
                        )}
                        {fund.establishment_date && (
                            <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold border border-amber-100">
                                Est. {safeDate(fund.establishment_date)?.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                    {(fund.manager_name_en || fund.manager_name) && (
                        <span className="text-slate-500 text-sm font-bold flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" /> {fund.manager_name_en || fund.manager_name}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Chart Section */}
                    <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden min-w-0 flex flex-col">
                        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" /> Performance
                                </h3>
                                {chartPerformance !== null && (
                                    <p className={clsx("text-xl font-black font-mono mt-1", chartPerformance >= 0 ? "text-emerald-600" : "text-red-600")}>
                                        {chartPerformance >= 0 ? "+" : ""}{chartPerformance.toFixed(2)}%
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
                                {(["1M", "3M", "1Y", "3Y", "5Y", "ALL"] as ChartPeriod[]).map((period) => (
                                    <button
                                        key={period}
                                        onClick={() => setChartPeriod(period)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                                            chartPeriod === period ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {period}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-[400px] w-full relative group bg-white">
                            <FundChart
                                data={filteredChartData}
                                period={chartPeriod}
                                colorId="colorNavDetail"
                                dateRangeOrLabel={dateRangeLabel}
                            />
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full blur-2xl pointer-events-none"></div>
                            <h3 className="text-lg font-bold text-slate-900 mb-5 relative z-10 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-500" /> Returns
                            </h3>
                            <div className="space-y-4 relative z-10">
                                {[
                                    { label: "YTD", val: fund.ytd_return, isDb: true },
                                    { label: "1 Year", val: fund.one_year_return ?? ret1Y, isDb: !!safeNumber(fund.one_year_return) },
                                    { label: "3 Years", val: fund.three_year_return ?? ret3Y, isDb: !!safeNumber(fund.three_year_return) },
                                    { label: "5 Years", val: fund.five_year_return ?? ret5Y, isDb: !!safeNumber(fund.five_year_return) },
                                ].map((item, i) => {
                                    const val = safeNumber(item.val);
                                    return (
                                        <div key={i} className="flex justify-between items-center pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-600">{item.label}</span>
                                                {item.isDb && val !== null && <span className="text-[9px] text-blue-400 font-bold uppercase">Official</span>}
                                            </div>
                                            <span className={clsx("font-mono font-bold text-lg", !val ? "text-slate-300" : val >= 0 ? "text-emerald-600" : "text-red-500")}>
                                                {val !== null ? `${val > 0 ? "+" : ""}${val.toFixed(2)}%` : "—"}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-500" /> Risk
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-2xl p-3">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Sharpe</div>
                                    <div className={clsx("text-xl font-black font-mono", isValidSharpe ? "text-blue-600" : "text-slate-300")}>
                                        {isValidSharpe ? sharpeRatio!.toFixed(2) : "—"}
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-3">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Vol (Std)</div>
                                    <div className={clsx("text-xl font-black font-mono", isValidStdDev ? "text-slate-900" : "text-slate-300")}>
                                        {isValidStdDev ? `${stdDev!.toFixed(2)}%` : "—"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-2xl border border-blue-100/50 p-4 flex gap-3 items-center">
                            <Info className="w-4 h-4 text-blue-400" />
                            <p className="text-xs text-blue-800/70 font-medium">
                                {filteredChartData.length} data points. {fund.last_updated && `Updated ${safeDate(fund.last_updated)?.toLocaleDateString()}.`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Investment Strategy Section - Full Width */}
                {fund.investment_strategy && (
                    <div className="mt-8 bg-white rounded-3xl shadow-xl border border-slate-100 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-teal-50 rounded-full blur-2xl pointer-events-none"></div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 relative z-10">
                            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-lg">📊</span>
                            Investment Strategy
                        </h3>
                        <p className="text-slate-600 leading-relaxed text-sm relative z-10">
                            {fund.investment_strategy}
                        </p>
                    </div>
                )}

                {/* Fund Profile Info - Complete Details */}
                <div className="mt-8 bg-white rounded-3xl shadow-xl border border-slate-100 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-50 to-orange-50 rounded-full blur-2xl pointer-events-none"></div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 relative z-10">
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-lg">📋</span>
                        Fund Profile
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                        {/* Fund Manager */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                <User className="w-3 h-3" /> Fund Manager
                            </div>
                            <div className="text-sm font-bold text-slate-800">
                                {fund.manager_name_en || fund.manager_name || "—"}
                            </div>
                        </div>

                        {/* Owner */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">🏛️ Owner</div>
                            <div className="text-sm font-bold text-slate-800">
                                {fund.owner_name_en || fund.owner_name || fund.manager_name_en || "—"}
                            </div>
                        </div>

                        {/* Currency */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">💱 Currency</div>
                            <div className="text-sm font-bold text-slate-800">
                                {fund.currency || "EGP"}
                            </div>
                        </div>

                        {/* Establishment Date */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">📅 Est. Date</div>
                            <div className="text-sm font-bold text-slate-800">
                                {fund.establishment_date ? safeDate(fund.establishment_date)?.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : "—"}
                            </div>
                        </div>

                        {/* Eligibility */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">🌍 Eligibility</div>
                            <div className="text-sm font-bold text-slate-800">
                                {fund.eligibility || "All Nationalities"}
                            </div>
                        </div>

                        {/* Market */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">📍 Market</div>
                            <div className="text-sm font-bold text-slate-800">
                                {fund.market_code === "EGX" ? "🇪🇬 Egyptian Exchange" : fund.market_code === "TDWL" ? "🇸🇦 Saudi Exchange" : fund.market_code || "—"}
                            </div>
                        </div>

                        {/* Fund Type */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">📂 Classification</div>
                            <div className="text-sm font-bold text-slate-800">
                                {fund.classification || fund.fund_type || "Mutual Fund"}
                            </div>
                        </div>

                        {/* Symbol */}
                        {fund.symbol && (
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">🏷️ Symbol</div>
                                <div className="text-sm font-bold text-blue-600 font-mono">
                                    {fund.symbol}
                                </div>
                            </div>
                        )}

                        {/* Latest NAV */}
                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                            <div className="text-xs font-bold text-emerald-600 uppercase mb-1">💰 Latest NAV</div>
                            <div className="text-lg font-black text-emerald-700 font-mono">
                                {latestNav.toFixed(4)} <span className="text-sm font-normal">{fund.currency || "EGP"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Extended Performance Grid - Full Width */}
                <div className="mt-8 bg-white rounded-3xl shadow-xl border border-slate-100 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-full blur-2xl pointer-events-none"></div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 relative z-10">
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white text-lg">📈</span>
                        Complete Performance Grid
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 relative z-10">
                        {[
                            { label: "1 Week", val: fund.profit_week },
                            { label: "1 Month", val: fund.profit_month },
                            { label: "3 Months", val: fund.profit_3month },
                            { label: "6 Months", val: fund.profit_6month },
                            { label: "YTD", val: fund.ytd_return },
                            { label: "1 Year", val: fund.one_year_return },
                            { label: "3 Years", val: fund.three_year_return },
                            { label: "5 Years", val: fund.five_year_return },
                            { label: "52W High", val: fund.profit_52w_high },
                            { label: "52W Low", val: fund.profit_52w_low },
                        ].map((item, i) => {
                            const val = safeNumber(item.val);
                            const isPositive = val !== null && val >= 0;
                            return (
                                <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">{item.label}</div>
                                    <div className={clsx(
                                        "text-lg font-black font-mono",
                                        val === null ? "text-slate-300" : isPositive ? "text-emerald-600" : "text-red-500"
                                    )}>
                                        {val !== null ? `${isPositive ? '+' : ''}${val.toFixed(2)}%` : "—"}
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

