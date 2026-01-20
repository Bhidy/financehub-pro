
import React from 'react';

export function SkeletonAssetCard() {
    return (
        <div className="bg-[#151925]/50 border border-white/5 rounded-3xl p-6 shadow-sm animate-pulse relative overflow-hidden backdrop-blur-sm">
            {/* Shimmer Effect Overlay */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" />

            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10" />
                    <div className="space-y-2">
                        <div className="h-5 w-20 bg-white/10 rounded-lg" />
                        <div className="h-3 w-32 bg-white/5 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-20 -mx-6 mb-4 bg-gradient-to-b from-white/5 to-transparent opacity-50" />

            <div className="space-y-4 pt-2 border-t border-white/5">
                <div className="flex justify-between">
                    <div className="h-8 w-24 bg-white/10 rounded-lg" />
                    <div className="h-8 w-16 bg-white/10 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonInsightCard() {
    return (
        <div className="bg-[#151925] border border-white/5 rounded-3xl p-8 shadow-sm animate-pulse h-[240px] relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" />
            <div className="h-6 w-32 bg-white/10 rounded-lg mb-6" />
            <div className="h-full w-full bg-white/5 rounded-2xl" />
        </div>
    );
}

export function SkeletonTable() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 w-full bg-[#151925] border border-white/5 rounded-2xl animate-pulse relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" />
                </div>
            ))}
        </div>
    )
}
