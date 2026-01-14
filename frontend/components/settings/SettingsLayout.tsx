"use client";

import { motion } from "framer-motion";
import { User, LogOut, Settings, Bell, Palette, Shield, Globe } from "lucide-react";

interface SettingsLayoutProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    isAdmin: boolean;
    children: React.ReactNode;
}

export default function SettingsLayout({ activeTab, onTabChange, isAdmin, children }: SettingsLayoutProps) {
    const tabs = [
        { id: "general", label: "General", icon: Globe },
        { id: "profile", label: "Profile", icon: User },
        { id: "appearance", label: "Appearance", icon: Palette },
        { id: "notifications", label: "Notifications", icon: Bell },
    ];

    if (isAdmin) {
        tabs.push({ id: "users", label: "User Management", icon: Shield });
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Horizontal Premium Tabs */}
            <div className="bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl border-b border-white/20 dark:border-white/5 sticky top-0 z-30 pt-2 px-2">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-0">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap outline-none
                                    ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}
                                `}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`} />
                                <span className="relative z-10">{tab.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabUnderline"
                                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-500 rounded-t-full"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area - Full Width */}
            <div className="w-full">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="bg-white dark:bg-[#1A1F2E] rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none p-6 lg:p-8 min-h-[600px] w-full"
                >
                    {children}
                </motion.div>
            </div>
        </div>
    );
}
