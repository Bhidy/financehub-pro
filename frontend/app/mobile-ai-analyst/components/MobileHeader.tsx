"use client";

import { MessageSquarePlus } from "lucide-react";
import { useMarketSafe } from "@/contexts/MarketContext";

interface MobileHeaderProps {
    onNewChat: () => void;
}

export function MobileHeader({ onNewChat }: MobileHeaderProps) {
    const { market } = useMarketSafe();

    return (
        <header className="sticky top-0 z-40 px-4 pt-3 pb-2">
            {/* Glass container */}
            <div className="flex items-center justify-between bg-white/70 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-lg shadow-slate-900/5 border border-white/50">

                {/* Left: Avatar + Status */}
                <div className="flex items-center gap-3">
                    {/* Gradient Avatar with pulse */}
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden">
                            <img
                                src="/ai-robot.png"
                                alt="Finny"
                                className="w-8 h-8 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                        {/* Online pulse */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white shadow-sm">
                            <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <div className="font-bold text-slate-900 text-sm leading-tight">Finny AI</div>
                        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                            <span className="uppercase tracking-wider">{market === 'EGX' ? 'Egypt' : 'Saudi'}</span>
                            <span className="text-emerald-500">• Live</span>
                        </div>
                    </div>
                </div>

                {/* Right: New Chat */}
                <button
                    onClick={onNewChat}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-500 hover:text-blue-600 active:scale-95 transition-all border border-slate-200/50 shadow-sm"
                >
                    <MessageSquarePlus className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
