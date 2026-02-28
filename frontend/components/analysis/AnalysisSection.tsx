"use client";

import { StockAnalysisResult, AnalysisCheck } from "@/lib/analysis-engine";
import { SnowflakeChart } from "./SnowflakeChart";
import { ValuationChart } from "./ValuationChart";
import { FutureGrowthChart } from "./FutureGrowthChart";
import { OwnershipDonut } from "./OwnershipDonut";
import { PeersScatter } from "./PeersScatter";
import {
    Check,
    X,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    Activity,
    ShieldCheck,
    PieChart,
    Info
} from "lucide-react";
import { motion } from "framer-motion";

interface AnalysisSectionProps {
    analysis: StockAnalysisResult;
    ticker: any;
    financials: any[]; // History for Growth Chart
    forecast: any[];   // Forecast for Growth Chart
    peers: any[];      // For Scatter
    ownership: any[];  // For Donut
    fairValue: number; // For Valuation Chart
}

export function AnalysisSection({ analysis, ticker, financials, forecast, peers, ownership, fairValue }: AnalysisSectionProps) {
    if (!analysis) return null;

    const renderChecks = (type: string) => {
        const checks = analysis.checks.filter(c => c.id.startsWith(type));
        return (
            <div className="space-y-3 mt-4">
                {checks.map((check, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
                    >
                        <div className={`mt-0.5 p-1 rounded-full ${check.passed ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"}`}>
                            {check.passed ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{check.message}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {check.label}: <span className="font-mono">{check.value}</span> vs {check.benchmark}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in-up">

            {/* 1. HERO SNOWFLAKE & SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual */}
                <div className="lg:col-span-1 relative overflow-hidden premium-glass rounded-2xl p-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none -mr-10 -mt-10" />
                    <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-emerald-500" /> Analysis Model
                    </h3>
                    <SnowflakeChart score={analysis.scores} />
                    <div className="text-center mt-2">
                        <span className="px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                            Total Score: {analysis.scores.total} / 30
                        </span>
                    </div>
                </div>

                {/* Narrative */}
                <div className="lg:col-span-2 relative overflow-hidden premium-glass rounded-2xl p-8 premium-glow-hover">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative z-10">
                        <h2 className="text-3xl font-black mb-4 text-slate-900 dark:text-white">Executive Summary</h2>
                        <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8 font-medium">
                            {analysis.summary}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                { l: "Value", s: analysis.scores.value, i: DollarSign },
                                { l: "Future", s: analysis.scores.future, i: TrendingUp },
                                { l: "Past", s: analysis.scores.past, i: Activity },
                                { l: "Health", s: analysis.scores.health, i: ShieldCheck },
                                { l: "Dividend", s: analysis.scores.dividend, i: PieChart },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <item.i className="w-3 h-3" /> {item.l}
                                    </div>
                                    <div className="flex items-end gap-1">
                                        <span className={`text-2xl font-black ${item.s >= 4 ? "text-emerald-400" : item.s >= 2 ? "text-amber-400" : "text-red-400"}`}>
                                            {item.s}
                                        </span>
                                        <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">/6</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. DEEP DIVE MODULES */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* VALUATION */}
                <div className="premium-glass rounded-2xl p-8 premium-glow-hover">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400"><DollarSign className="w-6 h-6" /></div>
                        Valuation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Fair Value Model (DCF)</h4>
                            <ValuationChart currentPrice={Number(ticker.last_price)} fairValue={fairValue} />
                        </div>
                        <div className="border-l border-slate-100 dark:border-white/5 pl-8">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Metric Analysis</h4>
                            {renderChecks('v')}
                        </div>
                    </div>
                </div>

                {/* FUTURE GROWTH */}
                <div className="premium-glass rounded-2xl p-8 premium-glow-hover">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                        <div className="p-2 bg-sky-100 dark:bg-sky-500/20 rounded-xl text-sky-600 dark:text-sky-400"><TrendingUp className="w-6 h-6" /></div>
                        Future Growth
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FutureGrowthChart data={[...financials, ...forecast]} />
                        <div className="border-l border-slate-100 dark:border-white/5 pl-8">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Growth Outlook</h4>
                            {renderChecks('v')} {/* Future checks not implemented/ID'd - using mock for structure */}
                            <div className="p-4 bg-sky-50 dark:bg-sky-500/10 rounded-xl border border-sky-100 dark:border-sky-500/20 mt-4">
                                <p className="text-sm text-sky-800 dark:text-sky-200">
                                    <Info className="w-4 h-4 inline mr-1" />
                                    Analysts forecast earnings to grow by <strong>12.5%</strong> per year.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* OWNERSHIP */}
                <div className="premium-glass rounded-2xl p-8 premium-glow-hover">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400"><PieChart className="w-6 h-6" /></div>
                        Ownership Breakdown
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <OwnershipDonut data={ownership} />
                        <div className="flex flex-col justify-center space-y-4">
                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    Top Shareholders control <strong>65%</strong> of the company.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-400 uppercase">Top Institutional Holders</p>
                                {/* Mock list - would come from props */}
                                <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-white/5 pb-2"><span>Vanguard Group</span><span>2.1%</span></div>
                                <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-white/5 pb-2"><span>BlackRock Inc.</span><span>1.8%</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RELATIVE VALUATION */}
                <div className="premium-glass rounded-2xl p-8 premium-glow-hover">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-xl text-orange-600 dark:text-orange-400"><Activity className="w-6 h-6" /></div>
                        Peer Comparison
                    </h3>
                    <PeersScatter
                        currentStock={{ symbol: ticker.symbol, pe: Number(ticker.pe_ratio) || 15, growth: 12, marketCap: Number(ticker.market_cap) }}
                        peers={peers}
                    />
                    <p className="text-xs text-center text-slate-400 mt-4">Comparison vs Top 5 Regional Peers in {ticker.sector_name}</p>
                </div>

            </div>
        </div>
    );
}
