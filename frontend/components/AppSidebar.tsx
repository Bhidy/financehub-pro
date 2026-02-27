"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
    LayoutDashboard,
    ScanLine,
    Database,
    DollarSign,
    Building2,
    Newspaper,
    Zap,
    Settings,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    Briefcase,
    Shield,
    SunMedium,
    MoonStar,
    type LucideIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { useMarketSafe } from "@/contexts/MarketContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import GlobalSearch from "@/components/GlobalSearchWidget";

interface AppSidebarProps {
    defaultCollapsed?: boolean;
}

const SIDEBAR_PREF_KEY = "fh_sidebar_collapsed";

interface NavItem {
    label: string;
    icon: LucideIcon;
    href: string;
    color: string;
    dynamicHref?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { label: "Market Overview", icon: LayoutDashboard, href: "/dashboard", color: "blue" },
    { label: "Market News", icon: Newspaper, href: "/news", color: "indigo" },
    { label: "Company Profile", icon: Building2, href: "/symbol/2222", dynamicHref: true, color: "amber" },
    { label: "My Portfolio", icon: Briefcase, href: "/portfolio", color: "indigo" },
    { label: "EGX Watchlist", icon: Zap, href: "/egx-watchlist", color: "rose" },
    { label: "Mutual Funds", icon: DollarSign, href: "/funds", color: "emerald" },
    { label: "Command Center", icon: Database, href: "/command-center", color: "slate" },
    { label: "Settings", icon: Settings, href: "/settings", color: "slate" },
];

const colorStyles: Record<string, { iconBg: string; iconText: string; activeBg: string; activeText: string }> = {
    blue: { iconBg: "bg-blue-50", iconText: "text-[#3B82F6]", activeBg: "bg-[#3B82F6]", activeText: "text-white" },
    indigo: { iconBg: "bg-blue-50", iconText: "text-[#3B82F6]", activeBg: "bg-[#3B82F6]", activeText: "text-white" },
    teal: { iconBg: "bg-teal-50", iconText: "text-[#14B8A6]", activeBg: "bg-[#14B8A6]", activeText: "text-white" },
    violet: { iconBg: "bg-teal-50", iconText: "text-[#14B8A6]", activeBg: "bg-[#14B8A6]", activeText: "text-white" },
    amber: { iconBg: "bg-amber-50", iconText: "text-[#F59E0B]", activeBg: "bg-[#F59E0B]", activeText: "text-white" },
    emerald: { iconBg: "bg-emerald-50", iconText: "text-[#10B981]", activeBg: "bg-[#10B981]", activeText: "text-white" },
    cyan: { iconBg: "bg-cyan-50", iconText: "text-cyan-600", activeBg: "bg-cyan-600", activeText: "text-white" },
    rose: { iconBg: "bg-rose-50", iconText: "text-[#EF4444]", activeBg: "bg-[#EF4444]", activeText: "text-white" },
    slate: { iconBg: "bg-slate-50", iconText: "text-slate-600", activeBg: "bg-[#0F172A]", activeText: "text-white" },
};

interface SidebarTooltipState {
    label: string;
    top: number;
    left: number;
    visible: boolean;
}

const INITIAL_TOOLTIP_STATE: SidebarTooltipState = {
    label: "",
    top: 0,
    left: 0,
    visible: false,
};

