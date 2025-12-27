"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSectors, fetchTickers } from "@/lib/api";
import clsx from "clsx";
import { useMemo } from "react";

export default function MarketsPage() {
    const { data: sectors = [] } = useQuery({ queryKey: ["sectors"], queryFn: fetchSectors });
    const { data: tickers = [] } = useQuery({ queryKey: ["tickers"], queryFn: fetchTickers });

    // Calculate Market Breadth
    const breadth = useMemo(() => {
        const up = tickers.filter((t: any) => t.change > 0).length;
        const down = tickers.filter((t: any) => t.change < 0).length;
        const total = tickers.length;
        return { up, down, unchanged: total - up - down };
    }, [tickers]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pb-20">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                            🎯
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Market Intelligence</h1>
                            <p className="text-emerald-100 font-medium">Sector Performance & Market Breadth</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Market Breadth Indicator */}
                <div className="col-span-12 lg:col-span-12">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Market Breadth</h3>
                        <div className="flex items-center gap-4 h-8 rounded-full overflow-hidden bg-slate-100">
                            <div
                                className="h-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
                                style={{ width: `${(breadth.up / (breadth.up + breadth.down + breadth.unchanged || 1)) * 100}%` }}
                            >
                                {breadth.up > 0 && `${breadth.up} Up`}
                            </div>
                            <div
                                className="h-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 transition-all duration-500"
                                style={{ width: `${(breadth.unchanged / (breadth.up + breadth.down + breadth.unchanged || 1)) * 100}%` }}
                            >
                                {breadth.unchanged > 0 && `${breadth.unchanged} Flat`}
                            </div>
                            <div
                                className="h-full bg-red-500 flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
                                style={{ width: `${(breadth.down / (breadth.up + breadth.down + breadth.unchanged || 1)) * 100}%` }}
                            >
                                {breadth.down > 0 && `${breadth.down} Down`}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sector Heatmap Grid */}
                <div className="col-span-12">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Sector Heatmap</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sectors.map((s: any) => (
                            <div
                                key={s.sector_name}
                                className={clsx(
                                    "p-6 rounded-xl border transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between h-40 relative overflow-hidden",
                                    s.performance > 0
                                        ? "bg-emerald-50 border-emerald-100"
                                        : "bg-red-50 border-red-100"
                                )}
                            >
                                {/* Background Accent */}
                                <div className={clsx(
                                    "absolute top-0 right-0 p-12 opacity-10 transform translate-x-4 -translate-y-4 rounded-full",
                                    s.performance > 0 ? "bg-emerald-500" : "bg-red-500"
                                )}></div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-lg font-bold text-slate-800 group-hover:underline">{s.sector_name}</h4>
                                        <span className={clsx(
                                            "text-2xl font-bold font-mono tracking-tight",
                                            s.performance > 0 ? "text-emerald-600" : "text-red-600"
                                        )}>
                                            {s.performance > 0 ? "+" : ""}{Number(s.performance).toFixed(2)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 font-bold">Vol: {(s.total_volume / 1000000).toFixed(1)}M</p>
                                </div>

                                <div className="relative z-10 mt-auto">
                                    <div className="w-full bg-white/50 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={clsx("h-full rounded-full", s.performance > 0 ? "bg-emerald-500" : "bg-red-500")}
                                            style={{ width: `${Math.min(Math.abs(s.performance) * 20, 100)}%` }} // Scale bar visual
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
