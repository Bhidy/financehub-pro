"use client";

import { useMarketSafe, MARKET_CONFIGS, type Market } from "@/contexts/MarketContext";
import clsx from "clsx";
import { Check, Globe } from "lucide-react";

export default function GeneralTab() {
    const { market, setMarket } = useMarketSafe();
    const MARKETS: Market[] = ['SAUDI', 'EGX'];

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Regional Preferences</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Select your primary market region for data and news.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MARKETS.map((m) => {
                        const isActive = market === m;
                        const config = MARKET_CONFIGS[m];

                        return (
                            <button
                                key={m}
                                onClick={() => setMarket(m)}
                                className={clsx(
                                    "relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group",
                                    isActive
                                        ? "border-teal-600 dark:border-teal-500/50 bg-teal-50/50 dark:bg-teal-500/10 shadow-md shadow-teal-100 dark:shadow-teal-900/10"
                                        : "border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
                                )}
                            >
                                <div className={clsx(
                                    "w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm transition-colors",
                                    isActive ? "bg-white dark:bg-teal-500/20" : "bg-slate-100 dark:bg-white/10"
                                )}>
                                    {config.flag}
                                </div>

                                <div className="flex-1">
                                    <div className="font-bold text-slate-900 dark:text-white">{config.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                        {m === 'EGX' ? 'Egyptian Exchange' : 'Saudi Exchange (Tadawul)'}
                                    </div>
                                </div>

                                {isActive && (
                                    <div className="absolute top-4 right-4 text-teal-600 dark:text-teal-400">
                                        <Check className="w-5 h-5 bg-teal-100 dark:bg-teal-500/20 rounded-full p-0.5" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <hr className="border-slate-100 dark:border-white/5" />

            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Data Settings</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Configure how data is displayed and updated.</p>

                <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-4 flex items-start gap-3">
                    <Globe className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5" />
                    <div>
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Automatic updates</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Market data refreshes automatically every 60 seconds when enabled.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
