"use client";

import { useAIChat, Message, Action as ChatAction, ChatResponse } from "@/hooks/useAIChat";
import { Bot, Send, Sparkles, TrendingUp, PieChart, Newspaper, Loader2, User, Mic, Paperclip, Phone, History, ChevronLeft, BarChart3, Plus, MessageSquarePlus } from "lucide-react";
import clsx from "clsx";
import { useEffect, useRef, useState, useMemo } from "react";
import { EvidenceCard } from "@/components/EvidenceCard";
import { AnimatePresence, motion } from "framer-motion";
import { PriceChart, FinancialTable, IndicatorBadge } from "@/components/ai/AnalystUI";
import { PremiumMessageRenderer } from "@/components/ai/PremiumMessageRenderer";
import { ChatCards, ActionsBar, Disclaimer } from "@/components/ai/ChatCards";
import { ChartCard } from "@/components/ai/ChartCard";
import { useMarketSafe } from "@/contexts/MarketContext";

export default function AIAnalystPage() {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const { query, setQuery, messages, isLoading, handleSend, handleAction, clearHistory } = useAIChat();
    const { market, config } = useMarketSafe();
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


    // Smart Suggestions - Market-aware
    const suggestionCategories = useMemo(() => {
        const isEgypt = market === 'EGX';

        // Market-specific stock names
        const stocks = isEgypt
            ? { main: "CIB", second: "SWDY", third: "HRHO", bank: "COMI", index: "EGX30" }
            : { main: "Aramco", second: "Al Rajhi", third: "SABIC", bank: "SNB", index: "TASI" };

        return [
            {
                id: 'popular',
                label: `🔥 ${isEgypt ? 'Egypt' : 'KSA'} Hot`,
                suggestions: [
                    { text: `${stocks.main} price now`, icon: TrendingUp, gradient: "from-emerald-500 to-teal-600" },
                    { text: "Top gainers today", icon: BarChart3, gradient: "from-orange-500 to-red-500" },
                    { text: `${stocks.index} summary`, icon: PieChart, gradient: "from-blue-500 to-indigo-600" },
                ]
            },
            {
                id: 'beginner',
                label: '📚 Starter',
                suggestions: [
                    { text: `Tell me about ${stocks.second}`, icon: Sparkles, gradient: "from-violet-500 to-purple-600" },
                    { text: "Best performing sector", icon: PieChart, gradient: "from-cyan-500 to-blue-600" },
                    { text: `${stocks.third} stock info`, icon: TrendingUp, gradient: "from-pink-500 to-rose-500" },
                ]
            },
            {
                id: 'technical',
                label: '📊 Technical',
                suggestions: [
                    { text: `${stocks.main} chart`, icon: BarChart3, gradient: "from-indigo-500 to-violet-600" },
                    { text: `${stocks.second} price history`, icon: TrendingUp, gradient: "from-blue-500 to-cyan-600" },
                    { text: `Show ${stocks.third} chart`, icon: Newspaper, gradient: "from-slate-500 to-slate-700" },
                ]
            },
            {
                id: 'fundamental',
                label: '💰 Financials',
                suggestions: [
                    { text: `${stocks.main} financials`, icon: PieChart, gradient: "from-emerald-500 to-green-600" },
                    { text: `${stocks.bank} income statement`, icon: BarChart3, gradient: "from-teal-500 to-emerald-600" },
                    { text: `${stocks.second} balance sheet`, icon: TrendingUp, gradient: "from-green-500 to-lime-600" },
                ]
            },
            {
                id: 'dividends',
                label: '💵 Dividends',
                suggestions: [
                    { text: `${stocks.main} dividends`, icon: Sparkles, gradient: "from-amber-500 to-orange-600" },
                    { text: "Highest dividend stocks", icon: TrendingUp, gradient: "from-red-500 to-rose-600" },
                    { text: `${stocks.bank} dividend history`, icon: PieChart, gradient: "from-purple-500 to-pink-600" },
                ]
            },
            {
                id: 'compare',
                label: '⚖️ Compare',
                suggestions: [
                    { text: `Compare ${stocks.main} vs ${stocks.second}`, icon: Newspaper, gradient: "from-pink-500 to-rose-600" },
                    { text: `${stocks.bank} vs ${stocks.third}`, icon: BarChart3, gradient: "from-cyan-500 to-teal-600" },
                    { text: "Top losers today", icon: Sparkles, gradient: "from-indigo-500 to-blue-600" },
                ]
            },
        ];
    }, [market]);

    const [activeCategory, setActiveCategory] = useState('popular');
    const activeSuggestions = suggestionCategories.find(c => c.id === activeCategory)?.suggestions || [];

    const handleSuggestionClick = (text: string) => {
        setQuery(text);
    };

    return (
        <div className="flex h-full bg-slate-50 relative overflow-hidden font-sans">
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
                <div className="absolute top-6 left-6 z-20 flex gap-2">
                    <button
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className="p-3 bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:shadow-md rounded-2xl text-slate-500 hover:text-blue-600 transition-all group active:scale-95"
                        title="View History"
                    >
                        <History className="w-5 h-5 group-hover:rotate-12 transition-transform duration-500" />
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 backdrop-blur-md border border-white/40 shadow-md hover:shadow-lg rounded-2xl text-white transition-all group active:scale-95"
                        title="New Chat"
                    >
                        <MessageSquarePlus className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                    </button>
                </div>

                {/* Chat Scroll Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto w-full scroll-smooth pb-32">
                    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col min-h-full">

                        {/* Welcome Screen - Compact Premium */}
                        {messages.length === 1 && (
                            <div className="flex-1 flex flex-col justify-center items-center text-center animate-in fade-in duration-500">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-slate-900">
                                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Finny</span> 🤖
                                </h1>
                                <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                                    Ready to analyze the market.
                                </p>

                                {/* Categories - Compact */}
                                <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                                    {suggestionCategories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={clsx(
                                                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                                                activeCategory === cat.id
                                                    ? "bg-slate-900 text-white shadow-md"
                                                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                                            )}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Suggestions - Grid Compact */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full max-w-2xl">
                                    {activeSuggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSuggestionClick(s.text)}
                                            className="group p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all text-left flex items-center gap-3"
                                        >
                                            <div className={clsx("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 text-white", s.gradient)}>
                                                <s.icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-700 line-clamp-1">
                                                {s.text}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages - Ultra Compact Pro */}
                        <div className="space-y-6">
                            {messages.slice(1).map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={idx}
                                    className={clsx("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                                >
                                    {/* Bot Avatar - Smaller */}
                                    {msg.role === "assistant" && (
                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                                            <Sparkles className="w-4 h-4 text-blue-600" />
                                        </div>
                                    )}

                                    {/* Bubble */}
                                    <div className={clsx(
                                        "flex flex-col gap-2 max-w-[90%] md:max-w-2xl",
                                        msg.role === "user" ? "items-end" : "items-start w-full"
                                    )}>
                                        <div className={clsx(
                                            "text-sm leading-relaxed shadow-sm",
                                            msg.role === "user"
                                                ? "px-4 py-2.5 bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                                                : "px-0 py-0 bg-transparent text-slate-800 w-full" // Bot messages have no bubble, just content
                                        )}>
                                            {msg.role === "user" ? (
                                                <span className="font-medium">{msg.content}</span>
                                            ) : (
                                                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                                                    <PremiumMessageRenderer content={msg.content} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Response Cards */}
                                        {msg.role === "assistant" && msg.response && (
                                            <div className="w-full mt-1">
                                                <ChatCards
                                                    cards={msg.response.cards}
                                                    language={msg.response.language}
                                                    onSymbolClick={(s) => { setQuery(`Price of ${s}`); handleSend(); }}
                                                    onExampleClick={setQuery}
                                                    showExport={true}
                                                />
                                                {msg.response.chart && <ChartCard chart={msg.response.chart} />}
                                                {msg.response.actions?.length > 0 && (
                                                    <ActionsBar actions={msg.response.actions} language={msg.response.language} onAction={handleAction} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
                                        <span className="text-xs font-semibold text-slate-500 animate-pulse">Processing...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Input Area - Absolute Bottom (Respects Sidebar) */}
                <div className="absolute bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200/50 pb-0 pt-2 px-4">
                    <div className="max-w-2xl mx-auto w-full relative">
                        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm flex items-end gap-1.5 p-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all" title="Attach">
                                <Paperclip className="w-4 h-4" />
                            </button>

                            <textarea
                                ref={textareaRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Message Finny..."
                                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 px-1 text-slate-800 placeholder:text-slate-400 text-sm font-medium leading-relaxed scrollbar-none"
                                rows={1}
                                disabled={isLoading}
                            />

                            {/* Disclaimer integrated subtly */}
                            <span className="text-[9px] text-slate-300 font-medium uppercase tracking-widest whitespace-nowrap mb-1.5 mr-2 select-none hidden sm:block">
                                AI-Generated
                            </span>

                            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all" title="Voice">
                                <Mic className="w-4 h-4" />
                            </button>

                            <button
                                onClick={handleSend}
                                disabled={!query.trim() || isLoading}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
