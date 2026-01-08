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

interface FundDetails {
    fund_id: string;
    fund_name: string;
    fund_name_en: string | null;
    symbol: string | null;
    market_code: string | null;
    currency: string | null;
    latest_nav: number;
    last_updated: string | null;

    // Classification
    fund_type: string | null;
    classification: string | null;
    eligibility: string | null;
    investment_strategy: string | null;
    establishment_date: string | null;

    // People
    manager_name: string | null;
    manager_name_en: string | null;
    manager: string | null;
    owner_name: string | null;
    owner_name_en: string | null;
    issuer: string | null;

    // Metrics (Legacy & New)
    ytd_return: number | null;
    one_year_return: number | null;
    three_year_return: number | null;
    five_year_return: number | null;
    profit_3month: number | null;
    profit_6month: number | null;
    profit_month: number | null;
    profit_week: number | null;
    profit_52w_high: number | null;
    profit_52w_low: number | null;

    returns_3m: number | null;
    returns_1y: number | null;
    returns_ytd: number | null;

    aum_millions: number | null;
    is_shariah: boolean | null;
    sharpe_ratio: number | null;
    standard_deviation: number | null;

    // Deep Data
    peers?: any[];
    actions?: any[];
}

import PeersTable from "@/components/funds/PeersTable";
import ActionsTimeline from "@/components/funds/ActionsTimeline";

export default function FundDetailPage() {
    const params = useParams();
    const router = useRouter();
    const fundId = params?.id as string;
    const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("ALL");

    // 1. Fetch Fund Metadata
    const { data: fundRaw, isLoading: loadingFund, isError: isFundError } = useQuery({
        queryKey: ["fund", fundId],
        queryFn: async () => {
            if (!fundId) throw new Error("No Fund ID");
            return fetchFund(fundId);
        },
        enabled: !!fundId,
        staleTime: 1000 * 60 * 5,
    });

    const fund = fundRaw as unknown as FundDetails;

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
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white shadow-lg sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
                <div className="max-w-7xl mx-auto px-6 py-4 md:py-6">
                    <button onClick={() => router.back()} className="flex items-center text-white/90 hover:text-white font-bold mb-4 transition-colors group text-sm">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Funds
                    </button>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
                                <DollarSign className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight" dir="auto">
                                    {fund.fund_name_en || fund.fund_name}
                                </h1>
                                <p className="text-blue-50 font-medium text-sm mt-1 opacity-90 flex items-center gap-2">
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{fund.symbol || fund.fund_id}</span>
                                    <span>•</span>
                                    <span>{fund.currency || 'EGP'}</span>
                                </p>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 min-w-[160px] hover:bg-white/20 transition-colors cursor-default">
                            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">Latest NAV</p>
                            <div className="text-3xl font-black font-mono tracking-tight flex items-baseline gap-1">
                                {latestNav.toFixed(2)}
                                <span className="text-sm font-sans font-bold opacity-70">{fund.currency || 'EGP'}</span>
                            </div>
                            {chartPerformance !== null && (
                                <div className={clsx("text-xs font-bold mt-1", chartPerformance >= 0 ? "text-emerald-300" : "text-red-300")}>
                                    {chartPerformance >= 0 ? "▲" : "▼"} {Math.abs(chartPerformance).toFixed(2)}% ({chartPeriod})
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Meta Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Type</div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1">{fund.classification || "Mutual Fund"}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Manager</div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-1">{fund.manager || fund.manager_name_en || "—"}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Launch</div>
                        <div className="text-xs font-bold text-slate-800">{fund.establishment_date ? safeDate(fund.establishment_date)?.getFullYear() : "—"}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">AUM</div>
                        <div className="text-xs font-bold text-slate-800">{fund.aum_millions ? `${(Number(fund.aum_millions) / 1000000).toFixed(1)}M` : "—"}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Risk (Sharpe)</div>
                        <div className="text-xs font-bold text-blue-600">{isValidSharpe ? sharpeRatio!.toFixed(2) : "—"}</div>
                    </div>
                    {fund.is_shariah && (
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-center">
                            <span className="text-xs font-black text-emerald-700 uppercase flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Shariah
                            </span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Chart Section */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden min-w-0 flex flex-col">
                            <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row justify-between gap-4 items-center bg-slate-50/30">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" /> NAV Performance
                                </h3>
                                <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                                    {(["1M", "3M", "1Y", "3Y", "5Y", "ALL"] as ChartPeriod[]).map((period) => (
                                        <button
                                            key={period}
                                            onClick={() => setChartPeriod(period)}
                                            className={clsx(
                                                "px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all",
                                                chartPeriod === period ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
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

                        {/* NEW: Competitive Landscape (Peers) */}
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-50 bg-gradient-to-r from-slate-50 to-white">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">🏆</span>
                                    Competitive Landscape
                                </h3>
                                <p className="text-xs text-slate-400 mt-1 pl-10">Ranked by returns against comparable funds</p>
                            </div>
                            <div className="p-0">
                                <PeersTable peers={fund.peers || []} currentFundId={fund.fund_id} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Stats & Actions */}
                    <div className="space-y-6">

                        {/* Performance Card */}
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 relative overflow-hidden">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 z-10 relative">Returns Snapshot</h3>
                            <div className="space-y-3 relative z-10">
                                {[
                                    { label: "YTD", val: fund.returns_ytd ?? fund.ytd_return },
                                    { label: "1 Year", val: fund.returns_1y ?? fund.one_year_return ?? ret1Y },
                                    { label: "3 Years", val: fund.three_year_return ?? ret3Y },
                                    { label: "5 Years", val: fund.five_year_return ?? ret5Y },
                                ].map((item, i) => {
                                    const val = safeNumber(item.val);
                                    return (
                                        <div key={i} className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                                            <span className="text-xs font-bold text-slate-500">{item.label}</span>
                                            <span className={clsx("font-mono font-bold", !val ? "text-slate-300" : val >= 0 ? "text-emerald-600" : "text-red-500")}>
                                                {val !== null ? `${val > 0 ? "+" : ""}${val.toFixed(2)}%` : "—"}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* NEW: Corporate Actions Timeline */}
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                            <div className="p-5 border-b border-slate-50 bg-slate-50/30">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">💰</span>
                                    Corporate Actions
                                </h3>
                            </div>
                            <div className="p-5">
                                <ActionsTimeline actions={fund.actions || []} />
                            </div>
                        </div>

                        {/* Investment Strategy (Moved to sidebar) */}
                        {fund.investment_strategy && (
                            <div className="bg-slate-50 rounded-3xl border border-slate-100 p-5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Strategy</h4>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {fund.investment_strategy.length > 200
                                        ? `${fund.investment_strategy.substring(0, 200)}...`
                                        : fund.investment_strategy}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

