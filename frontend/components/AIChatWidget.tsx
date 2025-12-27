"use client";

import { useState, useRef, useEffect } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { usePathname } from "next/navigation";
import {
    MessageSquare,
    X,
    Send,
    Bot,
    User,
    Loader2,
    TrendingUp,
    PieChart,
    Newspaper
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

export default function AIChatWidget() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const { query, setQuery, messages, isLoading, handleSend } = useAIChat();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Hide widget on the full AI Analyst page
    if (pathname === '/ai-analyst') return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">FinanceHub Analyst</h3>
                                    <p className="text-xs text-blue-100 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                        Online • Zero-Hallucination
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
                        >
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={clsx(
                                        "flex gap-3 max-w-[90%]",
                                        msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                        msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white text-blue-600 border border-slate-200"
                                    )}>
                                        {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className={clsx(
                                            "rounded-2xl p-3 text-sm shadow-sm",
                                            msg.role === "user"
                                                ? "bg-indigo-600 text-white rounded-tr-none"
                                                : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                                        )}>
                                            <div className="prose prose-sm max-w-none prose-p:leading-snug prose-strong:text-current">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>

                                        {/* EVIDENCE CARDS */}
                                        {msg.data && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {/* Price Card */}
                                                {msg.data.price_data && (
                                                    <EvidenceCard title="Market Data" icon={TrendingUp} color="emerald">
                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <div className="text-xs text-slate-500 font-bold">{msg.data.price_data.symbol}</div>
                                                                <div className="text-lg font-bold text-slate-900">{msg.data.price_data.name_en}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xl font-bold font-mono">{Number(msg.data.price_data.last_price).toFixed(2)}</div>
                                                                <div className={clsx("text-xs font-bold", msg.data.price_data.change >= 0 ? "text-emerald-600" : "text-red-500")}>
                                                                    {msg.data.price_data.change >= 0 ? "+" : ""}{msg.data.price_data.change_percent}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </EvidenceCard>
                                                )}

                                                {/* Fundamentals Card */}
                                                {msg.data.fundamentals && (
                                                    <EvidenceCard title="Valuation" icon={PieChart} color="blue">
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div className="bg-slate-50 p-2 rounded">
                                                                <div className="text-slate-400 font-bold">P/E Ratio</div>
                                                                <div className="font-mono font-bold">{Number(msg.data.fundamentals.pe_ratio).toFixed(2)}x</div>
                                                            </div>
                                                            <div className="bg-slate-50 p-2 rounded">
                                                                <div className="text-slate-400 font-bold">P/B Ratio</div>
                                                                <div className="font-mono font-bold">{Number(msg.data.fundamentals.pb_ratio).toFixed(2)}x</div>
                                                            </div>
                                                            <div className="bg-slate-50 p-2 rounded">
                                                                <div className="text-slate-400 font-bold">Div Yield</div>
                                                                <div className="font-mono font-bold text-emerald-600">{Number(msg.data.fundamentals.dividend_yield).toFixed(2)}%</div>
                                                            </div>
                                                            <div className="bg-slate-50 p-2 rounded">
                                                                <div className="text-slate-400 font-bold">Net Margin</div>
                                                                <div className="font-mono font-bold">{Number(msg.data.fundamentals.net_margin).toFixed(1)}%</div>
                                                            </div>
                                                        </div>
                                                    </EvidenceCard>
                                                )}

                                                {/* News Card */}
                                                {msg.data.news && Array.isArray(msg.data.news) && (
                                                    <EvidenceCard title="Recent Headlines" icon={Newspaper} color="amber">
                                                        <ul className="space-y-2">
                                                            {msg.data.news.map((item: any, i: number) => (
                                                                <li key={i} className="text-xs border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                                                                    <div className="font-medium line-clamp-2">{item.headline}</div>
                                                                    <div className="text-slate-400 text-[10px] mt-0.5 flex justify-between">
                                                                        <span>{item.source}</span>
                                                                        <span>{new Date(item.published_at).toLocaleDateString()}</span>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </EvidenceCard>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-sm">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                        <span className="text-xs text-slate-500 font-medium">Analyzing market data...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-200">
                            <div className="flex gap-2 relative">
                                <textarea
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about prices, ratios, or news..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12 resize-none h-[50px] scrollbar-none"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!query.trim() || isLoading}
                                    className="absolute right-2 top-1.5 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="mt-2 text-[10px] text-center text-slate-400">
                                AI can make mistakes. Check important info.
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="group flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-110 active:scale-95 z-50"
            >
                {isOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <MessageSquare className="w-6 h-6" />
                )}

                {/* Notification Badge (Simulated) */}
                {!isOpen && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-50"></span>
                )}
            </button>
        </div>
    );
}

// Re-export EvidenceCard if it was not exported before, or keep locally if only used here.
// But we need EvidenceCard for full page too.
// Let's create a separate component for EvidenceCard to be reusable.
// For now I will reproduce it inline in the new page or move it to a shared component.
// I'll keep it here for now to avoid breaking existing file structure too much in one step.
import { EvidenceCard } from "@/components/EvidenceCard";


