"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, FileText, Download, Calendar, Trophy, Star, Sparkles, Award } from "lucide-react";
import clsx from "clsx";
import { useMarketSafe } from "@/contexts/MarketContext";

// Fetch full statistics from new endpoint
const fetchFundStats = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://bhidy-financehub-api.hf.space'}/api/v1/funds/stats/summary`);
    if (!res.ok) throw new Error("Failed to fetch statistics");
    return res.json();
};

// Animated floating vectors
const FloatingVectors = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient orbs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 via-teal-300/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-60 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-400/15 via-blue-300/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />

        {/* Floating chart icons */}
        <div className="absolute top-20 right-20 text-6xl opacity-10 animate-bounce" style={{ animationDuration: '3s' }}>📈</div>
        <div className="absolute bottom-40 left-32 text-5xl opacity-10 animate-bounce" style={{ animationDuration: '4s' }}>💰</div>
        <div className="absolute top-1/2 right-40 text-4xl opacity-10 animate-bounce" style={{ animationDuration: '5s' }}>🏆</div>

        {/* Geometric shapes */}
        <svg className="absolute top-10 left-1/4 w-32 h-32 opacity-5 animate-spin" style={{ animationDuration: '20s' }} viewBox="0 0 100 100">
            <polygon points="50,10 90,90 10,90" fill="currentColor" className="text-blue-500" />
        </svg>
        <svg className="absolute bottom-20 right-1/4 w-24 h-24 opacity-5 animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }} viewBox="0 0 100 100">
            <rect x="20" y="20" width="60" height="60" fill="currentColor" className="text-emerald-500" transform="rotate(45 50 50)" />
        </svg>

        {/* Dotted pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)',
            backgroundSize: '30px 30px'
        }} />
    </div>
);

// Rank badge with animation
const RankBadge = ({ rank }: { rank: number }) => {
    if (rank === 1) return (
        <div className="relative">
            <span className="text-3xl animate-pulse">🥇</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
        </div>
    );
    if (rank === 2) return <span className="text-3xl">🥈</span>;
    if (rank === 3) return <span className="text-3xl">🥉</span>;
    return (
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 flex items-center justify-center text-lg font-black text-slate-500 dark:text-slate-300 shadow-inner">
            {rank}
        </div>
    );
};

// Performance bar with gradient animation
const PerformanceBar = ({ value, maxValue, isPositive }: { value: number; maxValue: number; isPositive: boolean }) => {
    const percentage = Math.min(Math.abs(value) / Math.abs(maxValue) * 100, 100);
    return (
        <div className="w-32 h-3 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
            <div
                className={clsx(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    isPositive
                        ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500"
                        : "bg-gradient-to-r from-red-400 via-orange-400 to-red-500"
                )}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
};

export default function FundStatisticsPage() {
    const router = useRouter();
    const { isEgypt } = useMarketSafe();

    const { data: stats, isLoading } = useQuery({
        queryKey: ["fund-stats"],
        queryFn: fetchFundStats,
        staleTime: 1000 * 60 * 5,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex flex-col items-center justify-center relative">
                <FloatingVectors />
                <div className="relative z-10">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-pulse mb-6">
                        <Trophy className="w-12 h-12 text-white" />
                    </div>
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-700">Loading Market Intelligence...</h2>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const sections = [
        {
            title: "Top Gainers",
            subtitle: "3 Months Performance",
            emoji: "🔥",
            icon: <TrendingUp className="w-5 h-5" />,
            data: stats.gainers_3m,
            type: "gainer",
            metric: "profit_3month",
            gradient: "from-emerald-500 to-teal-500",
            bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10",
            borderColor: "border-emerald-200 dark:border-emerald-500/20"
        },
        {
            title: "Biggest Drops",
            subtitle: "3 Months Performance",
            emoji: "📉",
            icon: <TrendingDown className="w-5 h-5" />,
            data: stats.losers_3m,
            type: "loser",
            metric: "profit_3month",
            gradient: "from-red-500 to-orange-500",
            bgGradient: "from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/10",
            borderColor: "border-red-200 dark:border-red-500/20"
        },
        {
            title: "Annual Champions",
            subtitle: "1 Year Performance",
            emoji: "🏆",
            icon: <TrendingUp className="w-5 h-5" />,
            data: stats.gainers_1y,
            type: "gainer",
            metric: "one_year_return",
            gradient: "from-blue-500 to-indigo-500",
            bgGradient: "from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10",
            borderColor: "border-blue-200 dark:border-blue-500/20"
        },
        {
            title: "Underperformers",
            subtitle: "1 Year Performance",
            emoji: "⚠️",
            icon: <TrendingDown className="w-5 h-5" />,
            data: stats.losers_1y,
            type: "loser",
            metric: "one_year_return",
            gradient: "from-amber-500 to-red-500",
            bgGradient: "from-amber-50 to-red-50 dark:from-amber-500/10 dark:to-red-500/10",
            borderColor: "border-amber-200 dark:border-amber-500/20"
        },
    ];

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-[#0B1121] dark:via-[#0F1629] dark:to-[#0B1121] pb-12 relative">
            <FloatingVectors />

            {/* Ultra-Premium Header */}
            <div className="relative overflow-hidden bg-white/80 dark:bg-[#151925]/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-teal-500/5 to-emerald-500/5 dark:from-blue-500/10 dark:via-teal-500/10 dark:to-emerald-500/10" />

                <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
                    <button
                        onClick={() => router.push('/funds')}
                        className="flex items-center text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold mb-8 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Funds Center
                    </button>

                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-teal-500 to-emerald-500 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                                <Trophy className="w-12 h-12 text-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-xl flex items-center justify-center text-sm shadow-lg animate-bounce">
                                ⭐
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Market Leaderboard
                                </h1>
                                <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                                    LIVE
                                </span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-500" />
                                Top Performers & Market Movers • Real-time Rankings
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
                {/* Statistics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {sections.map((section, idx) => {
                        const maxVal = section.data?.length > 0 ? Math.abs(Number(section.data[0][section.metric])) : 1;

                        return (
                            <div
                                key={idx}
                                className={clsx(
                                    "bg-white dark:bg-[#1A1F2E] rounded-3xl border-2 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 group",
                                    "hover:-translate-y-1",
                                    section.borderColor
                                )}
                            >
                                {/* Card Header */}
                                <div className={clsx("p-6 bg-gradient-to-r", section.bgGradient)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-4xl">{section.emoji}</span>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                                                    {section.title}
                                                </h3>
                                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{section.subtitle}</p>
                                            </div>
                                        </div>
                                        <div className={clsx(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br",
                                            section.gradient
                                        )}>
                                            {section.icon}
                                        </div>
                                    </div>
                                </div>

                                {/* Fund Rows */}
                                <div className="divide-y divide-slate-100 dark:divide-white/5">
                                    {section.data?.map((fund: any, i: number) => {
                                        const val = Number(fund[section.metric]);
                                        const isPositive = val >= 0;

                                        return (
                                            <div
                                                key={fund.fund_id}
                                                onClick={() => router.push(`/funds/${fund.fund_id}`)}
                                                className="p-5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-4 group/row"
                                            >
                                                {/* Rank Badge */}
                                                <RankBadge rank={i + 1} />

                                                {/* Fund Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 dark:text-white mb-2 truncate group-hover/row:text-blue-600 dark:group-hover/row:text-blue-400 transition-colors">
                                                        {fund.fund_name_en || fund.fund_name}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg">
                                                            {fund.symbol || fund.fund_type || "FUND"}
                                                        </span>
                                                        <PerformanceBar value={val} maxValue={maxVal} isPositive={isPositive} />
                                                    </div>
                                                </div>

                                                {/* Performance Value */}
                                                <div className={clsx(
                                                    "text-right font-mono font-black text-2xl",
                                                    isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                                )}>
                                                    {isPositive ? "+" : ""}{val.toFixed(2)}%
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Reports Section */}
                <div className="mt-12 bg-white dark:bg-[#1A1F2E] rounded-3xl border-2 border-blue-200 dark:border-white/5 overflow-hidden shadow-xl">
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-white/5 dark:to-white/5 border-b border-blue-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                                <FileText className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white">Performance Reports</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">Official fund documents & disclosures</p>
                            </div>
                        </div>
                    </div>

                    {stats.reports && stats.reports.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {stats.reports.map((report: any, i: number) => (
                                <div key={i} className="p-5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-white/5 dark:to-white/5 flex items-center justify-center">
                                            <FileText className="w-7 h-7 text-orange-500 dark:text-orange-400" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-white">{report.report_name}</div>
                                            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                                <Calendar className="w-3.5 h-3.5" /> {report.report_date}
                                            </div>
                                        </div>
                                    </div>
                                    <a
                                        href={report.report_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
                                    >
                                        <Download className="w-4 h-4" /> Download
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h4 className="text-slate-800 dark:text-white font-bold text-lg mb-2">No Reports Available</h4>
                            <p className="text-slate-500 dark:text-slate-400">Check back later for new market reports.</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
