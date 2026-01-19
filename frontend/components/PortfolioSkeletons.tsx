
import React from 'react';

export function SkeletonAssetCard() {
    return (
        <div className="bg-white dark:bg-[#151925] border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm animate-pulse">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-white/10" />
                <div className="space-y-2">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded" />
                    <div className="h-3 w-32 bg-slate-200 dark:bg-white/10 rounded" />
                </div>
            </div>
            <div className="space-y-4">
                <div className="h-8 w-1/2 bg-slate-200 dark:bg-white/10 rounded" />
                <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded" />
                <div className="h-16 w-full bg-slate-200 dark:bg-white/10 rounded-xl" />
            </div>
        </div>
    );
}

export function SkeletonInsightCard() {
    return (
        <div className="bg-white dark:bg-[#151925] border border-slate-100 dark:border-white/5 rounded-2xl p-6 shadow-sm animate-pulse h-[200px]">
            <div className="h-6 w-32 bg-slate-200 dark:bg-white/10 rounded mb-4" />
            <div className="h-full w-full bg-slate-200 dark:bg-white/5 rounded-xl" />
        </div>
    );
}

export function SkeletonTable() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 w-full bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse" />
            ))}
        </div>
    )
}
