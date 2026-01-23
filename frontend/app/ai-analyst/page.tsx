"use client";

import { useAIChat } from "@/hooks/useAIChat";
import { Bot, Send, Sparkles, TrendingUp, PieChart, Newspaper, Loader2, History, ChevronLeft, BarChart3, MessageSquarePlus, Paperclip, Mic, ShieldCheck, Zap, Activity, Building2, MessageCircle, User, LogIn, Settings, ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import { useEffect, useRef, useState, useMemo, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PremiumMessageRenderer } from "@/components/ai/PremiumMessageRenderer";
import { ChatCards, ActionsBar } from "@/components/ai/ChatCards";
import { ChartCard } from "@/components/ai/ChartCard";
import { useMarketSafe } from "@/contexts/MarketContext";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useGuestUsage } from "@/hooks/useGuestUsage";
import { useAuth } from "@/contexts/AuthContext";
import UsageLimitModal from "@/components/ai/UsageLimitModal";
import { FactExplanations } from "@/components/ai/FactExplanations";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function AIAnalystPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [showUsageModal, setShowUsageModal] = useState(false);
    const { query, setQuery, messages, isLoading, handleSend, handleAction, sendDirectMessage } = useAIChat({
        // Double safety: Only show modal if NOT authenticated
        onUsageLimitReached: () => {
            if (!isAuthenticated) {
                setShowUsageModal(true);
            }
        }
    });
    const { market } = useMarketSafe();
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auth and usage tracking
    const { isAuthenticated, user, logout } = useAuth();
    const { canAskQuestion, remainingQuestions, incrementUsage, deviceFingerprint } = useGuestUsage();

    // Handle Google OAuth callback - CRITICAL: Store token from URL params
    useEffect(() => {
        const token = searchParams.get("token");
        const userStr = searchParams.get("user");
        const googleAuth = searchParams.get("google_auth");

        if (googleAuth === "success" && token && userStr) {
            try {
                const userData = JSON.parse(decodeURIComponent(userStr));
                // Store in localStorage - same keys as AuthContext
                localStorage.setItem("fh_auth_token", token);
                localStorage.setItem("fh_user", JSON.stringify(userData));

                // Force navigation to clean URL (prevents infinite reload loop)
                window.location.href = "/ai-analyst";
            } catch (e) {
                console.error("Failed to parse Google auth response:", e);
            }
        }
    }, [searchParams]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendWithUsageCheck();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [query]);


    // =================================================================================================
    // SMART SUGGESTIONS - EXPANDED FOR FULL DB COVERAGE (43+ Fields)
    // =================================================================================================
    const suggestionCategories = useAISuggestions();

    const [activeCategory, setActiveCategory] = useState('popular');
    const activeSuggestions = suggestionCategories.find(c => c.id === activeCategory)?.suggestions || [];

    // Enhanced send with usage check
    const handleSendWithUsageCheck = () => {
        if (!isAuthenticated && !canAskQuestion) {
            setShowUsageModal(true);
            return;
        }
        if (!isAuthenticated) {
            incrementUsage();
        }
        handleSend();
    };

    const handleSuggestionClick = (text: string) => {
        if (!isAuthenticated && !canAskQuestion) {
            setShowUsageModal(true);
            return;
        }
        if (!isAuthenticated) {
            incrementUsage();
        }
        sendDirectMessage(text);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B1121] relative overflow-hidden transition-colors duration-300">

            {/* ULTRA-PREMIUM BACKGROUND DECOR */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent pointer-events-none" />

            {/* History Drawer */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHistoryOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute left-0 top-0 bottom-0 w-80 bg-white/95 dark:bg-[#0B1121]/95 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 shadow-2xl z-50 flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-white/5">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <History className="w-5 h-5 text-teal-500" />
                                        <span>History</span>
                                    </h2>
                                    <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => { setIsHistoryOpen(false); window.location.reload(); }}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl px-4 py-3 font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                                >
                                    <MessageSquarePlus className="w-4 h-4" />
                                    New Chat
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="text-center text-slate-400 text-sm py-10">No recent history</div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Header / Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-start pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="p-3 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm hover:shadow-md">
                        <History className="w-5 h-5" />
                    </button>
                    <button onClick={() => window.location.reload()} className="p-3 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm hover:shadow-md">
                        <MessageSquarePlus className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-3 items-center pointer-events-auto">
                    {!isAuthenticated && remainingQuestions > 0 && (
                        <div className="px-4 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                            <span className="text-teal-500 text-sm mr-1">{remainingQuestions}</span> free msgs
                        </div>
                    )}
                    <button onClick={() => router.push('/settings')} className="p-3 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm hover:shadow-md">
                        <Settings className="w-5 h-5" />
                    </button>
                    {isAuthenticated ? (
                        <button onClick={logout} className="p-3 bg-white/50 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl text-slate-500 hover:text-rose-500 transition-colors shadow-sm hover:shadow-md">
                            <LogIn className="w-5 h-5" />
                        </button>
                    ) : (
                        <button onClick={() => router.push('/login')} className="px-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all">
                            Login
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto w-full scroll-smooth pb-40">
                <div className={clsx("max-w-4xl mx-auto px-4 sm:px-6 w-full min-h-full flex flex-col", messages.length === 1 ? 'justify-center items-center py-20' : 'justify-start pt-24')}>

                    {/* WELCOME SCREEN */}
                    {messages.length === 1 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="w-full max-w-3xl flex flex-col items-center text-center space-y-8"
                        >
                            {/* Logo */}
                            <div className="w-24 h-24 relative mb-2">
                                <div className="absolute inset-0 bg-teal-500/30 blur-[40px] rounded-full animate-pulse" />
                                <Image src="/assets/chatbot-icon.png" alt="Starta AI" fill className="object-contain relative z-10 drop-shadow-2xl" priority />
                            </div>

                            {/* Headline */}
                            <div className="space-y-4">
                                <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Hello, I'm <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-500">Starta</span>
                                </h1>
                                <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto leading-relaxed">
                                    Your personal AI financial analyst. Ask me about valuation, dividends, or market trends.
                                </p>
                            </div>

                            {/* Chips */}
                            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                                {suggestionCategories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={clsx(
                                            "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                                            activeCategory === cat.id
                                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-lg scale-105"
                                                : "bg-white/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-white hover:shadow-md"
                                        )}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            {/* Suggestion Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                {activeSuggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSuggestionClick(s.text)}
                                        className="group p-5 rounded-2xl bg-white dark:bg-[#151925] border border-slate-100 dark:border-white/5 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/5 transition-all text-left flex items-start gap-4"
                                    >
                                        <div className={clsx("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white shadow-sm transition-transform group-hover:scale-110", s.gradient)}>
                                            <s.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors block mb-1">
                                                {s.text}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tap to ask</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* MESSAGES LIST */}
                    <div className="w-full space-y-8">
                        {messages.slice(1).map((msg, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={idx}
                                className={clsx("flex gap-4 md:gap-6", msg.role === "user" ? "justify-end" : "justify-start")}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg shadow-teal-500/20 shrink-0 mt-1">
                                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                    </div>
                                )}

                                <div className={clsx("flex flex-col gap-2 max-w-[90%] md:max-w-3xl", msg.role === "user" ? "items-end" : "items-start w-full")}>
                                    {msg.role === "user" ? (
                                        <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-xl font-medium text-base leading-relaxed">
                                            {msg.content}
                                        </div>
                                    ) : (
                                        <div className="w-full space-y-4">
                                            <PremiumMessageRenderer content={msg.response?.conversational_text || msg.content} />

                                            {/* Dynamic Components Rendered Here (Charts, Cards, etc.) */}
                                            {msg.response && (
                                                <>
                                                    {msg.response.chart && <ChartCard chart={msg.response.chart} />}
                                                    {msg.response.cards && <ChatCards cards={msg.response.cards} language={msg.response.language} onSymbolClick={(s) => { setQuery(`Price of ${s}`); handleSend(); }} onExampleClick={handleSuggestionClick} showExport={true} />}
                                                    {msg.response.learning_section && (
                                                        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl p-4">
                                                            <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2 text-sm"><Sparkles className="w-3 h-3" /> {msg.response.learning_section.title}</h4>
                                                            <ul className="space-y-2">
                                                                {msg.response.learning_section.items.map((item, i) => (
                                                                    <li key={i} className="text-xs md:text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                                                        <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 shrink-0" />
                                                                        <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {msg.response.follow_up_prompt && (
                                                        <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm italic text-slate-500 dark:text-slate-400">
                                                            💡 {msg.response.follow_up_prompt}
                                                        </div>
                                                    )}
                                                    {msg.response.actions && <ActionsBar actions={msg.response.actions} language={msg.response.language} onAction={handleAction} />}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                                    <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                                </div>
                                <div className="h-10 px-4 bg-white/50 dark:bg-white/5 rounded-xl flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce delay-75" />
                                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce delay-150" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* INPUT ISLAND - GROUNDED */}
            <div className="absolute bottom-0 left-0 right-0 z-30 pt-10 pb-6 px-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-[#0B1121] dark:via-[#0B1121] dark:to-transparent">
                <div className="max-w-4xl mx-auto w-full relative">
                    <div className="bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-900/10 dark:shadow-black/50 rounded-[2rem] p-2 pr-3 flex items-end gap-2 transition-all focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500">

                        <div className="flex items-center gap-1 pl-2 pb-2">
                            <button className="p-2.5 text-slate-400 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <button className="p-2.5 text-slate-400 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                                <Mic className="w-5 h-5" />
                            </button>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Starta anything..."
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-40 py-4 px-2 text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium leading-relaxed scrollbar-none"
                            rows={1}
                            style={{ minHeight: '3.5rem' }}
                            disabled={isLoading}
                        />

                        <button
                            onClick={handleSendWithUsageCheck}
                            disabled={!query.trim() || isLoading}
                            className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:shadow-none mb-1 mr-1"
                        >
                            <ArrowUpRight className="w-6 h-6" /> {/* Replaced Send with Modern Arrow */}
                        </button>
                    </div>

                    <div className="text-center mt-3">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest opacity-60">
                            Powerered by Groq &bull; Not Financial Advice
                        </p>
                    </div>
                </div>
            </div>

            {/* Usage Limit Modal */}
            <UsageLimitModal
                isOpen={showUsageModal}
                onClose={() => setShowUsageModal(false)}
                remainingQuestions={remainingQuestions}
            />
        </div>
    );
}

export default function AIAnalystPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B1121]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        }>
            <AIAnalystPageContent />
        </Suspense>
    );
}
