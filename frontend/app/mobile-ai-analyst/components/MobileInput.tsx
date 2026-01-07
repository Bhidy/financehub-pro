"use client";

import { useEffect, useRef } from "react";
import { Send, Mic, Paperclip } from "lucide-react";
import clsx from "clsx";

interface MobileInputProps {
    query: string;
    setQuery: (q: string) => void;
    onSend: () => void;
    isLoading: boolean;
}

export function MobileInput({ query, setQuery, onSend, isLoading }: MobileInputProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/60 pb-safe-area">
            <div className="px-3 py-3 w-full max-w-lg mx-auto">
                <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-[24px] p-2 pl-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 focus-within:bg-white transition-all">

                    {/* Attachment (Hidden on mobile keyaboard open? Maybe keep for now) */}
                    <button className="p-2 text-slate-400 active:text-blue-600 flex-shrink-0" disabled={isLoading}>
                        <Paperclip className="w-5 h-5" />
                    </button>

                    <textarea
                        ref={textareaRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Finny..."
                        className="flex-1 bg-transparent border-none p-2 text-slate-800 placeholder:text-slate-400 text-base leading-normal resize-none max-h-32 min-h-[44px] focus:ring-0"
                        rows={1}
                        disabled={isLoading}
                    />

                    {query.trim() ? (
                        <button
                            onClick={onSend}
                            disabled={isLoading}
                            className="p-2.5 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/20 active:scale-95 transition-transform flex-shrink-0 mb-0.5"
                        >
                            <Send className="w-5 h-5 ml-0.5" />
                        </button>
                    ) : (
                        <button className="p-2 text-slate-400 active:text-blue-600 flex-shrink-0 mb-0.5" disabled={isLoading}>
                            <Mic className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
