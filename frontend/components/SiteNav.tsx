"use client";

import { useState } from "react";
import { Sun, Moon, Menu, X, History, LogOut, UserRound } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_LABELS } from "@/lib/auth-i18n";
import navConfig from "@/lib/nav.json";

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

/**
 * The primary nav is defined ONCE in lib/nav.json and shared with
 * components/seo/PublicPageShell.tsx and the static pages (via
 * public/assets/starta-nav.js). This component previously carried its own list,
 * which drifted: it still advertised Market-Pulse and My Portfolio after the
 * funds-only repositioning, and lacked Wealth Calculators. Do not re-add a
 * local list — edit lib/nav.json.
 */
const NAV_LINKS = navConfig.items;

/**
 * Auth pill styles — Sign In is the secondary (outlined) action, Create Account
 * the primary (filled teal) one, both matching the existing nav pill geometry.
 */
const AUTH_PILL_BASE =
    "px-5 py-2 rounded-full text-xs font-bold tracking-widest transition-all duration-200 hover:-translate-y-px";
const AUTH_PILL_SECONDARY =
    `${AUTH_PILL_BASE} border border-slate-200 dark:border-white/[0.09] bg-white/50 dark:bg-[rgba(14,16,16,0.56)] text-slate-700 dark:text-[#eef2f6] hover:text-[#14B8A6] hover:border-[rgba(20,184,166,0.5)]`;
const AUTH_PILL_PRIMARY =
    `${AUTH_PILL_BASE} bg-[#14B8A6] text-white hover:bg-[#0D9488] shadow-sm shadow-[#14B8A6]/30`;

