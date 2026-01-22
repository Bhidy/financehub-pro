import React from 'react';

export function SkeletonAssetCard() {
    return (
        <div className="bg-white dark:bg-[#151925]/50 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 animate-pulse relative overflow-hidden backdrop-blur-3xl">
            {/* Shimmer Effect Overlay */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-900/5 dark:via-white/5 to-transparent z-10" />

            <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/10" />
                    <div className="space-y-3">
                        <div className="h-6 w-24 bg-slate-100 dark:bg-white/10 rounded-xl" />
                        <div className="h-4 w-32 bg-slate-50 dark:bg-white/5 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-24 -mx-10 mb-8 bg-gradient-to-b from-slate-100/50 dark:from-white/5 to-transparent opacity-50" />

            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center">
                    <div className="h-10 w-32 bg-slate-100 dark:bg-white/10 rounded-xl" />
                    <div className="h-10 w-20 bg-slate-100 dark:bg-white/10 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonInsightCard() {
    return (
        <div className="bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 animate-pulse h-[280px] relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-900/5 dark:via-white/5 to-transparent z-10" />
            <div className="h-6 w-32 bg-slate-100 dark:bg-white/10 rounded-xl mb-10" />
            <div className="h-full w-full bg-slate-50 dark:bg-white/5 rounded-[2rem]" />
        </div>
    );
}

export function SkeletonTable() {
    return (
        <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 w-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-3xl animate-pulse relative overflow-hidden shadow-sm">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-slate-900/5 dark:via-white/5 to-transparent z-10" />
                </div>
            ))}
        </div>
    )
}
