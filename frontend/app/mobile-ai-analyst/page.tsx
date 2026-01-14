"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIChat, Action } from "@/hooks/useAIChat";
import { MobileHeader } from "./components/MobileHeader";
import { MobileInput } from "./components/MobileInput";
import { MobileSuggestions } from "./components/MobileSuggestions";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestUsage } from "@/hooks/useGuestUsage";
import UsageLimitModal from "@/components/ai/UsageLimitModal";
import { useMarketSafe } from "@/contexts/MarketContext";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { clsx } from "clsx";

// Premium UI Components (Parity with Desktop)
import { ChatCards, ActionsBar } from "@/components/ai/ChatCards";
import { ChartCard } from "@/components/ai/ChartCard";
import { PremiumMessageRenderer } from "@/components/ai/PremiumMessageRenderer";

/**
 * Mobile-specific AI Analyst Page
 * Centered layout for "Mobile App" feel even on desktop
 */

function MobileAIAnalystPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const { market } = useMarketSafe();
    const [showUsageModal, setShowUsageModal] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLElement>(null);

    // Guest usage tracking for counter display
    const { remainingQuestions, incrementUsage } = useGuestUsage();

    // Custom state for market context
    const [contextMarket, setContextMarket] = useState<string>(market);

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
                // Clean up URL params
                router.replace("/mobile-ai-analyst");
                // Force page reload to pick up new auth state
                window.location.reload();
            } catch (e) {
                console.error("Failed to parse Google auth response:", e);
            }
        }
    }, [searchParams, router]);

    // Sync local state when global market changes
    useEffect(() => {
        setContextMarket(market);
    }, [market]);

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
        onUsageLimitReached: () => setShowUsageModal(true)  // Show popup when guest limit reached
    });

    // Increment local counter when a message is successfully sent (for guest users)
    // We track message count to detect new assistant responses
    const prevMessageCount = useRef(messages.length);
    useEffect(() => {
        // Check if a new assistant message was added (successful response)
        if (messages.length > prevMessageCount.current) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'assistant' && !isAuthenticated) {
                // Only increment if it's a real response, not the limit message
                if (lastMessage.response?.meta?.intent !== 'USAGE_LIMIT_REACHED') {
                    incrementUsage();
                }
            }
        }
        prevMessageCount.current = messages.length;
    }, [messages.length, isAuthenticated, incrementUsage]);

    // Language detection (simplified)
    const language = "en";

    // Scroll to bottom helper
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    };

    // Human-centric scrolling: When a new bot message arrives, scroll so the user question is visible
    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'assistant') {
                if (mainRef.current) {
                    const messageItems = mainRef.current.querySelectorAll('.message-item');
                    if (messageItems.length >= 2) {
                        const questionElement = messageItems[messageItems.length - 2];
                        // Scroll to 20px above the question to ensure it's not flush with the header
                        const mainElement = mainRef.current;
                        const topPos = (questionElement as HTMLElement).offsetTop - 20;
                        mainElement.scrollTo({
                            top: topPos,
                            behavior: 'smooth'
                        });
                        return;
                    }
                }
            }
            scrollToBottom();
        }
    }, [messages.length, isLoading]);

    // Handle Follow-up Actions
    // Handle Follow-up Actions
    const handleAction = (action: Action) => {
        // PRIORITY 1: Navigation
        if (action.action_type === "navigate" && action.payload) {
            router.push(action.payload);
            return;
        }

        // PRIORITY 2: Explicit Payload (e.g. "CIB Financials")
        // This is critical for preventing "context loss" by sending the full intent
        if (action.payload) {
            sendDirectMessage(action.payload);
            return;
        }

        // PRIORITY 3: Fallback to Label (e.g. "Financials")
        // Not ideal but better than nothing
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

    if (isAuthLoading) {
        return (
            <div className="h-[100dvh] w-full flex items-center justify-center bg-slate-50 dark:bg-[#0B1121]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-500" />
            </div>
        );
    }

    // Filter out the system "Chat initialized" message for mobile view
    const visibleMessages = messages.filter(m => m.content !== "Chat initialized. Ready to assist.");
    const showWelcome = visibleMessages.length === 0;

    return (
        <div className="fixed inset-0 w-full h-[100dvh] bg-slate-100 dark:bg-[#080B14] flex flex-col items-center justify-center overflow-hidden">
            <div className="flex flex-col h-full w-full max-w-[500px] bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-white font-sans transition-colors duration-300 relative shadow-2xl md:border-x border-slate-200/60 dark:border-white/10 overflow-hidden">
                {/* Background Gradient for Ultra Premium Look */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent dark:from-blue-900/10 dark:via-transparent dark:to-transparent pointer-events-none" />

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

                {/* Header (Stay fixed at top of flex-col) */}
                <MobileHeader
                    forceMarket={contextMarket}
                    onNewChat={clearHistory}
                    onOpenHistory={() => setIsHistoryOpen(true)}
                    isAuthenticated={isAuthenticated}
                    hasHistory={isAuthenticated}
                    remainingQuestions={remainingQuestions}
                    onLogin={() => router.push('/mobile-ai-analyst/login')}
                />

                {/* Chat Area */}
                <main ref={mainRef} className="flex-1 overflow-y-auto scroll-smooth overscroll-contain px-0 w-full scrollbar-transparent relative">
                    <div className="w-full space-y-6 px-4 py-4">
                        {showWelcome ? (
                            <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 pt-2 pb-8">
                                {/* Hero Section */}
                                <div className="flex-none pb-6 px-4 text-center space-y-4">
                                    <div className="relative w-32 h-32 mx-auto mb-4">
                                        <div className="absolute -inset-4 bg-teal-500/20 rounded-full blur-2xl animate-pulse opacity-50"></div>
                                        <div className="relative w-full h-full p-2 filter drop-shadow-xl">
                                            <Image
                                                src="/assets/chatbot-icon.png"
                                                alt="Starta AI"
                                                fill
                                                className="object-contain"
                                                priority
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 dark:from-white dark:via-blue-200 dark:to-white tracking-tight leading-tight">
                                            Hello, {user?.full_name?.split(' ')[0] || "Trader"}
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm max-w-[280px] mx-auto font-medium">
                                            I'm Starta. Ask me anything about {contextMarket === 'EGX' ? 'Egyptian' : 'Saudi'} stocks.
                                        </p>
                                    </div>
                                </div>

                                {/* Suggestions */}
                                <div className="w-full flex-1">
                                    <MobileSuggestions onSelect={sendDirectMessage} />
                                </div>
                            </div>
                        ) : (
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
                                            <div className="bg-emerald-500 text-white rounded-[20px] rounded-tr-none px-4 py-2.5 max-w-[85%] shadow-md shadow-emerald-500/10 text-[15px] font-medium leading-normal animate-in zoom-in-95 slide-in-from-right-2 duration-300">
                                                {m.content}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3 w-full max-w-[95%] animate-in zoom-in-95 slide-in-from-left-2 duration-300">

                                                {/* Specialized UI Components (Chart & Cards FIRST) */}
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

                                                {/* Premium Text Message Renderer (NOW SECOND) with Enhanced Design */}
                                                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-[#1A1F2E] dark:to-[#151925] rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-black/20 border border-blue-100 dark:border-blue-900/30 backdrop-blur-sm relative overflow-hidden group">
                                                    {/* Decorative Elements */}
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-600 opacity-80 rounded-l-2xl" />
                                                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />

                                                    {/* Header */}
                                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-white/5">
                                                        <div className="p-1.5 rounded-lg bg-blue-100/50 dark:bg-blue-900/20">
                                                            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Analysis Summary</span>
                                                    </div>

                                                    <PremiumMessageRenderer content={m.content} />
                                                </div>

                                                {/* Follow-up Actions */}
                                                {m.response?.actions && m.response.actions.length > 0 && (
                                                    <div className="pt-1">
                                                        <ActionsBar
                                                            actions={m.response.actions}
                                                            onAction={handleAction}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-[#1A1F2E] border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-3 shadow-sm backdrop-blur-sm">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></span>
                                            </div>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-pulse">Analyzing market data...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} className="h-4" />
                            </div>
                        )}
                    </div>
                </main>

                {/* Input Area */}
                <div className="flex-none w-full bg-slate-50 dark:bg-[#0B1121] border-t border-slate-200/60 dark:border-white/10 z-10">
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

export default function MobileAIAnalystPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-[#0B1121]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        }>
            <MobileAIAnalystPageContent />
        </Suspense>
    );
}