export default function SiteNav({ lang = "en", onToggleLang, mobileChatActions }: SiteNavProps) {
    const { theme, toggleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();
    const isAiChat = pathname === "/AiChat";

    // Auth affordances. `isLoading` is true on the server AND on the hydrating
    // client render (AuthProvider only reads localStorage in an effect), so
    // gating on it is hydration-safe and also avoids flashing "Sign In" at a
    // visitor who is in fact already signed in.
    const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
    const authLabels = AUTH_LABELS[lang === "ar" ? "ar" : "en"].nav;

    return (
        <>
            {/* ── Nav bar ─────────────────────────────────────────────────── */}
            <nav className="w-full flex-shrink-0 border-b border-slate-200/40 dark:border-white/[0.08] bg-white/80 dark:bg-[#010101]/80 backdrop-blur-xl relative z-50">
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
                        {/* TRY NOW — hidden on /AiChat (already there), desktop/tablet only */}
                        {!isAiChat && (
                            <a
                                href="/RiskAssessment"
                                className="hidden md:inline-flex px-6 py-2 rounded-full text-xs font-bold tracking-widest border border-[rgba(45,212,191,0.45)] bg-[rgba(45,212,191,0.08)] text-slate-900 dark:text-[#eef2f6] hover:bg-[rgba(45,212,191,0.2)] hover:-translate-y-px transition-all duration-200"
                            >
                                {lang === "ar" ? "اعرف ملف مخاطرك" : "FREE RISK PROFILE"}
                            </a>
                        )}

                        {/* Auth — real links, desktop/tablet only; mobile lives in overlay */}
                        {!isAuthLoading && (
                            isAuthenticated ? (
                                <div className="hidden md:flex items-center gap-2">
                                    <a href="/settings" className={`hidden md:inline-flex items-center gap-2 ${AUTH_PILL_SECONDARY}`}>
                                        <UserRound className="w-3.5 h-3.5" />
                                        {authLabels.account}
                                    </a>
                                    <button
                                        onClick={logout}
                                        className={`hidden md:inline-flex items-center gap-2 ${AUTH_PILL_SECONDARY}`}
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        {authLabels.signOut}
                                    </button>
                                </div>
                            ) : (
                                <div className="hidden md:flex items-center gap-2">
                                    <a href="/login" className={`inline-flex items-center ${AUTH_PILL_SECONDARY}`}>
                                        {authLabels.signIn}
                                    </a>
                                    <a href="/register" className={`inline-flex items-center ${AUTH_PILL_PRIMARY}`}>
                                        {authLabels.createAccount}
                                    </a>
                                </div>
                            )
                        )}

                        {/* Theme — desktop only; mobile lives in overlay */}
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            className="hidden lg:flex w-[2.35rem] h-[2.35rem] rounded-full border border-slate-200 dark:border-white/[0.09] bg-white/50 dark:bg-[rgba(14,16,16,0.56)] backdrop-blur-sm items-center justify-center text-slate-600 dark:text-[#eef2f6] hover:text-[#14B8A6] hover:border-[rgba(20,184,166,0.5)] hover:-translate-y-px transition-all duration-200"
                        >
                            {theme === "dark" ? <Sun className="w-[1.1rem] h-[1.1rem]" /> : <Moon className="w-[1.1rem] h-[1.1rem]" />}
                        </button>

                        {/* Language — desktop only; mobile lives in overlay */}
                        {onToggleLang && (
                            <button
                                onClick={onToggleLang}
                                className="hidden lg:flex w-[2.35rem] h-[2.35rem] rounded-full border border-slate-200 dark:border-white/[0.09] bg-white/50 dark:bg-[rgba(14,16,16,0.56)] backdrop-blur-sm items-center justify-center text-[0.8rem] font-bold text-slate-600 dark:text-[#eef2f6] hover:text-[#14B8A6] hover:border-[rgba(20,184,166,0.5)] hover:-translate-y-px transition-all duration-200"
                            >
                                {lang === "en" ? "AR" : "EN"}
                            </button>
                        )}

                        {/* Mobile chat controls */}
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
            </nav>

            {/* ── Mobile overlay — FIXED, floats over page, does NOT push content ── */}
            {mobileOpen && (
                <>
                    {/* Scrim — tap anywhere to close */}
                    <div
                        className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
                        onClick={() => setMobileOpen(false)}
                        aria-hidden="true"
                    />

                    {/* Dropdown panel — anchored right below the 80px nav bar */}
                    <div
                        className="lg:hidden fixed left-0 right-0 top-20 z-50 bg-white dark:bg-[#0b0c0d] border-b border-slate-200/60 dark:border-white/[0.08] shadow-2xl shadow-slate-900/10 dark:shadow-black/50 px-6 py-4"
                        style={{ animation: "siteNavSlideDown 0.18s ease-out both" }}
                    >
                        <style>{`
                            @keyframes siteNavSlideDown {
                                from { opacity: 0; transform: translateY(-8px); }
                                to   { opacity: 1; transform: translateY(0); }
                            }
                        `}</style>

                        {/* Nav links */}
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className="block text-sm font-mono tracking-widest text-slate-500 dark:text-[#9ca6b5] hover:text-[#14B8A6] transition-colors py-3 border-b border-slate-100 dark:border-white/[0.05]"
                            >
                                {lang === "ar" ? link.ar : link.en}
                            </a>
                        ))}

                        {/* TRY NOW — hidden on /AiChat */}
                        {!isAiChat && (
                            <a
                                href="/RiskAssessment"
                                onClick={() => setMobileOpen(false)}
                                className="mt-4 flex items-center justify-center px-6 py-3 rounded-full text-sm font-bold tracking-widest border border-[rgba(45,212,191,0.45)] bg-[rgba(45,212,191,0.08)] text-slate-900 dark:text-[#eef2f6]"
                            >
                                {lang === "ar" ? "اعرف ملف مخاطرك" : "FREE RISK PROFILE"}
                            </a>
                        )}

                        {/* Auth — same real links as the desktop nav */}
                        {!isAuthLoading && (
                            isAuthenticated ? (
                                <div className="mt-3 flex gap-3">
                                    <a
                                        href="/settings"
                                        onClick={() => setMobileOpen(false)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold tracking-widest border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-[#eef2f6]"
                                    >
                                        <UserRound className="w-4 h-4" />
                                        {authLabels.account}
                                    </a>
                                    <button
                                        onClick={() => { logout(); setMobileOpen(false); }}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold tracking-widest border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-[#eef2f6]"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        {authLabels.signOut}
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-3 flex gap-3">
                                    <a
                                        href="/login"
                                        onClick={() => setMobileOpen(false)}
                                        className="flex-1 flex items-center justify-center py-3 rounded-full text-sm font-bold tracking-widest border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-[#eef2f6]"
                                    >
                                        {authLabels.signIn}
                                    </a>
                                    <a
                                        href="/register"
                                        onClick={() => setMobileOpen(false)}
                                        className="flex-1 flex items-center justify-center py-3 rounded-full text-sm font-bold tracking-widest bg-[#14B8A6] text-white shadow-sm shadow-[#14B8A6]/30"
                                    >
                                        {authLabels.createAccount}
                                    </a>
                                </div>
                            )
                        )}

                        {/* Settings row — theme + language */}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.05] flex gap-3">
                            <button
                                onClick={() => { toggleTheme(); setMobileOpen(false); }}
                                aria-label="Toggle theme"
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.04] text-sm font-semibold text-slate-600 dark:text-[#9ca6b5] hover:text-[#14B8A6] hover:border-[rgba(20,184,166,0.4)] transition-all duration-200"
                            >
                                {theme === "dark"
                                    ? <><Sun className="w-4 h-4" /><span>{lang === "ar" ? "فاتح" : "Light"}</span></>
                                    : <><Moon className="w-4 h-4" /><span>{lang === "ar" ? "داكن" : "Dark"}</span></>}
                            </button>

                            {onToggleLang && (
                                <button
                                    onClick={() => { onToggleLang(); setMobileOpen(false); }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.04] text-sm font-semibold text-slate-600 dark:text-[#9ca6b5] hover:text-[#14B8A6] hover:border-[rgba(20,184,166,0.4)] transition-all duration-200"
                                >
                                    <span className="text-base leading-none">🌐</span>
                                    <span>{lang === "en" ? "العربية" : "English"}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
