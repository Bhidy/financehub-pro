"use client";

import StrategyBuilder from "@/components/StrategyBuilder";

export default function StrategyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 pb-20">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-teal-600 via-emerald-500 to-green-500 text-white sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">
                            🧪
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Quantitative Strategy Builder</h1>
                            <p className="text-teal-100 text-sm font-medium">Design, Backtest, and Optimize Trading Algorithms</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-8">
                <StrategyBuilder />
            </div>
        </div>
    );
}
