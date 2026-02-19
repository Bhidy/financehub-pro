"use client";

import React from "react";
import { Target, TrendingUp, Shield, Zap } from "lucide-react";
import { clsx } from "clsx";
import { translations } from "@/components/chatbot/translations";

interface ValuationScoreProps {
    data: {
        total_score: number;
        valuation_score: number;
        quality_score: number;
        momentum_score: number;
        assessment: string;
        sector?: string;
    };
    language?: "en" | "ar";
}

export function ValuationScoreCard({ data, language = "en" }: ValuationScoreProps) {
    const isRtl = language === "ar";
    const t = translations[language].chat;

    // Safety: Defaults to 0/10 if missing
    const score = Number.isFinite(Number(data?.total_score)) ? Number(data.total_score) : 0;
    const maxScore = 10; // Starta Score is usually 0-10 or 0-100? 
    // Looking at price_handler, it calls calculate_score. 
    // Usually these are 0-10 or 0-100. Let's assume 0-10 based on typical "Score" context or check logic.
    // If input is > 10, it's likely 100-based.
    const is100Based = score > 10;
    const finalMax = is100Based ? 100 : 10;

    const percentage = Math.min((score / finalMax) * 100, 100);

    // Color logic
    let scoreColor = "text-red-500";
    let scoreBg = "bg-red-50 dark:bg-red-500/10";
    let scoreBorder = "border-red-100 dark:border-red-500/20";

    if (percentage >= 70) {
        scoreColor = "text-emerald-500";
        scoreBg = "bg-emerald-50 dark:bg-emerald-500/10";
        scoreBorder = "border-emerald-100 dark:border-emerald-500/20";
    } else if (percentage >= 40) {
        scoreColor = "text-amber-500";
        scoreBg = "bg-amber-50 dark:bg-amber-500/10";
        scoreBorder = "border-amber-100 dark:border-amber-500/20";
    }

    const subFactors = [
        { name: isRtl ? "التقييم" : "Valuation", score: Number(data?.valuation_score), icon: Target },
        { name: isRtl ? "الجودة" : "Quality", score: Number(data?.quality_score), icon: Shield },
        { name: isRtl ? "الزخم" : "Momentum", score: Number(data?.momentum_score), icon: Zap },
    ];

    return (
        <div className="p-5 bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm" dir={isRtl ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Target size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                            {isRtl ? "نقاط ستارتا" : "Starta Score"}
                        </h3>
                        {data.sector && <div className="text-[10px] text-slate-400 dark:text-slate-500">{data.sector}</div>}
                    </div>
                </div>
                <div className={clsx("px-3 py-1 rounded-full text-xs font-black border", scoreColor, scoreBg, scoreBorder)}>
                    {data.assessment || (isRtl ? "غير متاح" : "N/A")}
                </div>
            </div>

            {/* Main Score Gauge */}
            <div className="mb-6 flex items-center justify-center gap-4">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                            className={scoreColor}
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * percentage) / 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className={clsx("text-2xl font-black", scoreColor)}>{score.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">/ {finalMax}</span>
                    </div>
                </div>
            </div>

            {/* Sub Factors */}
            <div className="grid grid-cols-3 gap-2">
                {subFactors.map((factor, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center border border-slate-100 dark:border-white/5">
                        <div className="flex justify-center mb-2 text-slate-400 dark:text-slate-500">
                            <factor.icon size={16} />
                        </div>
                        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1 leading-tight">{factor.name}</div>
                        <div className="text-sm font-black text-slate-800 dark:text-white">
                            {Number.isFinite(factor.score) ? (
                                <span>{factor.score.toFixed(1)}</span>
                            ) : (
                                <span className="text-slate-300">-</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
