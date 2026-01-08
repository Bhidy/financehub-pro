"use client";

import { MessageSquarePlus, History, LogIn, User, LogOut } from "lucide-react";
import { useMarketSafe } from "@/contexts/MarketContext";

interface MobileHeaderProps {
    onNewChat: () => void;
    onOpenHistory: () => void;
    hasHistory?: boolean;
    // Auth props
    isAuthenticated?: boolean;
    userName?: string;
    onLogin?: () => void;
    onLogout?: () => void;
    remainingQuestions?: number;
}

export function MobileHeader({
    onNewChat,
    onOpenHistory,
    hasHistory = false,
    isAuthenticated = false,
    userName,
    onLogin,
    onLogout,
    remainingQuestions = 5,
}: MobileHeaderProps) {
    const { market } = useMarketSafe();

    return (
        <header className="sticky top-0 z-50 px-4 pt-safe pb-2 bg-gradient-to-b from-slate-100 to-transparent" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
            {/* Glass container */}
            <div className="flex items-center justify-between bg-white/70 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-lg shadow-slate-900/5 border border-white/50">

                {/* Left: Avatar + Status */}
                <div className="flex items-center gap-3">
                    {/* Avatar - Robot image only */}
                    <div className="relative">
                        <div className="w-11 h-11 rounded-xl overflow-hidden shadow-lg shadow-slate-200/50">
                            <img
                                src="/ai-robot.png"
                                alt="Finny"
                                className="w-full h-full object-contain"
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

                {/* Right: Usage + Actions */}
                <div className="flex items-center gap-2">
                    {/* Usage Counter Badge (guests only) */}
                    {!isAuthenticated && remainingQuestions > 0 && (
                        <div className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500">
                            <span className="text-blue-600">{remainingQuestions}</span> left
                        </div>
                    )}
                    {!isAuthenticated && remainingQuestions <= 0 && (
                        <div className="px-2 py-1 bg-red-50 rounded-lg text-[10px] font-bold text-red-500">
                            Limit
                        </div>
                    )}

                    {/* History Button */}
                    <button
                        onClick={onOpenHistory}
                        className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-500 hover:text-blue-600 active:scale-95 transition-all border border-slate-200/50 shadow-sm"
                    >
                        <History className="w-5 h-5" />
                        {hasHistory && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                        )}
                    </button>

                    {/* New Chat Button */}
                    <button
                        onClick={onNewChat}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-500 hover:text-blue-600 active:scale-95 transition-all border border-slate-200/50 shadow-sm"
                    >
                        <MessageSquarePlus className="w-5 h-5" />
                    </button>

                    {/* Login/Profile Button */}
                    {isAuthenticated ? (
                        <button
                            onClick={onLogout}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-teal-50 text-blue-600 active:scale-95 transition-all border border-blue-200/50 shadow-sm"
                            title={userName || "Logout"}
                        >
                            <User className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={onLogin}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-600 text-white active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <LogIn className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
