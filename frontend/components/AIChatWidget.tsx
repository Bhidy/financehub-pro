"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, Sparkles, Loader2, BarChart2 } from 'lucide-react';
import { useBackendHealth } from '@/hooks/useBackendHealth';

export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: "Hello! I'm your AI Market Analyst. Ask me about any Saudi stock, financial report, or market trend." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            // Connect to real backend
            console.log("Sending message to AI:", userMsg);
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    history: messages // Send conversation context
                })
            });

            if (!res.ok) throw new Error("API Error");

            const data = await res.json();

            setMessages(prev => [...prev, {
                role: 'ai',
                content: data.reply || "Sorry, I couldn't process that."
            }]);
            setLoading(false);

        } catch (error) {
            console.error("Chat error:", error);
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            <div className="pointer-events-auto">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="mb-4 w-[380px] h-[600px] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            {/* Header */}
                            <div className={`p-4 border-b border-white/10 flex items-center justify-between ${isOffline ? 'bg-amber-900/40' : 'bg-gradient-to-r from-emerald-900/40 to-slate-900/40'
                                }`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${isOffline ? 'bg-amber-600 shadow-amber-500/20' : 'bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-emerald-500/20'
                                        }`}>
                                        {isOffline ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> : <Bot className="w-5 h-5 text-white" />}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium text-sm">AI Market Analyst</h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                                                }`} />
                                            <span className={`text-[10px] font-medium tracking-wide ${isOffline ? 'text-amber-400' : 'text-emerald-400'
                                                }`}>
                                                {isOffline ? 'SYSTEM OFFLINE' : 'ONLINE • GROK 2'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-emerald-600 text-white rounded-br-none shadow-lg shadow-emerald-900/20'
                                            : 'bg-slate-800/80 border border-white/5 text-slate-200 rounded-bl-none shadow-sm'
                                            }`}>
                                            {msg.role === 'ai' && (
                                                <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider">
                                                    <Sparkles className="w-3 h-3" />
                                                    Analyst Insight
                                                </div>
                                            )}
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-800/50 border border-white/5 rounded-2xl rounded-bl-none p-3 flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                                            <span className="text-xs text-slate-400">Analyzing market data...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 border-t border-white/10 bg-slate-900/50">
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !isOffline && handleSend()}
                                        disabled={loading || isOffline}
                                        placeholder={isOffline ? "System reconnecting..." : "Ask about 1120.SR financials..."}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-light disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || loading || isOffline}
                                        className={`absolute right-1.5 p-1.5 rounded-lg transition-all shadow-lg ${isOffline
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                            : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                                            }`}
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="text-[10px] text-center mt-2 text-slate-500 flex items-center justify-center gap-1">
                                    Powered by <span className="font-bold text-slate-400">FinanceHub AI</span> • Not financial advice
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Launcher Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 border border-white/20 hover:brightness-110 transition-all group pointer-events-auto"
                >
                    <AnimatePresence mode='wait'>
                        {isOpen ? (
                            <X key="close" className="w-6 h-6 text-white" />
                        ) : (
                            <Sparkles key="open" className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </div>
    );
}
