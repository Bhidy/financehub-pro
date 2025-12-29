"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
    LayoutDashboard,
    ScanLine,
    Briefcase,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    BarChart3,
    BrainCircuit,
    Bell,
    Grid3x3,
    Database,
    DollarSign,
    Building2,
    Users,
    Star,
    Activity,
    Globe,
    Zap,
    List,
    Newspaper
} from "lucide-react";
import { useState } from "react";

const NAV_SECTIONS = [
    {
        title: "System",
        color: "orange",
        items: [
            { label: "Command Center", icon: Database, href: "/command-center", badge: "LIVE", badgeColor: "green" },
        ]
    },
    {
        title: "Market Data",
        color: "blue",
        items: [
            { label: "Market Overview", icon: LayoutDashboard, href: "/" },
            { label: "Market News", icon: Newspaper, href: "/news", badge: "LIVE", badgeColor: "red" },
            { label: "Deep Screener", icon: ScanLine, href: "/screener" },
            // HIDDEN: Data Explorer - can be re-enabled later
            // { label: "Data Explorer", icon: Database, href: "/data-explorer", badge: "NEW", badgeColor: "blue" },
        ]
    },
    {
        title: "Analysis Tools",
        color: "teal",
        items: [
            // HIDDEN: Multi-Chart Grid - can be re-enabled later
            // { label: "Multi-Chart Grid", icon: Grid3x3, href: "/charts" },
            // HIDDEN: Market Intelligence - merged into Market Overview page
            // { label: "Market Intelligence", icon: TrendingUp, href: "/markets" },
            { label: "AI Analyst", icon: BrainCircuit, href: "/ai-analyst", badge: "BETA", badgeColor: "blue" },
            // HIDDEN: Market Pulse - can be re-enabled later
            // { label: "Market Pulse", icon: Activity, href: "/market-pulse" },
            // HIDDEN: Intraday Desk - can be re-enabled later
            // { label: "Intraday Desk", icon: BarChart3, href: "/intraday" },
        ]
    },
    {
        title: "Investment Research",
        color: "green",
        items: [
            { label: "Company Profile", icon: Building2, href: "/symbol/2222", badge: "NEW", badgeColor: "green" },
            { label: "Mutual Funds", icon: DollarSign, href: "/funds" },
            { label: "Shareholders", icon: Users, href: "/shareholders" },
            // HIDDEN: Earnings Calendar - can be re-enabled later
            // { label: "Earnings Calendar", icon: TrendingUp, href: "/earnings" },
            { label: "Analyst Ratings", icon: Star, href: "/analyst-ratings" },
            // HIDDEN: Insider Trading - can be re-enabled later
            // { label: "Insider Trading", icon: Users, href: "/insider-trading" },
            { label: "Corporate Actions", icon: Building2, href: "/corporate-actions" },
        ]
    },
    {
        title: "Macro & Global",
        color: "amber",
        items: [
            // HIDDEN: Economics Center - can be re-enabled later
            // { label: "Economics Center", icon: Globe, href: "/economics" },
        ]
    },
    {
        title: "Trading",
        color: "orange",
        items: [
            { label: "Portfolio", icon: Briefcase, href: "/portfolio" },
            { label: "Watchlists", icon: List, href: "/watchlist", badge: "NEW", badgeColor: "orange" },
            { label: "Strategy Builder", icon: BrainCircuit, href: "/strategy" },
        ]
    },
];

const colorMap: Record<string, { bg: string; text: string; activeBg: string; activeText: string; hoverBg: string }> = {
    blue: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        activeBg: "bg-blue-500",
        activeText: "text-white",
        hoverBg: "hover:bg-blue-50"
    },
    green: {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        activeBg: "bg-emerald-500",
        activeText: "text-white",
        hoverBg: "hover:bg-emerald-50"
    },
    teal: {
        bg: "bg-teal-50",
        text: "text-teal-600",
        activeBg: "bg-teal-500",
        activeText: "text-white",
        hoverBg: "hover:bg-teal-50"
    },
    orange: {
        bg: "bg-orange-50",
        text: "text-orange-600",
        activeBg: "bg-orange-500",
        activeText: "text-white",
        hoverBg: "hover:bg-orange-50"
    },
    amber: {
        bg: "bg-amber-50",
        text: "text-amber-600",
        activeBg: "bg-amber-500",
        activeText: "text-white",
        hoverBg: "hover:bg-amber-50"
    },
    red: {
        bg: "bg-red-50",
        text: "text-red-600",
        activeBg: "bg-red-500",
        activeText: "text-white",
        hoverBg: "hover:bg-red-50"
    }
};

const badgeColorMap: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    orange: "bg-orange-100 text-orange-700",
    red: "bg-red-100 text-red-700",
};

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={clsx(
                "h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 shadow-sm",
                collapsed ? "w-20" : "w-64"
            )}
        >
            {/* Logo Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-black tracking-tight">
                                <span className="text-slate-800">Finance</span>
                                <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Hub</span>
                            </span>
                            <span className="text-[10px] font-bold text-orange-500 ml-1">PRO</span>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
                {NAV_SECTIONS.map((section) => {
                    const colors = colorMap[section.color] || colorMap.blue;

                    return (
                        <div key={section.title} className="mb-6">
                            {!collapsed && (
                                <div className={clsx(
                                    "text-[10px] font-bold uppercase tracking-widest mb-2 px-3",
                                    colors.text
                                )}>
                                    {section.title}
                                </div>
                            )}
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={clsx(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group",
                                                isActive
                                                    ? `${colors.activeBg} ${colors.activeText} shadow-md`
                                                    : `text-slate-600 ${colors.hoverBg}`
                                            )}
                                        >
                                            <Icon
                                                className={clsx(
                                                    "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                                                    isActive ? "" : colors.text
                                                )}
                                            />
                                            {!collapsed && (
                                                <>
                                                    <span className="flex-1 truncate">{item.label}</span>
                                                    {item.badge && (
                                                        <span className={clsx(
                                                            "px-2 py-0.5 text-[10px] font-bold rounded-full",
                                                            isActive
                                                                ? "bg-white/20 text-white"
                                                                : badgeColorMap[item.badgeColor || "blue"]
                                                        )}>
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Collapse Button */}
            <div className="p-3 border-t border-slate-100">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all duration-200 text-sm font-medium"
                >
                    {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    {!collapsed && <span>Collapse</span>}
                </button>
            </div>

            {/* Status Footer */}
            {!collapsed && (
                <div className="p-4 border-t border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                        <span className="text-xs font-bold text-emerald-700">All Systems Online</span>
                    </div>
                    <div className="mt-1 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-mono">v1.0.14 (Enterprise)</span>
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
