"use client";

import { MessageSquarePlus, History } from "lucide-react";
import { useMarketSafe } from "@/contexts/MarketContext";

interface MobileHeaderProps {
    onOpenHistory: () => void;
    onNewChat: () => void;
}

export function MobileHeader({ onOpenHistory, onNewChat }: MobileHeaderProps) {
    const { market } = useMarketSafe();

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 h-14 flex items-center justify-between shadow-sm">

            {/* Left: Bot Identity */}
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                    <img
                        src="/ai-robot.png"
                        alt="Bot"
                        className="w-full h-full object-cover rounded-full opacity-90"
                        onError={(e) => {
                            // Fallback if image fails
                            (e.target as HTMLImageElement).style.display = 'none';
                            ((e.target as HTMLImageElement).parentElement as HTMLElement).innerText = 'F';
                        }}
                    />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm leading-tight">Finny AI</span>
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{market} Analyst</span>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onOpenHistory}
                    className="p-2 text-slate-500 hover:text-blue-600 active:bg-slate-100 rounded-full transition-colors"
                >
                    <History className="w-5 h-5" />
                </button>
                <button
                    onClick={onNewChat}
                    className="p-2 text-slate-500 hover:text-blue-600 active:bg-slate-100 rounded-full transition-colors"
                >
                    <MessageSquarePlus className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
