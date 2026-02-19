"use client";

import React from "react";
import { TrendingUp, TrendingDown, BarChart3, Database } from "lucide-react";
import { clsx } from "clsx";
import { translations } from "@/components/chatbot/translations";

interface GenericDataCardProps {
    data: {
        label?: string;
        price: string | number;
        change?: string;
        change_positive?: boolean;
        volume_context?: string;
        icon?: string;
    };
    language?: "en" | "ar";
}

export function GenericDataCard({ data, language = "en" }: GenericDataCardProps) {
    const isRtl = language === "ar";
    const t = translations[language].chat;

    // Safety: Ensure data exists
    if (!data) return null;

    const isPositive = data.change_positive === true;
    // If change_positive isn't explicitly provided, try to infer from change string if it exists
    const inferredPositive = data.change_positive ?? (data.change && !data.change.startsWith("-"));

    // Determine status color
    const statusColor = inferredPositive
        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
        : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20";

    return (
        <div className="p-5 bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <BarChart3 size={18} />
                    </div>
                    <h4 className="font-bold text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {data.label || (isRtl ? "البيانات الحالية" : "Current Data")}
                    </h4>
                </div>
                {data.change && (
                    <div className={clsx("px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border", statusColor)}>
                        {inferredPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span dir="ltr">{data.change}</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight" dir="ltr">
                    {data.price}
                </div>

                {data.volume_context && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <Database size={12} className="opacity-70" />
                        <span>{data.volume_context}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
