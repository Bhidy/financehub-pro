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
                <h3 className="text-lg font-bold text-slate-900 mb-1">Regional Preferences</h3>
                <p className="text-sm text-slate-500 mb-6">Select your primary market region for data and news.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MARKETS.map((m) => {
                        const isActive = market === m;
                        const config = MARKET_CONFIGS[m];

                        return (
                            <button
                                key={m}
                                onClick={() => setMarket(m)}
                                className={clsx(
                                    "relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                                    isActive
                                        ? "border-blue-600 bg-blue-50/30 shadow-md shadow-blue-100"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                <div className={clsx(
                                    "w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm",
                                    isActive ? "bg-white" : "bg-slate-100"
                                )}>
                                    {config.flag}
                                </div>

                                <div className="flex-1">
                                    <div className="font-bold text-slate-900">{config.name}</div>
                                    <div className="text-xs text-slate-500 font-medium">
                                        {m === 'EGX' ? 'Egyptian Exchange' : 'Saudi Exchange (Tadawul)'}
                                    </div>
                                </div>

                                {isActive && (
                                    <div className="absolute top-4 right-4 text-blue-600">
                                        <Check className="w-5 h-5 bg-blue-100 rounded-full p-0.5" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <hr className="border-slate-100" />

            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Data Settings</h3>
                <p className="text-sm text-slate-500 mb-4">Configure how data is displayed and updated.</p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
                    <Globe className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                        <div className="text-sm font-semibold text-slate-700">Automatic updates</div>
                        <div className="text-xs text-slate-500 mt-1">
                            Market data refreshes automatically every 60 seconds when enabled.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
