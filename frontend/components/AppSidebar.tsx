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
    BarChart3,
    Settings,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    Briefcase
} from "lucide-react";
import { useState } from "react";
import { useMarketSafe } from "@/contexts/MarketContext";
import { useAuth } from "@/contexts/AuthContext";
import GlobalSearch from "@/components/GlobalSearchWidget";

const NAV_ITEMS = [
    { label: "Market Overview", icon: LayoutDashboard, href: "/", color: "blue" },
    { label: "Market News", icon: Newspaper, href: "/news", color: "indigo" },
    { label: "Deep Screener", icon: ScanLine, href: "/screener", color: "teal" },
    { label: "AI Advisor", icon: BrainCircuit, href: "/ai-analyst", color: "violet" },
    { label: "Company Profile", icon: Building2, href: "/symbol/2222", dynamicHref: true, color: "amber" },
    { label: "My Portfolio", icon: Briefcase, href: "/portfolio", color: "indigo" },
    { label: "EGX Watchlist", icon: Zap, href: "/egx-watchlist", color: "rose" },
    { label: "Mutual Funds", icon: DollarSign, href: "/funds", color: "emerald" },
    { label: "Fund Statistics", icon: BarChart3, href: "/funds/statistics", color: "cyan" },
    { label: "Command Center", icon: Database, href: "/command-center", color: "slate" },
    { label: "Settings", icon: Settings, href: "/settings", color: "slate" },
];

const colorStyles: Record<string, { iconBg: string; iconText: string; activeBg: string; activeText: string }> = {
    blue: { iconBg: "bg-blue-50", iconText: "text-blue-600", activeBg: "bg-blue-600", activeText: "text-white" },
    indigo: { iconBg: "bg-indigo-50", iconText: "text-indigo-600", activeBg: "bg-indigo-600", activeText: "text-white" },
    teal: { iconBg: "bg-teal-50", iconText: "text-teal-600", activeBg: "bg-teal-600", activeText: "text-white" },
    violet: { iconBg: "bg-violet-50", iconText: "text-violet-600", activeBg: "bg-violet-600", activeText: "text-white" },
    amber: { iconBg: "bg-amber-50", iconText: "text-amber-600", activeBg: "bg-amber-600", activeText: "text-white" },
    emerald: { iconBg: "bg-emerald-50", iconText: "text-emerald-600", activeBg: "bg-emerald-600", activeText: "text-white" },
    cyan: { iconBg: "bg-cyan-50", iconText: "text-cyan-600", activeBg: "bg-cyan-600", activeText: "text-white" },
    rose: { iconBg: "bg-rose-50", iconText: "text-rose-600", activeBg: "bg-rose-600", activeText: "text-white" },
    slate: { iconBg: "bg-slate-50", iconText: "text-slate-600", activeBg: "bg-slate-800", activeText: "text-white" },
};

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { market } = useMarketSafe();
    const { logout } = useAuth();

    // Calculate width logic
    const widthClass = collapsed ? "w-[80px]" : "w-[260px]";

    return (
        <aside
            className={clsx(
                "h-screen flex flex-col transition-all duration-500 ease-in-out relative border-r border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#0B1121] shadow-2xl shadow-slate-200/20 dark:shadow-black/20 z-50",
                widthClass
            )}
        >
            {/* Header */}
            <div className={clsx("relative flex items-center h-20 px-6", collapsed ? "justify-center px-0" : "justify-start")}>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:shadow-slate-900/40 transition-shadow duration-300">
                            <Zap className="w-5 h-5 text-white" fill="currentColor" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-[3px] border-white" />
                    </div>

                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                                Finance<span className="text-blue-600 dark:text-blue-500">Hub</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Pro Terminal
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Search - Compact Mode */}
            <div className={clsx("px-4 py-2 mb-2", collapsed && "px-3")}>
                <div className={clsx("transition-all duration-300", collapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100")}>
                    <GlobalSearch collapsed={collapsed} />
                </div>
                {collapsed && (
                    <button className="w-10 h-10 mx-auto rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <ScanLine className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
                {NAV_ITEMS.map((item) => {
                    const resolvedHref = (item as any).dynamicHref
                        ? (market === 'EGX' ? '/egx/COMI' : '/symbol/2222')
                        : item.href;

                    const isActive = pathname === resolvedHref ||
                        (pathname.length > 1 && pathname.startsWith(resolvedHref)); // Simpler match logic

                    // Fix root match
                    const isRoot = item.href === '/';
                    const reallyActive = isRoot ? pathname === '/' : isActive;

                    const colors = colorStyles[item.color] || colorStyles.slate;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.label}
                            href={resolvedHref}
                            className={clsx(
                                "group relative flex items-center py-3 rounded-xl font-medium text-[13px] transition-all duration-300 ease-out",
                                collapsed ? "justify-center px-0" : "px-4 gap-3.5",
                                reallyActive
                                    ? "bg-slate-50 dark:bg-white/10 text-slate-900 dark:text-white"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white hover:shadow-lg hover:shadow-slate-100/50 dark:hover:shadow-none"
                            )}
                        >
                            {/* Active Indicator Line */}
                            {reallyActive && (
                                <div className={clsx(
                                    "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-md bg-blue-600 transition-all duration-300",
                                    collapsed ? "w-1 h-8" : "w-1 h-8"
                                )} />
                            )}

                            {/* Icon Box */}
                            <div className={clsx(
                                "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-300",
                                reallyActive ? colors.activeBg : `bg-white dark:bg-[#151925] ${colors.iconText} dark:text-slate-400 group-hover:scale-110 shadow-sm shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-white/5`
                            )}>
                                <Icon className={clsx(
                                    "w-[18px] h-[18px] transition-colors",
                                    reallyActive ? "text-white" : "currentColor"
                                )} strokeWidth={2} />
                            </div>

                            {!collapsed && (
                                <span className={clsx(
                                    "font-semibold tracking-wide",
                                    reallyActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                                )}>
                                    {item.label}
                                </span>
                            )}

                            {/* Hover tooltip for collapsed state */}
                            {collapsed && (
                                <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                                    {item.label}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Control Panel */}
            <div className="p-4 border-t border-slate-100 dark:border-white/5">
                <div className={clsx(
                    "flex items-center gap-2",
                    collapsed ? "flex-col" : "justify-between"
                )}>
                    {/* Logout Button */}
                    <button
                        onClick={logout}
                        className={clsx(
                            "flex items-center justify-center rounded-xl transition-all duration-200 group relative",
                            collapsed ? "w-10 h-10 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400" : "flex-1 py-2.5 px-3 bg-slate-50 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 gap-2"
                        )}
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                        {!collapsed && <span className="text-xs font-bold">Sign Out</span>}
                    </button>

                    {/* Separator if expanded */}
                    {!collapsed && <div className="w-px h-8 bg-slate-200" />}

                    {/* Collapse Button */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={clsx(
                            "flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white",
                            collapsed ? "w-10 h-10" : "w-10 h-10"
                        )}
                        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </aside>
    );
}

