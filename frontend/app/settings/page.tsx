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
        <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-white font-sans transition-colors duration-300">

            {/* ================================================================
                DESKTOP LAYOUT - Two Column with Sidebar
                ================================================================ */}
            <div className="hidden lg:flex h-screen overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-[320px] bg-white dark:bg-[#0A0F1C] border-r border-slate-200 dark:border-white/5 flex flex-col overflow-y-auto z-20 relative shadow-2xl shadow-slate-200 dark:shadow-black">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-200 dark:border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#13b8a6]/10 blur-[40px] rounded-full pointer-events-none" />
                        <div className="flex items-center gap-3 select-none cursor-default relative z-10">
                            <div className="relative">

                                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#13b8a6] to-[#0f766e] flex items-center justify-center shadow-lg shadow-[#13b8a6]/20">
                                    <TrendingUp className="w-5 h-5 text-slate-900 dark:text-white" />
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
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group border",
                                        activeTab === item.id
                                            ? "bg-[#13b8a6]/10 text-[#13b8a6] border-[#13b8a6]/30 shadow-inner shadow-[#13b8a6]/5"
                                            : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                    )}
                                >
                                    {activeTab === item.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#13b8a6] rounded-r-md shadow-[0_0_10px_#13b8a6]" />
                                    )}
                                    <item.icon className={clsx("w-5 h-5 transition-colors", activeTab === item.id ? "text-[#13b8a6]" : "text-slate-500 group-hover:text-slate-600 dark:text-slate-300")} />
                                    <span className="font-semibold text-sm">{item.label}</span>
                                    {activeTab === item.id && (
                                        <ChevronRight className="w-4 h-4 ml-auto text-[#13b8a6]" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-slate-100 dark:bg-white/5 my-6" />

                        {/* Admin Area (if applicable) */}
                        {user?.role === 'admin' && (
                            <>
                                <div className="px-4 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-5">Admin Area</div>
                                <div className="space-y-1 mb-6">
                                    <Link href="/admin/users" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition-all group">
                                        <Users className="w-5 h-5 text-emerald-500/70 group-hover:text-emerald-400" />
                                        <span className="font-semibold text-sm">User Management</span>
                                    </Link>
                                </div>
                                <div className="h-px bg-slate-100 dark:bg-white/5 my-6" />
                            </>
                        )}

                        {/* Additional Links */}
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('notifications')}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group border",
                                    activeTab === 'notifications'
                                        ? "bg-[#13b8a6]/10 text-[#13b8a6] border-[#13b8a6]/30 shadow-inner shadow-[#13b8a6]/5"
                                        : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                )}
                            >
                                {activeTab === 'notifications' && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#13b8a6] rounded-r-md shadow-[0_0_10px_#13b8a6]" />
                                )}
                                <Bell className={clsx("w-5 h-5 transition-colors", activeTab === 'notifications' ? "text-[#13b8a6]" : "text-slate-500 group-hover:text-slate-600 dark:text-slate-300")} />
                                <span className="font-semibold text-sm">Notifications</span>
                                {activeTab === 'notifications' && (
                                    <ChevronRight className="w-4 h-4 ml-auto text-[#13b8a6]" />
                                )}
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all group">
                                <HelpCircle className="w-5 h-5 text-slate-500 group-hover:text-slate-600 dark:text-slate-300" />
                                <span className="font-semibold text-sm">Help & Support</span>
                            </button>
                        </div>
                    </nav>

                    {/* Sign Out */}
                    <div className="p-6 border-t border-slate-200 dark:border-white/5 mt-auto">
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-500 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 transition-all font-semibold text-sm justify-center group"
                        >
                            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto relative">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#13b8a6]/5 blur-[120px] rounded-full pointer-events-none" />

                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-[#0B1121]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-8 py-6">
                        <div className="flex items-center justify-between max-w-4xl mx-auto">
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account preferences</p>
                            </div>
                            <Link
                                href="https://startamarkets.com/AiChat"
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-900 dark:text-white transition-all font-semibold text-sm shadow-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Chat
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
            <div className="lg:hidden h-[100dvh] flex flex-col overflow-hidden bg-white dark:bg-[#0A0F1C] text-slate-900 dark:text-white">
                {/* Header */}
                <header className="sticky top-0 z-30 px-5 py-4 flex items-center justify-between bg-slate-50 dark:bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#13b8a6]/20 blur-[40px] rounded-full pointer-events-none" />
                    <button
                        onClick={() => router.push('https://startamarkets.com/AiChat')}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white transition-all active:scale-95 z-10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight z-10">Settings</h1>
                    <button
                        onClick={logout}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 transition-all active:scale-95 z-10"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto pb-20">
                    {/* Profile Header */}
                    <MobileProfileHeader user={user} />

                    {/* Tab Navigation */}
                    <div className="px-5 mt-6 mb-6">
                        <div className="p-1.5 bg-slate-100 dark:bg-[#151D28] rounded-xl flex relative border border-slate-200 dark:border-white/5 shadow-inner">
                            <motion.div
                                className="absolute top-1.5 bottom-1.5 bg-[#13b8a6] rounded-lg shadow-md shadow-[#13b8a6]/30"
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
                                            ? "text-slate-900 dark:text-white"
                                            : "text-slate-500 dark:text-slate-400"
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
                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 pb-2">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Admin Area</h3>
                                <div className="space-y-2 flex flex-col">
                                    <Link href="/admin/users" className="w-full flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 active:scale-[0.98] transition-all group">
                                        <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm">
                                            <Users className="w-5 h-5 opacity-80 group-hover:opacity-100" /> User Management
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
        <div className="p-6 bg-white dark:bg-[#0B1121] rounded-2xl border border-slate-200 dark:border-white/5 relative overflow-hidden group hover:border-[#13b8a6]/30 transition-all duration-500 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#13b8a6]/10 blur-[40px] rounded-full pointer-events-none group-hover:bg-[#13b8a6]/20 transition-colors" />
            <div className="flex items-center gap-5 relative z-10">
                {/* Avatar */}
                <div className="relative cursor-pointer group/avatar" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#13b8a6] to-[#0f766e] p-0.5 shadow-lg shadow-[#13b8a6]/20 group-hover/avatar:shadow-[#13b8a6]/40 transition-shadow">
                        <div className="w-full h-full rounded-[14px] bg-slate-50 dark:bg-[#0A0F1C] overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-transparent text-xl font-bold text-slate-900 dark:text-white">
                                    {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                        <Camera className="w-5 h-5 text-slate-900 dark:text-white" />
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">{user?.full_name || 'User'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-[#13b8a6]/10 border border-[#13b8a6] dark:border-[#13b8a6]/20 text-[#13b8a6] rounded-full uppercase tracking-wider">
                            <Check className="w-3.5 h-3.5" /> Verified
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
            <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-b from-[#13b8a6]/10 to-transparent mask-border pointer-events-none" style={{ WebkitMaskImage: "linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)", WebkitMaskClip: "padding-box, border-box", WebkitMaskComposite: "source-out", maskComposite: "exclude" }} />

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Personal Details</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 relative z-10">Manage your identity information.</p>

                <form onSubmit={handleUpdate} className="space-y-6 relative z-10">
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

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-3.5 bg-transparent border-2 border-[#13b8a6] hover:bg-[#13b8a6]/10 text-slate-900 dark:text-white rounded-xl font-bold text-sm shadow-lg shadow-[#13b8a6]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 w-full sm:w-auto"
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
            <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-b from-[#13b8a6]/10 to-transparent mask-border pointer-events-none" style={{ WebkitMaskImage: "linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)", WebkitMaskClip: "padding-box, border-box", WebkitMaskComposite: "source-out", maskComposite: "exclude" }} />

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative z-10">Change Password</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 relative z-10">Keep your account secure with a strong password.</p>

                <form onSubmit={handleChange} className="space-y-6 relative z-10">
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

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-8 py-3.5 bg-transparent border-2 border-[#13b8a6] hover:bg-[#13b8a6]/10 text-slate-900 dark:text-white rounded-xl font-bold text-sm shadow-lg shadow-[#13b8a6]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 w-full sm:w-auto"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Sign Out Section */}
            <div className="bg-slate-100 dark:bg-[#151d28]/60 rounded-[2rem] border border-red-500/20 p-8 shadow-sm">
                <button
                    onClick={logout}
                    className="w-full sm:w-auto px-8 py-4 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-xl font-bold text-sm border border-red-500/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-sm"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out Everywhere
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
            <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-b from-[#13b8a6]/10 to-transparent mask-border pointer-events-none" style={{ WebkitMaskImage: "linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)", WebkitMaskClip: "padding-box, border-box", WebkitMaskComposite: "source-out", maskComposite: "exclude" }} />

                <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#13b8a6] to-[#0f766e] flex items-center justify-center shadow-lg shadow-[#13b8a6]/20">
                        <Palette className="w-6 h-6 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Appearance</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Choose your preferred theme</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 relative z-10">
                    <button
                        onClick={() => setTheme('light')}
                        className={clsx(
                            "relative group p-6 rounded-2xl border text-left transition-all overflow-hidden",
                            theme === 'light'
                                ? "bg-[#13b8a6]/10 border-[#13b8a6] ring-1 ring-[#13b8a6]"
                                : "bg-slate-50 dark:bg-[#0A0F1C] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/10"
                        )}
                    >
                        <div className={clsx(
                            "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all",
                            theme === 'light' ? "bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg shadow-orange-400/30" : "bg-slate-100 dark:bg-white/5"
                        )}>
                            <Sun className={clsx("w-7 h-7", theme === 'light' ? "text-slate-900 dark:text-white" : "text-slate-500")} />
                        </div>
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">Light Mode</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">Bright & vibrant</span>
                        {theme === 'light' && (
                            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#13b8a6] flex items-center justify-center">
                                <Check className="w-4 h-4 text-slate-900 dark:text-white" />
                            </div>
                        )}
                    </button>

                    <button
                        onClick={() => setTheme('dark')}
                        className={clsx(
                            "relative group p-6 rounded-2xl border text-left transition-all overflow-hidden",
                            theme === 'dark'
                                ? "bg-[#13b8a6]/10 border-[#13b8a6] ring-1 ring-[#13b8a6]"
                                : "bg-slate-50 dark:bg-[#0A0F1C] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/10"
                        )}
                    >
                        <div className={clsx(
                            "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all",
                            theme === 'dark' ? "bg-gradient-to-br from-[#13b8a6] to-[#0f766e] shadow-lg shadow-[#13b8a6]/30" : "bg-slate-100 dark:bg-white/5"
                        )}>
                            <Moon className={clsx("w-7 h-7", theme === 'dark' ? "text-slate-900 dark:text-white" : "text-slate-500")} />
                        </div>
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">Dark Mode</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">Sleek & premium</span>
                        {theme === 'dark' && (
                            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#13b8a6] flex items-center justify-center">
                                <Check className="w-4 h-4 text-slate-900 dark:text-white" />
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Language */}
            <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-b from-[#13b8a6]/10 to-transparent mask-border pointer-events-none" style={{ WebkitMaskImage: "linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)", WebkitMaskClip: "padding-box, border-box", WebkitMaskComposite: "source-out", maskComposite: "exclude" }} />

                <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#13b8a6] to-[#0f766e] flex items-center justify-center shadow-lg shadow-[#13b8a6]/20">
                        <Globe className="w-6 h-6 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Language</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Choose your preferred language</p>
                    </div>
                </div>

                <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between p-5 bg-[#13b8a6]/10 rounded-xl border border-[#13b8a6]/30 shadow-inner shadow-[#13b8a6]/5">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">🇺🇸</span>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">English</div>
                                <div className="text-xs text-[#13b8a6] mt-0.5">Active</div>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#13b8a6] flex items-center justify-center shadow-lg shadow-[#13b8a6]/30">
                            <Check className="w-4 h-4 text-slate-900 dark:text-white" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0F1C]/50 opacity-50">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl grayscale">🇸🇦</span>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">Arabic</div>
                                <div className="text-xs text-slate-500 mt-0.5">Coming Soon</div>
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
            <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</label>
            <div className={clsx(
                "relative rounded-xl transition-all duration-300",
                focused && !disabled && "ring-2 ring-[#13b8a6]/30 shadow-[0_0_15px_rgba(19,184,166,0.15)]"
            )}>
                <Icon className={clsx(
                    "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors z-10",
                    focused ? "text-[#13b8a6]" : "text-slate-500"
                )} />
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={disabled}
                    readOnly={readOnly}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-600 focus:outline-none focus:border-[#13b8a6] focus:bg-[#13b8a6]/5 transition-all text-sm disabled:opacity-50 relative z-0"
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
                            <div className="w-full h-full flex items-center justify-center bg-[#14B8A6] text-2xl font-bold text-slate-900 dark:text-white">
                                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#14B8A6] rounded-full flex items-center justify-center border-4 border-slate-50 dark:border-[#0A0F1C]">
                    <Camera className="w-4 h-4 text-slate-900 dark:text-white" />
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
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">Personal Details</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Manage your identity information.</p>

            <form onSubmit={handleUpdate} className="space-y-5">
                <MobileInput icon={UserIcon} label="Full Name" value={formData.full_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Enter name" />
                <MobileInput icon={Phone} label="Phone" value={formData.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 234 567" type="tel" />
                <MobileInput icon={Mail} label="Email" value={user?.email || ""} disabled readOnly />
                <StatusMessages success={successMsg} error={errorMsg} />
                <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 bg-transparent border-2 border-[#13b8a6] text-slate-900 dark:text-white hover:bg-[#13b8a6]/10 font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(19,184,166,0.15)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
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
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">Security</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Protect your account.</p>

            <form onSubmit={handleChange} className="space-y-5">
                <MobileInput icon={Lock} label="Current Password" value={passData.old_password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassData({ ...passData, old_password: e.target.value })} placeholder="••••••••" type="password" />
                <MobileInput icon={Shield} label="New Password" value={passData.new_password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassData({ ...passData, new_password: e.target.value })} placeholder="Min 6 chars" type="password" />
                <StatusMessages success={successMsg} error={errorMsg} />
                <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 bg-transparent border-2 border-[#13b8a6] text-slate-900 dark:text-white hover:bg-[#13b8a6]/10 font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(19,184,166,0.15)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-200 dark:border-white/10">
                <button onClick={logout} className="w-full py-4 bg-red-500/10 text-red-500 font-bold text-sm rounded-xl border border-red-500/20 shadow-lg shadow-red-500/5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                    <LogOut className="w-4 h-4" /> Sign Out Everywhere
                </button>
            </div>
        </motion.div>
    );
}

function AppTab() {
    const { theme, setTheme } = useTheme();

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-6 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#13b8a6]/10 blur-[40px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#13b8a6] to-[#0f766e] flex items-center justify-center">
                        <Palette className="w-5 h-5 text-slate-900 dark:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Appearance</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <button onClick={() => setTheme('light')} className={clsx("p-4 rounded-xl border text-center transition-all", theme === 'light' ? "bg-[#13b8a6]/10 border-[#13b8a6] shadow-inner shadow-[#13b8a6]/10" : "bg-slate-50 dark:bg-[#0A0F1C] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10")}>
                        <Sun className={clsx("w-6 h-6 mx-auto mb-2", theme === 'light' ? "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" : "text-slate-500")} />
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">Light</span>
                    </button>
                    <button onClick={() => setTheme('dark')} className={clsx("p-4 rounded-xl border text-center transition-all", theme === 'dark' ? "bg-[#13b8a6]/10 border-[#13b8a6] shadow-inner shadow-[#13b8a6]/10" : "bg-slate-50 dark:bg-[#0A0F1C] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10")}>
                        <Moon className={clsx("w-6 h-6 mx-auto mb-2", theme === 'dark' ? "text-[#13b8a6] drop-shadow-[0_0_8px_rgba(19,184,166,0.5)]" : "text-slate-500")} />
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">Dark</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-6 shadow-2xl border border-[#13b8a6] dark:border-[#13b8a6]/20 relative overflow-hidden group">
                <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-b from-[#13b8a6]/10 to-transparent mask-border pointer-events-none" style={{ WebkitMaskImage: "linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)", WebkitMaskClip: "padding-box, border-box", WebkitMaskComposite: "source-out", maskComposite: "exclude" }} />
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#13b8a6] to-[#0f766e] flex items-center justify-center">
                        <Globe className="w-5 h-5 text-slate-900 dark:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Language</h3>
                </div>
                <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between p-4 bg-[#13b8a6]/10 rounded-xl border border-[#13b8a6]/30">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">🇺🇸</span>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">English</div>
                                <div className="text-xs text-[#13b8a6]">Active</div>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#13b8a6] flex items-center justify-center shadow-lg shadow-[#13b8a6]/30">
                            <Check className="w-4 h-4 text-slate-900 dark:text-white" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A0F1C]/50 opacity-50">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl grayscale">🇸🇦</span>
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
        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
            <div className="relative">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10" />
                <input type={type} value={value} onChange={onChange} disabled={disabled} readOnly={readOnly} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-600 focus:outline-none focus:border-[#13b8a6] focus:bg-[#13b8a6]/5 focus:ring-1 focus:ring-[#13b8a6]/50 transition-all text-sm disabled:bg-slate-50 dark:bg-[#0A0F1C]/50 disabled:text-slate-500 relative z-0" placeholder={placeholder} />
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
        "Unlimited AI Analyst Chat",
        "Unlimited 5-Year Income Statements",
        "Unlimited 5-Year Balance Sheets",
        "Unlimited 5-Year Cash Flow Statements",
        "Full Financial History (Annually, Quarterly & TTM)",
        "Complete Financial Ratios & KPIs",
        "Advanced Excel Export (All Financials)",
        "Unlimited PDF Report Generation",
        "Daily Market News Briefing",
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
            <div className="flex flex-col gap-6">
                <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden group hover:border-[#13b8a6]/50 transition-colors duration-500">
                    {/* Glowing effect background for The Analyst */}
                    {isAnalyst && (
                        <div className="absolute inset-x-0 -top-40 h-[250px] bg-[#13b8a6]/20 blur-[80px] rounded-full pointer-events-none" />
                    )}
                    {!isAnalyst && (
                        <div className="absolute inset-x-0 -top-40 h-[250px] bg-slate-500/10 blur-[80px] rounded-full pointer-events-none" />
                    )}

                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="w-full">
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                                {isAnalyst ? "Your Active Plan" : "Current Plan"}
                            </p>
                            <h2 className={clsx("text-4xl font-extrabold flex items-center gap-3", isAnalyst ? "text-[#13b8a6]" : "text-slate-900 dark:text-white")}>
                                {isAnalyst ? "The Analyst" : "Free"}
                                {isAnalyst && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-[#13b8a6]/20 text-[#13b8a6] rounded-full uppercase tracking-wider border border-[#13b8a6]/30">
                                        <Check className="w-3.5 h-3.5" /> Active
                                    </span>
                                )}
                            </h2>
                        </div>
                    </div>

                    <div className="mb-8 relative z-10 h-[6rem]">
                        <div className="text-[3.5rem] leading-none font-bold text-slate-900 dark:text-white flex items-center">
                            {isAnalyst ? (
                                <>
                                    <span className="text-[1.5rem] mr-2">EGP</span>
                                    69
                                </>
                            ) : (
                                "Free"
                            )}
                        </div>
                        {isAnalyst && (
                            <div className="text-slate-500 dark:text-slate-400 text-sm mt-2">Monthly or 662 EGP Annually (20% off)</div>
                        )}
                        {!isAnalyst && (
                            <div className="text-slate-500 dark:text-slate-400 text-sm mt-2">Essential market data for the casual investor</div>
                        )}
                    </div>

                    <button
                        onClick={handleManageBilling}
                        disabled={isBillingLoading}
                        className={clsx(
                            "w-full px-8 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 relative z-10",
                            isAnalyst
                                ? "bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-300 dark:hover:border-white/20"
                                : "bg-transparent border-2 border-[#13b8a6] text-slate-900 dark:text-white hover:bg-[#13b8a6]/10"
                        )}
                    >
                        {isBillingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                        {isAnalyst ? "Manage Billing & Invoices" : "Get started"}
                    </button>

                    {billingError && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center gap-2 relative z-10">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {billingError}
                        </div>
                    )}
                </div>

                <div className="bg-slate-100 dark:bg-[#151D28] rounded-[2rem] p-6 border border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm">
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Payment Security</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Transactions are securely processed by Stripe.</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#1A222C] flex items-center justify-center shadow-sm border border-slate-200 dark:border-white/5">
                        <Shield className="w-6 h-6 text-[#13b8a6]" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-8 shadow-2xl border border-[#13b8a6]/30 flex flex-col justify-start relative overflow-hidden group">
                <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-b from-[#13b8a6]/20 to-transparent mask-border pointer-events-none" style={{ WebkitMaskImage: "linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)", WebkitMaskClip: "padding-box, border-box", WebkitMaskComposite: "source-out", maskComposite: "exclude" }} />

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8 relative z-10">
                    {isAnalyst ? "Your Premium Benefits" : "Unlock The Analyst"}
                </h3>

                <ul className="space-y-0 relative z-10">
                    {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start py-4 border-t border-slate-200 dark:border-white/10 first:border-t-0">
                            <div className="flex-shrink-0 mr-4 mt-0.5">
                                <div className="w-6 h-6 rounded-full bg-[#13b8a6]/20 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-[#13b8a6]" />
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{feature}</p>
                        </li>
                    ))}
                </ul>
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
        "Unlimited AI Analyst Chat",
        "Unlimited 5-Year Income Statements",
        "Unlimited 5-Year Balance Sheets",
        "Unlimited 5-Year Cash Flow Statements",
        "Full Financial History (Annually, Quarterly & TTM)",
        "Complete Financial Ratios & KPIs",
        "Advanced Excel Export (All Financials)",
        "Unlimited PDF Report Generation",
        "Daily Market News Briefing",
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-6 border border-slate-200 dark:border-white/10 relative overflow-hidden mt-2 shadow-2xl">
                {isAnalyst && (
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#13b8a6] rounded-full blur-[80px] opacity-20 pointer-events-none" />
                )}
                {!isAnalyst && (
                    <div className="absolute top-0 right-0 w-40 h-40 bg-slate-500 rounded-full blur-[80px] opacity-10 pointer-events-none" />
                )}

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    {isAnalyst ? "Your Active Plan" : "Your Plan"}
                </p>
                <h2 className={clsx("text-3xl font-extrabold flex items-center gap-2 mb-4 relative z-10", isAnalyst ? "text-[#13b8a6]" : "text-slate-900 dark:text-white")}>
                    {isAnalyst ? "The Analyst" : "Free"}
                    {isAnalyst && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold bg-[#13b8a6]/20 text-[#13b8a6] rounded-full uppercase tracking-wider border border-[#13b8a6]/30">
                            <Check className="w-3 h-3" /> Active
                        </span>
                    )}
                </h2>

                <div className="mb-6 relative z-10">
                    <div className="text-[2.5rem] leading-none font-bold text-slate-900 dark:text-white flex items-center mb-1">
                        {isAnalyst ? (
                            <>
                                <span className="text-[1.25rem] mr-2">EGP</span>
                                69
                            </>
                        ) : (
                            "Free"
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[90%]">
                        {isAnalyst ? "Monthly or 662 EGP Annually (20% off)" : "Essential market data for the casual investor."}
                    </p>
                </div>

                <button
                    onClick={handleManageBilling}
                    disabled={isBillingLoading}
                    className={clsx(
                        "w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 relative z-10",
                        isAnalyst
                            ? "bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 backdrop-blur-sm"
                            : "bg-transparent border-2 border-[#13b8a6] text-slate-900 dark:text-white hover:bg-[#13b8a6]/10"
                    )}
                >
                    {isBillingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {isAnalyst ? "Manage Billing" : "Get started"}
                </button>
            </div>

            {billingError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {billingError}
                </div>
            )}

            <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-6 shadow-2xl border border-[#13b8a6]/30 flex flex-col justify-start relative overflow-hidden group">
                <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-b from-[#13b8a6]/20 to-transparent mask-border pointer-events-none" style={{ WebkitMaskImage: "linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)", WebkitMaskClip: "padding-box, border-box", WebkitMaskComposite: "source-out", maskComposite: "exclude" }} />

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 relative z-10">
                    {isAnalyst ? "Pro Benefits" : "Unlock with Pro"}
                </h3>
                <ul className="space-y-0 relative z-10">
                    {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start py-3 border-t border-slate-200 dark:border-white/10 first:border-t-0">
                            <div className="flex-shrink-0 mr-3 mt-0.5">
                                <div className="w-5 h-5 rounded-full bg-[#13b8a6]/20 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-[#13b8a6]" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{feature}</p>
                        </li>
                    ))}
                </ul>
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
                <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-8 shadow-2xl border border-[#13b8a6] dark:border-[#13b8a6]/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-[#13b8a6]/5 to-transparent pointer-events-none" />

                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-[#13b8a6]/10 flex items-center justify-center border border-[#13b8a6] dark:border-[#13b8a6]/20 shadow-inner shadow-[#13b8a6]/10">
                            <Zap className="w-6 h-6 text-[#13b8a6]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Market Alerts</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Real-time stock movement notifications.</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
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

                <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden group">
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10">
                            <Shield className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">System & Security</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Account activity and mobile pushes.</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
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
                <div className="bg-white dark:bg-[#0B1121] rounded-[2rem] p-8 shadow-2xl border border-[#13b8a6] dark:border-[#13b8a6]/20 relative overflow-hidden group h-full">
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-[#13b8a6]/10 flex items-center justify-center border border-[#13b8a6] dark:border-[#13b8a6]/20 shadow-inner shadow-[#13b8a6]/10">
                            <Mail className="w-6 h-6 text-[#13b8a6]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Email Reports</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Stay informed with curated digests.</p>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
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
        <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-[#0A0F1C] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-slate-300 dark:hover:border-white/10 transition-colors">
            <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
            </div>
            <button
                onClick={onToggle}
                className={clsx(
                    "relative w-12 h-7 rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#13b8a6] focus:ring-offset-[#0B1121] flex-shrink-0 shadow-inner",
                    isOn ? 'bg-[#13b8a6] shadow-[#13b8a6]/30' : 'bg-white/10'
                )}
            >
                <div
                    className={clsx(
                        "inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-300 shadow-md mt-1 absolute top-0",
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">

            {/* Market Alerts Section */}
            <div>
                <div className="flex items-center gap-3 mb-5 pl-1">
                    <Zap className="w-5 h-5 text-[#13b8a6]" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">Market Alerts</h3>
                </div>
                <div className="space-y-4">
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
                <div className="flex items-center gap-3 mb-5 pl-1">
                    <Mail className="w-5 h-5 text-[#13b8a6]" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-widest">Reports & Security</h3>
                </div>
                <div className="space-y-4">
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
        <div className="flex items-center justify-between p-5 bg-white dark:bg-[#0B1121] rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg">
            <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1">{title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
            <button
                onClick={onToggle}
                className={clsx(
                    "relative w-12 h-7 rounded-full transition-colors duration-300 focus:outline-none flex-shrink-0 shadow-inner",
                    isOn ? 'bg-[#13b8a6] shadow-[#13b8a6]/20' : 'bg-white/10'
                )}
            >
                <div
                    className={clsx(
                        "inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-300 shadow-md mt-1 absolute top-0",
                        isOn ? 'translate-x-6 left-0' : 'translate-x-1 left-0'
                    )}
                />
            </button>
        </div>
    );
}
