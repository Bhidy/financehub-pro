"use client";

import { useAIChat } from "@/hooks/useAIChat";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Loader2, Sparkles, History, ChevronLeft, MessageSquarePlus } from "lucide-react";

// Shared Components
import { PremiumMessageRenderer } from "@/components/ai/PremiumMessageRenderer";
import { ChatCards, ActionsBar } from "@/components/ai/ChatCards";
import { ChartCard } from "@/components/ai/ChartCard";

// Mobile Specific Components
import { MobileHeader } from "./components/MobileHeader";
import { MobileInput } from "./components/MobileInput";
import { MobileSuggestions } from "./components/MobileSuggestions";

export default function MobileAIAnalystPage() {
    const { query, setQuery, messages, isLoading, handleSend, handleAction } = useAIChat();
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Auto-scroll anchor
    const bottomRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 1) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading]);

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-50 relative overflow-hidden font-sans">

            {/* Header */}
            <MobileHeader
                onOpenHistory={() => setIsHistoryOpen(true)}
                onNewChat={() => window.location.reload()}
            />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full scroll-smooth pb-32">

                {/* Welcome State */}
                {messages.length === 1 ? (
                    <div className="flex flex-col min-h-full">
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-[-40px]">
                            {/* Animated Background Blob */}
                            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-400/20 rounded-full blur-[80px] -z-10 animate-pulse-slow" />

                            <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
                                Hello, I'm <span className="text-blue-600">Finny</span>
                            </h1>
                            <p className="text-slate-500 text-lg leading-relaxed max-w-[280px]">
                                Your personal AI financial analyst in your pocket.
                            </p>
                        </div>

                        {/* Suggestions Grid */}
                        <MobileSuggestions onSelect={(text) => {
                            setQuery(text);
                            // small delay to allow state update before send if needed, 
                            // but usually we can just send. 
                            // However, we need to populate input first.
                            // Let's actually just call handleSend with the text if the hook supports it, 
                            // or setQuery and then handleSend.
                            // The hook `handleSend` uses the `query` state. 
                            // So we need to set it first.
                            // Ideally useAIChat would accept an override, but let's just fill it for now.
                        }} />
                    </div>
                ) : (
                    /* Chat State */
                    <div className="flex flex-col gap-6 px-4 py-6">
                        {messages.slice(1).map((msg, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={idx}
                                className={clsx("flex flex-col gap-2", msg.role === "user" ? "items-end" : "items-start")}
                            >
                                {/* Message Bubble */}
                                <div className={clsx(
                                    "max-w-[90%] rounded-2xl p-4 text-[15px] leading-relaxed shadow-sm",
                                    msg.role === "user"
                                        ? "bg-blue-600 text-white rounded-br-sm"
                                        : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm"
                                )}>
                                    {msg.role === "user" ? (
                                        msg.content
                                    ) : (
                                        <PremiumMessageRenderer content={msg.content} />
                                    )}
                                </div>

                                {/* AI Extras (Cards, Charts, Actions) */}
                                {msg.role === "assistant" && msg.response && (
                                    <div className="w-full space-y-3 pl-1">
                                        <ChatCards
                                            cards={msg.response.cards}
                                            language={msg.response.language}
                                            onSymbolClick={(s) => { setQuery(`Price of ${s}`); handleSend(); }}
                                            onExampleClick={(text) => { setQuery(text); }}
                                            showExport={false} // Simplify for mobile
                                        />
                                        {msg.response.chart && <ChartCard chart={msg.response.chart} />}
                                        {msg.response.actions?.length > 0 && (
                                            <ActionsBar actions={msg.response.actions} language={msg.response.language} onAction={handleAction} />
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {isLoading && (
                            <div className="flex items-center gap-3 pl-2">
                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                </div>
                                <span className="text-sm text-slate-400 font-medium">Analyst is thinking...</span>
                            </div>
                        )}

                        <div ref={bottomRef} className="h-4" />
                    </div>
                )}
            </main>

            {/* Input Fixed at Bottom */}
            <MobileInput
                query={query}
                setQuery={setQuery}
                onSend={handleSend}
                isLoading={isLoading}
            />

            {/* History Drawer (Bottom Sheet style for Mobile) */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHistoryOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                        />
                        {/* Sheet */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 h-[80dvh] flex flex-col shadow-2xl"
                        >
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-lg text-slate-800">
                                    <History className="w-5 h-5 text-blue-600" />
                                    History
                                </div>
                                <button
                                    onClick={() => setIsHistoryOpen(false)}
                                    className="p-2 bg-slate-100 rounded-full text-slate-500"
                                >
                                    <ChevronLeft className="w-5 h-5 -rotate-90" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-slate-400 gap-4">
                                <History className="w-12 h-12 opacity-20" />
                                <p>No recent history on this device</p>
                            </div>

                            <div className="p-4 border-t border-slate-100">
                                <button
                                    onClick={() => { setIsHistoryOpen(false); window.location.reload(); }}
                                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                                >
                                    <MessageSquarePlus className="w-5 h-5" />
                                    Start New Chat
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
