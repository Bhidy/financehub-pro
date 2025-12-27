"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTickers } from "@/lib/api";
import { TVChartComponent } from "@/components/TVChart";
import clsx from "clsx";
import Link from "next/link";

export default function ChartsPage() {
    const { data: tickers = [] } = useQuery({ queryKey: ["tickers"], queryFn: fetchTickers });

    // Get Top 4 by Volume
    const topTickers = tickers.slice(0, 4);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-20">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white">
                <div className="max-w-full mx-auto px-6 py-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">
                                📈
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight">Advanced Charting</h1>
                                <p className="text-blue-100 text-sm font-medium">Multi-Layout Grid (4-Up)</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Link href="/screener" className="text-sm font-bold text-white/80 hover:text-white">Screener</Link>
                            <Link href="/markets" className="text-sm font-bold text-white/80 hover:text-white">Heatmap</Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 h-[calc(100vh-100px)]">
                <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
                    {topTickers.map((t: any) => (
                        <div key={t.symbol} className="bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden flex flex-col">
                            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <div className="flex gap-2 items-center">
                                    <span className="font-bold text-blue-600">{t.symbol}</span>
                                    <span className="text-xs text-gray-500">{t.name_en}</span>
                                </div>
                                <div className={clsx("font-mono font-bold text-sm", t.change >= 0 ? "text-emerald-600" : "text-red-600")}>
                                    {Number(t.last_price).toFixed(2)}
                                </div>
                            </div>
                            <div className="flex-1 relative">
                                <TVChartComponent symbol={t.symbol} />
                            </div>
                        </div>
                    ))}
                    {topTickers.length === 0 && (
                        <div className="col-span-2 row-span-2 flex items-center justify-center text-gray-400">
                            Loading Market Data...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
