"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Mic, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useTypewriter } from "@/hooks/useTypewriter";

interface MobileInputProps {
    query: string;
    setQuery: (q: string) => void;
    onSend: () => void;
    isLoading: boolean;
}

export function MobileInput({ query, setQuery, onSend, isLoading }: MobileInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Typewriter placeholders
    const placeholderTexts = [
        "Ask Starta anything...",
        "What is the fair value of COMI?",
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

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px';
        }
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="w-full px-4 pb-safe pt-2 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC] to-transparent dark:from-[#0F172A] dark:via-[#0F172A] dark:to-transparent">
            {/* Added extra padding bottom to ensure it doesn't touch the home indicator too closely */}
            <div className="pb-2">
                {/* Floating island container - Midnight Teal Design */}
                <div className={clsx(
                    "relative bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl rounded-2xl border shadow-xl transition-all duration-300",
                    isFocused
                        ? "border-[#3B82F6] dark:border-[#3B82F6]/50 shadow-[#3B82F6]/10 dark:shadow-[#3B82F6]/20 ring-2 ring-[#3B82F6]/10 dark:ring-[#3B82F6]/20"
                        : "border-slate-200/60 dark:border-white/[0.08] shadow-slate-900/5 dark:shadow-black/20"
                )}>
                    {/* Subtle glow when focused */}
                    {isFocused && (
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#3B82F6]/5 via-[#14B8A6]/5 to-[#3B82F6]/5 -z-10 blur-xl" />
                    )}

                    <div className="flex items-end gap-2 p-1.5 pl-4">
                        <textarea
                            ref={textareaRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={isFocused ? "Ask Starta anything..." : typewriterPlaceholder}
                            className="flex-1 bg-transparent border-none py-2.5 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-[16px] leading-snug resize-none max-h-24 min-h-[44px] focus:ring-0 focus:outline-none font-medium"
                            style={{ fontSize: '16px' }} // HARD ENFORCEMENT for iOS
                            rows={1}
                            disabled={isLoading}
                        />

                        {/* Send / Mic Button - Using Trust Blue */}
                        <div className="flex-none">
                            {isLoading ? (
                                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#0F172A] mb-0.5">
                                    <Loader2 className="w-5 h-5 animate-spin text-[#3B82F6]" />
                                </div>
                            ) : query.trim() ? (
                                <button
                                    onClick={onSend}
                                    className="w-10 h-10 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full shadow-lg shadow-[#3B82F6]/30 active:scale-95 transition-all flex items-center justify-center mb-0.5"
                                >
                                    <Send className="w-4.5 h-4.5 ml-0.5" />
                                </button>
                            ) : (
                                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 mb-0.5">
                                    <Send className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Disclaimer */}
                <p className="text-center text-[8px] text-slate-400 dark:text-slate-500 font-bold mt-2 uppercase tracking-widest opacity-80">
                    AI-generated • Verify important info
                </p>
            </div>
        </div>
    );
}
