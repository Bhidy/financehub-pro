"use client";

import React from "react";
import { Gem, Star, Sparkles } from "lucide-react";
import { clsx } from "clsx";

// ============================================================================
// HiddenGemCard - Enterprise Component for Discovery Stock List
// Matches HTML Mockup: Scenario 3 "Hidden Gems"
// ============================================================================

export interface HiddenGemStock {
    ticker: string;
    company_name: string;
    description?: string;
    score: number;
    metrics: Record<string, string>;
    why_its_a_gem?: string;
    is_top_pick?: boolean;
    logo_url?: string;
}

export interface HiddenGemCardProps {
    data: {
        title?: string;
        stocks: HiddenGemStock[];
    };
    onStockClick?: (ticker: string) => void;
    language?: "en" | "ar";
}

function ScoreBadge({ score, language }: { score: number; language: "en" | "ar" }) {
    const getScoreColor = () => {
        if (score >= 75) return "from-emerald-500 to-teal-500 shadow-emerald-500/30";
        if (score >= 60) return "from-blue-500 to-cyan-500 shadow-blue-500/30";
        if (score >= 45) return "from-amber-500 to-orange-500 shadow-amber-500/30";
        return "from-slate-500 to-slate-600 shadow-slate-500/30";
    };

    return (
        <div className={clsx(
            "flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br shadow-lg",
            getScoreColor()
        )}>
            <span className="text-2xl font-black text-white leading-none">{score}</span>
            <span className="text-[8px] font-bold text-white/80 uppercase tracking-wider">{language === "ar" ? "التقييم" : "Score"}</span>
        </div>
    );
}

function GemStockItem({
    stock,
    rank,
    onStockClick,
    language,
}: {
    stock: HiddenGemStock;
    rank: number;
    onStockClick?: (ticker: string) => void;
    language: "en" | "ar";
}) {
    const [imgError, setImgError] = React.useState(false);
    const isRtl = language === "ar";
    const ui = language === "ar"
        ? {
            topPick: "أفضل اختيار",
            whyGem: "لماذا يعد فرصة مميزة",
            undervaluation: "أقل من القيمة العادلة",
        }
        : {
            topPick: "Top Pick",
            whyGem: "Why it's a gem",
            undervaluation: "Undervaluation",
        };

    return (
        <div
            onClick={() => onStockClick?.(stock.ticker)}
            className={clsx(
                "group p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer",
                stock.is_top_pick
                    ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-400 dark:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10"
                    : "bg-white dark:bg-[#1A1F2E] border-slate-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-lg"
            )}
            dir={isRtl ? "rtl" : "ltr"}
        >
            <div className="flex items-start justify-between gap-4">
                {/* Left: Stock Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        {/* Logo or Rank Badge */}
                        {stock.logo_url && !imgError ? (
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 dark:border-white/10 shadow-sm p-1 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={stock.logo_url}
                                    alt={stock.ticker}
                                    className="w-full h-full object-contain"
                                    onError={() => setImgError(true)}
                                />
                            </div>
                        ) : (
                            <div className={clsx(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm",
                                rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" :
                                    rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800" :
                                        rank === 3 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                                            "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            )}>
                                {rank}
                            </div>
                        )}

                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {stock.ticker}
                                </span>
                                {stock.is_top_pick && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-bold uppercase">
                                        <Star size={10} className="fill-current" />
                                        {ui.topPick}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 font-medium truncate max-w-[250px]">
                                {stock.company_name}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {stock.description && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                            {stock.description}
                        </div>
                    )}

                    {/* Metrics Grid */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(stock.metrics).slice(0, 4).map(([key, value]) => (
                            <div
                                key={key}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-xs"
                            >
                                <span className="text-slate-500 dark:text-slate-500 font-medium">{key}: </span>
                                <span className="text-slate-800 dark:text-slate-200 font-bold">{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Why It's a Gem */}
                    {stock.why_its_a_gem && (
                        <div className={clsx(
                            "p-3 rounded-xl border-l-4",
                            stock.is_top_pick
                                ? "bg-emerald-100/50 dark:bg-emerald-500/10 border-emerald-500"
                                : "bg-blue-50 dark:bg-blue-500/10 border-blue-500"
                        )}>
                            <div className="flex items-start gap-2">
                                <Sparkles size={14} className={clsx(
                                    "mt-0.5 shrink-0",
                                    stock.is_top_pick ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                                )} />
                                <div>
                                    <div className={clsx(
                                        "text-[10px] font-bold uppercase tracking-wider mb-1",
                                        stock.is_top_pick ? "text-emerald-700 dark:text-emerald-400" : "text-blue-700 dark:text-blue-400"
                                    )}>
                                        {ui.whyGem}
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                        {stock.why_its_a_gem}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Score */}
                <div className="shrink-0">
                    <ScoreBadge score={stock.score} language={language} />
                    <div className="text-center mt-2 text-[9px] text-slate-400 dark:text-slate-500 font-medium uppercase">
                        {ui.undervaluation}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function HiddenGemCard({ data, onStockClick, language = "en" }: HiddenGemCardProps) {
    const isRtl = language === "ar";
    const ui = language === "ar"
        ? {
            hiddenGems: "فرص خفية",
            subtitle: "فرص غير مكتشفة بأساسيات قوية",
            significantValue: "75+: قيمة مرتفعة",
            moderateValue: "60-75: قيمة متوسطة",
            fairValue: "45-60: قيمة عادلة",
        }
        : {
            hiddenGems: "Hidden Gems",
            subtitle: "Undiscovered opportunities with strong fundamentals",
            significantValue: "75+: Significant Value",
            moderateValue: "60-75: Moderate Value",
            fairValue: "45-60: Fair Value",
        };

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden my-4 transition-all duration-300" dir={isRtl ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 px-6 py-5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                        <Gem className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-xl tracking-tight">
                            {data.title || ui.hiddenGems}
                        </h3>
                        <p className="text-white/80 text-sm mt-0.5 font-medium">
                            {ui.subtitle}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stock List */}
            <div className="p-6 space-y-4">
                {data.stocks.map((stock, idx) => (
                        <GemStockItem
                            key={stock.ticker}
                            stock={stock}
                            rank={idx + 1}
                            onStockClick={onStockClick}
                            language={language}
                        />
                    ))}
                </div>

            {/* Score Legend */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5">
                <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{ui.significantValue}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>{ui.moderateValue}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>{ui.fairValue}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HiddenGemCard;
