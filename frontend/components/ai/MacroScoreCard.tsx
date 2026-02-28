"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus, Activity, DollarSign, Zap, BarChart3, Globe } from "lucide-react";
import { clsx } from "clsx";

// ============================================================================
// MacroScoreCard - Enterprise Component for Market Timing Analysis
// Matches HTML Mockup: Scenario 4 "Is This a Good Time to Buy?"
// ============================================================================

export interface MacroFactor {
    name: string;
    points: number;
    max_points: number;
    status: "positive" | "neutral" | "negative";
    detail?: string;
}

export interface MacroScoreCardProps {
    data: {
        score: number;
        max_score?: number;
        assessment: string;
        factors: MacroFactor[];
        market?: string;
        as_of?: string;
    };
    language?: "en" | "ar";
}

// Status color mapping
const statusColors = {
    positive: {
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
        border: "border-emerald-200 dark:border-emerald-500/20",
        text: "text-emerald-700 dark:text-emerald-400",
        icon: TrendingUp,
        badge: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
    },
    neutral: {
        bg: "bg-amber-50 dark:bg-amber-500/10",
        border: "border-amber-200 dark:border-amber-500/20",
        text: "text-amber-700 dark:text-amber-400",
        icon: Minus,
        badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300"
    },
    negative: {
        bg: "bg-red-50 dark:bg-red-500/10",
        border: "border-red-200 dark:border-red-500/20",
        text: "text-red-700 dark:text-red-400",
        icon: TrendingDown,
        badge: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"
    }
};

// Factor icon mapping
const factorIcons: Record<string, React.ElementType> = {
    growth: TrendingUp,
    inflation: Activity,
    "hard currency": DollarSign,
    "usd dynamics": Globe,
    earnings: BarChart3,
    default: Zap
};

function getFactorIcon(name: string): React.ElementType {
    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(factorIcons)) {
        if (lowerName.includes(key)) return icon;
    }
    return factorIcons.default;
}

function getScoreGradient(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return "from-emerald-500 to-teal-600";
    if (percentage >= 50) return "from-amber-500 to-orange-600";
    return "from-red-500 to-rose-600";
}

function getScoreAssessment(score: number, maxScore: number, language: "en" | "ar"): { label: string; color: string } {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    if (percentage >= 75) return { label: language === "ar" ? "إيجابي" : "CONSTRUCTIVE", color: "bg-emerald-500" };
    if (percentage >= 50) return { label: language === "ar" ? "مختلط" : "MIXED", color: "bg-amber-500" };
    if (percentage >= 25) return { label: language === "ar" ? "حذر" : "CAUTION", color: "bg-orange-500" };
    return { label: language === "ar" ? "مخاطر مرتفعة" : "RISK-OFF", color: "bg-red-500" };
}

export function MacroScoreCard({ data, language = "en" }: MacroScoreCardProps) {
    const maxScore = data.max_score || 100;
    const scoreInfo = getScoreAssessment(data.score, maxScore, language);
    const isRtl = language === "ar";
    const ui = language === "ar"
        ? {
            marketFallback: "مصر",
            marketScore: "درجة السوق",
            macroAssessment: "تقييم البيئة الاقتصادية",
            assessment: "التقييم:",
            constructive: "75-100: إيجابي",
            mixed: "50-75: مختلط",
            caution: "25-50: حذر",
            riskOff: "0-25: مخاطر مرتفعة",
            dataAsOf: "البيانات حتى",
        }
        : {
            marketFallback: "Egypt",
            marketScore: "Market Score",
            macroAssessment: "Macro Environment Assessment",
            assessment: "Assessment:",
            constructive: "75-100: Constructive",
            mixed: "50-75: Mixed",
            caution: "25-50: Caution",
            riskOff: "0-25: Risk-Off",
            dataAsOf: "Data as of",
        };

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden my-4 transition-all duration-300 hover:shadow-blue-500/5" dir={isRtl ? "rtl" : "ltr"}>
            {/* Premium Header */}
            <div className={clsx(
                "px-6 py-5 bg-gradient-to-r",
                getScoreGradient(data.score, maxScore)
            )}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                            <Activity className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-xl tracking-tight">
                                {isRtl
                                    ? `${ui.marketScore} ${data.market || ui.marketFallback}`
                                    : `${data.market || ui.marketFallback} ${ui.marketScore}`}
                            </h3>
                            <p className="text-white/80 text-sm mt-0.5 font-medium">
                                {ui.macroAssessment}
                            </p>
                        </div>
                    </div>

                    {/* Large Score Display */}
                    <div className={clsx("flex flex-col", isRtl ? "items-start" : "items-end")}>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-white tracking-tighter">
                                {data.score}
                            </span>
                            <span className="text-2xl font-bold text-white/60">
                                /{maxScore}
                            </span>
                        </div>
                        <div className={clsx(
                            "mt-2 px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider",
                            scoreInfo.color
                        )}>
                            {scoreInfo.label}
                        </div>
                    </div>
                </div>
            </div>

            {/* Assessment Text */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                <p className={clsx("text-slate-700 dark:text-slate-300 text-sm leading-relaxed", isRtl ? "text-right" : "text-left")}>
                    <span className="font-semibold text-slate-900 dark:text-white">{ui.assessment} </span>
                    {data.assessment}
                </p>
            </div>

            {/* Factor Grid */}
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.factors.map((factor, idx) => {
                        const colors = statusColors[factor.status];
                        const Icon = getFactorIcon(factor.name);
                        const factorPercentage = Math.round((factor.points / factor.max_points) * 100);

                        return (
                            <div
                                key={idx}
                                className={clsx(
                                    "p-4 rounded-2xl border transition-all duration-300 hover:shadow-md",
                                    colors.bg,
                                    colors.border
                                )}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={clsx("p-1.5 rounded-lg", colors.badge)}>
                                            {(Icon as any)({ size: 14, className: "stroke-[2.5]" })}
                                        </div>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                            {factor.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={clsx("font-bold text-lg", colors.text)}>
                                            {factor.points}
                                        </span>
                                        <span className="text-slate-400 dark:text-slate-500 text-sm">
                                            /{factor.max_points}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={clsx(
                                            "h-full rounded-full transition-all duration-500",
                                            factor.status === "positive" && "bg-emerald-500",
                                            factor.status === "neutral" && "bg-amber-500",
                                            factor.status === "negative" && "bg-red-500"
                                        )}
                                        style={{ width: `${factorPercentage}%` }}
                                    />
                                </div>

                                {/* Detail Text */}
                                {factor.detail && (
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {factor.detail}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Score Legend */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5">
                <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{ui.constructive}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>{ui.mixed}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>{ui.caution}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>{ui.riskOff}</span>
                    </div>
                </div>
            </div>

            {/* Timestamp */}
            {data.as_of && (
                <div className="px-6 py-2 text-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {ui.dataAsOf} {new Date(data.as_of).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}
                </div>
            )}
        </div>
    );
}

export default MacroScoreCard;
