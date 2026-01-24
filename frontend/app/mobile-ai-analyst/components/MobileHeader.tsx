"use client";

import { MessageSquarePlus, History, LogIn, User, LogOut, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMarketSafe } from "@/contexts/MarketContext";
import { useMobileRoutes } from "../hooks/useMobileRoutes";
import { useTheme } from "@/contexts/ThemeContext";

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
    const { getRoute } = useMobileRoutes();
    const { theme, setTheme } = useTheme();
    const displayMarket = forceMarket || contextMarket;

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <header className="w-full z-50 relative flex-none px-4 pt-safe pb-2 bg-transparent" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
            {/* Opaque container - Premium Glass Effect with Midnight Teal Design */}
            <div className="flex items-center justify-between bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl rounded-xl px-4 py-3 shadow-sm dark:shadow-none border border-slate-200/60 dark:border-white/[0.08] transition-colors duration-300">

                {/* Left: Avatar + Status */}
                <div className="flex items-center gap-3">
                    {/* Avatar - Robot image with Teal accent */}
                    <div className="relative">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shadow-md shadow-[#14B8A6]/10 dark:shadow-none ring-1 ring-slate-100 dark:ring-white/[0.08] bg-slate-50 dark:bg-slate-800">
                            <img
                                src="/ai-robot.png"
                                alt="Starta"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        {/* Online pulse - Teal accent */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#14B8A6] rounded-full border-2 border-white dark:border-[#111827] shadow-sm">
                            <div className="absolute inset-0 bg-[#14B8A6] rounded-full animate-ping opacity-75" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="flex flex-col">
                        <div className="font-bold text-slate-900 dark:text-white text-[15px] leading-tight tracking-tight transition-colors">Starta AI</div>
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 transition-colors">
                            <span className="uppercase tracking-wider font-semibold text-[10px] text-slate-400 dark:text-slate-500">{displayMarket === 'EGX' ? 'Egypt' : 'Saudi'}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span className="text-[#14B8A6] font-semibold">Pro</span>
                        </div>
                    </div>
                </div>

                {/* Right: Usage + Actions */}
                <div className="flex items-center gap-2">
                    {/* Usage Counter Badge (guests only) - Using Trust Blue */}
                    {!isAuthenticated && remainingQuestions !== undefined && remainingQuestions > 0 && (
                        <div className="px-2.5 py-1 bg-[#0F172A] dark:bg-slate-800 text-white dark:text-slate-200 rounded-full text-[10px] font-bold shadow-md shadow-slate-900/10 dark:shadow-none border border-transparent dark:border-white/[0.08]">
                            <span className="text-[#3B82F6]">{remainingQuestions}</span> left
                        </div>
                    )}
                    {/* Limit Badge - Using Error Red */}
                    {!isAuthenticated && remainingQuestions !== undefined && remainingQuestions <= 0 && (
                        <div className="px-2.5 py-1 bg-[#EF4444] text-white rounded-full text-[10px] font-bold shadow-md shadow-[#EF4444]/20">
                            Limit
                        </div>
                    )}

                    {/* History Button */}
                    <button
                        onClick={onOpenHistory}
                        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                    >
                        <History className="w-5 h-5" />
                        {hasHistory && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-[#3B82F6] rounded-full border border-white dark:border-[#111827]" />
                        )}
                    </button>

                    {/* New Chat Button */}
                    <button
                        onClick={onNewChat}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                    >
                        <MessageSquarePlus className="w-5 h-5" />
                    </button>

                    {/* Theme Toggle Button - Light/Dark Mode Switch */}
                    <button
                        onClick={toggleTheme}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all"
                        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5" />
                        ) : (
                            <Moon className="w-5 h-5" />
                        )}
                    </button>

                    {/* Login/Profile Button - Using Trust Blue gradient */}
                    {isAuthenticated ? (
                        <button
                            onClick={() => router.push(getRoute('setting'))}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#14B8A6] text-white shadow-lg shadow-[#14B8A6]/20 dark:shadow-[#14B8A6]/10 active:scale-95 transition-all"
                            title="Settings"
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
