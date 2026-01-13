"use client";

import { MessageSquarePlus, History, LogIn, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMarketSafe } from "@/contexts/MarketContext";

interface MobileHeaderProps {
    onNewChat?: () => void;
    onOpenHistory?: () => void;
    hasHistory?: boolean;
    // Auth props
    isAuthenticated?: boolean;
    userName?: string;
    onLogin?: () => void;
    onLogout?: () => void;
    remainingQuestions?: number;
    forceMarket?: string;
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
    forceMarket
}: MobileHeaderProps) {
    const router = useRouter();
    const { market: contextMarket } = useMarketSafe();
    const displayMarket = forceMarket || contextMarket;

    return (
        <header className="w-full z-50 relative flex-none px-4 pt-safe pb-2 bg-transparent" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
            {/* Opaque container - Premium Glass Effect */}
            <div className="flex items-center justify-between bg-white/90 dark:bg-[#0B1121]/90 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-sm dark:shadow-none border border-slate-200/60 dark:border-white/10 ring-1 ring-slate-100 dark:ring-transparent transition-colors duration-300">

                {/* Left: Avatar + Status */}
                <div className="flex items-center gap-3">
                    {/* Avatar - Robot image only */}
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-blue-500/10 dark:shadow-none ring-1 ring-slate-100 dark:ring-white/10 bg-slate-50 dark:bg-slate-800">
                            <img
                                src="/ai-robot.png"
                                alt="Starta"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        {/* Online pulse */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0B1121] shadow-sm">
                            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="flex flex-col">
                        <div className="font-bold text-slate-900 dark:text-white text-[15px] leading-tight font-display tracking-tight transition-colors">Starta AI</div>
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 transition-colors">
                            <span className="uppercase tracking-wider font-semibold text-[10px] text-slate-400 dark:text-slate-500">{displayMarket === 'EGX' ? 'Egypt' : 'Saudi'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Pro</span>
                        </div>
                    </div>
                </div>

                {/* Right: Usage + Actions */}
                <div className="flex items-center gap-2">
                    {/* Usage Counter Badge (guests only) */}
                    {!isAuthenticated && remainingQuestions !== undefined && remainingQuestions > 0 && (
                        <div className="px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 rounded-full text-[10px] font-bold shadow-md shadow-slate-900/10 dark:shadow-none border border-transparent dark:border-white/10">
                            <span className="text-blue-300 dark:text-blue-400">{remainingQuestions}</span> left
                        </div>
                    )}
                    {!isAuthenticated && remainingQuestions !== undefined && remainingQuestions <= 0 && (
                        <div className="px-2.5 py-1 bg-red-500 text-white rounded-full text-[10px] font-bold shadow-md shadow-red-500/20">
                            Limit
                        </div>
                    )}

                    {/* History Button */}
                    <button
                        onClick={onOpenHistory}
                        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                    >
                        <History className="w-5 h-5" />
                        {hasHistory && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border border-white dark:border-[#0B1121]" />
                        )}
                    </button>

                    {/* New Chat Button */}
                    <button
                        onClick={onNewChat}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                    >
                        <MessageSquarePlus className="w-5 h-5" />
                    </button>

                    {/* Login/Profile Button */}
                    {isAuthenticated ? (
                        <button
                            onClick={() => router.push('/mobile-ai-analyst/setting')}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 dark:shadow-blue-900/30 active:scale-95 transition-all"
                            title="Settings"
                        >
                            <User className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={onLogin}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 dark:shadow-white/10 active:scale-95 transition-all"
                        >
                            <LogIn className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
