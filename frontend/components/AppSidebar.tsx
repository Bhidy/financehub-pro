"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
    LayoutDashboard,
    ScanLine,
    ChevronLeft,
    ChevronRight,
    BrainCircuit,
    Database,
    DollarSign,
    Building2,
    Newspaper,
    Zap,
    BarChart3
} from "lucide-react";
import { useState } from "react";
import { useMarketSafe, MARKET_CONFIGS, type Market } from "@/contexts/MarketContext";

const NAV_ITEMS = [
    { label: "Market Overview", icon: LayoutDashboard, href: "/", color: "blue" },
    { label: "Market News", icon: Newspaper, href: "/news", color: "blue" },
    { label: "Deep Screener", icon: ScanLine, href: "/screener", color: "teal" },
    { label: "AI Advisor", icon: BrainCircuit, href: "/ai-analyst", color: "violet" },
    { label: "Company Profile", icon: Building2, href: "/symbol/2222", dynamicHref: true, color: "amber" },
    { label: "Mutual Funds", icon: DollarSign, href: "/funds", color: "emerald" },
    { label: "Fund Statistics", icon: BarChart3, href: "/funds/statistics", color: "cyan" },
    { label: "Command Center", icon: Database, href: "/command-center", color: "slate" },
];

const colorStyles: Record<string, { iconBg: string; iconText: string; activeBg: string }> = {
    blue: { iconBg: "bg-blue-50", iconText: "text-blue-500", activeBg: "from-blue-500 to-blue-600" },
    teal: { iconBg: "bg-teal-50", iconText: "text-teal-500", activeBg: "from-teal-500 to-teal-600" },
    violet: { iconBg: "bg-violet-50", iconText: "text-violet-500", activeBg: "from-violet-500 to-violet-600" },
    amber: { iconBg: "bg-amber-50", iconText: "text-amber-500", activeBg: "from-amber-500 to-amber-600" },
    emerald: { iconBg: "bg-emerald-50", iconText: "text-emerald-500", activeBg: "from-emerald-500 to-emerald-600" },
    cyan: { iconBg: "bg-cyan-50", iconText: "text-cyan-500", activeBg: "from-cyan-500 to-cyan-600" },
    slate: { iconBg: "bg-slate-100", iconText: "text-slate-500", activeBg: "from-slate-600 to-slate-700" },
};

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { market, setMarket } = useMarketSafe();

    return (
        <aside
            className={clsx(
                "h-screen flex flex-col transition-all duration-300 relative overflow-hidden",
                "bg-white shadow-xl shadow-slate-100/50",
                collapsed ? "w-[72px]" : "w-[240px]"
            )}
        >
            {/* Decorative Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-100/40 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-teal-100/40 rounded-full blur-3xl" />
            </div>

            {/* Logo Header */}
            <div className="relative z-10 px-4 py-5 border-b border-slate-100/80">
                <div className={clsx("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-200/50">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                    </div>
                    {!collapsed && (
                        <div>
                            <div className="text-lg font-black tracking-tight">
                                <span className="text-slate-800">Finance</span>
                                <span className="text-blue-500">Hub</span>
                            </div>
                            <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Pro Edition</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Market Toggle */}
            <div className={clsx("relative z-10 px-3 py-4", collapsed && "px-2")}>
                {!collapsed ? (
                    <div className="flex p-1 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-100">
                        {(['SAUDI', 'EGX'] as Market[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMarket(m)}
                                className={clsx(
                                    "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-200",
                                    market === m
                                        ? "bg-white text-slate-800 shadow-md shadow-slate-200/50"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <span className="text-base">{MARKET_CONFIGS[m].flag}</span>
                                <span>{m === 'SAUDI' ? 'KSA' : 'Egypt'}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {(['SAUDI', 'EGX'] as Market[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMarket(m)}
                                className={clsx(
                                    "w-full flex items-center justify-center p-2 rounded-lg text-base transition-all",
                                    market === m
                                        ? "bg-slate-100 shadow-sm"
                                        : "opacity-40 hover:opacity-100"
                                )}
                                title={MARKET_CONFIGS[m].name}
                            >
                                {MARKET_CONFIGS[m].flag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const resolvedHref = (item as any).dynamicHref
                        ? (market === 'EGX' ? '/egx/COMI' : '/symbol/2222')
                        : item.href;
                    const isActive = pathname === resolvedHref ||
                        pathname.startsWith(resolvedHref.split('/').slice(0, -1).join('/') + '/') ||
                        (item.href === '/' && pathname === '/');
                    const Icon = item.icon;
                    const colors = colorStyles[item.color];

                    return (
                        <Link
                            key={item.label}
                            href={resolvedHref}
                            className={clsx(
                                "group flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-[13px] transition-all duration-200",
                                isActive
                                    ? `bg-gradient-to-r ${colors.activeBg} text-white shadow-lg`
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                            style={isActive ? { boxShadow: '0 4px 12px -2px rgba(0,0,0,0.12)' } : {}}
                        >
                            <div className={clsx(
                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                                isActive ? "bg-white/20" : colors.iconBg
                            )}>
                                <Icon className={clsx(
                                    "w-4 h-4 transition-transform group-hover:scale-110",
                                    isActive ? "text-white" : colors.iconText
                                )} />
                            </div>
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse Button */}
            <div className="relative z-10 p-3 border-t border-slate-100/80">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all text-xs font-semibold"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : (
                        <>
                            <ChevronLeft className="w-4 h-4" />
                            <span>Collapse</span>
                        </>
                    )}
                </button>
            </div>

            {/* Status Footer */}
            {!collapsed && (
                <div className="relative z-10 px-4 py-3 border-t border-slate-100/80 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            </div>
                            <span className="text-[11px] font-bold text-emerald-600">Online</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">v2.0</span>
                    </div>
                </div>
            )}
        </aside>
    );
}
