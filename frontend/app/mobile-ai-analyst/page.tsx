"use client";

import { useAIChat } from "@/hooks/useAIChat";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Loader2, History, X, MessageSquarePlus, Trash2, Clock } from "lucide-react";
import { useMobileChatHistory, type ChatSession } from "@/hooks/useMobileChatHistory";

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
    const { sessions, saveSession, loadSession, deleteSession } = useMobileChatHistory();

    // Auto-scroll anchor
    const bottomRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 1) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading]);

    // Save session when messages change
    useEffect(() => {
        if (messages.length > 1) {
            saveSession(messages.map(m => ({ role: m.role, content: m.content })));
        }
    }, [messages, saveSession]);

    const handleSuggestionSelect = (text: string) => {
        setQuery(text);
        // Auto-send immediately
        setTimeout(() => handleSend(), 100);
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-slate-100 via-slate-50 to-white relative overflow-hidden font-sans">

            {/* Decorative blobs */}
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-200/30 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-teal-200/20 rounded-full blur-[80px] -z-10" />

            {/* Header */}
            <MobileHeader
                onNewChat={() => window.location.reload()}
                onOpenHistory={() => setIsHistoryOpen(true)}
                hasHistory={sessions.length > 0}
            />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full scroll-smooth">

                {/* Welcome State */}
                {messages.length === 1 ? (
                    <div className="flex flex-col min-h-full pt-4">

                        {/* Hero Section */}
                        <div className="flex flex-col items-center text-center px-6 py-8">
                            {/* Floating Robot - No background */}
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.6 }}
                                className="relative mb-6"
                            >
                                <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl shadow-slate-300/50">
                                    <img
                                        src="/ai-robot.png"
                                        alt="Finny AI"
                                        className="w-full h-full object-contain drop-shadow-lg"
                                    />
                                </div>
                                {/* Subtle pulse ring */}
                                <div className="absolute inset-0 rounded-3xl border-2 border-blue-300/30 animate-ping" />
                            </motion.div>

                            {/* Title */}
                            <motion.h1
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                className="text-2xl font-black text-slate-900 mb-2"
                            >
                                Hello, I'm <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">Finny</span>
                            </motion.h1>

                            <motion.p
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="text-slate-500 text-base leading-relaxed max-w-[280px]"
                            >
                                Your AI financial analyst, right in your pocket.
                            </motion.p>
                        </div>

                        {/* Suggestions */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="flex-1"
                        >
                            <MobileSuggestions onSelect={handleSuggestionSelect} />
                        </motion.div>
                    </div>
                ) : (
                    /* Chat State */
                    <div className="flex flex-col gap-5 px-4 py-4 pb-40">
                        {messages.slice(1).map((msg, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={idx}
                                className={clsx("flex flex-col gap-2", msg.role === "user" ? "items-end" : "items-start")}
                            >
                                {/* Message Bubble */}
                                <div className={clsx(
                                    "max-w-[85%] rounded-2xl p-4 text-[15px] leading-relaxed",
                                    msg.role === "user"
                                        ? "bg-gradient-to-br from-blue-500 to-teal-500 text-white rounded-br-sm shadow-lg shadow-blue-500/20"
                                        : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm shadow-lg shadow-slate-200/50"
                                )}>
                                    {msg.role === "user" ? (
                                        <span className="font-medium">{msg.content}</span>
                                    ) : (
                                        <PremiumMessageRenderer content={msg.content} />
                                    )}
                                </div>

                                {/* AI Extras */}
                                {msg.role === "assistant" && msg.response && (
                                    <div className="w-full space-y-3">
                                        <ChatCards
                                            cards={msg.response.cards}
                                            language={msg.response.language}
                                            onSymbolClick={(s) => { setQuery(`Price of ${s}`); handleSend(); }}
                                            onExampleClick={(text) => { setQuery(text); }}
                                            showExport={false}
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
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-2 items-start"
                            >
                                <div className="max-w-[85%] flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full overflow-hidden shadow-lg shadow-slate-200/50 flex-shrink-0 bg-white">
                                        <img src="/ai-robot.png" alt="Finny" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg shadow-slate-200/50 border border-slate-100">
                                        <div className="flex gap-1.5">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div ref={bottomRef} className="h-4" />
                    </div>
                )}
            </main>

            {/* Input */}
            <MobileInput
                query={query}
                setQuery={setQuery}
                onSend={handleSend}
                isLoading={isLoading}
            />

            {/* History Drawer */}
            <AnimatePresence>
                {isHistoryOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHistoryOpen(false)}
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-50 h-[75dvh] flex flex-col shadow-2xl"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
                                    <History className="w-5 h-5 text-blue-600" />
                                    Chat History
                                </div>
                                <button
                                    onClick={() => setIsHistoryOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Sessions List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {sessions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                        <History className="w-12 h-12 opacity-20" />
                                        <p className="text-sm">No saved chats yet</p>
                                    </div>
                                ) : (
                                    sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className="relative group bg-slate-50 rounded-2xl p-4 border border-slate-100"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-slate-800 text-sm truncate mb-1">
                                                        {session.title}
                                                    </div>
                                                    <div className="text-xs text-slate-400 truncate mb-2">
                                                        {session.preview}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTime(session.timestamp)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => deleteSession(session.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100">
                                <button
                                    onClick={() => { setIsHistoryOpen(false); window.location.reload(); }}
                                    className="w-full py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-slate-900/20"
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
