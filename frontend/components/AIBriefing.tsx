"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAIBriefing } from '@/lib/api';
import clsx from 'clsx';

export const AIBriefingWidget = () => {
    const { data: briefing, isLoading } = useQuery({ queryKey: ["ai-briefing"], queryFn: fetchAIBriefing });

    if (isLoading) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/3 mb-4"></div>
                <div className="h-20 bg-slate-50 rounded w-full"></div>
            </div>
        );
    }

    if (!briefing) return null;

    const sentimentColor = briefing.sentiment === 'BULLISH' ? 'text-emerald-600 bg-emerald-50' :
        briefing.sentiment === 'BEARISH' ? 'text-red-600 bg-red-50' :
            'text-slate-600 bg-slate-50';

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full flex flex-col relative overflow-hidden">
            {/* Background Effect */}
            <div className={clsx("absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-20 pointer-events-none",
                briefing.sentiment === 'BULLISH' ? 'bg-emerald-400' :
                    briefing.sentiment === 'BEARISH' ? 'bg-red-400' : 'bg-slate-400'
            )}></div>

            <div className="flex justify-between items-start mb-4 z-10">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <h3 className="font-bold text-slate-900 font-sans">AI Market Analyst</h3>
                </div>
                <span className={clsx("px-2 py-1 rounded text-xs font-bold uppercase tracking-wider", sentimentColor)}>
                    {briefing.sentiment} ({briefing.score})
                </span>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                {briefing.summary}
            </p>

            <div className="mt-auto">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2">Dominant Themes</h4>
                <div className="flex flex-wrap gap-2">
                    {briefing.themes.map((theme: string) => (
                        <span key={theme} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded border border-slate-200">
                            #{theme.toUpperCase()}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
