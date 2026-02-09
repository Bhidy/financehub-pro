"use client";

import React from "react";
import { PieChart as PieChartIcon, TrendingUp, TrendingDown, BarChart3, Layers } from "lucide-react";
import { clsx } from "clsx";

// ============================================================================
// IndexCompositionCard - Enterprise Component for Index Analysis
// Matches HTML Mockup: Scenario 9 "EGX 30 Constituents"
// ============================================================================

export interface SectorWeight {
    sector: string;
    weight: number;
    color: string;
    stock_count: number;
}

export interface TopPerformer {
    ticker: string;
    company_name: string;
    price: number;
    change_percent: number;
    logo_url?: string;
}

export interface IndexStats {
    total_market_cap: number;
    avg_pe: number;
    avg_pb: number;
    dividend_yield: number;
    ytd_return: number;
}

export interface IndexCompositionCardProps {
    data: {
        index_name: string;
        index_level?: number;
        change_percent?: number;
        sectors: SectorWeight[];
        top_performers: TopPerformer[];
        stats: IndexStats;
        as_of?: string;
    };
    onStockClick?: (ticker: string) => void;
    language?: "en" | "ar";
}

// Format large numbers
function formatNumber(value: number, language: "en" | "ar"): string {
    return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value);
}

// Sector weight badge component
function SectorBadge({ sector, language }: { sector: SectorWeight; language: "en" | "ar" }) {
    const stocksLabel = language === "ar" ? "أسهم" : "stocks";
    return (
        <div className="flex flex-col items-center gap-2">
            {/* Circular Weight Badge */}
            <div
                className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                style={{
                    background: `conic-gradient(${sector.color} ${sector.weight * 3.6}deg, #e2e8f0 0deg)`
                }}
            >
                <div className="absolute inset-1 bg-white dark:bg-[#1A1F2E] rounded-full flex items-center justify-center">
                    <span className="text-sm font-black text-slate-800 dark:text-white">
                        {sector.weight.toFixed(0)}%
                    </span>
                </div>
            </div>
            <div className="text-center">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[80px] leading-tight">
                    {sector.sector}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-500">
                    {sector.stock_count} {stocksLabel}
                </div>
            </div>
        </div>
    );
}

