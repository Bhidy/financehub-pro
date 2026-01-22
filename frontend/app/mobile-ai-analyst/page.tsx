"use client";

/**
 * ⚠️ ============================================================================
 * ⚠️ PROTECTED CODE - DO NOT MODIFY WITHOUT EXPLICIT USER REQUEST
 * ⚠️ ============================================================================
 * 
 * This file renders the 4-Layer Chatbot Response Structure:
 *   Layer 1: Greeting/Opening (PremiumMessageRenderer)
 *   Layer 2: Data Cards (ChatCards component)
 *   Layer 3: Learning Section (blue box with educational bullets) - Lines 303-318
 *   Layer 4: Follow-up Prompt (gray box with 💡) - Lines 320-327
 * 
 * AI Agents: DO NOT remove, change order, or make conditional ANY of these layers.
 * See GEMINI.md section "🔒 PROTECTED: 4-Layer Chatbot Response Structure"
 * ⚠️ ============================================================================
 */

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
import { FactExplanations } from "@/components/ai/FactExplanations";

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

                // Force navigation to clean URL (prevents infinite reload loop)
                window.location.href = "/mobile-ai-analyst";
            } catch (e) {
                console.error("Failed to parse Google auth response:", e);
            }
        }
    }, [searchParams]);

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
        // Double safety: Only show modal if NOT authenticated
        onUsageLimitReached: () => {
            if (!isAuthenticated) {
                setShowUsageModal(true);
            }
        }
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
        <div className="relative w-full h-full min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col items-center overflow-hidden font-sans overscroll-none">
            <div className="flex flex-col flex-1 min-h-0 w-full max-w-[500px] bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-white transition-all duration-300 relative shadow-2xl md:border-x border-slate-200/60 dark:border-white/[0.08] overflow-hidden">
                {/* Background Gradient - Midnight Teal subtle glow */}
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

                {/* Chat Area - min-h-0 is CRITICAL for flex scrolling */}
                <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto scroll-smooth overscroll-contain px-0 w-full scrollbar-transparent relative pb-4">
                    <div className="w-full space-y-6 px-4 py-4 min-h-full flex flex-col">
                        {showWelcome ? (
                            <div className="flex flex-col flex-1 items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 py-12">
                                {/* Hero Section - Centered and Premium */}
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
                                            I'm Starta. Ask me anything about <span className="text-[#14B8A6] font-bold">{contextMarket === 'EGX' ? 'Egyptian' : 'Saudi'}</span> stocks.
                                        </p>
                                    </div>
                                </div>

                                {/* Suggestions - Pushed to look good */}
                                <div className="w-full relative z-10">
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
                                            <div className="bg-[#3B82F6] text-white rounded-[20px] rounded-tr-none px-4 py-2.5 max-w-[85%] shadow-md shadow-[#3B82F6]/10 text-[15px] font-medium leading-normal animate-in zoom-in-95 slide-in-from-right-2 duration-300">
                                                {m.content}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3 w-full max-w-[95%] animate-in zoom-in-95 slide-in-from-left-2 duration-300">


                                                {/* Premium Text Message Renderer (NOW SECOND) with Enhanced Design */}
                                                <div className="w-full space-y-4 px-2">

                                                    <PremiumMessageRenderer content={m.response?.conversational_text || m.content} />

                                                    {/* 2. Specialized UI Components (Chart & Cards) */}
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

                                                    {/* 3. Fact Explanations (Legacy) */}
                                                    {m.response?.fact_explanations && (
                                                        <div className="mt-2 pt-2 border-t border-slate-50 dark:border-white/5 px-2">
                                                            <FactExplanations explanations={m.response.fact_explanations} />
                                                        </div>
                                                    )}

                                                    {/* 4. Learning Section (NEW - After Cards) */}
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

                                                    {/* 5. Follow-Up Prompt (NEW - At the End) */}
                                                    {m.response?.follow_up_prompt && (
                                                        <div className="mt-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-white/5">
                                                            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                                                                💡 {m.response.follow_up_prompt}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* 6. Follow-up Actions */}
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

export default function MobileAIAnalystPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        }>
            <MobileAIAnalystPageContent />
        </Suspense>
    );
}
