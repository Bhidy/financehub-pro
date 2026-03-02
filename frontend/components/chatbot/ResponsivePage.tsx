/**
 * ============================================================================
 * RESPONSIVE AI ANALYST PAGE - MOCKUP ACCURATE DESIGN
 * ============================================================================
 * 
 * Domain-aware responsive wrapper that provides:
 * - startamarkets.com: Ultra-premium responsive design (Desktop sidebar + Mobile)
 * - finhub-pro.vercel.app: UNCHANGED original mobile experience
 * 
 * Same URL works for both desktop and mobile - purely responsive.
 * 
 * DESKTOP LAYOUT MATCHES THE PROVIDED MOCKUP EXACTLY:
 * - Left sidebar with chat history grouped by TODAY/YESTERDAY/THIS WEEK
 * - Main content with StartaAI PRO header
 * - Welcome section with icon, input field with ⌘+Enter hint
 * - 6 Popular Analysis Request cards in 2x3 grid
 * 
 * ============================================================================
 */

"use client";

import { useState, useRef, useEffect, Suspense, useCallback, useMemo, memo } from "react";
import { Loader2, Send, BarChart3, Sun, Moon, Plus, History, Settings, LogOut, MessageSquare, ChevronLeft, ChevronRight, Sparkles, Bot, User, Target, CircleDollarSign, TrendingUp, PieChart, ArrowLeftRight, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIChat, Action } from "@/hooks/useAIChat";
import { useTypewriter } from "@/hooks/useTypewriter";
import { MobileHeader } from "./components/MobileHeader";
import { MobileInput } from "./components/MobileInput";
import { MobileSuggestions } from "./components/MobileSuggestions";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useGuestUsage } from "@/hooks/useGuestUsage";
import UsageLimitModal from "@/components/ai/UsageLimitModal";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { clsx } from "clsx";

// Premium UI Components
import { ChatCards, ActionsBar } from "@/components/ai/ChatCards";
import { ChartCard } from "@/components/ai/ChartCard";
import { FactExplanations } from "@/components/ai/FactExplanations";
import { useMobileRoutes } from "./hooks/useMobileRoutes";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { AnalystDesktopGrid } from "./components/AnalystDesktopGrid";

// NEW: World-Class Unified Message Renderer (Matches Mockup EXACTLY)
import { WorldClassMessage, FollowUpPrompt, FollowUpChips } from "@/components/ai/WorldClassMessage";
import { MessageErrorBoundary } from "@/components/ai/MessageErrorBoundary";
import { MessageFeedback } from "@/components/ai/MessageFeedback";

// Domain and Device detection
import { useDomainDetect } from "@/hooks/useDomainDetect";
import { useDeviceDetect } from "@/hooks/useDeviceDetect";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { translations, Language } from "./translations";

const containsArabicChars = (text?: string) => /[\u0600-\u06FF]/.test(text || "");
const canonicalizeCardType = (value: any): string => {
    const raw = String(value ?? "").trim();
    if (!raw) return raw;
    if (/^cardtype\./i.test(raw)) return raw.replace(/^cardtype\./i, "").toLowerCase();
    if (/^CardType\./.test(raw)) return raw.replace(/^CardType\./, "").toLowerCase();
    return raw.toLowerCase();
};
export const resolveMessageLanguage = (msg: any): Language => {
    const responseLanguage = msg?.response?.language;
    if (responseLanguage === "ar") return "ar";
    if (responseLanguage === "en") {
        const combined = `${msg?.response?.conversational_text || ""} ${msg?.response?.message_text || ""} ${msg?.content || ""}`;
        return containsArabicChars(combined) ? "ar" : "en";
    }
    const combined = `${msg?.response?.conversational_text || ""} ${msg?.response?.message_text || ""} ${msg?.content || ""}`;
    return containsArabicChars(combined) ? "ar" : "en";
};

/**
 * Responsive AI Analyst with Domain-Based Layout
 */
export interface ResponsivePageProps {
    initialSessionId?: string;
    isSharedView?: boolean;
    isSharedMessageView?: boolean;
}

/**
 * Responsive AI Analyst with Domain-Based Layout
 */
