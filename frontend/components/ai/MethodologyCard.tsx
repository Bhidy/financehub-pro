"use client";

import React from "react";
import { Target, Filter, Layers, CheckCircle } from "lucide-react";
import { clsx } from "clsx";

// ============================================================================
// MethodologyCard - Enterprise Component for Screening Methodology Display
// Matches HTML Mockup: Scenario 2 "Most Undervalued Stocks"
// ============================================================================

export interface MethodologyCriterion {
    label: string;
    value?: string;
    highlight?: boolean;
}

export interface MethodologyCardProps {
    data: {
        title?: string;
        icon?: string;
        description?: string;
        criteria: MethodologyCriterion[] | string[];
        note?: string;
    };
}

export function MethodologyCard({ data }: MethodologyCardProps) {
    // Normalize criteria to objects
    const normalizedCriteria: MethodologyCriterion[] = data.criteria.map(c =>
        typeof c === 'string' ? { label: c } : c
    );

    return (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-[#1A1F2E] dark:to-blue-900/10 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg overflow-hidden my-4 transition-all duration-300 hover:shadow-xl">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-teal-500 flex items-center gap-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h4 className="font-bold text-white text-base">
                        {data.icon && <span className="mr-2">{data.icon}</span>}
                        {data.title || "Screening Methodology"}
                    </h4>
                    {data.description && (
                        <p className="text-white/80 text-xs mt-0.5">{data.description}</p>
                    )}
                </div>
            </div>

            {/* Criteria List */}
            <div className="p-5">
                <div className="space-y-3">
                    {normalizedCriteria.map((criterion, idx) => (
                        <div
                            key={idx}
                            className={clsx(
                                "flex items-start gap-3 p-3 rounded-xl transition-colors",
                                criterion.highlight
                                    ? "bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30"
                                    : "bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5"
                            )}
                        >
                            <div className={clsx(
                                "p-1 rounded-lg shrink-0 mt-0.5",
                                criterion.highlight
                                    ? "bg-blue-500 text-white"
                                    : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            )}>
                                <CheckCircle size={12} className="stroke-[2.5]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {criterion.label}
                                </span>
                                {criterion.value && (
                                    <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                                        ({criterion.value})
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Note */}
                {data.note && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                        <div className="flex items-start gap-2">
                            <Filter size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                                {data.note}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 bg-slate-100 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/5">
                <div className="flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Layers size={12} />
                    <span>Multi-Factor Analysis Framework</span>
                </div>
            </div>
        </div>
    );
}

export default MethodologyCard;
