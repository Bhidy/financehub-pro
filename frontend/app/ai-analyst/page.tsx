"use client";

import { useAIChat } from "@/hooks/useAIChat";
import { Bot, Send, Sparkles, TrendingUp, PieChart, Newspaper, Loader2, User, Mic, Paperclip, Phone, History, ChevronLeft, BarChart3, Plus, MessageSquarePlus } from "lucide-react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { EvidenceCard } from "@/components/EvidenceCard";
import { AnimatePresence, motion } from "framer-motion";
import { PriceChart, FinancialTable, IndicatorBadge } from "@/components/ai/AnalystUI";
import { PremiumMessageRenderer } from "@/components/ai/PremiumMessageRenderer";

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


    // Smart Suggestions - Covers ALL 21 Database Tools
    const suggestionCategories = [
        {
            id: 'popular',
            label: '🔥 Hot',
            suggestions: [
                { text: "Aramco price now", icon: TrendingUp, gradient: "from-emerald-500 to-teal-600" },
                { text: "Top gainers today", icon: BarChart3, gradient: "from-orange-500 to-red-500" },
                { text: "Market summary", icon: PieChart, gradient: "from-blue-500 to-indigo-600" },
            ]
        },
        {
            id: 'beginner',
            label: '📚 Starter',
            suggestions: [
                { text: "Tell me about Al Rajhi", icon: Sparkles, gradient: "from-violet-500 to-purple-600" },
                { text: "Best performing sector", icon: PieChart, gradient: "from-cyan-500 to-blue-600" },
                { text: "STC stock info", icon: TrendingUp, gradient: "from-pink-500 to-rose-500" },
            ]
        },
        {
            id: 'technical',
            label: '📊 Technical',
            suggestions: [
                { text: "SABIC technical analysis", icon: BarChart3, gradient: "from-indigo-500 to-violet-600" },
                { text: "Aramco RSI and MACD", icon: TrendingUp, gradient: "from-blue-500 to-cyan-600" },
                { text: "Al Rajhi price history", icon: Newspaper, gradient: "from-slate-500 to-slate-700" },
            ]
        },
        {
            id: 'fundamental',
            label: '💰 Financials',
            suggestions: [
                { text: "Aramco financials", icon: PieChart, gradient: "from-emerald-500 to-green-600" },
                { text: "SABIC balance sheet", icon: BarChart3, gradient: "from-teal-500 to-emerald-600" },
                { text: "SNB income statement", icon: TrendingUp, gradient: "from-green-500 to-lime-600" },
            ]
        },
        {
            id: 'research',
            label: '🔬 Research',
            suggestions: [
                { text: "Al Rajhi analyst ratings", icon: Sparkles, gradient: "from-amber-500 to-orange-600" },
                { text: "Aramco insider trading", icon: TrendingUp, gradient: "from-red-500 to-rose-600" },
                { text: "Who owns SABIC?", icon: PieChart, gradient: "from-purple-500 to-pink-600" },
            ]
        },
        {
            id: 'events',
            label: '📅 Calendar',
            suggestions: [
                { text: "Upcoming dividends", icon: Newspaper, gradient: "from-pink-500 to-rose-600" },
                { text: "Earnings calendar", icon: BarChart3, gradient: "from-cyan-500 to-teal-600" },
                { text: "Recent corporate actions", icon: Sparkles, gradient: "from-indigo-500 to-blue-600" },
            ]
        },
        {
            id: 'macro',
            label: '🌍 Economy',
            suggestions: [
                { text: "Oil price today", icon: TrendingUp, gradient: "from-amber-500 to-yellow-600" },
                { text: "Gold price", icon: Sparkles, gradient: "from-yellow-500 to-amber-600" },
                { text: "Latest market news", icon: Newspaper, gradient: "from-slate-500 to-zinc-600" },
            ]
        },
    ];

    const [activeCategory, setActiveCategory] = useState('popular');
    const activeSuggestions = suggestionCategories.find(c => c.id === activeCategory)?.suggestions || [];

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

                {/* Chat Scroll Area (Full Width for Scrollbar) */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto w-full scroll-smooth">
                    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 min-h-full flex flex-col">

                        {/* Welcome Screen - Premium Redesigned */}
                        {messages.length === 1 && (
                            <div className="flex-1 flex flex-col justify-center items-center text-center animate-in fade-in duration-700 slide-in-from-bottom-6">
                                {/* Hero Icon - Removed */}

                                {/* Title */}
                                <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-slate-900 drop-shadow-sm">
                                    Hey! I'm <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">Finny</span> 🤖
                                </h1>

                                <p className="text-slate-500 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed font-medium">
                                    Your AI-powered guide to Saudi stocks. Ask me anything! ✨
                                </p>

                                {/* Category Tabs */}
                                <div className="flex flex-wrap justify-center gap-2 mb-6">
                                    {suggestionCategories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={clsx(
                                                "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                                                activeCategory === cat.id
                                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                                                    : "bg-white/70 text-slate-600 hover:bg-white hover:shadow-md border border-slate-200/50"
                                            )}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Suggestion Cards */}
                                <motion.div
                                    key={activeCategory}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="grid md:grid-cols-3 gap-4 w-full max-w-4xl"
                                >
                                    {activeSuggestions.map((s, i) => (
                                        <motion.button
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.1 }}
                                            onClick={() => handleSuggestionClick(s.text)}
                                            className="group p-5 rounded-2xl bg-white/90 backdrop-blur-sm hover:bg-white border border-slate-200/60 hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/15 transition-all duration-300 text-left flex items-center gap-4"
                                        >
                                            <div className={clsx(
                                                "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg",
                                                s.gradient
                                            )}>
                                                <s.icon className="w-6 h-6 text-white" />
                                            </div>
                                            <span className="text-base font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">
                                                {s.text}
                                            </span>
                                        </motion.button>
                                    ))}
                                </motion.div>

                                {/* Quick Actions - Top Stocks */}
                                <div className="mt-8 flex flex-wrap justify-center gap-3">
                                    <span className="text-xs text-slate-400 font-medium">Popular:</span>
                                    {["Aramco", "Al Rajhi", "SABIC", "STC", "SNB", "Maaden"].map((stock, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSuggestionClick(`${stock} price`)}
                                            className="px-3 py-1.5 rounded-full bg-slate-100/80 hover:bg-emerald-50 text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-200"
                                        >
                                            {stock}
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
                                        "flex flex-col gap-3 max-w-[85%] md:max-w-3xl",
                                        msg.role === "user" ? "items-end" : "items-start w-full"
                                    )}>
                                        <div className={clsx(
                                            "text-[15px] md:text-base leading-relaxed shadow-lg ring-1 ring-inset",
                                            msg.role === "user"
                                                ? "px-6 py-4 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm ring-blue-600 shadow-blue-500/20"
                                                : "px-6 py-6 bg-white/95 backdrop-blur-xl border border-slate-100 text-slate-800 rounded-2xl rounded-tl-sm w-full ring-slate-100/50 shadow-slate-200/50"
                                        )}>
                                            <div className={clsx(
                                                msg.role === "user"
                                                    ? ""
                                                    : "prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-h3:text-lg prose-h3:mt-0 prose-h3:mb-4 prose-h3:flex prose-h3:items-center prose-h3:gap-2 prose-p:text-slate-700 prose-p:leading-relaxed prose-strong:text-blue-700 prose-strong:font-semibold prose-table:my-4 prose-table:border-collapse prose-th:bg-slate-50 prose-th:text-slate-600 prose-th:text-xs prose-th:font-semibold prose-th:uppercase prose-th:tracking-wider prose-th:py-3 prose-th:px-4 prose-th:text-left prose-th:border-b prose-th:border-slate-200 prose-td:py-3 prose-td:px-4 prose-td:border-b prose-td:border-slate-100 prose-td:text-slate-800 prose-ul:my-3 prose-li:text-slate-700 prose-li:marker:text-blue-500 prose-hr:my-4 prose-hr:border-slate-100 prose-em:text-slate-500 prose-em:text-sm"
                                            )}>
                                                {msg.role === "user" ? (
                                                    <span className="font-medium">{msg.content}</span>
                                                ) : (
                                                    <PremiumMessageRenderer content={msg.content} />
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
                                                                {/* RSI Badge */}
                                                                <IndicatorBadge
                                                                    label="RSI"
                                                                    value={`${msg.data.technical_analysis.indicators?.rsi || msg.data.technical_analysis.rsi || '-'}`}
                                                                    type={(msg.data.technical_analysis.indicators?.rsi || 50) > 70 ? 'bearish' : (msg.data.technical_analysis.indicators?.rsi || 50) < 30 ? 'bullish' : 'neutral'}
                                                                />

                                                                {/* MACD Badge */}
                                                                {msg.data.technical_analysis.indicators?.macd?.sentiment && (
                                                                    <IndicatorBadge
                                                                        label="MACD"
                                                                        value={msg.data.technical_analysis.indicators.macd.sentiment}
                                                                        type={msg.data.technical_analysis.indicators.macd.sentiment === 'Bullish' ? 'bullish' : 'bearish'}
                                                                    />
                                                                )}

                                                                {/* Trend Badge */}
                                                                <IndicatorBadge
                                                                    label="Trend"
                                                                    value={msg.data.technical_analysis.trend || 'NEUTRAL'}
                                                                    type={msg.data.technical_analysis.trend && msg.data.technical_analysis.trend.includes('BULLISH') ? 'bullish' : msg.data.technical_analysis.trend && msg.data.technical_analysis.trend.includes('BEARISH') ? 'bearish' : 'neutral'}
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
