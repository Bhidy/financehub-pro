"use client";

import { useAIChat } from "@/hooks/useAIChat";
import { Bot, Send, Sparkles, TrendingUp, PieChart, Newspaper, Loader2, History, ChevronLeft, BarChart3, MessageSquarePlus, Paperclip, Mic, ShieldCheck, Zap, Activity, Building2, MessageCircle, User, LogIn, Settings } from "lucide-react";
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
        <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-[#0B1121] relative overflow-hidden transition-colors duration-300">

            {/* ============================================================================ */}
            {/* ULTRA-PREMIUM BACKGROUND DECOR (Mobile Style) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent dark:from-blue-900/10 dark:via-transparent dark:to-transparent pointer-events-none" />

            {/* History Drawer (Slide-out) */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHistoryOpen(false)}
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 350, damping: 35 }}
                            className="absolute left-0 top-0 bottom-0 w-80 bg-white/80 dark:bg-[#0B1121]/90 backdrop-blur-2xl border-r border-white/50 dark:border-white/10 shadow-2xl z-50 flex flex-col p-0"
                        >
                            <div className="p-6 border-b border-slate-100/50 dark:border-white/5">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        <span>History</span>
                                    </h2>
                                    <button
                                        onClick={() => setIsHistoryOpen(false)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => { setIsHistoryOpen(false); window.location.reload(); }}
                                    className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-blue-600 text-white rounded-xl px-4 py-4 hover:shadow-xl hover:shadow-slate-900/20 hover:bg-slate-800 dark:hover:bg-blue-500 transition-all font-bold text-sm active:scale-[0.98]"
                                >
                                    <MessageSquarePlus className="w-4 h-4" />
                                    New Conversation
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                <div className="text-center text-slate-400 text-sm py-10">No recent history</div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative z-10 w-full h-full">

                {/* Header Actions (Floating) */}
                <div className="absolute top-6 left-6 z-20 flex gap-3">
                    <button
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className="p-3.5 bg-white/70 dark:bg-[#1A1F2E]/70 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm hover:shadow-lg rounded-2xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all group active:scale-95"
                        title="View History"
                    >
                        <History className="w-5 h-5 group-hover:rotate-12 transition-transform duration-500" />
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-3.5 bg-white/70 dark:bg-[#1A1F2E]/70 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm hover:shadow-lg rounded-2xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all group active:scale-95"
                        title="New Chat"
                    >
                        <MessageSquarePlus className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                    </button>
                </div>

                {/* Right side: Login/Profile + Settings */}
                <div className="absolute top-6 right-6 z-20 flex gap-3 items-center">
                    {/* Usage Counter Badge (for guests only) */}
                    {!isAuthenticated && remainingQuestions > 0 && (
                        <div className="px-3 py-2 bg-white/70 dark:bg-[#1A1F2E]/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">{remainingQuestions}</span> questions left
                        </div>
                    )}
                    {!isAuthenticated && remainingQuestions <= 0 && (
                        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-500/30 rounded-xl text-sm font-medium text-red-600 dark:text-red-400">
                            Limit reached
                        </div>
                    )}

                    {/* Settings Button (Theme Toggling) */}
                    <button
                        onClick={() => router.push('/settings')}
                        className="p-3 bg-white/70 dark:bg-[#1A1F2E]/70 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm hover:shadow-lg rounded-xl text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                        title="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    {/* Login/Profile Button */}
                    {isAuthenticated ? (
                        <div className="flex items-center gap-2">
                            <div className="px-4 py-2 bg-white/70 dark:bg-[#1A1F2E]/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200">
                                {user?.full_name || user?.email}
                            </div>
                            <button
                                onClick={logout}
                                className="p-3 bg-white/70 dark:bg-[#1A1F2E]/70 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm hover:shadow-lg rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                                title="Logout"
                            >
                                <LogIn className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => router.push('/login')}
                            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
                        >
                            <LogIn className="w-4 h-4" />
                            Login
                        </button>
                    )}
                </div>

                {/* Chat Scroll Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto w-full scroll-smooth pb-48 pt-20">
                    <div className={clsx("max-w-4xl mx-auto px-6 flex flex-col min-h-full transition-all duration-700", messages.length === 1 ? 'justify-center' : 'justify-start')}>

                        {/* WELCOME SCREEN - BIGGER & BOLDER */}
                        {messages.length === 1 && (
                            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                                {/* AI Robot Logo */}
                                <div className="w-32 h-32 mb-8 relative">
                                    <div className="absolute -inset-4 bg-teal-500/20 rounded-full blur-2xl animate-pulse opacity-50"></div>
                                    <div className="relative w-full h-full p-2 filter drop-shadow-xl">
                                        <Image
                                            src="/assets/chatbot-icon.png"
                                            alt="Starta AI Assistant"
                                            fill
                                            className="object-contain"
                                            priority
                                        />
                                    </div>
                                </div>

                                <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 text-slate-900 dark:text-white">
                                    Hello, I'm <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-teal-400 bg-clip-text text-transparent">Starta</span>.
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                                    Your personal AI financial analyst. I can analyze <span className="text-slate-800 dark:text-slate-200 font-bold">valuation</span>, <span className="text-slate-800 dark:text-slate-200 font-bold">health</span>, and <span className="text-slate-800 dark:text-slate-200 font-bold">growth</span> for any {market} stock.
                                </p>

                                {/* Categories - Bigger Pills */}
                                <div className="flex flex-wrap justify-center gap-3 mb-8">
                                    {suggestionCategories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={clsx(
                                                "px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 transform active:scale-95 border",
                                                activeCategory === cat.id
                                                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 border-slate-900 dark:border-white scale-105"
                                                    : "bg-white dark:bg-[#1A1F2E] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#252b3d] hover:text-slate-800 dark:hover:text-slate-200 border-slate-200 dark:border-white/10"
                                            )}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Suggestions - Bigger Grid & Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                                    {activeSuggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSuggestionClick(s.text)}
                                            className="group p-5 rounded-2xl bg-white/80 dark:bg-[#1A1F2E]/60 backdrop-blur-sm border border-slate-200/60 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left flex items-center gap-5 transform hover:-translate-y-1 duration-300"
                                        >
                                            <div className={clsx("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white shadow-md group-hover:scale-110 transition-transform duration-300", s.gradient)}>
                                                <s.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <span className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors line-clamp-1 block mb-1">
                                                    {s.text}
                                                </span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium group-hover:text-blue-400 dark:group-hover:text-blue-300 transition-colors">
                                                    Tap to ask
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages - Ultra Premium Layout (Mobile Match) */}
                        <div className="space-y-10 py-4">
                            {messages.slice(1).map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                    key={idx}
                                    className={clsx("flex gap-5", msg.role === "user" ? "justify-end" : "justify-start")}
                                >
                                    {/* Bot Avatar */}
                                    {msg.role === "assistant" && (
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1F2E] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-lg mt-1">
                                            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                    )}

                                    {/* Message Content */}
                                    <div className={clsx(
                                        "flex flex-col gap-3 max-w-[95%] md:max-w-3xl",
                                        msg.role === "user" ? "items-end" : "items-start w-full"
                                    )}>
                                        {msg.role === "user" ? (
                                            <div className="px-6 py-4 bg-emerald-500 text-white rounded-3xl rounded-tr-sm shadow-emerald-500/20 text-base leading-relaxed shadow-sm font-medium">
                                                {msg.content}
                                            </div>
                                        ) : (
                                            <div className="w-full space-y-4">
                                                {/* 1. Charts & Cards (Top Priority as requested) */}
                                                {msg.response && (
                                                    <>
                                                        {msg.response.chart && <ChartCard chart={msg.response.chart} />}

                                                        {msg.response.cards && msg.response.cards.length > 0 && (
                                                            <ChatCards
                                                                cards={msg.response.cards}
                                                                language={msg.response.language}
                                                                onSymbolClick={(s) => { setQuery(`Price of ${s}`); handleSend(); }}
                                                                onExampleClick={(text) => handleSuggestionClick(text)}
                                                                showExport={true}
                                                            />
                                                        )}
                                                    </>
                                                )}

                                                {/* 2. Text Summary (Enhanced Design - Matches Mobile) */}
                                                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-[#1A1F2E] dark:to-[#151925] rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-blue-100 dark:border-blue-900/30 backdrop-blur-sm relative overflow-hidden group">
                                                    {/* Decorative Elements */}
                                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-600 opacity-80" />
                                                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />

                                                    {/* Header */}
                                                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-white/5">
                                                        <div className="p-1.5 rounded-lg bg-blue-100/50 dark:bg-blue-900/20">
                                                            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Analysis Summary</span>
                                                    </div>

                                                    <PremiumMessageRenderer content={msg.content} />
                                                </div>

                                                {/* 3. Actions */}
                                                {msg.response?.actions && msg.response.actions.length > 0 && (
                                                    <ActionsBar actions={msg.response.actions} language={msg.response.language} onAction={handleAction} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-5 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1F2E] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-500 dark:text-blue-400" />
                                    </div>
                                    <div className="flex items-center gap-3 px-6 py-3 bg-white/80 dark:bg-[#1A1F2E]/80 backdrop-blur-md rounded-full border border-slate-100 dark:border-white/5 shadow-md">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></span>
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></span>
                                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 ml-2">Analyst is thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* INPUT AREA - BIGGER & FLOATING */}
                <div className="absolute bottom-6 left-0 right-0 z-30 px-6">
                    <div className="max-w-4xl mx-auto w-full relative">
                        {/* Glass Container */}
                        <div className="bg-white/80 dark:bg-[#1A1F2E]/80 backdrop-blur-2xl rounded-3xl border border-white/50 dark:border-white/10 shadow-2xl shadow-slate-900/10 dark:shadow-black/30 p-2 flex items-end gap-3 transition-all focus-within:ring-4 focus-within:ring-blue-500/10 dark:focus-within:ring-blue-500/5 focus-within:border-blue-300 dark:focus-within:border-blue-700/50">

                            {/* Attachment Button */}
                            <button className="p-3 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-[#252b3d] rounded-2xl transition-all h-14 w-14 flex items-center justify-center" title="Attach">
                                <Paperclip className="w-6 h-6" />
                            </button>

                            {/* TALLER Input Box */}
                            <textarea
                                ref={textareaRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Message Starta..."
                                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-48 py-4 px-2 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-lg font-medium leading-relaxed scrollbar-none min-h-[3.5rem]"
                                rows={1}
                                disabled={isLoading}
                            />

                            {/* Voice Button */}
                            <button className="p-3 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-[#252b3d] rounded-2xl transition-all h-14 w-14 flex items-center justify-center" title="Voice">
                                <Mic className="w-6 h-6" />
                            </button>

                            {/* Send Button */}
                            <button
                                onClick={handleSendWithUsageCheck}
                                disabled={!query.trim() || isLoading}
                                className="h-14 w-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95"
                            >
                                <Send className="w-6 h-6 ml-0.5" />
                            </button>
                        </div>

                        <div className="text-center mt-3">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-600 font-bold">
                                AI-Generated Content • Check Important Info
                            </p>
                        </div>
                    </div>
                </div>
            </main>

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
