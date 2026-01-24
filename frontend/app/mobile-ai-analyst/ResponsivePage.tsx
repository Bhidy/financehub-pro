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

import { useState, useRef, useEffect, Suspense } from "react";
import { Loader2, Send, BarChart3, Sun, Moon, Plus, History, Settings, LogOut, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIChat, Action } from "@/hooks/useAIChat";
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

// Domain and Device detection
import { useDomainDetect } from "@/hooks/useDomainDetect";
import { useDeviceDetect } from "@/hooks/useDeviceDetect";

/**
 * Responsive AI Analyst with Domain-Based Layout
 */
function ResponsiveAIAnalystContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const { getRoute } = useMobileRoutes();
    const [showUsageModal, setShowUsageModal] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLElement>(null);

    // Domain and Device Detection
    const { isStartaMarkets, isFinhubPro, isLocalhost, isSSR: isDomainSSR } = useDomainDetect();
    const { isDesktop, isMobile, isSSR: isDeviceSSR } = useDeviceDetect();

    // Guest usage tracking
    const { remainingQuestions, incrementUsage } = useGuestUsage();

    // Fixed market context - Egypt is default (no market selector)
    const contextMarket = "EGX";

    // Theme detection
    useEffect(() => {
        if (typeof window !== "undefined") {
            const isDark = document.documentElement.classList.contains("dark");
            setTheme(isDark ? "dark" : "light");
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

    const {
        messages,
        query,
        setQuery,
        handleSend,
        isLoading,
        sendDirectMessage,
        clearHistory,
        loadSession,
        sessionId
    } = useAIChat({
        market: contextMarket,
        onUsageLimitReached: () => {
            if (!isAuthenticated) {
                setShowUsageModal(true);
            }
        }
    });

    // Increment usage counter for guests
    const prevMessageCount = useRef(messages.length);
    useEffect(() => {
        if (messages.length > prevMessageCount.current) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'assistant' && !isAuthenticated) {
                if (lastMessage.response?.meta?.intent !== 'USAGE_LIMIT_REACHED') {
                    incrementUsage();
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

    const handleSymbolClick = (symbol: string) => {
        sendDirectMessage(`Analyze ${symbol}`);
    };

    const handleExampleClick = (text: string) => {
        sendDirectMessage(text);
    };

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
                            "bg-[#14B8A6] text-white rounded-[20px] rounded-tr-none px-4 py-2.5 shadow-md shadow-[#14B8A6]/10 text-[15px] font-medium leading-normal animate-in zoom-in-95 slide-in-from-right-2 duration-300",
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
                            <span className="w-2 h-2 bg-[#14B8A6] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-[#14B8A6] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-[#14B8A6] rounded-full animate-bounce"></span>
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
        // Mock chat history data (grouped by time)
        const chatHistory = {
            today: [
                { id: '1', title: 'Show me the safest stocks...', time: '12:48 AM', market: 'EGX' },
            ],
            yesterday: [
                { id: '2', title: 'Is TMGH undervalued or overvalued?', time: '8:50 PM', market: 'EGX' },
            ],
            thisWeek: [
                { id: '3', title: 'Is COMI financially safe?', time: '8:18 PM', market: '' },
                { id: '4', title: 'Hello', time: '4:32 PM', market: 'EGX' },
                { id: '5', title: 'Is TMGH undervalued or overvalued?', time: '1:31 PM', market: 'EGX' },
                { id: '6', title: 'Show PEG Ratio for COMI', time: '10:27 PM', market: 'EGX' },
                { id: '7', title: 'Does EKHO have high growth...', time: '10:31 PM', market: 'EGX' },
            ],
        };

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
                    LEFT SIDEBAR - Chat History & Navigation (Matches Mockup)
                    ================================================================ */}
                <aside className="flex-shrink-0 w-[240px] h-full bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-white/5 flex flex-col">
                    {/* Sidebar Header */}
                    <div className="flex-shrink-0 p-4 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[#14B8A6] flex items-center justify-center">
                                    <BarChart3 className="w-3.5 h-3.5 text-white" />
                                </div>
                                <span className="font-semibold text-slate-800 dark:text-white text-sm">Starta AI</span>
                            </div>
                            <button className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        </div>

                        {/* New Chat Button - Teal like mockup */}
                        <button
                            onClick={clearHistory}
                            className="w-full h-10 rounded-lg bg-[#14B8A6] hover:bg-[#0D9488] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Chat
                        </button>
                    </div>

                    {/* Chat History Section */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Chat History Button */}
                        <div className="p-3 pb-2">
                            <button
                                onClick={() => setIsHistoryOpen(true)}
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#14B8A6]/30 transition-all text-left group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 group-hover:text-[#14B8A6] transition-colors">
                                        <History className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-white">Chat History</p>
                                        <p className="text-xs text-slate-400">View past conversations</p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* TODAY */}
                        <div className="px-3 pt-3">
                            <p className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-wider mb-2">Today</p>
                            {chatHistory.today.map((chat) => (
                                <button key={chat.id} className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors mb-1 group">
                                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate group-hover:text-slate-900 dark:group-hover:text-white">{chat.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-400">{chat.time}</span>
                                        {chat.market && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded font-medium">{chat.market}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* YESTERDAY */}
                        <div className="px-3 pt-3">
                            <p className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-wider mb-2">Yesterday</p>
                            {chatHistory.yesterday.map((chat) => (
                                <button key={chat.id} className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors mb-1 group">
                                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate group-hover:text-slate-900 dark:group-hover:text-white">{chat.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-400">{chat.time}</span>
                                        {chat.market && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded font-medium">{chat.market}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* THIS WEEK */}
                        <div className="px-3 pt-3 pb-4">
                            <p className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-wider mb-2">This Week</p>
                            {chatHistory.thisWeek.map((chat) => (
                                <button key={chat.id} className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors mb-1 group">
                                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate group-hover:text-slate-900 dark:group-hover:text-white">{chat.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-400">{chat.time}</span>
                                        {chat.market && <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 rounded font-medium">{chat.market}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar Footer */}
                    <div className="flex-shrink-0 p-3 border-t border-slate-100 dark:border-white/5 space-y-2">
                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="w-full p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-left text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-3"
                        >
                            <Moon className="w-4 h-4" />
                            Dark Mode
                        </button>

                        {/* Sign In Button */}
                        {isAuthenticated ? (
                            <button
                                onClick={() => router.push(getRoute('setting'))}
                                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-3 hover:border-[#14B8A6]/30 transition-colors"
                            >
                                <div className="w-7 h-7 rounded-full bg-[#14B8A6] flex items-center justify-center text-white text-xs font-bold">
                                    {user?.full_name?.charAt(0) || "U"}
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate flex-1 text-left">
                                    {user?.full_name || "User"}
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => router.push(getRoute('login'))}
                                className="w-full p-3 rounded-lg bg-[#0F172A] dark:bg-slate-800 text-white font-medium text-sm text-center transition-all hover:bg-[#1E293B]"
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                </aside>

                {/* ================================================================
                    MAIN CONTENT AREA (Matches Mockup)
                    ================================================================ */}
                <div className="flex-1 flex flex-col min-w-0 h-full">
                    {/* Top Header Bar - StartaAI PRO badge + User button */}
                    <header className="flex-shrink-0 h-14 px-6 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#14B8A6] flex items-center justify-center">
                                <BarChart3 className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-white text-sm">StartaAI</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] text-[10px] font-bold">PRO</span>
                        </div>

                        <div className="flex items-center gap-3">
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
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14B8A6] text-white text-sm font-medium hover:bg-[#0D9488] transition-colors"
                                >
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                                        {user?.full_name?.charAt(0) || "U"}
                                    </div>
                                    {user?.full_name?.split(' ')[0] || "User"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => router.push(getRoute('login'))}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14B8A6] text-white text-sm font-medium hover:bg-[#0D9488] transition-colors"
                                >
                                    Sign In
                                </button>
                            )}
                        </div>
                    </header>

                    {/* History Drawer */}
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
                                isMobile={false}
                            />
                        )}
                    </AnimatePresence>

                    {/* Main Content */}
                    <main ref={mainRef} className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0F172A]">
                        <div className="max-w-4xl mx-auto px-6 py-8">
                            {showWelcome ? (
                                <div className="flex flex-col items-center justify-center min-h-[70vh]">
                                    {/* Welcome Icon - Teal rounded square like mockup */}
                                    <div className="w-14 h-14 rounded-2xl bg-[#14B8A6] flex items-center justify-center mb-6 shadow-lg shadow-[#14B8A6]/20">
                                        <BarChart3 className="w-7 h-7 text-white" />
                                    </div>

                                    {/* Welcome Text */}
                                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                                        Welcome to <span className="text-[#14B8A6]">Starta AI</span>
                                    </h1>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                                        Your intelligent assistant for Egyptian stock market analysis.
                                    </p>

                                    {/* Input Field - Matches mockup with ⌘+Enter hint */}
                                    <div className="w-full max-w-xl mb-10">
                                        <div className="flex items-center gap-2 p-2 rounded-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 shadow-sm focus-within:border-[#14B8A6]/50 focus-within:ring-2 focus-within:ring-[#14B8A6]/10 transition-all">
                                            <input
                                                type="text"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                                placeholder="Ask Starta anything about the market..."
                                                className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm"
                                            />
                                            <div className="flex items-center gap-2 pr-1">
                                                <span className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-md text-[10px] text-slate-400 font-medium">
                                                    ⌘ + Enter
                                                </span>
                                                <button
                                                    onClick={handleSend}
                                                    disabled={isLoading || !query.trim()}
                                                    className="w-9 h-9 rounded-full bg-[#14B8A6] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0D9488] transition-all"
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

                                    {/* Popular Analysis Requests - 3x2 grid like mockup */}
                                    <div className="w-full max-w-3xl">
                                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">
                                            Popular Analysis Requests
                                        </p>
                                        <div className="grid grid-cols-3 gap-3">
                                            {popularRequests.map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => sendDirectMessage(item.query)}
                                                    className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 hover:border-[#14B8A6]/50 hover:shadow-md transition-all text-left group"
                                                >
                                                    <div className={clsx(
                                                        "w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 text-base",
                                                        item.color === 'coral'
                                                            ? "bg-[#FB7185]/10"
                                                            : "bg-[#14B8A6]/10"
                                                    )}>
                                                        {item.icon}
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-0.5 group-hover:text-[#14B8A6] transition-colors">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        {item.subtitle}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Disclaimer */}
                                    <p className="mt-10 text-[11px] text-slate-400 flex items-center gap-1.5">
                                        <span className="text-amber-500">⚠️</span>
                                        Starta AI can make mistakes. This is not financial advice.
                                    </p>
                                </div>
                            ) : (
                                /* Chat Messages */
                                renderMessageList()
                            )}
                        </div>
                    </main>

                    {/* Input Area (when in chat mode) */}
                    {!showWelcome && (
                        <div className="flex-shrink-0 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827] p-4">
                            <div className="max-w-3xl mx-auto">
                                <div className="flex items-center gap-2 p-2 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus-within:border-[#14B8A6]/50 focus-within:ring-2 focus-within:ring-[#14B8A6]/10 transition-all">
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
                                        className="w-9 h-9 rounded-full bg-[#14B8A6] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0D9488] transition-all"
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
                />

                {/* Chat Area */}
                <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto scroll-smooth overscroll-contain px-0 w-full scrollbar-transparent relative pb-4">
                    <div className="w-full space-y-6 px-4 py-4 min-h-full flex flex-col">
                        {showWelcome ? (
                            <div className="flex flex-col flex-1 items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 py-12">
                                {/* Hero Section */}
                                <div className="flex-none text-center space-y-6 mb-12 relative z-10 w-full max-w-[320px]">
                                    <div className="relative w-28 h-28 mx-auto">
                                        <div className="absolute inset-0 bg-[#14B8A6]/30 rounded-full blur-[40px] animate-pulse"></div>
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
                                        <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-teal-200 dark:to-white leading-[1.1]">
                                            Hello, {user?.full_name?.split(' ')[0] || "Trader"}
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 text-base font-medium leading-relaxed">
                                            I'm Starta. Ask me anything about <span className="text-[#14B8A6] font-bold">Egyptian</span> stocks.
                                        </p>
                                    </div>
                                </div>

                                {/* Suggestions */}
                                <div className="w-full relative z-10">
                                    <MobileSuggestions onSelect={sendDirectMessage} />
                                </div>
                            </div>
                        ) : (
                            renderMessageList()
                        )}
                    </div>
                </main>

                {/* Input Area */}
                <div className="flex-none w-full bg-[#F8FAFC] dark:bg-[#0F172A] border-t border-slate-200/60 dark:border-white/[0.08] z-10">
                    <MobileInput
                        query={query}
                        setQuery={setQuery}
                        onSend={handleSend}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </div>
    );
}

export default function ResponsiveAIAnalystPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        }>
            <ResponsiveAIAnalystContent />
        </Suspense>
    );
}
