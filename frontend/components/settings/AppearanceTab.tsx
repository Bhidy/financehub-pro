"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import clsx from "clsx";

export default function AppearanceTab() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in duration-500">
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Theme Preferences</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Choose how FinanceHub Pro looks to you.</p>

                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => setTheme('light')}
                        className={clsx(
                            "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all relative overflow-hidden group",
                            theme === 'light'
                                ? "border-teal-600 bg-teal-50/50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                                : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                        )}
                    >
                        <div className={clsx(
                            "p-3 rounded-xl shadow-sm transition-colors",
                            theme === 'light' ? "bg-white text-orange-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                            <Sun className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold">Light</span>
                        {theme === 'light' && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-teal-600 rounded-full shadow-lg shadow-teal-600/50" />
                        )}
                    </button>

                    <button
                        onClick={() => setTheme('dark')}
                        className={clsx(
                            "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all relative overflow-hidden group",
                            theme === 'dark'
                                ? "border-teal-500 bg-teal-50/50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400"
                                : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                        )}
                    >
                        <div className={clsx(
                            "p-3 rounded-xl shadow-sm transition-colors",
                            theme === 'dark' ? "bg-teal-900 text-teal-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                            <Moon className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-semibold">Dark</span>
                        {theme === 'dark' && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-teal-500 rounded-full shadow-lg shadow-teal-500/50" />
                        )}
                    </button>

                    <button
                        disabled // System preference sync requires more complex hook logic, keeping disabled for now but removing "Coming Soon" if just placeholder
                        className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 dark:border-white/5 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-500 transition-all opacity-50 cursor-not-allowed"
                        title="Coming Soon"
                    >
                        <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 rounded-xl shadow-sm">
                            <Monitor className="w-6 h-6 text-slate-700 dark:text-slate-400" />
                        </div>
                        <span className="text-sm font-medium">System</span>
                    </button>
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Language</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Select your preferred language for the interface.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="flex items-center justify-between p-4 rounded-xl border border-teal-200 dark:border-teal-500/50 bg-teal-50/30 dark:bg-teal-500/10 text-slate-900 dark:text-white transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-xs">EN</div>
                            <span className="font-semibold">English</span>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600 dark:bg-teal-500 shadow-sm shadow-teal-500/50" />
                    </button>

                    <button className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 transition-all opacity-60 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">AR</div>
                            <span className="font-medium">العربية</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
