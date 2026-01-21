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
        <div className="flex flex-col h-[100dvh] bg-slate-50 dark:bg-[#0B1121] relative overflow-hidden transition-colors duration-300">

            {/* ============================================================================ */}
            {/* ULTRA-PREMIUM BACKGROUND DECOR (Midnight Teal) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#14B8A6]/5 via-transparent to-transparent dark:from-[#14B8A6]/5 dark:via-transparent dark:to-transparent pointer-events-none" />

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
                                        <History className="w-6 h-6 text-[#3B82F6]" />
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
                                    className="w-full flex items-center justify-center gap-2 bg-[#3B82F6] text-white rounded-lg px-4 py-3 hover:shadow-xl hover:shadow-[#3B82F6]/20 hover:bg-[#2563EB] transition-all font-bold text-sm active:scale-[0.98]"
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
                        className="p-3.5 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-white/50 dark:border-white/[0.08] shadow-sm hover:shadow-lg rounded-xl text-slate-500 dark:text-slate-400 hover:text-[#3B82F6] dark:hover:text-[#3B82F6] transition-all group active:scale-95"
                        title="View History"
                    >
                        <History className="w-5 h-5 group-hover:rotate-12 transition-transform duration-500" />
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-3.5 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-white/50 dark:border-white/[0.08] shadow-sm hover:shadow-lg rounded-xl text-slate-500 dark:text-slate-400 hover:text-[#3B82F6] dark:hover:text-[#3B82F6] transition-all group active:scale-95"
                        title="New Chat"
                    >
                        <MessageSquarePlus className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                    </button>
                </div>

                {/* Right side: Login/Profile + Settings */}
                <div className="absolute top-6 right-6 z-20 flex gap-3 items-center">
                    {/* Usage Counter Badge (for guests only) */}
                    {!isAuthenticated && remainingQuestions > 0 && (
                        <div className="px-3 py-2 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-white/50 dark:border-white/[0.08] rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300">
                            <span className="text-[#3B82F6] font-bold">{remainingQuestions}</span> questions left
                        </div>
                    )}
                    {!isAuthenticated && remainingQuestions <= 0 && (
                        <div className="px-3 py-2 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg text-sm font-medium text-[#EF4444]">
                            Limit reached
                        </div>
                    )}

                    {/* Settings Button (Theme Toggling) */}
                    <button
                        onClick={() => router.push('/settings')}
                        className="p-3 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-white/50 dark:border-white/[0.08] shadow-sm hover:shadow-lg rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#3B82F6] dark:hover:text-[#3B82F6] transition-all"
                        title="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    {/* Login/Profile Button */}
                    {isAuthenticated ? (
                        <div className="flex items-center gap-2">
                            <div className="px-4 py-2 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-white/50 dark:border-white/[0.08] rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200">
                                {user?.full_name || user?.email}
                            </div>
                            <button
                                onClick={logout}
                                className="p-3 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border border-white/50 dark:border-white/[0.08] shadow-sm hover:shadow-lg rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#EF4444] dark:hover:text-[#EF4444] transition-all"
                                title="Logout"
                            >
                                <LogIn className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => router.push('/login')}
                            className="px-4 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-[#3B82F6]/20 transition-all active:scale-95"
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
                                    <div className="absolute -inset-4 bg-[#14B8A6]/20 rounded-full blur-2xl animate-pulse opacity-50"></div>
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
                                    Hello, I'm <span className="text-[#14B8A6]">Starta</span>.
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
                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center shrink-0 shadow-lg mt-1">
                                            <Sparkles className="w-5 h-5 text-[#14B8A6]" />
                                        </div>
                                    )}

                                    {/* Message Content */}
                                    <div className={clsx(
                                        "flex flex-col gap-3 max-w-[95%] md:max-w-3xl",
                                        msg.role === "user" ? "items-end" : "items-start w-full"
                                    )}>
                                        {msg.role === "user" ? (
                                            <div className="px-6 py-4 bg-[#3B82F6] text-white rounded-2xl rounded-tr-sm shadow-[#3B82F6]/20 text-base leading-relaxed shadow-sm font-medium">
                                                {msg.content}
                                            </div>
                                        ) : (
                                            <div className="w-full space-y-4">
                                                {/* 1. Text Summary (The "Starta Voice" - NOW FIRST) */}
                                                <div className="w-full space-y-4 px-2">

                                                    <PremiumMessageRenderer content={msg.response?.conversational_text || msg.content} />

                                                    {/* 2. Charts & Cards (Secondary Data) */}
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

                                                    {/* 3. Fact Explanations (Legacy - kept for compatibility) */}
                                                    {msg.response?.fact_explanations && (
                                                        <div className="mt-2 border-t border-slate-100 dark:border-white/5 pt-4 px-2">
                                                            <FactExplanations explanations={msg.response.fact_explanations} />
                                                        </div>
                                                    )}

                                                    {/* 4. Learning Section (NEW - After Cards) */}
                                                    {msg.response?.learning_section && (
                                                        <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                                                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                                                                {msg.response.learning_section.title}
                                                            </h4>
                                                            <ul className="space-y-2">
                                                                {msg.response.learning_section.items.map((item, i) => (
                                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                                                                        <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-slate-900 dark:text-white font-semibold">$1</strong>') }} />
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* 5. Follow-Up Prompt (NEW - At the End) */}
                                                    {msg.response?.follow_up_prompt && (
                                                        <div className="mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-white/5">
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                                                                💡 {msg.response.follow_up_prompt}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* 6. Actions */}
                                                    {msg.response?.actions && msg.response.actions.length > 0 && (
                                                        <ActionsBar actions={msg.response.actions} language={msg.response.language} onAction={handleAction} />
                                                    )}

                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-5 items-center">
                                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center shrink-0 shadow-lg">
                                        <Loader2 className="w-5 h-5 animate-spin text-[#14B8A6]" />
                                    </div>
                                    <div className="flex items-center gap-3 px-6 py-3 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md rounded-xl border border-slate-100 dark:border-white/[0.08] shadow-md">
                                        <span className="w-2 h-2 bg-[#14B8A6] rounded-full animate-pulse"></span>
                                        <span className="w-2 h-2 bg-[#14B8A6] rounded-full animate-pulse delay-75"></span>
                                        <span className="w-2 h-2 bg-[#14B8A6] rounded-full animate-pulse delay-150"></span>
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
                        <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-2xl rounded-2xl border border-white/50 dark:border-white/[0.08] shadow-2xl shadow-slate-900/10 dark:shadow-black/30 p-2 flex items-end gap-3 transition-all focus-within:ring-2 focus-within:ring-[#3B82F6]/20 focus-within:border-[#3B82F6] dark:focus-within:border-[#3B82F6]/50">

                            {/* Attachment Button */}
                            <button className="p-3 text-slate-400 dark:text-slate-500 hover:text-[#3B82F6] dark:hover:text-[#3B82F6] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all h-14 w-14 flex items-center justify-center" title="Attach">
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
                            <button className="p-3 text-slate-400 dark:text-slate-500 hover:text-[#3B82F6] dark:hover:text-[#3B82F6] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all h-14 w-14 flex items-center justify-center" title="Voice">
                                <Mic className="w-6 h-6" />
                            </button>

                            {/* Send Button - Trust Blue */}
                            <button
                                onClick={handleSendWithUsageCheck}
                                disabled={!query.trim() || isLoading}
                                className="h-14 w-14 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-[#3B82F6]/30 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95"
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