function ResponsiveAIAnalystContent({ initialSessionId, isSharedView = false, isSharedMessageView = false }: ResponsivePageProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
    const { getRoute } = useMobileRoutes();
    const [showUsageModal, setShowUsageModal] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const [lang, setLang] = useState<Language>("en");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [designMode, setDesignMode] = useState<'pro' | 'analyst'>('pro');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLElement>(null);

    // Domain and Device Detection
    const { isStartaMarkets, isFinhubPro, isLocalhost, isSSR: isDomainSSR } = useDomainDetect();
    const { isDesktop, isMobile, isSSR: isDeviceSSR } = useDeviceDetect();

    // Guest usage tracking
    const { remainingQuestions, incrementUsage } = useGuestUsage();

    // Fixed market context - Egypt is default (no market selector)
    const contextMarket = "EGX";

    // Typewriter placeholders
    const placeholderTexts = translations[lang].placeholders;

    const typewriterPlaceholder = useTypewriter(placeholderTexts);

    // Language Initialization with Persistence
    useEffect(() => {
        if (typeof window !== "undefined") {
            // FORCE ENGLISH (Override any saved preference)
            // const savedLang = localStorage.getItem("lang") as Language;
            setLang('en');
            localStorage.setItem("lang", "en");
            document.documentElement.lang = "en";
            document.documentElement.dir = "ltr";
        }
    }, []);

    const toggleLang = () => {
        const newLang = lang === 'en' ? 'ar' : 'en';
        setLang(newLang);
        localStorage.setItem("lang", newLang);
        document.documentElement.lang = newLang;
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    };

    // Handle Google OAuth callback
    useEffect(() => {
        const token = searchParams.get("token");
        const refreshToken = searchParams.get("refresh_token");
        const userStr = searchParams.get("user");
        const googleAuth = searchParams.get("google_auth");

        if (googleAuth === "success" && token && userStr) {
            try {
                const userData = JSON.parse(decodeURIComponent(userStr));
                localStorage.setItem("fh_auth_token", token);
                if (refreshToken) {
                    localStorage.setItem("fh_refresh_token", refreshToken);
                }
                localStorage.setItem("fh_user", JSON.stringify(userData));
                window.location.href = getRoute('home');
            } catch (e) {
                console.error("Failed to parse Google auth response:", e);
            }
        }
    }, [searchParams]);

    // Set sidebar state based on auth - REMOVED to keep closed by default
    // useEffect(() => {
    //     if (!isAuthLoading) {
    //         setIsSidebarOpen(isAuthenticated);
    //     }
    // }, [isAuthLoading, isAuthenticated]);

    // Memoize config to prevent infinite re-renders
    const chatConfig = useMemo(() => ({
        market: contextMarket,
        onUsageLimitReached: () => {
            if (!isAuthenticated && !isSharedView) {
                setShowUsageModal(true);
            }
        },
        lang: lang,
        sharedSessionId: isSharedView ? initialSessionId : undefined,
        isSharedMessageView: isSharedMessageView,
    }), [contextMarket, isAuthenticated, lang, isSharedView, initialSessionId, isSharedMessageView]);

    const {
        messages,
        query,
        setQuery,
        handleSend,
        isLoading,
        sendDirectMessage,
        clearHistory,
        loadSession,
        sessionId,
        historyRefreshTrigger
    } = useAIChat(chatConfig);

    // Handle session selection wrapper to ensure state updates
    const handleSelectSession = useCallback(async (id: string) => {
        console.log("Selecting session:", id);
        // Force the sidebar to stay open or just load the session
        await loadSession(id);
    }, [loadSession]);

    // Increment usage counter for guests
    const prevMessageCount = useRef(messages.length);
    useEffect(() => {
        if (messages.length > prevMessageCount.current) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'assistant' && !isAuthenticated) {
                if (lastMessage.response?.meta?.intent !== 'USAGE_LIMIT_REACHED') {
                    incrementUsage();
                } else {
                    // Trigger popup if limit reached intent is received
                    setShowUsageModal(true);
                }
            }
        }
        prevMessageCount.current = messages.length;
    }, [messages.length, isAuthenticated, incrementUsage]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    };

    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];

            // 1. Scroll down immediately when the user submits a question or the loader appears
            if (isLoading || lastMessage.role === 'user') {
                setTimeout(scrollToBottom, 50);
                return;
            }

            // 2. Once the assistant responds, scroll near the top initially if it's too long,
            // BUT actually we just want to let the typing scroll logic handle pushing it down!
            if (!isLoading && lastMessage.role === 'assistant') {
                // Initial snap into view.
                setTimeout(scrollToBottom, 50);
            }
        }
    }, [messages.length, isLoading]);

    const handleAction = (action: Action) => {
        if (action.action_type === "navigate" && action.payload) {
            router.push(action.payload);
            return;
        }
        if (action.payload) {
            sendDirectMessage(action.payload);
            return;
        }
        if (action.label) {
            sendDirectMessage(action.label);
        }
    };

    const handleSymbolClick = useCallback((symbol: string) => {
        sendDirectMessage(`Analyze ${symbol}`);
    }, [sendDirectMessage]);

    const handleExampleClick = useCallback((text: string) => {
        sendDirectMessage(text);
    }, [sendDirectMessage]);

    // Loading state
    if (isAuthLoading || isDomainSSR || isDeviceSSR) {
        return (
            <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-50 dark:bg-[#0B1121]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-500" />
            </div>
        );
    }

    const hiddenSystemMessages = new Set([
        "Chat initialized. Ready to assist.",
        "تم تهيئة المحادثة. جاهز للمساعدة."
    ]);
    const visibleMessages = messages.filter(m => !hiddenSystemMessages.has(m.content));
    const showWelcome = visibleMessages.length === 0;

    // For localhost, default to Starta behavior for development
    const effectiveStarta = isStartaMarkets || isLocalhost;
    const effectiveDesktop = effectiveStarta && isDesktop;

    const renderMessageList = () => (
        <div className="space-y-6 pt-2 pb-6 px-1">
            {visibleMessages.map((m, idx) => (
                <MessageRenderer
                    key={idx}
                    m={m}
                    idx={idx}
                    isLatest={idx === visibleMessages.length - 1 && !m.isHistorical}
                    scrollToBottom={scrollToBottom}
                    handleSymbolClick={handleSymbolClick}
                    handleExampleClick={handleExampleClick}
                    sendDirectMessage={sendDirectMessage}
                    handleAction={handleAction}
                    sessionId={sessionId}
                />
            ))}

            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 flex items-center gap-3 shadow-sm ">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-[#13b8a6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-[#13b8a6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-[#13b8a6] rounded-full animate-bounce"></span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-pulse">{translations[lang].analyzing}</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
        </div>
    );

    // ========================================================================
    // DESKTOP LAYOUT - Exact Match to Provided Mockup
    // ========================================================================
    if (effectiveDesktop) {
        // Popular analysis request cards - matches mockup exactly
        // Popular analysis request cards - matches mockup exactly
        const t = translations[lang];
        const popularRequests = [
            { icon: '🎯', title: t.cards.fairValue.title, subtitle: t.cards.fairValue.subtitle, query: t.cards.fairValue.query, color: 'teal' },
            { icon: '✨', title: t.cards.dividendDeep.title, subtitle: t.cards.dividendDeep.subtitle, query: t.cards.dividendDeep.query, color: 'teal' },
            { icon: '📊', title: t.cards.comparison.title, subtitle: t.cards.comparison.subtitle, query: t.cards.comparison.query, color: 'teal' },
            { icon: '📈', title: t.cards.screener.title, subtitle: t.cards.screener.subtitle, query: t.cards.screener.query, color: 'coral' },
            { icon: '💵', title: t.cards.price.title, subtitle: t.cards.price.subtitle, query: t.cards.price.query, color: 'teal' },
            { icon: '📉', title: t.cards.sector.title, subtitle: t.cards.sector.subtitle, query: t.cards.sector.query, color: 'coral' },
        ];

        return (
            <div className="h-[100dvh] w-full flex bg-[#F8FAFC] dark:bg-[#0B1121] overflow-hidden">
                {/* ================================================================
                    LEFT SIDEBAR - Ultra Premium Component
                    ================================================================ */}
                <DesktopSidebar
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    onNewChat={clearHistory}
                    onSelectSession={handleSelectSession}
                    currentSessionId={sessionId}
                    isAuthenticated={isAuthenticated}
                    user={user}
                    onLogin={() => router.push(getRoute('login'))}
                    onLogout={logout}
                    onSettings={() => router.push(getRoute('setting'))}
                    lang={lang}
                    refreshTrigger={historyRefreshTrigger}
                />

                {/* ================================================================
                    MAIN CONTENT AREA (Matches Mockup)
                    ================================================================ */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                    {/* Top Header Bar - StartaAI PRO badge + User button */}
                    <header className="flex-shrink-0 h-14 px-6 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]">
                        <div className="flex items-center gap-2" dir="ltr">
                            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">STARTA</span>
                            <span className="px-1.5 py-0.5 rounded-[4px] bg-[#13b8a6]/10 text-[#13b8a6] text-[10px] font-black uppercase tracking-wider">{translations[lang].beta}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Design Switcher (Desktop) */}
                            <div className="hidden bg-slate-100 dark:bg-white/5 p-1 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-white/10">
                                <button
                                    onClick={() => setDesignMode('pro')}
                                    className={clsx(
                                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all",
                                        designMode === 'pro'
                                            ? "bg-white dark:bg-slate-700 text-[#13b8a6] shadow-sm"
                                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    )}
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Pro
                                </button>
                                <button
                                    onClick={() => setDesignMode('analyst')}
                                    className={clsx(
                                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all",
                                        designMode === 'analyst'
                                            ? "bg-white dark:bg-slate-700 text-[#13b8a6] shadow-sm"
                                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    )}
                                >
                                    <Bot className="w-3 h-3" />
                                    Analyst
                                </button>
                            </div>

                            {/* Language Switcher - HIDDEN as per user request */}
                            {/* <button
                                onClick={toggleLang}
                                className="px-3 py-1.5 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors uppercase"
                            >
                                {lang === 'en' ? 'AR' : 'EN'}
                            </button> */}

                            {/* Dark Mode Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors"
                            >
                                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>

                            {/* User Button */}
                            {isAuthenticated ? (
                                <button
                                    onClick={() => router.push(getRoute('setting'))}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors",
                                        designMode === 'pro'
                                            ? "bg-[#13b8a6] hover:bg-[#0f8f82]"
                                            : "bg-[#13b8a6] hover:bg-[#0f8f82]"
                                    )}
                                >
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold overflow-hidden relative">
                                        {user?.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.full_name || "User"}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            user?.full_name?.charAt(0) || "U"
                                        )}
                                    </div>
                                    {user?.full_name?.split(' ')[0] || "User"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => router.push(getRoute('login'))}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors",
                                        designMode === 'pro'
                                            ? "bg-[#13b8a6] hover:bg-[#0f8f82]"
                                            : "bg-[#13b8a6] hover:bg-[#0f8f82]"
                                    )}
                                >
                                    {translations[lang].signIn}
                                </button>
                            )}
                        </div>
                    </header>



                    {/* Usage Limit Modal */}
                    <AnimatePresence>
                        {showUsageModal && (
                            <UsageLimitModal
                                isOpen={showUsageModal}
                                onClose={() => setShowUsageModal(false)}
                                isMobile={false}
                            />
                        )}
                    </AnimatePresence>

                    {/* Main Content */}
                    <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0F172A]">
                        <div className="max-w-4xl mx-auto px-6 py-8">
                            {/* DESIGN MODE CONTENT SWITCHING (Only if showWelcome is true) */}
                            {showWelcome ? (
                                designMode === 'pro' ? (
                                    // PRO DESIGN (Green, Centered Input, Vertical Cards)
                                    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-2xl mx-auto">
                                        <div className="w-16 h-16 rounded-2xl bg-[#13b8a6] flex items-center justify-center mb-6 shadow-xl shadow-[#13b8a6]/20 animate-in fade-in zoom-in duration-500">
                                            <BarChart3 className="w-8 h-8 text-white" />
                                        </div>

                                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 text-center tracking-tight">
                                            {translations[lang].title}
                                        </h1>
                                        <p className="text-slate-500 dark:text-slate-400 text-base mb-10 text-center max-w-md leading-relaxed">
                                            {translations[lang].subtitle}
                                        </p>

                                        {/* Centered Input (Pro) - Fixed Light Mode Background */}
                                        <div className="w-full mb-12">
                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-[#13b8a6]/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                <div className="relative flex items-center gap-3 p-2 pe-2 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none focus-within:border-[#13b8a6]/50 focus-within:ring-2 focus-within:ring-[#13b8a6]/10 transition-all">
                                                    <input
                                                        type="text"
                                                        value={query}
                                                        onChange={(e) => setQuery(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                                        placeholder={typewriterPlaceholder}
                                                        className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-slate-900 dark:!text-white dark:caret-white placeholder:text-slate-400 text-base"
                                                    />
                                                    <button
                                                        onClick={handleSend}
                                                        disabled={isLoading || !query.trim()}
                                                        className="w-11 h-11 rounded-xl bg-[#13b8a6] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0f8f82] transition-all shadow-md shadow-[#13b8a6]/20"
                                                    >
                                                        {isLoading ? (
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                        ) : (
                                                            <Send className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Grid Layout for Desktop Popular Questions (Pro) */}
                                        <div className="w-full max-w-4xl">
                                            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                                                {translations[lang].popularRequests}
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
                                                {[
                                                    { icon: <CircleDollarSign className="w-5 h-5" />, title: translations[lang].cards.scenario_undervalued.title, subtitle: translations[lang].cards.scenario_undervalued.subtitle, query: translations[lang].cards.scenario_undervalued.query, color: 'teal' },
                                                    { icon: <Sparkles className="w-5 h-5" />, title: translations[lang].cards.scenario_hidden_gems.title, subtitle: translations[lang].cards.scenario_hidden_gems.subtitle, query: translations[lang].cards.scenario_hidden_gems.query, color: 'coral' },
                                                    { icon: <BarChart3 className="w-5 h-5" />, title: translations[lang].cards.scenario_score.title, subtitle: translations[lang].cards.scenario_score.subtitle, query: translations[lang].cards.scenario_score.query, color: 'teal' },
                                                    { icon: <TrendingUp className="w-5 h-5" />, title: translations[lang].cards.scenario_jufo.title, subtitle: translations[lang].cards.scenario_jufo.subtitle, query: translations[lang].cards.scenario_jufo.query, color: 'teal' },
                                                    { icon: <Target className="w-5 h-5" />, title: translations[lang].cards.scenario_market_timing.title, subtitle: translations[lang].cards.scenario_market_timing.subtitle, query: translations[lang].cards.scenario_market_timing.query, color: 'coral' }
                                                ].map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => sendDirectMessage(item.query)}
                                                        className="p-3.5 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 hover:border-[#13b8a6]/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-start group flex flex-col items-center justify-center h-full gap-2"
                                                    >
                                                        <div className={clsx(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors",
                                                            item.color === 'coral' ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10" : "bg-[#13b8a6]/10 text-[#13b8a6] dark:bg-[#13b8a6]/10"
                                                        )}>
                                                            {item.icon}
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-[#13b8a6] transition-colors line-clamp-1">
                                                                {item.title}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 leading-tight line-clamp-1">
                                                                {item.subtitle}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // ANALYST DESIGN (Green, Robot, Bottom Input, Grid Cards)
                                    <div className="flex flex-col items-center justify-center min-h-[70vh]">
                                        <div className="relative w-32 h-32 mx-auto mb-6">
                                            <div className="absolute inset-0 bg-[#13b8a6]/30 rounded-full blur-[50px] animate-pulse"></div>
                                            <Image
                                                src="/assets/chatbot-icon.png"
                                                alt="Starta AI"
                                                fill
                                                className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>

                                        <h1 className="text-3xl font-black text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-[#13b8a6] to-slate-900 dark:from-white dark:via-[#13b8a6] dark:to-white">
                                            {translations[lang].hello}, {user?.full_name?.split(' ')[0] || translations[lang].trader}
                                        </h1>
                                        <p className="text-slate-500 dark:text-slate-400 text-base mb-10 text-center max-w-md">
                                            {translations[lang].subtitle}
                                        </p>

                                        {/* Grid Layout for Desktop Popular Questions (Analyst Mode - Blue) - Sourced from Mobile Suggestions */}
                                        <div className="w-full max-w-4xl mt-8">
                                            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                                                {translations[lang].recommendedAnalysis}
                                            </p>
                                            <AnalystDesktopGrid onSelect={sendDirectMessage} lang={lang} />
                                        </div>
                                    </div>
                                )
                            ) : null}

                            {/* Show Messages when NOT in welcome mode */}
                            {!showWelcome && renderMessageList()}
                        </div>
                    </main>

                    {/* Input Area (Desktop) */}
                    {/* Always show input unless it's the Pro Welcome screen (which has centered input) */}
                    {(!showWelcome || designMode === 'analyst') && (
                        <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827] p-4">
                            <div className="max-w-3xl mx-auto">
                                <div className="flex items-center gap-2 p-2 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus-within:border-[#13b8a6]/50 focus-within:ring-2 focus-within:ring-[#13b8a6]/10 transition-all">
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                        placeholder={translations[lang].inputPlaceholder}
                                        className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-slate-900 dark:!text-white dark:caret-white placeholder:text-slate-400 text-sm"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={isLoading || !query.trim()}
                                        className={clsx(
                                            "w-9 h-9 rounded-full text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all",
                                            designMode === 'pro' ? "bg-[#13b8a6] hover:bg-[#0f8f82]" : "bg-[#13b8a6] hover:bg-[#0f8f82]"
                                        )}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ========================================================================
    // MOBILE / ORIGINAL LAYOUT - For both mobile devices AND finhub-pro.vercel.app
    // ========================================================================
    // ROOT CAUSE FIX: Lenis smooth scroll was disabled for mobile/chatbot routes.
    // Now we use clean, standard document-flow layout.
    return (
        <div className="relative w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col">

            {/* Background Gradient - Fixed */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#14B8A6]/5 via-transparent to-transparent dark:from-[#14B8A6]/5 dark:via-transparent dark:to-transparent pointer-events-none z-0" />

            <HistoryDrawer
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onSelectSession={loadSession}
                onNewChat={clearHistory}
                currentSessionId={sessionId}
                refreshTrigger={historyRefreshTrigger}
            />

            {/* Usage Limit Modal */}
            <AnimatePresence>
                {showUsageModal && (
                    <UsageLimitModal
                        isOpen={showUsageModal}
                        onClose={() => setShowUsageModal(false)}
                        isMobile={true}
                    />
                )}
            </AnimatePresence>

            {/* HEADER: Sticky Top */}
            <div className="sticky top-0 z-40 bg-[#F8FAFC]/95 dark:bg-[#0F172A]/95  border-b border-slate-200/60 dark:border-white/[0.08]">
                <div className="w-full max-w-[500px] mx-auto">
                    <MobileHeader
                        forceMarket={contextMarket}
                        onNewChat={clearHistory}
                        onOpenHistory={() => setIsHistoryOpen(true)}
                        isAuthenticated={isAuthenticated}
                        hasHistory={isAuthenticated}
                        remainingQuestions={remainingQuestions}
                        onLogin={() => router.push(getRoute('login'))}
                        designMode={designMode}
                        onToggleDesignMode={() => setDesignMode(designMode === 'pro' ? 'analyst' : 'pro')}
                        lang={'en'} // Force English
                        onToggleLang={() => { }} // Disable toggle
                    />
                </div>
            </div>

            {/* MAIN CONTENT: Natural Flow with Forced Height */}
            <main ref={mainRef} className="flex-1 w-full max-w-[500px] mx-auto relative z-10">
                <div className="w-full space-y-6 px-4 py-4 pb-40 flex flex-col">
                    {showWelcome ? (
                        <div className="flex flex-col flex-1 items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 py-12">
                            {designMode === 'pro' ? (
                                // MOBILE PRO WELCOME (Match Image 2)
                                <div className="w-full flex flex-col items-center px-2">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#13b8a6] to-[#0f8f82] flex items-center justify-center mb-6 shadow-xl shadow-[#13b8a6]/30 ring-4 ring-[#13b8a6]/10">
                                        <BarChart3 className="w-8 h-8 text-white" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 text-center tracking-tight">
                                        {translations[lang].title}
                                    </h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-[13px] mb-10 text-center max-w-[280px] leading-relaxed font-medium">
                                        {translations[lang].subtitle}
                                    </p>

                                    {/* Centered Input Mobile - Dark Theme */}
                                    <div className="w-full mb-10">
                                        <div className="relative group">
                                            {/* Glow */}
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#13b8a6]/30 to-[#13b8a6]/30 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                            <div className="relative flex items-center gap-2 p-2 pr-2 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] shadow-lg shadow-slate-200/50 dark:shadow-[#0F172A]/20">
                                                <input
                                                    type="text"
                                                    value={query}
                                                    onChange={(e) => setQuery(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                                    placeholder={typewriterPlaceholder}
                                                    className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-slate-900 dark:!text-white dark:caret-white placeholder:text-slate-400 text-sm font-medium"
                                                />
                                                <button
                                                    onClick={handleSend}
                                                    className="w-9 h-9 rounded-xl bg-white text-slate-900 hover:bg-slate-50 flex items-center justify-center shadow-md active:scale-95 transition-all"
                                                >
                                                    {isLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-[#13b8a6]" />
                                                    ) : (
                                                        <Send className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Popular Questions Vertical List */}
                                    <div className="w-full space-y-3">
                                        <p className="text-center text-[10px] font-bold text-slate-400/80 uppercase tracking-widest mb-4">
                                            {translations[lang].popularRequests}
                                        </p>
                                        {[
                                            { icon: <CircleDollarSign className="w-5 h-5" />, title: translations[lang].cards.scenario_undervalued.title, query: translations[lang].cards.scenario_undervalued.query, subtitle: translations[lang].askStarta, color: 'bg-[#13b8a6]' },
                                            { icon: <Sparkles className="w-5 h-5" />, title: translations[lang].cards.scenario_hidden_gems.title, query: translations[lang].cards.scenario_hidden_gems.query, subtitle: translations[lang].askStarta, color: 'bg-rose-500' },
                                            { icon: <BarChart3 className="w-5 h-5" />, title: translations[lang].cards.scenario_score.title, query: translations[lang].cards.scenario_score.query, subtitle: translations[lang].askStarta, color: 'bg-[#13b8a6]' },
                                            { icon: <TrendingUp className="w-5 h-5" />, title: translations[lang].cards.scenario_jufo.title, query: translations[lang].cards.scenario_jufo.query, subtitle: translations[lang].askStarta, color: 'bg-[#13b8a6]' },
                                            { icon: <Target className="w-5 h-5" />, title: translations[lang].cards.scenario_market_timing.title, query: translations[lang].cards.scenario_market_timing.query, subtitle: translations[lang].askStarta, color: 'bg-rose-500' },
                                        ].map((item, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => sendDirectMessage(item.query)}
                                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all duration-300 text-left group"
                                            >
                                                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md shrink-0", item.color)}>
                                                    <span className="text-lg">{item.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[14px] font-bold text-slate-800 dark:text-white truncate group-hover:text-[#13b8a6] transition-colors">{item.title}</p>
                                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1 uppercase tracking-wide">
                                                        <Sparkles className="w-2.5 h-2.5" />
                                                        {item.subtitle}
                                                    </p>
                                                </div>
                                                <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300 group-hover:bg-[#13b8a6] group-hover:text-white transition-colors">
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                // MOBILE ANALYST WELCOME (Default/Robot)
                                <>
                                    {/* Hero Section */}
                                    <div className="flex-none text-center space-y-6 mb-12 relative z-10 w-full max-w-[320px]">
                                        <div className="relative w-28 h-28 mx-auto">
                                            <div className="absolute inset-0 bg-[#13b8a6]/30 rounded-full blur-[40px] animate-pulse"></div>
                                            <div className="relative w-full h-full p-0 filter drop-shadow-2xl hover:scale-105 transition-transform duration-500">
                                                <Image
                                                    src="/assets/chatbot-icon.png"
                                                    alt="Starta AI"
                                                    fill
                                                    className="object-contain"
                                                    priority
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-blue-200 dark:to-white leading-[1.1]">
                                                {translations[lang].hello}, {user?.full_name?.split(' ')[0] || translations[lang].trader}
                                            </h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-base font-medium leading-relaxed">
                                                {translations[lang].subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Suggestions */}
                                    <div className="w-full relative z-10">
                                        <MobileSuggestions onSelect={sendDirectMessage} lang={lang} />
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        renderMessageList()
                    )}
                </div>
            </main>

            {/* INPUT AREA: Fixed Bottom */}
            {(!showWelcome || designMode === 'analyst') && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#F8FAFC] dark:bg-[#0F172A] border-t border-slate-200/60 dark:border-white/[0.08] safe-area-pb">
                    <div className="w-full max-w-[500px] mx-auto">
                        <MobileInput
                            query={query}
                            setQuery={setQuery}
                            onSend={handleSend}
                            isLoading={isLoading}
                            lang={lang}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// CHAT MESSAGE ROW RENDERER
// ============================================================================
const MessageRenderer = memo(({
    m,
    idx,
    isLatest,
    scrollToBottom,
    handleSymbolClick,
    handleExampleClick,
    sendDirectMessage,
    handleAction,
    sessionId
}: {
    m: any;
    idx: number;
    isLatest: boolean;
    scrollToBottom: () => void;
    handleSymbolClick?: (symbol: string) => void;
    handleExampleClick?: (example: string) => void;
    sendDirectMessage?: (msg: string) => void;
    handleAction?: (action: Action) => void;
    sessionId?: string | null;
}) => {
    const [isTypingCompleted, setIsTypingCompleted] = useState(!isLatest);
    const isUser = m.role === 'user';
    const isRtl = !isUser && resolveMessageLanguage(m) === "ar";

    return (
        <div
            className={clsx(
                "flex gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                isUser ? "flex-row-reverse" : "flex-row",
                isRtl && "font-arabic"
            )}
            dir={isRtl ? "rtl" : "ltr"}
            lang={isRtl ? "ar" : "en"}
        >
            {/* Avatar */}
            <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 mt-[2px] shadow-sm",
                isUser
                    ? "bg-amber-500 text-white"
                    : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-serif text-[14px]"
            )}>
                {isUser ? "U" : "S"}
            </div>

            {/* Bubble */}
            <div className={clsx(
                "max-w-[85%] rounded-2xl p-4 shadow-sm",
                isUser
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[14.5px] leading-relaxed"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[14.5px] leading-relaxed text-slate-800 dark:text-slate-200"
            )}
                data-response-status={!isUser
                    ? (m.response?.success === false ? "fail" : (m.response ? "pass" : undefined))
                    : undefined}
                data-response-intent={!isUser ? (m.response?.meta?.intent || undefined) : undefined}
            >
                {isUser ? (
                    m.content
                ) : (
                    <div className="w-full flex flex-col gap-3">
                        <MessageErrorBoundary>
                            <WorldClassMessage
                                conversationalText={m.response?.conversational_text || m.content}
                                response={m.response}
                                lang={resolveMessageLanguage(m)}
                                isLatest={isLatest}
                                onTyping={scrollToBottom}
                                onTypingComplete={() => setIsTypingCompleted(true)}
                            />
                        </MessageErrorBoundary>

                        {/* Data Cards - Keep for stock metrics display */}
                        {isTypingCompleted && (() => {
                            // All card types handled by WorldClassMessage's ultra-premium components
                            const worldClassHandledTypes = [
                                'bull_case', 'bear_case', 'learning_section',
                                'disclaimer', 'disclaimer_card', 'follow_up_prompt',
                                'follow_up', 'error',
                                'stock_list', 'stock_ranking', 'hidden_gems', 'undervalued_stocks',
                                'comparison_table', 'compare_table', 'peer_comparison',
                                'educational', 'educational_card', 'define_term', 'definition', 'metric_explanation',
                                'positives', 'concerns', 'mixed_signals', 'headwinds', 'tailwinds',
                                'price_display', 'current_position', 'stock_position',
                                'index_composition', 'egx_constituents',
                                'insight', 'insights', 'warning_card', 'reality_check',
                                'character_cards', 'stock_personalities',
                                'macro_score', 'market_environment', 'framework_card', 'methodology', 'screening_criteria',
                                'stock_header'
                            ];
                            const filteredCards = (m.response?.cards || []).filter(
                                (card: any) => !worldClassHandledTypes.includes(canonicalizeCardType(card?.type))
                            );
                            return filteredCards.length > 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                >
                                    <ChatCards
                                        cards={filteredCards}
                                        language={resolveMessageLanguage(m)}
                                        onSymbolClick={handleSymbolClick}
                                        onExampleClick={handleExampleClick}
                                    />
                                </motion.div>
                            ) : null;
                        })()}

                        {isTypingCompleted && m.response?.fact_explanations && (
                            <motion.div
                                className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            >
                                <FactExplanations explanations={m.response.fact_explanations} language={resolveMessageLanguage(m)} />
                            </motion.div>
                        )}

                        {/* Follow Up Chips (Dynamic Array) or Fallback to Legacy Prompt */}
                        {isTypingCompleted && (m.response?.followups && m.response.followups.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            >
                                <FollowUpChips
                                    followups={m.response.followups}
                                    onAction={(prompt) => sendDirectMessage && sendDirectMessage(prompt)}
                                    language={resolveMessageLanguage(m)}
                                />
                            </motion.div>
                        ) : m.response?.follow_up_prompt ? (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            >
                                <FollowUpPrompt content={m.response.follow_up_prompt} />
                            </motion.div>
                        ) : null)}

                        {/* Actions */}
                        {isTypingCompleted && m.response?.actions && m.response.actions.length > 0 && !(m.response?.followups && m.response.followups.length > 0) && (
                            <motion.div
                                className="pt-2"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            >
                                <ActionsBar
                                    actions={m.response.actions}
                                    language={resolveMessageLanguage(m)}
                                    onAction={handleAction || (() => { })}
                                />
                            </motion.div>
                        )}

                        {/* Feedback & Share */}
                        {isTypingCompleted && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.3 }}
                            >
                                <MessageFeedback
                                    messageId={m.id?.toString() || ""}
                                    sessionId={sessionId || ""}
                                    contentToShare={m.response?.conversational_text || m.content}
                                    language={resolveMessageLanguage(m)}
                                />
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
MessageRenderer.displayName = "MessageRenderer";

MessageRenderer.displayName = "MessageRenderer";

export default function ResponsiveAIAnalystPage(props: ResponsivePageProps = {}) {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A]">
                <Loader2 className="w-8 h-8 animate-spin text-[#13b8a6]" />
            </div>
        }>
            <ResponsiveAIAnalystContent {...props} />
        </Suspense>
    );
}
