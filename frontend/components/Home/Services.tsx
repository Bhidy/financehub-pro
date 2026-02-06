"use client";

import { useRef, useEffect } from "react";
import Section from "./Section";
import Heading from "./Heading";
import { service1, service1Light, service2, service3, check } from "./assets";
import { brainwaveServices, brainwaveServicesIcons } from "./constants";
import {
    PhotoChatMessage,
    Gradient,
    VideoBar,
    VideoChatMessage,
} from "./design/Services";
import ScrubText from "../ScrubText";
import ClipReveal from "../ClipReveal";

import Generating from "./Generating";

const Services = () => {
    return (
        <Section id="how-to-use">
            <div className="container">
                <div className="text-center mb-12 lg:mb-20">
                    <h2 className="h2 mb-4">
                        <ScrubText text="Institutional-Grade Intelligence." type="chars" />
                    </h2>
                    <div className="body-1 text-n-4">
                        <ScrubText text="Starta Markets unlocks the potential of real-time EGX data." type="words" />
                    </div>
                </div>

                <div className="relative max-w-6xl mx-auto">
                    {/* Card 1: AI Analyst Chat (Large Left) */}
                    <ClipReveal direction="center" className="relative z-1 flex items-center h-[30rem] mb-5 p-8 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1121] rounded-[2rem] overflow-hidden lg:p-12 xl:h-[32rem] shadow-xl dark:shadow-[0_30px_90px_rgba(2,6,23,0.55)] group hover:border-slate-300 dark:hover:border-white/20 transition-all duration-500">
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none md:w-3/5 xl:w-auto">
                            {/* Light Mode Image */}
                            <img
                                className="w-full h-full object-cover md:object-right opacity-90 transition-opacity block dark:hidden"
                                width={800}
                                alt="AI Analyst"
                                height={730}
                                src={service1Light}
                            />
                            {/* Dark Mode Image */}
                            <img
                                className="w-full h-full object-cover md:object-right opacity-90 dark:opacity-100 transition-opacity hidden dark:block"
                                width={800}
                                alt="AI Analyst"
                                height={730}
                                src={service1}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent dark:from-[#0B1121] dark:via-[#0B1121]/40 dark:to-transparent md:via-white/0 md:to-transparent" />
                        </div>

                        <div className="relative z-1 max-w-[20rem] ml-auto">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1 text-[0.7rem] uppercase tracking-[0.24em] text-slate-500 dark:text-white/70 backdrop-blur-sm mb-6">
                                Smart Assistant
                            </div>
                            <h4 className="h4 mb-4 text-slate-900 dark:text-white">
                                <ScrubText text="Ask the AI Analyst" type="words" />
                            </h4>
                            <p className="body-2 mb-[2rem] text-slate-600 dark:text-slate-300">
                                Just ask: "Is EZZ Steel a buy?" or "Analyze COMI's risk."
                            </p>
                            <ul className="body-2">
                                {[
                                    "Instant Financial Reports",
                                    "Portfolio Risk Stress Tests",
                                    "Dividend Yield Forecasts"
                                ].map((item, index) => (
                                    <li key={index} className="flex items-start py-3 border-t border-slate-100 dark:border-white/10">
                                        <div className="flex items-center justify-center w-6 h-6 bg-[#13b8a6]/10 dark:bg-[#13b8a6]/20 rounded-full mr-4">
                                            <img width={14} height={14} src={check} alt="Check" className="tint-teal" />
                                        </div>
                                        <p className="text-sm text-slate-700 dark:text-slate-200">{item}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Generating className="absolute left-4 right-4 bottom-4 border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0F172A]/80 shadow-sm backdrop-blur-md lg:left-1/2 lg-right-auto lg:bottom-8 lg:-translate-x-1/2 text-slate-600 dark:text-white" type="Thinking: Analyzing P/E Ratio..." />
                    </ClipReveal>

                    <div className="relative z-1 grid gap-5 lg:grid-cols-2">
                        {/* Card 2: Proactive Alerts (Ultra Premium Holographic) */}
                        <ClipReveal
                            direction="vertical"
                            className="relative min-h-[30rem] rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1121] shadow-xl dark:shadow-[0_30px_90px_rgba(2,6,23,0.55)] group transition-all duration-500 hover:border-slate-300 dark:hover:border-white/20"
                        >
                            <div className="absolute inset-0 pointer-events-none">
                                {/* Northern Lights Top Effect */}
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#13b8a6] to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-700" />
                                <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_10%,rgba(20,184,166,0.05),transparent_60%),radial-gradient(120%_120%_at_85%_80%,rgba(59,130,246,0.05),transparent_55%)] dark:bg-[radial-gradient(120%_120%_at_15%_10%,rgba(20,184,166,0.15),transparent_60%),radial-gradient(120%_120%_at_85%_80%,rgba(59,130,246,0.1),transparent_55%)]" />
                                <div className="absolute inset-0 bg-transparent dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.95),rgba(15,23,42,0.60))]" />
                            </div>

                            <div className="relative z-1 flex h-full flex-col justify-between p-8 lg:p-10">
                                <div className="flex items-center justify-between">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1 text-[0.7rem] uppercase tracking-[0.24em] text-slate-500 dark:text-white/70 backdrop-blur-sm">
                                        Signal Engine
                                    </div>
                                    <div className="flex items-center gap-2 rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1 text-xs font-semibold text-[#0D9488] dark:text-[#2DD4BF]">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B8A6] opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#14B8A6]"></span>
                                        </span>
                                        Live
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <h4 className="h4 mb-4 text-slate-900 dark:text-white">
                                        <ScrubText text="Proactive Alerts" type="words" />
                                    </h4>
                                    <p className="body-2 mb-6 text-slate-600 dark:text-slate-300">
                                        Always‑on detection for breakouts, earnings inflections, and liquidity shifts.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
                                        {[
                                            "Breakout velocity",
                                            "Earnings surprise",
                                            "Order flow spikes",
                                            "Risk drift",
                                        ].map((item) => (
                                            <div
                                                key={item}
                                                className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 transition-colors duration-300 hover:bg-slate-100 dark:hover:bg-white/10"
                                            >
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-8 grid grid-cols-3 gap-3">
                                    {[
                                        { label: "Coverage", value: "MENA" },
                                        { label: "Latency", value: "< 500ms" },
                                        { label: "Triggers", value: "24/5" },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-3 text-xs text-slate-600 dark:text-slate-300"
                                        >
                                            <div className="text-[0.6rem] uppercase tracking-[0.28em] text-slate-400 dark:text-white/40">
                                                {item.label}
                                            </div>
                                            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                                {item.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="absolute right-6 top-20 w-[12rem] rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#1E293B]/90 p-4 text-xs text-slate-700 dark:text-white/80 backdrop-blur-md shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-105">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400 dark:text-white/50">

                                        Alert
                                    </div>
                                    <div className="h-1.5 w-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                                </div>
                                <div className="mt-1 font-semibold text-slate-900 dark:text-white text-sm">
                                    COMI volatility spike
                                </div>
                                <div className="mt-1 text-[0.65rem] text-slate-500 dark:text-slate-400">sigma &gt; 2.5 standard dev</div>
                                <div className="mt-3 h-[2px] w-full bg-gradient-to-r from-[#14B8A6] via-[#3B82F6] to-transparent rounded-full" />
                            </div>
                        </ClipReveal>

                        {/* Card 3: Institutional Deep Dives (Redesigned Dark Vault) */}
                        <div className="rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] shadow-xl dark:shadow-[0_30px_90px_rgba(15,23,42,0.3)] lg:min-h-[30rem] group hover:border-slate-300 dark:hover:border-white/20 transition-colors duration-500">
                            <ClipReveal direction="vertical" delay={0.2} className="h-full flex flex-col relative">
                                {/* Dark Background Effects */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.05),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1),transparent_70%)] pointer-events-none" />
                                <div className="absolute inset-0 bg-[url('/assets/grid.png')] bg-[length:40px_40px] opacity-[0.03] dark:opacity-[0.04] pointer-events-none mix-blend-overlay" />

                                <div className="relative px-6 py-8 xl:px-10 flex-1">
                                    <div className="relative z-1">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-1 text-[0.7rem] uppercase tracking-[0.24em] text-slate-500 dark:text-white/60">
                                            Research Vault
                                        </div>
                                        <h4 className="h4 mt-4 mb-3 text-slate-900 dark:text-white">
                                            <ScrubText text="Institutional Deep Dives" type="words" />
                                        </h4>
                                        <p className="body-2 mb-6 text-slate-600 dark:text-slate-300">
                                            Signal, not noise. Analyst‑grade reports in seconds with full data lineage.
                                        </p>
                                        <div className="grid grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-300">
                                            {[
                                                { label: "Coverage", value: "210+ Tickers" },
                                                { label: "Depth", value: "10Y+ History" },
                                                { label: "Exports", value: "CSV + PDF" },
                                            ].map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2 transition-colors duration-300 hover:bg-slate-100 dark:hover:bg-white/10"
                                                >
                                                    <div className="text-[0.6rem] uppercase tracking-[0.25em] text-slate-400 dark:text-white/40">
                                                        {item.label}
                                                    </div>
                                                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                                        {item.value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="relative mx-4 mb-4 flex-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B1121]/50 p-5 backdrop-blur-sm transition-all duration-500 group-hover:-translate-y-1">
                                    <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_20%_0%,rgba(20,184,166,0.05),transparent_55%)] dark:bg-[radial-gradient(120%_120%_at_20%_0%,rgba(20,184,166,0.08),transparent_55%)]" />
                                    {/* Holographic Top Border */}
                                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#14B8A6]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative z-1 grid gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.2em] text-[#0D9488] dark:text-[#2DD4BF] font-semibold">
                                                <div className="w-1 h-1 rounded-full bg-[#0D9488] dark:bg-[#2DD4BF] animate-pulse" />
                                                Report Preview
                                            </div>
                                            <div className="text-[0.65rem] text-slate-400 dark:text-slate-500 font-mono">ID: #8821X</div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 p-4 relative overflow-hidden group/card shadow-sm dark:shadow-none">
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 dark:via-white/5 -translate-x-[150%] skew-x-12 group-hover/card:animate-[shimmer_2s_infinite]" />

                                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                                COMI — Risk & Valuation Summary
                                            </div>
                                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                                Intraday sentiment, valuation banding, and downside buffers.
                                            </div>
                                            <div className="mt-3 flex items-center gap-2 text-xs">
                                                <span className="rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-2.5 py-1 text-[#0D9488] dark:text-[#2DD4BF] font-medium">
                                                    Quality: A-
                                                </span>
                                                <span className="rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-2.5 py-1 text-[#2563EB] dark:text-[#60A5FA] font-medium">
                                                    Confidence: 92%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3 text-xs text-slate-600 dark:text-white/70">
                                            {[
                                                { label: "Valuation", value: "At Fair" },
                                                { label: "Moat", value: "Strong" },
                                                { label: "Momentum", value: "Positive" },
                                            ].map((item) => (
                                                <div
                                                    key={item.label}
                                                    className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 px-3 py-3"
                                                >
                                                    <div className="text-[0.6rem] uppercase tracking-[0.28em] text-slate-400 dark:text-white/40">
                                                        {item.label}
                                                    </div>
                                                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                                        {item.value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ClipReveal>
                        </div>
                    </div>

                    <Gradient />
                </div>
            </div>
        </Section>
    );
};

export default Services;