export default function Sidebar({ defaultCollapsed = false }: AppSidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === "undefined") return defaultCollapsed;
        const saved = window.localStorage.getItem(SIDEBAR_PREF_KEY);
        if (saved === null) {
            window.localStorage.setItem(SIDEBAR_PREF_KEY, defaultCollapsed ? "1" : "0");
            return defaultCollapsed;
        }
        return saved === "1";
    });
    const [tooltip, setTooltip] = useState<SidebarTooltipState>(INITIAL_TOOLTIP_STATE);
    const { market } = useMarketSafe();
    const { logout, user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            if (!next) {
                setTooltip((current) => (current.visible ? { ...current, visible: false } : current));
            }
            if (typeof window !== "undefined") {
                window.localStorage.setItem(SIDEBAR_PREF_KEY, next ? "1" : "0");
            }
            return next;
        });
    };

    // Calculate width logic
    const widthClass = collapsed ? "w-[80px]" : "w-[260px]";

    const hideTooltip = () => {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };

    const showTooltip = (label: string, target: HTMLElement) => {
        if (!collapsed) return;
        const rect = target.getBoundingClientRect();

        setTooltip({
            label,
            top: rect.top + rect.height / 2,
            left: rect.right + 14,
            visible: true,
        });
    };

    // Inject Analytics item conditionally before Settings
    const dynamicNavItems = [...NAV_ITEMS];
    if (user?.role === 'admin') {
        // Insert Analytics right before "Settings" which is the last item
        const adminItem = { label: "Analytics", icon: Shield, href: "/admin/analytics", color: "emerald" };
        dynamicNavItems.splice(dynamicNavItems.length - 1, 0, adminItem);
    }

    useEffect(() => {
        if (!collapsed || typeof window === "undefined") return;

        const dismissTooltip = () => {
            setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        };

        window.addEventListener("resize", dismissTooltip);
        window.addEventListener("scroll", dismissTooltip, true);

        return () => {
            window.removeEventListener("resize", dismissTooltip);
            window.removeEventListener("scroll", dismissTooltip, true);
        };
    }, [collapsed]);

    return (
        <aside
            className={clsx(
                "finhub-sidebar finhub-glass h-[100dvh] flex flex-col transition-all duration-500 ease-in-out relative border-r border-slate-200/60 dark:border-white/[0.08] bg-white dark:bg-[#0B1121] shadow-xl shadow-slate-200/20 dark:shadow-black/20 z-50",
                widthClass
            )}
        >
            {/* Header */}
            <div className={clsx("relative flex items-center h-20 px-6", collapsed ? "justify-center px-0" : "justify-start")}>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#14B8A6] flex items-center justify-center shadow-lg shadow-[#14B8A6]/20 group-hover:shadow-[#14B8A6]/40 transition-shadow duration-300">
                            <Zap className="w-5 h-5 text-white" fill="currentColor" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#14B8A6] rounded-full border-[3px] border-white" />
                    </div>

                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                                Starta
                            </span>
                            <span className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-widest mt-1">
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
            <nav
                className="flex-1 overflow-y-auto px-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10"
                data-lenis-prevent="true"
                onScroll={hideTooltip}
            >
                {dynamicNavItems.map((item) => {
                    const resolvedHref = item.dynamicHref
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
                            aria-label={collapsed ? item.label : undefined}
                            aria-current={reallyActive ? "page" : undefined}
                            title={collapsed ? item.label : undefined}
                            onMouseEnter={(event) => showTooltip(item.label, event.currentTarget)}
                            onMouseMove={(event) => showTooltip(item.label, event.currentTarget)}
                            onMouseLeave={hideTooltip}
                            onFocus={(event) => showTooltip(item.label, event.currentTarget)}
                            onBlur={hideTooltip}
                        >
                            {/* Active Indicator Line */}
                            {reallyActive && (
                                <div className={clsx(
                                    "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-md bg-[#14B8A6] transition-all duration-300",
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
                        </Link>
                    );
                })}
            </nav>

            {/* Fixed tooltip layer avoids clipping inside scrollable nav */}
            {collapsed && tooltip.label && (
                <div
                    className={clsx(
                        "pointer-events-none fixed -translate-y-1/2 z-[120] transition-all duration-200 ease-out",
                        tooltip.visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"
                    )}
                    style={{ top: tooltip.top, left: tooltip.left }}
                    role="tooltip"
                    aria-hidden={!tooltip.visible}
                >
                    <div className="relative">
                        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-700 shadow-[0_14px_34px_-18px_rgba(15,23,42,0.45)] ring-1 ring-white/70 backdrop-blur-xl dark:border-cyan-300/20 dark:bg-[#071427]/95 dark:text-slate-100 dark:shadow-[0_18px_42px_-20px_rgba(6,182,212,0.48)] dark:ring-cyan-300/10">
                            <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-500/10 dark:from-cyan-300/10 dark:to-blue-300/10" />
                            <span className="relative whitespace-nowrap">{tooltip.label}</span>
                        </div>
                        <span className="absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-slate-200/80 bg-white/95 dark:border-cyan-300/20 dark:bg-[#071427]/95" />
                    </div>
                </div>
            )}

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
                    {!collapsed && <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />}

                    {/* Theme Button */}
                    <button
                        onClick={toggleTheme}
                        className={clsx(
                            "flex items-center justify-center rounded-xl transition-all duration-200",
                            "text-slate-400 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-cyan-200",
                            "hover:bg-slate-100 dark:hover:bg-cyan-500/10",
                            "border border-transparent hover:border-slate-200 dark:hover:border-cyan-400/20",
                            collapsed ? "w-10 h-10" : "w-10 h-10"
                        )}
                        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {theme === "dark" ? <SunMedium className="w-5 h-5" /> : <MoonStar className="w-5 h-5" />}
                    </button>

                    {/* Separator if expanded */}
                    {!collapsed && <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />}

                    {/* Collapse Button */}
                    <button
                        onClick={toggleCollapsed}
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
