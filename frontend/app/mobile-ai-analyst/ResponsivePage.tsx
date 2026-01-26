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

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { Loader2, Send, BarChart3, Sun, Moon, Plus, History, Settings, LogOut, MessageSquare, ChevronLeft, ChevronRight, Sparkles, Bot, User, Target, CircleDollarSign, TrendingUp, PieChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIChat, Action } from "@/hooks/useAIChat";
import { useTypewriter } from "@/hooks/useTypewriter";
import { MobileHeader } from "./components/MobileHeader";
import { MobileInput } from "./components/MobileInput";
import { MobileSuggestions } from "./components/MobileSuggestions";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestUsage } from "@/hooks/useGuestUsage";
import UsageLimitModal from "@/components/ai/UsageLimitModal";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { clsx } from "clsx";

// Premium UI Components
import { ChatCards, ActionsBar } from "@/components/ai/ChatCards";
import { ChartCard } from "@/components/ai/ChartCard";
import { PremiumMessageRenderer } from "@/components/ai/PremiumMessageRenderer";
import { FactExplanations } from "@/components/ai/FactExplanations";
import { useMobileRoutes } from "./hooks/useMobileRoutes";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { AnalystDesktopGrid } from "./components/AnalystDesktopGrid";

// Domain and Device detection
import { useDomainDetect } from "@/hooks/useDomainDetect";
import { useDeviceDetect } from "@/hooks/useDeviceDetect";
import { DesktopSidebar } from "./components/DesktopSidebar";

/**
 * Responsive AI Analyst with Domain-Based Layout
 */
function ResponsiveAIAnalystContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
    const { getRoute } = useMobileRoutes();
    const [showUsageModal, setShowUsageModal] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
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
    const placeholderTexts = [
        "Compare HRHO vs COMI...",
        "Market Summary",
        "Analyze the dividend history of TMGH",
        "Show me the top gainers today",
        "Is SWDY undervalued right now?",
        "Financial health check for FWRY",
        "Who are the major shareholders of ETEL?",
        "Technical analysis for ORWE",
        "Show me the banking sector performance",
        "What is the PE ratio of ADIB?"
    ];

    const typewriterPlaceholder = useTypewriter(placeholderTexts);

    // Force Light Theme Default
    useEffect(() => {
        if (typeof window !== "undefined") {
            // Remove dark class to ensure light mode by default
            document.documentElement.classList.remove("dark");
            setTheme("light");
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    };

    // Handle Google OAuth callback
    useEffect(() => {
        const token = searchParams.get("token");
        const userStr = searchParams.get("user");
        const googleAuth = searchParams.get("google_auth");

        if (googleAuth === "success" && token && userStr) {
            try {
                const userData = JSON.parse(decodeURIComponent(userStr));
                localStorage.setItem("fh_auth_token", token);
                localStorage.setItem("fh_user", JSON.stringify(userData));
                window.location.href = getRoute('home');
            } catch (e) {
                console.error("Failed to parse Google auth response:", e);
            }
        }
    }, [searchParams]);

    // Set sidebar state based on auth
    useEffect(() => {
        if (!isAuthLoading) {
            setIsSidebarOpen(isAuthenticated);
        }
    }, [isAuthLoading, isAuthenticated]);

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
    } = useAIChat({
        market: contextMarket,
        onUsageLimitReached: () => {
            if (!isAuthenticated) {
                setShowUsageModal(true);
            }
        }
    });

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

    const language = "en";

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    };

    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'assistant') {
                if (mainRef.current) {
                    const messageItems = mainRef.current.querySelectorAll('.message-item');
                    if (messageItems.length >= 2) {
                        const questionElement = messageItems[messageItems.length - 2];
                        const mainElement = mainRef.current;
                        const topPos = (questionElement as HTMLElement).offsetTop - 20;
                        mainElement.scrollTo({ top: topPos, behavior: 'smooth' });
                        return;
                    }
                }
            }
            scrollToBottom();
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

    const visibleMessages = messages.filter(m => m.content !== "Chat initialized. Ready to assist.");
    const showWelcome = visibleMessages.length === 0;

    // For localhost, default to Starta behavior for development
    const effectiveStarta = isStartaMarkets || isLocalhost;
    const effectiveDesktop = effectiveStarta && isDesktop;

    /**
     * ========================================================================
     * PROTECTED MESSAGE RENDERING - DO NOT MODIFY
     * ========================================================================
     * This function renders the 4-Layer Chatbot Response Structure:
     *   Layer 1: Greeting/Opening (PremiumMessageRenderer)
     *   Layer 2: Data Cards (ChatCards component)
     *   Layer 3: Learning Section (blue box with educational bullets)
     *   Layer 4: Follow-up Prompt (gray box with 💡)
     * ========================================================================
     */
    const renderMessageList = () => (
        <div className="space-y-6 pt-2">
            {visibleMessages.map((m, idx) => (
                <div
                    key={idx}
                    className={clsx(
                        "flex flex-col w-full message-item",
                        m.role === 'user' ? "items-end" : "items-start"
                    )}
                >
                    {m.role === 'user' ? (
                        <div className={clsx(
                            "bg-[#13b8a6] text-white rounded-[20px] rounded-tr-none px-4 py-2.5 shadow-md shadow-[#13b8a6]/10 text-[15px] font-medium leading-normal animate-in zoom-in-95 slide-in-from-right-2 duration-300",
                            effectiveDesktop ? "max-w-[70%]" : "max-w-[85%]"
                        )}>
                            {m.content}
                        </div>
                    ) : (
                        <div className={clsx(
                            "flex flex-col gap-3 animate-in zoom-in-95 slide-in-from-left-2 duration-300",
                            effectiveDesktop ? "w-full max-w-[90%]" : "w-full max-w-[95%]"
                        )}>
                            <div className="w-full space-y-4 px-2">
                                <PremiumMessageRenderer content={m.response?.conversational_text || m.content} />

                                {m.response?.chart && (
                                    <div className="mb-2">
                                        <ChartCard chart={m.response.chart} />
                                    </div>
                                )}

                                {m.response?.cards && m.response.cards.length > 0 && (
                                    <ChatCards
                                        cards={m.response.cards}
                                        language={language}
                                        onSymbolClick={handleSymbolClick}
                                        onExampleClick={handleExampleClick}
                                    />
                                )}

                                {m.response?.fact_explanations && (
                                    <div className="mt-2 pt-2 border-t border-slate-50 dark:border-white/5 px-2">
                                        <FactExplanations explanations={m.response.fact_explanations} />
                                    </div>
                                )}

                                {/* Layer 3: Learning Section */}
                                {m.response?.learning_section && (
                                    <div className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                                        <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-2">
                                            {m.response.learning_section.title}
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {m.response.learning_section.items.map((item, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                                    <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                                    <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-slate-900 dark:text-white font-semibold">$1</strong>') }} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Layer 4: Follow-up Prompt */}
                                {m.response?.follow_up_prompt && (
                                    <div className="mt-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-white/5">
                                        <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                                            💡 {m.response.follow_up_prompt}
                                        </p>
                                    </div>
                                )}

                                {m.response?.actions && m.response.actions.length > 0 && (
                                    <div className="pt-1">
                                        <ActionsBar
                                            actions={m.response.actions}
                                            onAction={handleAction}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl p-4 flex items-center gap-3 shadow-sm backdrop-blur-sm">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-[#13b8a6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-[#13b8a6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-[#13b8a6] rounded-full animate-bounce"></span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-pulse">Analyzing market data...</span>
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
        const popularRequests = [
            { icon: '🎯', title: 'Fair Value Analysis', subtitle: 'Get comprehensive valuation', query: 'What is the fair value of SWDY?', color: 'teal' },
            { icon: '✨', title: 'Dividend Deep Dive', subtitle: 'Historical dividend analysis', query: 'Show me stocks with highest dividends', color: 'teal' },
            { icon: '📊', title: 'Financial Comparison', subtitle: 'Compare key metrics', query: 'Compare CIB and COMI', color: 'teal' },
            { icon: '📈', title: 'Market Screener', subtitle: 'Find matching stocks', query: 'Show me top gainers today', color: 'coral' },
            { icon: '💵', title: 'Price Analysis', subtitle: 'Technical price insights', query: 'Analyze price of TMGH', color: 'teal' },
            { icon: '📉', title: 'Sector Performance', subtitle: 'Industry analysis', query: 'Show banking sector performance', color: 'coral' },
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
                />

                {/* ================================================================
                    MAIN CONTENT AREA (Matches Mockup)
                    ================================================================ */}
                <div className="flex-1 flex flex-col min-w-0 h-full">
                    {/* Top Header Bar - StartaAI PRO badge + User button */}
                    <header className="flex-shrink-0 h-14 px-6 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]">
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">STARTA</span>
                            <span className="px-1.5 py-0.5 rounded-[4px] bg-[#13b8a6]/10 text-[#13b8a6] text-[10px] font-black uppercase tracking-wider">BETA</span>
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
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                                        {user?.full_name?.charAt(0) || "U"}
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
                                    Sign In
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
                    <main ref={mainRef} className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0F172A]">
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
                                            Starta Market Intelligence
                                        </h1>
                                        <p className="text-slate-500 dark:text-slate-400 text-base mb-10 text-center max-w-md leading-relaxed">
                                            Begin understanding the Egyptian stock market with AI-powered insights
                                        </p>

                                        {/* Centered Input (Pro) - Fixed Light Mode Background */}
                                        <div className="w-full mb-12">
                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-[#13b8a6]/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                <div className="relative flex items-center gap-3 p-2 pr-2 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-none focus-within:border-[#13b8a6]/50 focus-within:ring-2 focus-within:ring-[#13b8a6]/10 transition-all">
                                                    <input
                                                        type="text"
                                                        value={query}
                                                        onChange={(e) => setQuery(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                                        placeholder={typewriterPlaceholder}
                                                        className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 text-base"
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
                                                Popular Analysis Requests
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                                                {[
                                                    { icon: <Target className="w-5 h-5" />, title: 'Market Summary', subtitle: 'ASK STARTA', query: 'Market Summary', color: 'teal' },
                                                    { icon: <Sparkles className="w-5 h-5" />, title: 'Dividend history TMGH', subtitle: 'ASK STARTA', query: 'Dividend history TMGH', color: 'teal' },
                                                    { icon: <CircleDollarSign className="w-5 h-5" />, title: 'PE ratio for SWDY', subtitle: 'ASK STARTA', query: 'PE ratio for SWDY', color: 'teal' },
                                                ].map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => sendDirectMessage(item.query)}
                                                        className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 hover:border-[#10B981]/50 hover:shadow-lg transition-all text-left group flex flex-col h-full"
                                                    >
                                                        <div className={clsx(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg transition-colors",
                                                            item.color === 'coral' ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10" : "bg-[#13b8a6]/10 text-[#13b8a6] dark:bg-[#13b8a6]/10"
                                                        )}>
                                                            {item.icon}
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white mb-1 group-hover:text-[#13b8a6] transition-colors">
                                                            {item.title}
                                                        </p>
                                                        <p className="text-xs text-slate-400 leading-relaxed">
                                                            {item.subtitle}
                                                        </p>
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
                                            Hello, {user?.full_name?.split(' ')[0] || "Trader"}
                                        </h1>
                                        <p className="text-slate-500 dark:text-slate-400 text-base mb-10 text-center max-w-md">
                                            I'm Starta. Ask me anything about <span className="text-[#13b8a6] font-bold">Egyptian</span> stocks.
                                        </p>

                                        {/* Grid Layout for Desktop Popular Questions (Analyst Mode - Blue) - Sourced from Mobile Suggestions */}
                                        <div className="w-full max-w-4xl mt-8">
                                            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                                                Recommended Analysis
                                            </p>
                                            <AnalystDesktopGrid onSelect={sendDirectMessage} />
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
                                        placeholder="Ask about Egyptian stocks..."
                                        className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
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
    return (
        <div className="relative w-full h-full min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col items-center overflow-hidden font-sans overscroll-none">
            <div className="flex flex-col flex-1 min-h-0 w-full max-w-[500px] bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-white transition-all duration-300 relative shadow-2xl md:border-x border-slate-200/60 dark:border-white/[0.08] overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#14B8A6]/5 via-transparent to-transparent dark:from-[#14B8A6]/5 dark:via-transparent dark:to-transparent pointer-events-none" />

                <HistoryDrawer
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    onSelectSession={loadSession}
                    onNewChat={clearHistory}
                    currentSessionId={sessionId}
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

                {/* Header */}
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
                />

                {/* Chat Area */}
                <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto scroll-smooth overscroll-contain px-0 w-full scrollbar-transparent relative pb-4">
                    <div className="w-full space-y-6 px-4 py-4 min-h-full flex flex-col">
                        {showWelcome ? (
                            <div className="flex flex-col flex-1 items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 py-12">
                                {designMode === 'pro' ? (
                                    // MOBILE PRO WELCOME (Match Image 2)
                                    <div className="w-full flex flex-col items-center px-2">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#13b8a6] to-[#0f8f82] flex items-center justify-center mb-6 shadow-xl shadow-[#13b8a6]/30 ring-4 ring-[#13b8a6]/10">
                                            <BarChart3 className="w-8 h-8 text-white" />
                                        </div>
                                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 text-center tracking-tight">
                                            Starta Market Intelligence
                                        </h1>
                                        <p className="text-slate-500 dark:text-slate-400 text-[13px] mb-10 text-center max-w-[280px] leading-relaxed font-medium">
                                            Begin understanding the Egyptian stock market with AI-powered insights
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
                                                        placeholder="Compare HRHO vs..."
                                                        className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium"
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
                                                Popular Questions
                                            </p>
                                            {[
                                                { icon: <Target className="w-5 h-5" />, title: 'Market Summary', subtitle: 'ASK STARTA', color: 'bg-[#13b8a6]' },
                                                { icon: <Sparkles className="w-5 h-5" />, title: 'Dividend history TMGH', subtitle: 'ASK STARTA', color: 'bg-[#13b8a6]' },
                                                { icon: <CircleDollarSign className="w-5 h-5" />, title: 'PE ratio for SWDY', subtitle: 'ASK STARTA', color: 'bg-[#13b8a6]' },
                                            ].map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => sendDirectMessage(item.title)}
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
                                                    Hello, {user?.full_name?.split(' ')[0] || "Trader"}
                                                </h2>
                                                <p className="text-slate-500 dark:text-slate-400 text-base font-medium leading-relaxed">
                                                    I'm Starta. Ask me anything about <span className="text-[#13b8a6] font-bold">Egyptian</span> stocks.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Suggestions */}
                                        <div className="w-full relative z-10">
                                            <MobileSuggestions onSelect={sendDirectMessage} />
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            renderMessageList()
                        )}
                    </div>
                </main>

                {/* Input Area (Only show fixed bottom input if NOT in Pro Welcome screen) */}
                {(!showWelcome || designMode === 'analyst') && (
                    <div className="flex-none w-full bg-[#F8FAFC] dark:bg-[#0F172A] border-t border-slate-200/60 dark:border-white/[0.08] z-10">
                        <MobileInput
                            query={query}
                            setQuery={setQuery}
                            onSend={handleSend}
                            isLoading={isLoading}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResponsiveAIAnalystPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A]">
                <Loader2 className="w-8 h-8 animate-spin text-[#13b8a6]" />
            </div>
        }>
            <ResponsiveAIAnalystContent />
        </Suspense>
    );
}
