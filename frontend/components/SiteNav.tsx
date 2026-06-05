"use client";

import { useState } from "react";
import { Sun, Moon, Menu, X, Plus, History } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface MobileChatActions {
    onNewChat?: () => void;
    onOpenHistory?: () => void;
    hasHistory?: boolean;
}

interface SiteNavProps {
    lang?: string;
    onToggleLang?: () => void;
    mobileChatActions?: MobileChatActions;
}

const NAV_LINKS = [
    { href: "/", en: "HOME", ar: "الرئيسية" },
    { href: "/Funds", en: "MUTUAL FUNDS", ar: "الصناديق الاستثمارية" },
    { href: "/Market-Pulse", en: "MARKET PULSE", ar: "نبض السوق" },
    { href: "/News", en: "MARKET NEWS", ar: "أخبار السوق" },
    { href: "/Portfolio", en: "PORTFOLIO", ar: "المحفظة" },
    { href: "/Learn", en: "LEARN", ar: "تعلّم" },
];

export default function SiteNav({ lang = "en", onToggleLang, mobileChatActions }: SiteNavProps) {
    const { theme, toggleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <nav className="w-full flex-shrink-0 border-b border-slate-200/40 dark:border-white/[0.08] bg-white/80 dark:bg-[#010101]/80 backdrop-blur-xl z-50">
            <div className="max-w-screen-2xl mx-auto px-8 h-20 flex justify-between items-center">
                {/* Logo */}
                <a href="/" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 bg-[#14B8A6] rounded flex items-center justify-center font-bold text-white text-xl group-hover:rotate-12 transition-transform">
                        S
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-[#eef2f6] tracking-widest uppercase">
                        STARTA
                    </span>
                </a>

                {/* Desktop nav links */}
                <div className="hidden lg:flex items-center gap-10">
                    <div className="flex gap-10 text-xs font-mono text-slate-500 dark:text-[#9ca6b5] tracking-widest">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="hover:text-[#14B8A6] transition-colors"
                            >
                                {lang === "ar" ? link.ar : link.en}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3">
                    {/* TRY NOW button */}
                    <a
                        href="/AiChat"
                        className="hidden md:inline-flex px-6 py-2 rounded-full text-xs font-bold tracking-widest border border-[rgba(45,212,191,0.45)] bg-[rgba(45,212,191,0.08)] text-slate-900 dark:text-[#eef2f6] hover:bg-[rgba(45,212,191,0.2)] hover:-translate-y-px transition-all duration-200"
                    >
                        {lang === "ar" ? "جرّب الآن" : "TRY NOW"}
                    </a>

                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                        className="w-[2.35rem] h-[2.35rem] rounded-full border border-slate-200 dark:border-white/[0.09] bg-white/50 dark:bg-[rgba(14,16,16,0.56)] backdrop-blur-sm flex items-center justify-center text-slate-600 dark:text-[#eef2f6] hover:text-[#14B8A6] hover:border-[rgba(20,184,166,0.5)] hover:-translate-y-px transition-all duration-200"
                    >
                        {theme === "dark" ? (
                            <Sun className="w-[1.1rem] h-[1.1rem]" />
                        ) : (
                            <Moon className="w-[1.1rem] h-[1.1rem]" />
                        )}
                    </button>

                    {/* Language toggle */}
                    {onToggleLang && (
                        <button
                            onClick={onToggleLang}
                            className="w-[2.35rem] h-[2.35rem] rounded-full border border-slate-200 dark:border-white/[0.09] bg-white/50 dark:bg-[rgba(14,16,16,0.56)] backdrop-blur-sm flex items-center justify-center text-[0.8rem] font-bold text-slate-600 dark:text-[#eef2f6] hover:text-[#14B8A6] hover:border-[rgba(20,184,166,0.5)] hover:-translate-y-px transition-all duration-200"
                        >
                            {lang === "en" ? "AR" : "EN"}
                        </button>
                    )}

                    {/* Mobile chat controls — only shown when provided (e.g. on /AiChat) */}
                    {mobileChatActions?.onOpenHistory && (
                        <button
                            onClick={mobileChatActions.onOpenHistory}
                            className="lg:hidden relative w-[2.35rem] h-[2.35rem] rounded-full border border-slate-200 dark:border-white/[0.09] bg-white/50 dark:bg-[rgba(14,16,16,0.56)] backdrop-blur-sm flex items-center justify-center text-slate-600 dark:text-[#eef2f6] hover:text-[#14B8A6] hover:border-[rgba(20,184,166,0.5)] transition-all duration-200"
                            aria-label="Chat history"
                        >
                            <History className="w-[1.1rem] h-[1.1rem]" />
                            {mobileChatActions.hasHistory && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
                            )}
                        </button>
                    )}
                    {mobileChatActions?.onNewChat && (
                        <button
                            onClick={mobileChatActions.onNewChat}
                            className="lg:hidden w-[2.35rem] h-[2.35rem] rounded-full border border-slate-200 dark:border-white/[0.09] bg-white/50 dark:bg-[rgba(14,16,16,0.56)] backdrop-blur-sm flex items-center justify-center text-slate-600 dark:text-[#eef2f6] hover:text-[#14B8A6] hover:border-[rgba(20,184,166,0.5)] transition-all duration-200"
                            aria-label="New chat"
                        >
                            <Plus className="w-[1.1rem] h-[1.1rem]" />
                        </button>
                    )}

                    {/* Mobile burger */}
                    <button
                        className="lg:hidden w-[2.35rem] h-[2.35rem] rounded-full border border-slate-200 dark:border-white/[0.09] bg-white/50 dark:bg-[rgba(14,16,16,0.56)] backdrop-blur-sm flex items-center justify-center text-slate-600 dark:text-[#eef2f6] hover:text-[#14B8A6] hover:border-[rgba(20,184,166,0.5)] transition-all duration-200"
                        onClick={() => setMobileOpen((o) => !o)}
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile slide-down menu */}
            {mobileOpen && (
                <div className="lg:hidden bg-white dark:bg-[#0b0c0d] border-t border-slate-200/40 dark:border-white/[0.08] px-6 py-4">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="block text-sm font-mono tracking-widest text-slate-500 dark:text-[#9ca6b5] hover:text-[#14B8A6] transition-colors py-3 border-b border-slate-100 dark:border-white/[0.05] last:border-0"
                        >
                            {lang === "ar" ? link.ar : link.en}
                        </a>
                    ))}
                    <a
                        href="/AiChat"
                        className="mt-4 flex items-center justify-center px-6 py-3 rounded-full text-sm font-bold tracking-widest border border-[rgba(45,212,191,0.45)] bg-[rgba(45,212,191,0.08)] text-slate-900 dark:text-[#eef2f6]"
                    >
                        {lang === "ar" ? "جرّب الآن" : "TRY NOW"}
                    </a>
                </div>
            )}
        </nav>
    );
}
