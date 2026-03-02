/**
 * ============================================================================
 * ULTRA-PREMIUM SETTINGS PAGE - WORLD-CLASS FINTECH DESIGN
 * ============================================================================
 * 
 * Enterprise-grade settings experience with:
 * - Beautiful desktop two-column layout
 * - Premium card-based sections
 * - Smooth tab transitions
 * - Consistent teal branding
 * 
 * ============================================================================
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
    ArrowLeft, Loader2, User as UserIcon, Phone, Lock, Check, AlertCircle,
    Sun, Moon, Mail, LogOut, Camera, Globe, Shield, Palette, Sparkles,
    TrendingUp, Settings, ChevronRight, Bell, CreditCard, HelpCircle, Users, Zap, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { updateProfile, changePassword, createCustomerPortalSession, createCheckoutSession, fetchNotificationPreferences, updateNotificationPreferences } from "@/lib/api";
import type { NotificationPreferences } from "@/lib/api";
import { useMobileRoutes } from "@/components/chatbot/hooks/useMobileRoutes";
import Link from "next/link";
import Image from "next/image";

type Tab = 'personal' | 'billing' | 'security' | 'app' | 'notifications';

export default function MobileSettingsPage() {
    const router = useRouter();
    const { user, logout, isAuthenticated, isLoading, updateUser } = useAuth();
    const { getRoute } = useMobileRoutes();
    const [activeTab, setActiveTab] = useState<Tab>('personal');

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push(getRoute('login'));
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen w-full bg-white dark:bg-[#0A0F1C] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        );
    }

    // Desktop Layout (lg and above)
    return (
        <div className="min-h-screen w-full bg-[#F1F5F9] dark:bg-[#1A222C] text-slate-900 dark:text-white font-sans transition-colors duration-300">

            {/* ================================================================
                DESKTOP LAYOUT - Two Column with Sidebar
                ================================================================ */}
            <div className="hidden lg:flex h-screen overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-[320px] bg-white dark:bg-[#24303F] border-r border-slate-200 dark:border-[#2E3A47] flex flex-col overflow-y-auto">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-200 dark:border-[#2E3A47]">
                        <div className="flex items-center gap-3 select-none cursor-default">
                            <div className="relative">

                                <div className="relative w-10 h-10 rounded-xl bg-[#14B8A6] flex items-center justify-center shadow-lg shadow-[#14B8A6]/20">
                                    <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Starta</span>
                        </div>
                    </div>

                    {/* Profile Card */}
                    <div className="p-6">
                        <DesktopProfileCard user={user} />
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4">
                        <div className="space-y-1">
                            {[
                                { id: 'personal' as Tab, label: 'Personal Details', icon: UserIcon },
                                { id: 'billing' as Tab, label: 'Subscription & Billing', icon: CreditCard },
                                { id: 'security' as Tab, label: 'Security', icon: Shield },
                                { id: 'app' as Tab, label: 'App Settings', icon: Settings },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200",
                                        activeTab === item.id
                                            ? "bg-[#F1F5F9] dark:bg-[#1A222C] text-[#14B8A6]"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1A222C]"
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                    {activeTab === item.id && (
                                        <ChevronRight className="w-4 h-4 ml-auto" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-slate-200 dark:bg-[#2E3A47] my-4" />

                        {/* Admin Area (if applicable) */}
                        {user?.role === 'admin' && (
                            <>
                                <div className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Area</div>
                                <div className="space-y-1 mb-4">
                                    <Link href="/admin/users" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all">
                                        <Users className="w-5 h-5" />
                                        <span className="font-medium">User Management</span>
                                    </Link>
                                </div>
                                <div className="h-px bg-slate-200 dark:bg-[#2E3A47] my-4" />
                            </>
                        )}

                        {/* Additional Links */}
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('notifications')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200",
                                    activeTab === 'notifications'
                                        ? "bg-[#F1F5F9] dark:bg-[#1A222C] text-[#14B8A6]"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1A222C]"
                                )}
                            >
                                <Bell className="w-5 h-5" />
                                <span className="font-medium">Notifications</span>
                                {activeTab === 'notifications' && (
                                    <ChevronRight className="w-4 h-4 ml-auto" />
                                )}
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1A222C] transition-all">
                                <HelpCircle className="w-5 h-5" />
                                <span className="font-medium">Help & Support</span>
                            </button>
                        </div>
                    </nav>

                    {/* Sign Out */}
                    <div className="p-4 border-t border-slate-200 dark:border-[#2E3A47]">
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-[#F1F5F9] dark:bg-[#1A222C] border-b border-slate-200 dark:border-[#2E3A47] px-8 py-5">
                        <div className="flex items-center justify-between max-w-3xl">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account preferences</p>
                            </div>
                            <Link
                                href="https://startamarkets.com/AiChat"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14B8A6]/10 text-[#14B8A6] hover:bg-[#14B8A6]/20 transition-colors font-medium text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Link>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-8 max-w-3xl">
                        <AnimatePresence mode="wait">
                            {activeTab === 'personal' && <DesktopPersonalTab key="personal" user={user} updateUser={updateUser} />}
                            {activeTab === 'billing' && <DesktopBillingTab key="billing" user={user} />}
                            {activeTab === 'security' && <DesktopSecurityTab key="security" logout={logout} />}
                            {activeTab === 'app' && <DesktopAppTab key="app" />}
                            {activeTab === 'notifications' && <DesktopNotificationsTab key="notifications" />}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ================================================================
                MOBILE LAYOUT
                ================================================================ */}
            <div className="lg:hidden h-[100dvh] flex flex-col overflow-hidden">
                {/* Header */}
                <header className="sticky top-0 z-30 px-5 py-4 flex items-center justify-between bg-[#F1F5F9] dark:bg-[#24303F] border-b border-slate-200 dark:border-[#2E3A47]">
                    <button
                        onClick={() => router.push('https://startamarkets.com/AiChat')}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h1>
                    <button
                        onClick={logout}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-500 transition-all active:scale-95"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto pb-20">
                    {/* Profile Header */}
                    <MobileProfileHeader user={user} />

                    {/* Tab Navigation */}
                    <div className="px-5 mt-6 mb-6">
                        <div className="p-1.5 bg-slate-100 dark:bg-white/5 rounded-xl flex relative">
                            <motion.div
                                className="absolute top-1.5 bottom-1.5 bg-white dark:bg-[#14B8A6] rounded-lg shadow-md"
                                layoutId="mobileTab"
                                initial={false}
                                animate={{
                                    left: activeTab === 'personal' ? '4px' : activeTab === 'billing' ? '20%' : activeTab === 'security' ? '40%' : activeTab === 'app' ? '60%' : '80%',
                                    width: 'calc(20% - 8px)',
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                            {(['personal', 'billing', 'security', 'app', 'notifications'] as Tab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={clsx(
                                        "flex-1 relative z-10 py-2.5 text-[10px] sm:text-xs font-semibold text-center transition-colors rounded-lg capitalize whitespace-nowrap px-0 sm:px-1",
                                        activeTab === tab
                                            ? "text-[#14B8A6] dark:text-white"
                                            : "text-slate-500"
                                    )}
                                >
                                    {tab === 'personal' ? 'Personal' : tab === 'billing' ? 'Billing' : tab === 'security' ? 'Security' : tab === 'app' ? 'App' : 'Alerts'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="px-5">
                        <AnimatePresence mode="wait">
                            {activeTab === 'personal' && <PersonalTab key="personal" user={user} updateUser={updateUser} />}
                            {activeTab === 'billing' && <BillingTab key="billing" user={user} />}
                            {activeTab === 'security' && <SecurityTab key="security" logout={logout} />}
                            {activeTab === 'app' && <AppTab key="app" />}
                            {activeTab === 'notifications' && <NotificationsTab key="notifications" />}
                        </AnimatePresence>

                        {/* Admin Mobile Links */}
                        {user?.role === 'admin' && (
                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 pb-2">
                                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1">Admin Area</h3>
                                <div className="space-y-2 flex flex-col">
                                    <Link href="/admin/users" className="w-full flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 active:scale-[0.98] transition-all">
                                        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                            <Users className="w-5 h-5" /> User Management
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-emerald-500" />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

// ============================================================================
// DESKTOP COMPONENTS
// ============================================================================

function DesktopProfileCard({ user }: { user: any }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('user_avatar_url');
        if (saved) setAvatarUrl(saved);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setAvatarUrl(result);
                localStorage.setItem('user_avatar_url', result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="p-5 bg-[#F1F5F9] dark:bg-[#1A222C] rounded-md border border-slate-200 dark:border-[#2E3A47]">
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 rounded-xl bg-[#14B8A6] p-0.5 shadow-lg shadow-[#14B8A6]/20">
                        <div className="w-full h-full rounded-[10px] bg-white dark:bg-slate-900 overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#14B8A6] text-xl font-bold text-white">
                                    {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">{user?.full_name || 'User'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                            <Check className="w-3 h-3" /> Verified
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#14B8A6]/10 text-[#14B8A6] rounded-full">
                            <Sparkles className="w-3 h-3" /> Beta
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DesktopPersonalTab({ user, updateUser }: { user: any, updateUser: (data: any) => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [formData, setFormData] = useState({
        full_name: user?.full_name || "",
        phone: user?.phone || "",
    });
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            await updateProfile(formData);
            updateUser(formData);
            setSuccessMsg("Profile updated successfully");
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
        >
            <div className="premium-glass rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Personal Details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Manage your identity information.</p>

                <form onSubmit={handleUpdate} className="space-y-5">
                    <DesktopInput
                        icon={UserIcon}
                        label="Full Name"
                        value={formData.full_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Enter your full name"
                    />
                    <DesktopInput
                        icon={Phone}
                        label="Phone Number"
                        value={formData.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 234 567 8900"
                        type="tel"
                    />
                    <DesktopInput
                        icon={Mail}
                        label="Email Address"
                        value={user?.email || ""}
                        disabled
                        readOnly
                    />

                    <StatusMessages success={successMsg} error={errorMsg} />

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-3 bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white rounded-md font-semibold text-sm shadow-lg shadow-[#14B8A6]/20 flex items-center gap-2 hover:shadow-xl hover:shadow-[#14B8A6]/30 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

        </motion.div>
    );
}

function DesktopSecurityTab({ logout }: { logout: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [passData, setPassData] = useState({ old_password: "", new_password: "" });

    const handleChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            await changePassword(passData);
            setSuccessMsg("Password changed successfully");
            setPassData({ old_password: "", new_password: "" });
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Failed to change password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
        >
            <div className="premium-glass rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Change Password</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Keep your account secure with a strong password.</p>

                <form onSubmit={handleChange} className="space-y-5">
                    <DesktopInput
                        icon={Lock}
                        label="Current Password"
                        value={passData.old_password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassData({ ...passData, old_password: e.target.value })}
                        placeholder="••••••••"
                        type="password"
                    />
                    <DesktopInput
                        icon={Shield}
                        label="New Password"
                        value={passData.new_password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassData({ ...passData, new_password: e.target.value })}
                        placeholder="Min 6 characters"
                        type="password"
                    />

                    <StatusMessages success={successMsg} error={errorMsg} />

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-3 bg-[#14B8A6] hover:bg-[#14B8A6]/90 text-white border-transparent rounded-md font-semibold text-sm shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Sign Out Section */}
            <div className="bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 p-6 shadow-sm">
                <button
                    onClick={logout}
                    className="w-full px-6 py-4 bg-white dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm border border-red-200 dark:border-red-500/20 flex items-center justify-center gap-2.5 hover:bg-red-50 dark:hover:bg-red-500/20 active:scale-[0.98] transition-all shadow-sm hover:shadow-red-500/10"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </motion.div>
    );
}

function DesktopAppTab() {
    const { theme, setTheme } = useTheme();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
        >
            {/* Appearance */}
            <div className="premium-glass rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#14B8A6] flex items-center justify-center">
                        <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Appearance</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Choose your preferred theme</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setTheme('light')}
                        className={clsx(
                            "relative group p-6 rounded-2xl border text-left transition-all overflow-hidden",
                            theme === 'light'
                                ? "bg-[#F1F5F9] dark:bg-[#1A222C] border-[#14B8A6] ring-1 ring-[#14B8A6]"
                                : "bg-[#F1F5F9] dark:bg-[#1A222C] border-slate-200 dark:border-[#2E3A47] hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                    >
                        <div className={clsx(
                            "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all",
                            theme === 'light' ? "bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg shadow-orange-400/30" : "bg-slate-200 dark:bg-white/10"
                        )}>
                            <Sun className={clsx("w-7 h-7", theme === 'light' ? "text-white" : "text-slate-400")} />
                        </div>
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">Light Mode</span>
                        <span className="block text-xs text-slate-500 mt-1">Bright & vibrant</span>
                        {theme === 'light' && (
                            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#14B8A6] flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </button>

                    <button
                        onClick={() => setTheme('dark')}
                        className={clsx(
                            "relative group p-6 rounded-2xl border text-left transition-all overflow-hidden",
                            theme === 'dark'
                                ? "bg-[#F1F5F9] dark:bg-[#1A222C] border-[#14B8A6] ring-1 ring-[#14B8A6]"
                                : "bg-[#F1F5F9] dark:bg-[#1A222C] border-slate-200 dark:border-[#2E3A47] hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                    >
                        <div className={clsx(
                            "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all",
                            theme === 'dark' ? "bg-gradient-to-br from-[#0D9488] to-[#14B8A6] shadow-lg shadow-[#14B8A6]/30" : "bg-slate-200 dark:bg-white/10"
                        )}>
                            <Moon className={clsx("w-7 h-7", theme === 'dark' ? "text-white" : "text-slate-400")} />
                        </div>
                        <span className={clsx("block text-sm font-bold", theme === 'dark' ? "text-white" : "text-slate-900 dark:text-white")}>Dark Mode</span>
                        <span className={clsx("block text-xs mt-1", theme === 'dark' ? "text-slate-400" : "text-slate-500")}>Easy on the eyes</span>
                        {theme === 'dark' && (
                            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#14B8A6] flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Language */}
            <div className="premium-glass rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D9488] to-[#14B8A6] flex items-center justify-center">
                        <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Language</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Choose your preferred language</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🇺🇸</span>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">English</div>
                                <div className="text-xs text-slate-500">Default</div>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#14B8A6] flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 opacity-50">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🇸🇦</span>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">Arabic</div>
                                <div className="text-xs text-slate-500">Coming Soon</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function DesktopInput({ icon: Icon, label, value, onChange, placeholder, type = "text", disabled, readOnly }: any) {
    const [focused, setFocused] = useState(false);

    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
            <div className={clsx(
                "relative rounded-xl transition-all duration-300",
                focused && !disabled && "ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10"
            )}>
                <Icon className={clsx(
                    "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                    focused ? "text-[#14B8A6]" : "text-slate-400"
                )} />
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={disabled}
                    readOnly={readOnly}
                    className="w-full pl-12 pr-4 py-3 bg-[#F1F5F9] dark:bg-[#1A222C] border border-slate-200 dark:border-[#2E3A47] rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] transition-all text-sm disabled:opacity-50"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}

// ============================================================================
// MOBILE COMPONENTS
// ============================================================================

function MobileProfileHeader({ user }: { user: any }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('user_avatar_url');
        if (saved) setAvatarUrl(saved);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setAvatarUrl(result);
                localStorage.setItem('user_avatar_url', result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="px-5 pt-4 flex flex-col items-center text-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full p-1 bg-[#14B8A6] shadow-lg shadow-[#14B8A6]/20">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#14B8A6] text-2xl font-bold text-white">
                                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#14B8A6] rounded-full flex items-center justify-center border-4 border-slate-50 dark:border-[#0A0F1C]">
                    <Camera className="w-4 h-4 text-white" />
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <div className="mt-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.full_name || 'User'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>

            <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                    <Check className="w-3 h-3" /> Verified
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#14B8A6]/10 text-[#14B8A6] rounded-full">
                    <Sparkles className="w-3 h-3" /> Beta
                </span>
            </div>
        </div>
    );
}

function PersonalTab({ user, updateUser }: { user: any, updateUser: (data: any) => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [formData, setFormData] = useState({
        full_name: user?.full_name || "",
        phone: user?.phone || "",
    });
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            await updateProfile(formData);
            updateUser(formData);
            setSuccessMsg("Profile updated successfully");
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Personal Details</h3>
            <p className="text-xs text-slate-500 mb-5">Manage your identity information.</p>

            <form onSubmit={handleUpdate} className="space-y-4">
                <MobileInput icon={UserIcon} label="Full Name" value={formData.full_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Enter name" />
                <MobileInput icon={Phone} label="Phone" value={formData.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 234 567" type="tel" />
                <MobileInput icon={Mail} label="Email" value={user?.email || ""} disabled readOnly />
                <StatusMessages success={successMsg} error={errorMsg} />
                <button type="submit" disabled={isLoading} className="w-full py-4 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#14B8A6]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                </button>
            </form>
        </motion.div>
    );
}

function SecurityTab({ logout }: { logout: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [passData, setPassData] = useState({ old_password: "", new_password: "" });

    const handleChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            await changePassword(passData);
            setSuccessMsg("Password changed");
            setPassData({ old_password: "", new_password: "" });
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Security</h3>
            <p className="text-xs text-slate-500 mb-5">Protect your account.</p>

            <form onSubmit={handleChange} className="space-y-4">
                <MobileInput icon={Lock} label="Current Password" value={passData.old_password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassData({ ...passData, old_password: e.target.value })} placeholder="••••••••" type="password" />
                <MobileInput icon={Shield} label="New Password" value={passData.new_password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassData({ ...passData, new_password: e.target.value })} placeholder="Min 6 chars" type="password" />
                <StatusMessages success={successMsg} error={errorMsg} />
                <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5">
                <button onClick={logout} className="w-full py-4 bg-red-50 dark:bg-red-500/10 text-red-500 font-bold text-sm rounded-xl border border-red-200 dark:border-red-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>
        </motion.div>
    );
}

function AppTab() {
    const { theme, setTheme } = useTheme();

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Palette className="w-5 h-5 text-[#14B8A6]" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Appearance</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setTheme('light')} className={clsx("p-4 rounded-xl border text-left transition-all", theme === 'light' ? "bg-white border-[#14B8A6] ring-2 ring-[#14B8A6]/20" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5")}>
                        <Sun className={clsx("w-6 h-6 mb-2", theme === 'light' ? "text-orange-400" : "text-slate-400")} />
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">Light</span>
                    </button>
                    <button onClick={() => setTheme('dark')} className={clsx("p-4 rounded-xl border text-left transition-all", theme === 'dark' ? "bg-slate-900 border-[#14B8A6] ring-2 ring-[#14B8A6]/20" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5")}>
                        <Moon className={clsx("w-6 h-6 mb-2", theme === 'dark' ? "text-[#14B8A6]" : "text-slate-400")} />
                        <span className={clsx("block text-sm font-bold", theme === 'dark' ? "text-white" : "text-slate-900 dark:text-white")}>Dark</span>
                    </button>
                </div>
            </div>

            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-[#14B8A6]" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Language</h3>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🇺🇸</span>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">English</div>
                                <div className="text-xs text-slate-500">Default</div>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#14B8A6] flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 opacity-50">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🇸🇦</span>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">Arabic</div>
                                <div className="text-xs text-slate-500">Coming Soon</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function MobileInput({ icon: Icon, label, value, onChange, placeholder, type = "text", disabled, readOnly }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type={type} value={value} onChange={onChange} disabled={disabled} readOnly={readOnly} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all text-sm disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-500" placeholder={placeholder} />
            </div>
        </div>
    );
}

function StatusMessages({ success, error }: { success: string, error: string }) {
    if (!success && !error) return null;
    return (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
            {success && (
                <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400 rounded-xl text-sm font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" /> {success}
                </div>
            )}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}
        </motion.div>
    );
}

// ============================================================================
// BILLING COMPONENTS
// ============================================================================

function DesktopBillingTab({ user }: { user: any }) {
    const [isBillingLoading, setIsBillingLoading] = useState(false);
    const [billingError, setBillingError] = useState("");

    const isAnalyst = user?.subscription_plan === 'analyst' || user?.subscription_status === 'active';

    const handleManageBilling = async () => {
        setIsBillingLoading(true);
        setBillingError("");
        try {
            if (isAnalyst) {
                const { url } = await createCustomerPortalSession();
                if (url) window.location.href = url;
            } else {
                const { url } = await createCheckoutSession('price_1T66bq2UXuH5fA2IQIuSelxJ'); // Analyst Package Monthly
                if (url) window.location.href = url;
            }
        } catch (error) {
            console.error("Billing error:", error);
            setBillingError("Failed to connect to billing portal. Please try again later.");
        } finally {
            setIsBillingLoading(false);
        }
    };

    const features = [
        { title: "Advanced AI Chat", desc: "Unlimited queries", icon: Sparkles },
        { title: "Real-Time Market Data", desc: "Live prices for EGX & MENA", icon: TrendingUp },
        { title: "Premium Insights", desc: "Undervalued stock scanner", icon: Zap },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
            <div className="flex flex-col gap-6">
                <div className="bg-white dark:bg-[#1A222C] rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-[#2E3A47] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-[#14B8A6]/10 to-transparent pointer-events-none" />

                    <div className="flex justify-between items-start mb-6 relative">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Current Plan</p>
                            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                                {isAnalyst ? "The Analyst" : "Free Tier"}
                                {isAnalyst && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-[#14B8A6]/10 text-[#14B8A6] rounded-full uppercase tracking-wider">
                                        <Check className="w-3.5 h-3.5" /> Active
                                    </span>
                                )}
                            </h2>
                        </div>
                    </div>

                    <div className="mb-8 relative">
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
                            {isAnalyst
                                ? "You have full access to all premium features, real-time Egyptian and MENA market data, and advanced AI stock analysis."
                                : "You are currently on the free tier. Upgrade to unlock all premium features and live data."}
                        </p>
                    </div>

                    <button
                        onClick={handleManageBilling}
                        disabled={isBillingLoading}
                        className={clsx(
                            "w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 relative",
                            isAnalyst
                                ? "bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-white border border-slate-200 dark:border-[#2E3A47] hover:bg-slate-200 dark:hover:bg-black"
                                : "bg-gradient-to-r from-[#14B8A6] to-[#0D9488] hover:from-[#0D9488] hover:to-[#0F766E] text-white shadow-lg shadow-[#14B8A6]/20"
                        )}
                    >
                        {isBillingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        {isAnalyst ? "Manage Billing & Invoices" : "Upgrade to The Analyst"}
                        {!isAnalyst && !isBillingLoading && <ArrowRight className="w-5 h-5" />}
                    </button>

                    {billingError && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2 relative">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {billingError}
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 dark:bg-[#1A222C] rounded-2xl p-6 border border-slate-200 dark:border-[#2E3A47] flex items-center justify-between shadow-sm">
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Payment Security</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">All transactions are securely processed by Stripe.</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-[#24303F] flex items-center justify-center shadow-sm border border-slate-100 dark:border-transparent">
                        <Shield className="w-6 h-6 text-[#14B8A6]" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1A222C] rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-[#2E3A47] flex flex-col justify-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8">
                    {isAnalyst ? "Your Premium Benefits" : "Unlock The Analyst"}
                </h3>

                <div className="space-y-6">
                    {features.map((item, idx) => (
                        <div key={idx} className="flex gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-50 dark:bg-[#0F172A] flex items-center justify-center border border-slate-100 dark:border-[#2E3A47] shadow-inner">
                                <item.icon className="w-6 h-6 text-[#14B8A6]" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-1.5">{item.title}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

function BillingTab({ user }: { user: any }) {
    const [isBillingLoading, setIsBillingLoading] = useState(false);
    const [billingError, setBillingError] = useState("");

    const isAnalyst = user?.subscription_plan === 'analyst' || user?.subscription_status === 'active';

    const handleManageBilling = async () => {
        setIsBillingLoading(true);
        setBillingError("");
        try {
            if (isAnalyst) {
                const { url } = await createCustomerPortalSession();
                if (url) window.location.href = url;
            } else {
                const { url } = await createCheckoutSession('price_1T66bq2UXuH5fA2IQIuSelxJ'); // Analyst Package Monthly
                if (url) window.location.href = url;
            }
        } catch (error) {
            console.error("Billing error:", error);
            setBillingError("Failed to connect to billing. Please try again.");
        } finally {
            setIsBillingLoading(false);
        }
    };

    const features = [
        { title: "Advanced AI Chat", desc: "Unlimited queries", icon: Sparkles },
        { title: "Real-Time Market Data", desc: "Live prices for EGX & MENA", icon: TrendingUp },
        { title: "Premium Insights", desc: "Undervalued stock scanner", icon: Zap },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="bg-[#1A222C] rounded-3xl p-6 border border-[#2E3A47] relative overflow-hidden mt-2 shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#14B8A6] rounded-full blur-[60px] opacity-10" />

                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Your Plan</p>
                <h2 className="text-3xl font-extrabold text-white flex items-center gap-2 mb-4 relative z-10">
                    {isAnalyst ? "The Analyst" : "Free"}
                    {isAnalyst && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-[#14B8A6]/20 text-[#2DD4BF] rounded-full uppercase tracking-wider border border-[#14B8A6]/30">
                            <Check className="w-3 h-3" /> Active
                        </span>
                    )}
                </h2>

                <div className="mb-6 relative z-10">
                    <p className="text-sm text-slate-300 leading-relaxed">
                        {isAnalyst ? "Full access to premium features, real-time data, and advanced AI analysis." : "You are currently on the free tier. Upgrade to unlock all premium features."}
                    </p>
                </div>

                <button
                    onClick={handleManageBilling}
                    disabled={isBillingLoading}
                    className={clsx(
                        "w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 relative z-10",
                        isAnalyst
                            ? "bg-white/10 text-white hover:bg-white/20 border border-white/10 backdrop-blur-sm"
                            : "bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white shadow-lg shadow-[#14B8A6]/30"
                    )}
                >
                    {isBillingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {isAnalyst ? "Manage Billing" : "Upgrade to Pro"}
                    {!isAnalyst && !isBillingLoading && <ArrowRight className="w-4 h-4" />}
                </button>
            </div>

            {billingError && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {billingError}
                </div>
            )}

            <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pl-1">
                    {isAnalyst ? "Pro Benefits" : "Unlock with Pro"}
                </h3>
                <div className="space-y-3">
                    {features.map((item, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-[#24303F] border border-slate-200 dark:border-[#2E3A47] shadow-sm">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#F1F5F9] dark:bg-[#1A222C] flex items-center justify-center">
                                <item.icon className="w-5 h-5 text-[#14B8A6]" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5">{item.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// ============================================================================
// NOTIFICATIONS COMPONENTS
// ============================================================================

function DesktopNotificationsTab() {
    const [toggles, setToggles] = useState<NotificationPreferences>({
        price_alerts: true,
        volume_spikes: false,
        weekly_report: true,
        academy_news: true,
        push_notifs: false,
        security_alert: true,
    });

    useEffect(() => {
        let mounted = true;
        fetchNotificationPreferences().then(data => {
            if (mounted) {
                setToggles(data);
            }
        }).catch(err => {
            console.error("Failed to load generic notification preferences:", err);
        });
        return () => { mounted = false; };
    }, []);

    const toggle = async (key: keyof typeof toggles) => {
        const newValue = !toggles[key];
        setToggles(prev => ({ ...prev, [key]: newValue }));
        try {
            await updateNotificationPreferences({ [key]: newValue });
        } catch (error) {
            console.error("Failed to sync notification toggle:", error);
            // Revert state on failure
            setToggles(prev => ({ ...prev, [key]: !newValue }));
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
            <div className="flex flex-col gap-6">
                <div className="bg-white dark:bg-[#1A222C] rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-[#2E3A47] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-[#14B8A6]/5 to-transparent pointer-events-none" />

                    <div className="flex items-center gap-3 mb-6 relative">
                        <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center border border-[#14B8A6]/20">
                            <Zap className="w-5 h-5 text-[#14B8A6]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Market Alerts</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Real-time stock movement notifications.</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative">
                        <DesktopToggleItem
                            title="Price Target Alerts"
                            description="Email me when my watchlist hits set targets."
                            isOn={toggles.price_alerts}
                            onToggle={() => toggle('price_alerts')}
                        />
                        <DesktopToggleItem
                            title="Volume Spikes"
                            description="Notify me of unusual trading volume."
                            isOn={toggles.volume_spikes}
                            onToggle={() => toggle('volume_spikes')}
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1A222C] rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-[#2E3A47] relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0F172A] flex items-center justify-center border border-slate-200 dark:border-transparent">
                            <Shield className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">System & Security</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Account activity and mobile pushes.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <DesktopToggleItem
                            title="Security Alerts"
                            description="Critical alerts for new sign-ins."
                            isOn={toggles.security_alert}
                            onToggle={() => toggle('security_alert')}
                        />
                        <DesktopToggleItem
                            title="Push Notifications"
                            description="Receive mobile device notifications."
                            isOn={toggles.push_notifs}
                            onToggle={() => toggle('push_notifs')}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <div className="bg-white dark:bg-[#1A222C] rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-[#2E3A47] relative overflow-hidden h-full">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center border border-[#14B8A6]/20">
                            <Mail className="w-5 h-5 text-[#14B8A6]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Email Reports</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Stay informed with curated digests.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <DesktopToggleItem
                            title="Weekly Market Report"
                            description="Every Sunday, deeply analyzing MENA markets."
                            isOn={toggles.weekly_report}
                            onToggle={() => toggle('weekly_report')}
                        />
                        <DesktopToggleItem
                            title="Starta Academy"
                            description="Educational content and trading strategies."
                            isOn={toggles.academy_news}
                            onToggle={() => toggle('academy_news')}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function DesktopToggleItem({ title, description, isOn, onToggle }: { title: string, description: string, isOn: boolean, onToggle: () => void }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0F172A] rounded-2xl border border-slate-100 dark:border-[#2E3A47] shadow-sm">
            <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={clsx(
                    "relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14B8A6] flex-shrink-0",
                    isOn ? 'bg-[#14B8A6]' : 'bg-slate-300 dark:bg-[#2E3A47]'
                )}
            >
                <div
                    className={clsx(
                        "inline-block w-4 h-4 transform bg-white rounded-full shadow-sm transition-transform duration-200 mt-1 absolute top-0",
                        isOn ? 'translate-x-6 left-0' : 'translate-x-1 left-0'
                    )}
                />
            </button>
        </div>
    );
}


function NotificationsTab() {
    const [toggles, setToggles] = useState<NotificationPreferences>({
        price_alerts: true,
        volume_spikes: false,
        weekly_report: true,
        academy_news: true,
        push_notifs: false,
        security_alert: true,
    });

    useEffect(() => {
        let mounted = true;
        fetchNotificationPreferences().then(data => {
            if (mounted) {
                setToggles(data);
            }
        }).catch(err => {
            console.error("Failed to load generic notification preferences:", err);
        });
        return () => { mounted = false; };
    }, []);

    const toggle = async (key: keyof typeof toggles) => {
        const newValue = !toggles[key];
        setToggles(prev => ({ ...prev, [key]: newValue }));
        try {
            await updateNotificationPreferences({ [key]: newValue });
        } catch (error) {
            console.error("Failed to sync notification toggle:", error);
            setToggles(prev => ({ ...prev, [key]: !newValue }));
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Market Alerts Section */}
            <div>
                <div className="flex items-center gap-2 mb-4 pl-1">
                    <Zap className="w-4 h-4 text-[#14B8A6]" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Market Alerts</h3>
                </div>
                <div className="space-y-3">
                    <MobileToggleItem
                        title="Price Targets"
                        desc="Email me when targets are hit."
                        isOn={toggles.price_alerts}
                        onToggle={() => toggle('price_alerts')}
                    />
                    <MobileToggleItem
                        title="Volume Spikes"
                        desc="Unusual trading volume alerts."
                        isOn={toggles.volume_spikes}
                        onToggle={() => toggle('volume_spikes')}
                    />
                </div>
            </div>

            {/* Reports Section */}
            <div>
                <div className="flex items-center gap-2 mb-4 pl-1">
                    <Mail className="w-4 h-4 text-[#14B8A6]" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Reports & Security</h3>
                </div>
                <div className="space-y-3">
                    <MobileToggleItem
                        title="Weekly Report"
                        desc="Sunday MENA market digest."
                        isOn={toggles.weekly_report}
                        onToggle={() => toggle('weekly_report')}
                    />
                    <MobileToggleItem
                        title="Security Alerts"
                        desc="Critical account activity."
                        isOn={toggles.security_alert}
                        onToggle={() => toggle('security_alert')}
                    />
                </div>
            </div>

        </motion.div>
    );
}

function MobileToggleItem({ title, desc, isOn, onToggle }: { title: string, desc: string, isOn: boolean, onToggle: () => void }) {
    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-[#1A222C] rounded-2xl border border-slate-200 dark:border-[#2E3A47] shadow-sm">
            <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-0.5">{title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
            <button
                onClick={onToggle}
                className={clsx(
                    "relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0",
                    isOn ? 'bg-[#14B8A6]' : 'bg-slate-200 dark:bg-white/10'
                )}
            >
                <div
                    className={clsx(
                        "inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 mt-1 absolute top-0",
                        isOn ? 'translate-x-6 left-0' : 'translate-x-1 left-0'
                    )}
                />
            </button>
        </div>
    );
}
