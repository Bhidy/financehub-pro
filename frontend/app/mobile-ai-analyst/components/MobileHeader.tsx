"use client";

import { MessageSquarePlus, History, LogIn, User, Sun, Moon, Sparkles, Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMarketSafe } from "@/contexts/MarketContext";
import { useMobileRoutes } from "../hooks/useMobileRoutes";
import { useTheme } from "@/contexts/ThemeContext";
import { clsx } from "clsx";

interface MobileHeaderProps {
    onNewChat?: () => void;
    onOpenHistory?: () => void;
    hasHistory?: boolean;
    isAuthenticated?: boolean;
    userName?: string;
    onLogin?: () => void;
    onLogout?: () => void;
    remainingQuestions?: number;
    forceMarket?: string;
    designMode: 'pro' | 'analyst';
    onToggleDesignMode: () => void;
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
    forceMarket,
    designMode,
    onToggleDesignMode
}: MobileHeaderProps) {
    const router = useRouter();
    const { market: contextMarket } = useMarketSafe();
    const { getRoute } = useMobileRoutes();
    const { theme, setTheme } = useTheme();
    const displayMarket = forceMarket || contextMarket;

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <header className="w-full z-50 relative flex-none px-4 pt-safe pb-2 bg-transparent" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
            <div className="flex items-center justify-between bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl rounded-xl px-4 py-3 shadow-sm dark:shadow-none border border-slate-200/60 dark:border-white/[0.08] transition-colors duration-300">

                {/* Left: Avatar + Title + Design Switcher */}
                {/* Left: Avatar + Title + Design Switcher */}
                {/* Left: Avatar + Title + Design Switcher */}
                <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                        <div className="font-black text-slate-900 dark:text-white text-lg leading-none tracking-tight transition-colors">STARTA</div>
                        <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{displayMarket === 'EGX' ? 'Egypt' : 'Saudi'}</span>

                            {/* Premium Mobile Mode Toggle - Compact */}
                            <button
                                onClick={onToggleDesignMode}
                                className="hidden group relative flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md p-0.5 h-5 shadow-sm overflow-hidden"
                            >
                                <div className={clsx(
                                    "absolute top-0.5 bottom-0.5 w-[50%] rounded bg-white dark:bg-slate-700 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]",
                                    designMode === 'pro' ? "left-0.5" : "left-[calc(50%-2px)] translate-x-[2px]"
                                )} />

                                <span className={clsx(
                                    "relative z-10 px-2 text-[8px] font-black uppercase tracking-widest transition-colors duration-200",
                                    designMode === 'pro' ? "text-[#13b8a6]" : "text-slate-400 dark:text-slate-500"
                                )}>
                                    PRO
                                </span>
                                <span className={clsx(
                                    "relative z-10 px-2 text-[8px] font-black uppercase tracking-widest transition-colors duration-200",
                                    designMode === 'analyst' ? "text-[#13b8a6]" : "text-slate-400 dark:text-slate-500"
                                )}>
                                    ANALYST
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {!isAuthenticated && remainingQuestions !== undefined && remainingQuestions > 0 && (
                        <div className="px-2.5 py-1 bg-[#0F172A] dark:bg-slate-800 text-white dark:text-slate-200 rounded-full text-[10px] font-bold shadow-md shadow-slate-900/10 dark:shadow-none border border-transparent dark:border-white/[0.08]">
                            <span className="text-[#13b8a6]">{remainingQuestions}</span> left
                        </div>
                    )}

                    <button
                        onClick={onOpenHistory}
                        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                    >
                        <History className="w-5 h-5" />
                        {hasHistory && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-[#13b8a6] rounded-full border border-white dark:border-[#111827]" />
                        )}
                    </button>

                    <button
                        onClick={onNewChat}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                    >
                        <MessageSquarePlus className="w-5 h-5" />
                    </button>

                    <button
                        onClick={toggleTheme}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>

                    {isAuthenticated ? (
                        <button
                            onClick={() => router.push(getRoute('setting'))}
                            className={clsx(
                                "w-9 h-9 flex items-center justify-center rounded-lg text-white shadow-lg active:scale-95 transition-all duration-300",
                                designMode === 'pro'
                                    ? "bg-[#13b8a6] shadow-[#13b8a6]/20"
                                    : "bg-[#13b8a6] shadow-[#13b8a6]/20"
                            )}
                        >
                            <User className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={onLogin}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] shadow-lg shadow-slate-900/20 dark:shadow-white/10 active:scale-95 transition-all"
                        >
                            <LogIn className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
