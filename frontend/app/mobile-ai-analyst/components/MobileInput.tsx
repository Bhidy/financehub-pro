"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Mic, Loader2 } from "lucide-react";
import clsx from "clsx";

interface MobileInputProps {
    query: string;
    setQuery: (q: string) => void;
    onSend: () => void;
    isLoading: boolean;
}

export function MobileInput({ query, setQuery, onSend, isLoading }: MobileInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);

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
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-3 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
            {/* Floating island container */}
            <div className={clsx(
                "relative bg-white/90 backdrop-blur-xl rounded-[28px] border shadow-2xl transition-all duration-300",
                isFocused
                    ? "border-blue-300 shadow-blue-500/10 ring-4 ring-blue-500/10"
                    : "border-slate-200/60 shadow-slate-900/10"
            )}>
                {/* Glow effect when focused */}
                {isFocused && (
                    <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 -z-10 blur-xl" />
                )}

                <div className="flex items-end gap-2 p-2 pl-4">
                    <textarea
                        ref={textareaRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Ask Finny anything..."
                        className="flex-1 bg-transparent border-none p-2 text-slate-800 placeholder:text-slate-400 text-base leading-normal resize-none max-h-24 min-h-[44px] focus:ring-0 focus:outline-none font-medium"
                        rows={1}
                        disabled={isLoading}
                    />

                    {/* Send / Mic Button */}
                    {isLoading ? (
                        <div className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 mb-0.5">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        </div>
                    ) : query.trim() ? (
                        <button
                            onClick={onSend}
                            className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center mb-0.5"
                        >
                            <Send className="w-5 h-5 ml-0.5" />
                        </button>
                    ) : (
                        <button className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-0.5">
                            <Mic className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[10px] text-slate-400 font-medium mt-2 uppercase tracking-wide">
                AI-generated • Verify important info
            </p>
        </div>
    );
}
