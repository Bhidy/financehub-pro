"use client";

import { Moon, Sun, Monitor, Languages } from "lucide-react";

export default function AppearanceTab() {
    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Theme Preferences</h3>
                <p className="text-sm text-slate-500 mb-6">Choose how FinanceHub Pro looks to you.</p>

                <div className="grid grid-cols-3 gap-4">
                    <button className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-blue-600 bg-blue-50/50 text-blue-700 transition-all cursor-default">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                            <Sun className="w-6 h-6 text-orange-500" />
                        </div>
                        <span className="text-sm font-semibold">Light</span>
                    </button>

                    <button className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-200 bg-white text-slate-600 transition-all opacity-50 cursor-not-allowed" title="Coming Soon">
                        <div className="p-3 bg-slate-900 rounded-xl shadow-sm text-white">
                            <Moon className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-medium">Dark</span>
                    </button>

                    <button className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-200 bg-white text-slate-600 transition-all opacity-50 cursor-not-allowed" title="Coming Soon">
                        <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl shadow-sm">
                            <Monitor className="w-6 h-6 text-slate-700" />
                        </div>
                        <span className="text-sm font-medium">System</span>
                    </button>
                </div>
            </div>

            <hr className="border-slate-100" />

            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Language</h3>
                <p className="text-sm text-slate-500 mb-6">Select your preferred language for the interface.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button className="flex items-center justify-between p-4 rounded-xl border border-blue-200 bg-blue-50/30 text-slate-900 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">EN</div>
                            <span className="font-semibold">English</span>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm" />
                    </button>

                    <button className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-600 transition-all opacity-60 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">AR</div>
                            <span className="font-medium">العربية</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
