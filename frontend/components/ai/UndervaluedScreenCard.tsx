"use client";

import React from "react";
import { clsx } from "clsx";

export interface UndervaluedTopItem {
    ticker: string;
    company_name: string;
    sector: string;
    score: number;
    grade: string;
}

export interface SectorWinnerItem {
    sector_name: string;
    ticker: string;
    score: number;
}

export interface UndervaluedScreenCardProps {
    data: {
        overall_top: UndervaluedTopItem[];
        sector_winners: SectorWinnerItem[];
        insight?: string;
    };
    language?: "en" | "ar";
}

export function UndervaluedScreenCard({ data, language = "en" }: UndervaluedScreenCardProps) {
    const isRtl = language === "ar";

    return (
        <div className="flex flex-col gap-4 mt-3" dir={isRtl ? "rtl" : "ltr"}>

            {/* OVERALL TOP 5 */}
            {data.overall_top && data.overall_top.length > 0 && (
                <div>
                    <div className="text-[11px] font-bold text-gray-500 dark:text-[#9ca3af] tracking-widest uppercase mb-2 ml-1">
                        {isRtl ? "📊 أفضل الأسهم إجمالاً — حسب نقاط الجاذبية" : "📊 Overall Top Picks — by Attractiveness Score"}
                    </div>
                    <div className="bg-white dark:bg-[#111620] border border-gray-200 dark:border-[#252d3d] rounded-xl overflow-hidden shadow-sm">
                        <div className="grid grid-cols-[28px_60px_1fr_60px_60px] sm:grid-cols-[28px_70px_1fr_75px_70px] gap-2 items-center px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2535] text-[11px] font-semibold text-gray-500 dark:text-[#9ca3af] uppercase tracking-wider border-b border-gray-200 dark:border-[#252d3d]">
                            <div>#</div>
                            <div>{isRtl ? "الرمز" : "Ticker"}</div>
                            <div>{isRtl ? "الشركة" : "Company"}</div>
                            <div className="hidden sm:block">{isRtl ? "القطاع" : "Sector"}</div>
                            <div className="sm:hidden">{isRtl ? "قطاع" : "Sect"}</div>
                            <div className="text-right">{isRtl ? "النقاط" : "Score"}</div>
                        </div>

                        {data.overall_top.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[28px_60px_1fr_60px_60px] sm:grid-cols-[28px_70px_1fr_75px_70px] gap-2 items-center px-3.5 py-2.5 border-b border-gray-100 dark:border-[#1e2535] last:border-0 text-[13px] hover:bg-gray-50 dark:hover:bg-[#181e2a] transition-colors">
                                <div className="font-mono text-[12px] text-gray-400 dark:text-[#9ca3af] font-medium">{idx + 1}</div>
                                <div className="font-mono font-medium text-gray-900 dark:text-[#e8ecf4]">{item.ticker}</div>
                                <div className="text-gray-600 dark:text-[#8b95a8] text-[12px] truncate">{item.company_name}</div>
                                <div>
                                    <span className="text-[10px] sm:text-[11px] text-gray-500 dark:text-[#9ca3af] bg-gray-100 dark:bg-[#1e2535] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-center inline-block max-w-full truncate">
                                        {item.sector}
                                    </span>
                                </div>
                                <div className="font-mono font-semibold text-gray-900 dark:text-[#e8ecf4] text-right">
                                    {item.score} <span className="text-[10px] font-normal text-gray-400 dark:text-[#6b7280]">/ {item.grade}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTOR BEST */}
            {data.sector_winners && data.sector_winners.length > 0 && (
                <div className="mt-2">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-[#9ca3af] tracking-widest uppercase mb-2 ml-1">
                        {isRtl ? "🏆 أفضل اختيار بكل قطاع" : "🏆 Best Pick by Sector"}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {data.sector_winners.map((winner, idx) => (
                            <div key={idx} className="bg-white dark:bg-[#111620] border border-gray-200 dark:border-[#252d3d] rounded-xl p-3 shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                <div className="text-[11px] text-gray-500 dark:text-[#9ca3af] mb-1.5 font-medium truncate">
                                    {winner.sector_name}
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="font-mono text-[14px] font-medium text-gray-900 dark:text-[#e8ecf4]">{winner.ticker}</div>
                                    <div className="font-mono text-[13px] text-gray-500 dark:text-[#6b7280]">{winner.score}/100</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* INSIGHT */}
            {data.insight && (
                <div className="bg-teal-50 dark:bg-teal-900/10 border-l-[3px] border-l-teal-600 dark:border-l-teal-500 rounded-lg p-3.5 mt-1 text-[13.5px] leading-relaxed text-gray-700 dark:text-[#8b95a8]">
                    <strong className="text-gray-900 dark:text-[#e8ecf4] mr-1">
                        {isRtl ? "ماذا يخبرنا هذا:" : "What this tells me:"}
                    </strong>
                    {data.insight}
                </div>
            )}

        </div>
    );
}