// Top performer row
function PerformerRow({
    performer,
    rank,
    onStockClick,
    language,
}: {
    performer: TopPerformer;
    rank: number;
    onStockClick?: (ticker: string) => void;
    language: "en" | "ar";
}) {
    const [imgError, setImgError] = React.useState(false);
    const isPositive = performer.change_percent >= 0;
    const isRtl = language === "ar";
    const locale = language === "ar" ? "ar-EG" : "en-US";

    return (
        <div
            onClick={() => onStockClick?.(performer.ticker)}
            className="group flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
            dir={isRtl ? "rtl" : "ltr"}
        >
            {/* Rank Badge */}
            <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                rank === 1 ? "bg-yellow-400 text-yellow-900" :
                    rank === 2 ? "bg-slate-300 text-slate-800" :
                        rank === 3 ? "bg-amber-600 text-white" :
                            "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            )}>
                {rank}
            </div>

            {/* Logo */}
            {performer.logo_url && !imgError ? (
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 dark:border-white/10 p-0.5 overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={performer.logo_url}
                        alt={performer.ticker}
                        className="w-full h-full object-contain"
                        onError={() => setImgError(true)}
                    />
                </div>
            ) : null}

            {/* Stock Info */}
            <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {performer.ticker}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {performer.company_name}
                </div>
            </div>

            {/* Price & Change */}
            <div className={clsx("shrink-0", isRtl ? "text-left" : "text-right")}>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {performer.price.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={clsx(
                    "text-xs font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5",
                    isPositive
                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                )}>
                    {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {isPositive ? "+" : ""}{performer.change_percent.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                </div>
            </div>
        </div>
    );
}

export function IndexCompositionCard({ data, onStockClick, language = "en" }: IndexCompositionCardProps) {
    const isPositive = (data.change_percent || 0) >= 0;
    const isRtl = language === "ar";
    const locale = language === "ar" ? "ar-EG" : "en-US";
    const ui = language === "ar"
        ? {
            subtitle: "تكوين المؤشر وتحليله",
            sectorWeights: "أوزان القطاعات",
            topPerformers: "أفضل 5 أداءً",
            indexStats: "إحصائيات المؤشر",
            marketCap: "القيمة السوقية",
            avgPe: "متوسط مكرر الربحية",
            avgPb: "متوسط مكرر القيمة الدفترية",
            divYield: "عائد التوزيعات",
            ytd: "العائد منذ بداية العام",
            dataAsOf: "البيانات حتى",
        }
        : {
            subtitle: "Index Composition & Analysis",
            sectorWeights: "Sector Weights",
            topPerformers: "Top 5 Performers",
            indexStats: "Index Statistics",
            marketCap: "Market Cap",
            avgPe: "Avg P/E",
            avgPb: "Avg P/B",
            divYield: "Div Yield",
            ytd: "YTD Return",
            dataAsOf: "Data as of",
        };

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden my-4 transition-all duration-300" dir={isRtl ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-6 py-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                            <Layers className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-xl tracking-tight">
                                {data.index_name}
                            </h3>
                            <p className="text-white/60 text-sm mt-0.5 font-medium">
                                {ui.subtitle}
                            </p>
                        </div>
                    </div>

                    {/* Index Level */}
                    {data.index_level && (
                        <div className={isRtl ? "text-left" : "text-right"}>
                            <div className="text-3xl font-black text-white tracking-tighter">
                                {formatNumber(data.index_level, language)}
                            </div>
                            {data.change_percent !== undefined && (
                                <div className={clsx(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mt-1",
                                    isPositive
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "bg-red-500/20 text-red-400"
                                )}>
                                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {isPositive ? "+" : ""}{data.change_percent.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Sector Weights */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-4">
                    <PieChartIcon size={16} className="text-slate-400" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        {ui.sectorWeights}
                    </h4>
                </div>
                <div className="flex flex-wrap justify-center gap-6">
                    {data.sectors.map((sector, idx) => (
                        <SectorBadge key={idx} sector={sector} language={language} />
                    ))}
                </div>
            </div>

            {/* Top Performers */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={16} className="text-emerald-500" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        {ui.topPerformers}
                    </h4>
                </div>
                <div className="space-y-1">
                    {data.top_performers.map((performer, idx) => (
                        <PerformerRow
                            key={performer.ticker}
                            performer={performer}
                            rank={idx + 1}
                            onStockClick={onStockClick}
                            language={language}
                        />
                    ))}
                </div>
            </div>

            {/* Index Stats */}
            <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={16} className="text-blue-500" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        {ui.indexStats}
                    </h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">
                            {ui.marketCap}
                        </div>
                        <div className="text-lg font-black text-slate-800 dark:text-white">
                            {formatNumber(data.stats.total_market_cap, language)}
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">
                            {ui.avgPe}
                        </div>
                        <div className="text-lg font-black text-slate-800 dark:text-white">
                            {data.stats.avg_pe.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">
                            {ui.avgPb}
                        </div>
                        <div className="text-lg font-black text-slate-800 dark:text-white">
                            {data.stats.avg_pb.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">
                            {ui.divYield}
                        </div>
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {data.stats.dividend_yield.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">
                            {ui.ytd}
                        </div>
                        <div className={clsx(
                            "text-lg font-black",
                            data.stats.ytd_return >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                        )}>
                            {data.stats.ytd_return >= 0 ? "+" : ""}{data.stats.ytd_return.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Timestamp */}
            {data.as_of && (
                <div className="px-6 py-2 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {ui.dataAsOf} {new Date(data.as_of).toLocaleDateString(locale)}
                    </span>
                </div>
            )}
        </div>
    );
}

export default IndexCompositionCard;
