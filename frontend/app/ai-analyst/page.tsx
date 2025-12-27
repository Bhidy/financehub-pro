"use client";

import { useAIChat } from "@/hooks/useAIChat";
import { Bot, Send, Sparkles, TrendingUp, PieChart, Newspaper, Loader2, User, Mic, Paperclip, Phone, History, ChevronLeft, BarChart3 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { EvidenceCard } from "@/components/EvidenceCard";
import { AnimatePresence, motion } from "framer-motion";
import { PriceChart, FinancialTable, IndicatorBadge } from "@/components/ai/AnalystUI";

export default function AIAnalystPage() {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const { query, setQuery, messages, isLoading, handleSend } = useAIChat();
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [query]);


    const suggestions = [
        { title: "Analyze TASI Sector breakdown", desc: "Get a detailed report on current sector performance.", icon: PieChart },
        { title: "Predict Aramco earnings", desc: "Forecast upcoming quarterly results based on data.", icon: TrendingUp },
        { title: "Summarize global markets", desc: "Stay updated on major market-moving events.", icon: Newspaper },
    ];

    const handleSuggestionClick = (text: string) => {
        setQuery(text);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-50 relative overflow-hidden font-sans">
            {/* Background Decor */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px] opacity-50 mix-blend-multiply"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-100/40 rounded-full blur-[120px] opacity-50 mix-blend-multiply"></div>
            </div>

            {/* History Drawer (Slide-out) */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHistoryOpen(false)}
                            className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] z-40 transition-opacity"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 350, damping: 35 }}
                            className="absolute left-0 top-0 bottom-0 w-80 bg-white/95 backdrop-blur-2xl border-r border-white/50 shadow-2xl z-50 flex flex-col p-0"
                        >
                            <div className="p-6 border-b border-slate-100/50">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <History className="w-5 h-5 text-blue-600" />
                                        <span>History</span>
                                    </h2>
                                    <button
                                        onClick={() => setIsHistoryOpen(false)}
                                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                </div>

                                <button
                                    onClick={() => setIsHistoryOpen(false)}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-3.5 hover:shadow-lg hover:shadow-blue-500/25 transition-all font-semibold active:scale-[0.98]"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    New Analysis
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                <div>
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Recent Queries</h4>
                                    <div className="space-y-1">
                                        {["TASI Sector Report", "Aramco Earnings Forecast", "Global Inflation Trends", "SABIC Valuation Model"].map((item, i) => (
                                            <button key={i} className="w-full text-left px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-700 transition-all truncate border border-transparent hover:border-slate-100 group flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative z-10 w-full h-full">

                {/* Header Actions (Floating) */}
                <div className="absolute top-6 left-6 z-20">
                    <button
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className="p-3 bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:shadow-md rounded-2xl text-slate-500 hover:text-blue-600 transition-all group active:scale-95"
                        title="View History"
                    >
                        <History className="w-5 h-5 group-hover:rotate-12 transition-transform duration-500" />
                    </button>
                </div>

                {/* Chat Scroll Area (Full Width for Scrollbar) */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 min-h-full flex flex-col">

                        {/* Welcome Screen */}
                        {messages.length === 1 && (
                            <div className="flex-1 flex flex-col justify-center items-center text-center animate-in fade-in duration-700 slide-in-from-bottom-6">
                                <div className="mb-8 relative group cursor-default">
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-teal-500 rounded-[2rem] flex items-center justify-center relative shadow-2xl shadow-blue-500/30 group-hover:scale-105 transition-transform duration-500">
                                        <Bot className="w-12 h-12 text-white drop-shadow-md" />
                                    </div>
                                </div>

                                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-slate-900 drop-shadow-sm">
                                    FinanceHub <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Analyst</span>
                                </h1>

                                <p className="text-slate-500 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                                    Institutional-grade market intelligence. <br className="hidden md:block" />
                                    Powered by advanced AI for deep-dive financial analysis.
                                </p>

                                <div className="grid md:grid-cols-3 gap-4 w-full max-w-5xl px-2">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSuggestionClick(s.title)}
                                            className="p-6 rounded-3xl bg-white hover:bg-white/80 border border-slate-200/60 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group text-left relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                                                    <ChevronLeft className="w-3 h-3 text-blue-600 rotate-180" />
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50/80 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                                <s.icon className="w-6 h-6" />
                                            </div>
                                            <div className="font-bold text-slate-900 text-lg mb-2 group-hover:text-blue-700 transition-colors">{s.title}</div>
                                            <div className="text-sm text-slate-500 leading-relaxed font-medium">{s.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        <div className="space-y-10 pb-40">
                            {messages.slice(1).map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                    key={idx}
                                    className={clsx("flex gap-5 md:gap-8", msg.role === "user" ? "justify-end" : "justify-start")}
                                >
                                    {/* Bot Avatar */}
                                    {msg.role === "assistant" && (
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/10 mt-1">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                    )}

                                    {/* Message content */}
                                    <div className={clsx(
                                        "flex flex-col gap-3 max-w-[85%] md:max-w-2xl",
                                        msg.role === "user" ? "items-end" : "items-start w-full"
                                    )}>
                                        <div className={clsx(
                                            "px-7 py-5 rounded-[2rem] text-[15px] md:text-base leading-relaxed shadow-sm ring-1 ring-inset",
                                            msg.role === "user"
                                                ? "bg-blue-600 text-white rounded-tr-sm ring-blue-600"
                                                : "bg-white/80 backdrop-blur-sm border border-slate-200/50 text-slate-800 rounded-tl-sm w-full ring-slate-200/20"
                                        )}>
                                            <div className="prose prose-slate max-w-none prose-p:leading-7 prose-strong:text-current prose-headings:text-current">
                                                {msg.role === "user" ? (
                                                    msg.content
                                                ) : (
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                )}
                                            </div>
                                        </div>

                                        {/* Evidence Cards */}
                                        {msg.role === "assistant" && msg.data && (
                                            <div className="w-full mt-2 grid gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                                {/* Price & Technicals */}
                                                {msg.data.price_data && (
                                                    <EvidenceCard title="Market Context" icon={TrendingUp} color="emerald">
                                                        <div className="flex justify-between items-end mb-4">
                                                            <div>
                                                                <div className="text-xs text-slate-500 font-bold mb-1 tracking-wider">{msg.data.price_data.symbol}</div>
                                                                <div className="text-2xl font-bold text-slate-900 tracking-tight">{msg.data.price_data.name_en}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-3xl font-black font-mono tracking-tighter text-slate-900">{Number(msg.data.price_data.last_price).toFixed(2)}</div>
                                                                <div className={clsx("text-sm font-bold flex items-center justify-end gap-1.5 mt-1", (msg.data.price_data.change_percent || 0) >= 0 ? "text-emerald-600" : "text-red-500")}>
                                                                    {(msg.data.price_data.change_percent || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
                                                                    {(msg.data.price_data.change_percent || 0) >= 0 ? "+" : ""}{msg.data.price_data.change_percent}%
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Tech Signals */}
                                                        {msg.data.technical_analysis && (
                                                            <div className="flex flex-wrap gap-2 mb-4">
                                                                <IndicatorBadge
                                                                    label="RSI"
                                                                    value={`${msg.data.technical_analysis.rsi || '-'}`}
                                                                    type={(msg.data.technical_analysis.rsi || 50) > 70 ? 'bearish' : (msg.data.technical_analysis.rsi || 50) < 30 ? 'bullish' : 'neutral'}
                                                                />
                                                                <IndicatorBadge
                                                                    label="Trend"
                                                                    value={msg.data.technical_analysis.trend || 'NEUTRAL'}
                                                                    type={msg.data.technical_analysis.trend === 'BULLISH' ? 'bullish' : msg.data.technical_analysis.trend === 'BEARISH' ? 'bearish' : 'neutral'}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Price History Chart */}
                                                        {msg.data.price_history && (
                                                            <PriceChart data={msg.data.price_history.history} symbol={msg.data.price_history.symbol} />
                                                        )}
                                                    </EvidenceCard>
                                                )}

                                                {/* Institutional Fundamentals */}
                                                {msg.data.fundamentals && (
                                                    <EvidenceCard title="Institutional Analysis" icon={PieChart} color="blue">
                                                        {/* High Level Metrics from latest row */}
                                                        {msg.data.fundamentals.financials?.[0] && (
                                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                                                {[
                                                                    { label: "Margin", value: `${msg.data.fundamentals.financials[0].net_margin || '-'}%` },
                                                                    { label: "ROA", value: `${msg.data.fundamentals.financials[0].roa || '-'}%`, highlight: true },
                                                                    { label: "ROE", value: `${msg.data.fundamentals.financials[0].roe || '-'}%`, highlight: true },
                                                                    { label: "Debt Ratio", value: `${msg.data.fundamentals.financials[0].debt_ratio || '-'}%` },
                                                                ].map((metric, i) => (
                                                                    <div key={i} className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 group hover:border-blue-100 transition-colors">
                                                                        <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">{metric.label}</div>
                                                                        <div className={clsx("font-bold font-mono text-base uppercase", metric.highlight ? "text-blue-600" : "text-slate-900")}>
                                                                            {metric.value}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Historical Financial Table */}
                                                        <FinancialTable financials={msg.data.fundamentals.financials} />
                                                    </EvidenceCard>
                                                )}

                                                {/* Ownership / Major Holders */}
                                                {msg.data.major_holders && (
                                                    <EvidenceCard title="Ownership Structure" icon={BarChart3} color="amber">
                                                        <div className="space-y-3">
                                                            {msg.data.major_holders.holders?.slice(0, 5).map((holder: any, i: number) => (
                                                                <div key={i} className="flex justify-between items-center text-xs">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-800">{holder.holder_name}</span>
                                                                        <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{holder.holder_type}</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="font-mono font-bold text-slate-900">{holder.ownership_percent}%</div>
                                                                        <div className={clsx("text-[10px] font-bold", holder.change_percent >= 0 ? "text-emerald-600" : "text-red-500")}>
                                                                            {holder.change_percent >= 0 ? '↑' : '↓'} {Math.abs(holder.change_percent)}%
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </EvidenceCard>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Loading State */}
                            {isLoading && (
                                <div className="flex gap-5 md:gap-8">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/10 mt-1 animate-pulse">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex items-center gap-3 p-5 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-slate-200/50">
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                        <span className="text-slate-600 text-sm font-medium animate-pulse">Analyzing market context...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Floating Input Area (Fixed Center) */}
                <div className="absolute bottom-6 left-0 right-0 z-30 pointer-events-none px-4">
                    <div className="max-w-4xl mx-auto w-full">
                        <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-white/60 p-2.5 flex items-end gap-3 pointer-events-auto ring-1 ring-slate-200/50 transition-all focus-within:shadow-blue-500/15 focus-within:bg-white/90">
                            <button className="p-4 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all hidden md:block group active:scale-95" title="Attach file">
                                <Paperclip className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>

                            <textarea
                                ref={textareaRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask FinanceHub AI about stocks, markets, or economics..."
                                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-40 py-4 px-3 text-slate-800 placeholder:text-slate-400 text-[15px] md:text-base scrollbar-none font-medium leading-relaxed"
                                rows={1}
                                disabled={isLoading}
                            />

                            <button className="p-4 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all hidden md:block group active:scale-95" title="Voice Input">
                                <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>

                            <button
                                onClick={handleSend}
                                disabled={!query.trim() || isLoading}
                                className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-[2rem] hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 m-1 group"
                            >
                                <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </button>
                        </div>
                        <div className="text-center mt-4 text-[10px] md:text-xs font-medium text-slate-400/80 uppercase tracking-widest">
                            AI-Generated • Verify Financial Data
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
