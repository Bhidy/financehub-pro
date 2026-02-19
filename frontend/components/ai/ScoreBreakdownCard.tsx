"use client";

import React from "react";
import { clsx } from "clsx";

export interface ScoreComponent {
    label: string;
    note: string;
    score: number;
    max_score: number;
    icon: string;
}

export interface ScoreBreakdownCardProps {
    data: {
        components: ScoreComponent[];
    };
    language?: "en" | "ar";
}

export function ScoreBreakdownCard({ data, language = "en" }: ScoreBreakdownCardProps) {
    const isRtl = language === "ar";

    const getBarColor = (compIndex: number) => {
        const colors = ["bg-[#14b8a6]", "bg-[#16a34a]", "bg-[#1d4ed8]", "bg-[#d97706]", "bg-[#6b7280]"];
        return colors[compIndex % colors.length];
    };

    return (
        <div
            className="bg-white dark:bg-[#111620] border border-gray-200 dark:border-[#2e3a4e] rounded-xl p-3.5 my-3 text-[13px] shadow-sm overflow-hidden"
            dir={isRtl ? "rtl" : "ltr"}
        >
            <div className="text-[12px] font-semibold text-gray-500 dark:text-[#6b7280] tracking-wider uppercase mb-2.5">
                {isRtl ? "تفصيل التقييم الخماسي" : "Score Breakdown"}
            </div>

            <div className="flex flex-col">
                {data.components.map((comp, idx) => {
                    const widthPct = Math.min(100, Math.max(0, (comp.score / comp.max_score) * 100));
                    return (
                        <div key={idx} className="flex items-center gap-2 py-1.5 border-b border-[#f3f4f6] dark:border-[#1e2535] last:border-0">
                            <div className="text-[13px] w-[18px] flex-shrink-0 text-center">{comp.icon || "📊"}</div>

                            <div className="flex-1 min-w-0">
                                <div className="text-[#374151] dark:text-[#8b95a8] font-medium truncate">{comp.label}</div>
                                {comp.note && (
                                    <div className="text-[11px] text-[#9ca3af] mt-0.5 truncate max-w-[200px] sm:max-w-none">{comp.note}</div>
                                )}
                            </div>

                            <div className="w-[60px] sm:w-[80px] h-[6px] bg-[#f3f4f6] dark:bg-[#1e2535] rounded-full overflow-hidden shrink-0">
                                <div
                                    className={clsx("h-full rounded-full transition-all duration-500", getBarColor(idx))}
                                    style={{ width: `${widthPct}%` }}
                                ></div>
                            </div>

                            <div className="font-mono text-[12px] font-medium text-[#0d1117] dark:text-[#e8ecf4] w-[40px] text-right shrink-0">
                                {comp.score}/{comp.max_score}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
