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
        <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Settings</h2>
                    <nav className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group
                                        ${isActive
                                            ? "text-blue-600 bg-blue-50/50"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabBg"
                                            className="absolute inset-0 bg-blue-50/50 rounded-xl"
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <Icon className={`w-4 h-4 relative z-10 ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
                                    <span className="relative z-10">{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:p-8 min-h-full"
                >
                    {children}
                </motion.div>
            </div>
        </div>
    );
}
