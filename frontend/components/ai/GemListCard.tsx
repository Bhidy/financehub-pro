"use client";

import React from "react";
import { clsx } from "clsx";

export interface GemMiniBar {
    label: string;
    percentage: number;
}

export interface GemItem {
    ticker: string;
    company_name: string;
    sector: string;
    score: number;
    grade: string;
    mini_bars: GemMiniBar[];
    why: string;
    strength: string;
    watch: string;
}

export interface GemListCardProps {
    data: {
        title?: string;
        gems: GemItem[];
    };
    language?: "en" | "ar";
}

export function GemListCard({ data, language = "en" }: GemListCardProps) {
    const isRtl = language === "ar";

    // Fallback colors for mini bars
    const getBarColor = (index: number) => {
        const colors = [
            "bg-[#14b8a6]", // teal
            "bg-[#16a34a]", // green
            "bg-[#1d4ed8]", // blue
            "bg-[#d97706]", // gold
            "bg-[#6b7280]", // gray
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="flex flex-col gap-2 mt-3" dir={isRtl ? "rtl" : "ltr"}>
            {data.gems.map((gem, idx) => (
                <div key={idx} className="bg-white dark:bg-[#111620] border border-gray-200 dark:border-[#252d3d] rounded-xl p-3.5 border-l-[3px] border-l-purple-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">

                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="font-mono text-[15px] font-medium text-gray-900 dark:text-white">
                                {gem.ticker}
                            </div>
                            <div className="text-[12px] text-gray-500 dark:text-[#6b7280] mt-0.5">
                                {gem.company_name}
                            </div>
                            {gem.sector && (
                                <div className="text-[11px] px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-md font-medium mt-1.5 inline-block shrink-0">
                                    {gem.sector}
                                </div>
                            )}
                        </div>

                        <div className="text-right shrink-0">
                            <div className="font-mono text-2xl font-normal text-gray-900 dark:text-white leading-none">
                                {gem.score}
                            </div>
                            <div className="text-[11px] text-gray-400 dark:text-[#9ca3af] mt-1 font-medium">
                                {isRtl ? "الدرجة" : "Grade"} {gem.grade}
                            </div>
                        </div>
                    </div>

                    <div className="text-[13px] text-gray-700 dark:text-[#8b95a8] leading-relaxed mt-2 border-t border-gray-100 dark:border-white/5 pt-2">
                        {gem.why}
                    </div>

                    {gem.strength && (
                        <div className="text-[12px] text-green-600 dark:text-green-500 mt-1.5 font-medium">
                            <span className="mr-1 opacity-70">↑</span>{gem.strength}
                        </div>
                    )}

                    {gem.watch && (
                        <div className="text-[12px] text-amber-600 dark:text-amber-500 mt-1 font-medium">
                            <span className="mr-1 opacity-70">⚠</span>{gem.watch}
                        </div>
                    )}

                    {gem.mini_bars && gem.mini_bars.length > 0 && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                            {gem.mini_bars.map((bar, bIdx) => {
                                const widthPct = Math.min(100, Math.max(0, bar.percentage));
                                return (
                                    <div key={bIdx} className="flex-1 text-center">
                                        <div className="text-[10px] text-gray-400 dark:text-[#9ca3af] mb-1.5 truncate uppercase tracking-wider font-semibold">
                                            {bar.label}
                                        </div>
                                        <div className="h-1 bg-gray-100 dark:bg-[#1e2535] rounded-full overflow-hidden">
                                            <div
                                                className={clsx("h-full rounded-full transition-all duration-500", getBarColor(bIdx))}
                                                style={{ width: `${widthPct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
