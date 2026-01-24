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
    TrendingUp, Settings, ChevronRight, Bell, CreditCard, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { updateProfile, changePassword } from "@/lib/api";
import { useMobileRoutes } from "../hooks/useMobileRoutes";
import Link from "next/link";

type Tab = 'personal' | 'security' | 'app';

export default function MobileSettingsPage() {
    const router = useRouter();
    const { user, logout, isAuthenticated, isLoading } = useAuth();
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
        <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0A0F1C] text-slate-900 dark:text-white font-sans transition-colors duration-300">

            {/* ================================================================
                DESKTOP LAYOUT - Two Column with Sidebar
                ================================================================ */}
            <div className="hidden lg:flex min-h-screen">
                {/* Left Sidebar */}
                <div className="w-[320px] bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-white/5 flex flex-col">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-100 dark:border-white/5">
                        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#14B8A6] rounded-xl blur-xl opacity-40" />
                                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center shadow-lg shadow-[#14B8A6]/20">
                                    <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Starta</span>
                        </Link>
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
                                { id: 'security' as Tab, label: 'Security', icon: Shield },
                                { id: 'app' as Tab, label: 'App Settings', icon: Settings },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                        activeTab === item.id
                                            ? "bg-[#14B8A6]/10 text-[#14B8A6]"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
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
                        <div className="h-px bg-slate-100 dark:bg-white/5 my-4" />

                        {/* Additional Links */}
                        <div className="space-y-1">
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                                <Bell className="w-5 h-5" />
                                <span className="font-medium">Notifications</span>
                                <span className="ml-auto text-xs font-bold bg-[#14B8A6] text-white px-2 py-0.5 rounded-full">Soon</span>
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                                <HelpCircle className="w-5 h-5" />
                                <span className="font-medium">Help & Support</span>
                            </button>
                        </div>
                    </nav>

                    {/* Sign Out */}
                    <div className="p-4 border-t border-slate-100 dark:border-white/5">
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
                    <div className="sticky top-0 z-10 bg-slate-50/80 dark:bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-8 py-5">
                        <div className="flex items-center justify-between max-w-3xl">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account preferences</p>
                            </div>
                            <Link
                                href="/"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14B8A6]/10 text-[#14B8A6] hover:bg-[#14B8A6]/20 transition-colors font-medium text-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Chat
                            </Link>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-8 max-w-3xl">
                        <AnimatePresence mode="wait">
                            {activeTab === 'personal' && <DesktopPersonalTab key="personal" user={user} />}
                            {activeTab === 'security' && <DesktopSecurityTab key="security" logout={logout} />}
                            {activeTab === 'app' && <DesktopAppTab key="app" />}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* ================================================================
                MOBILE LAYOUT
                ================================================================ */}
            <div className="lg:hidden min-h-screen flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-30 px-5 py-4 flex items-center justify-between bg-white/80 dark:bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
                    <button
                        onClick={() => router.push(getRoute('home'))}
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
                                    left: activeTab === 'personal' ? '6px' : activeTab === 'security' ? '33.33%' : '66.66%',
                                    width: 'calc(33.33% - 8px)',
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                            {(['personal', 'security', 'app'] as Tab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={clsx(
                                        "flex-1 relative z-10 py-2.5 text-sm font-semibold text-center transition-colors rounded-lg capitalize",
                                        activeTab === tab
                                            ? "text-[#14B8A6] dark:text-white"
                                            : "text-slate-500"
                                    )}
                                >
                                    {tab === 'personal' ? 'Personal' : tab === 'security' ? 'Security' : 'App'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="px-5">
                        <AnimatePresence mode="wait">
                            {activeTab === 'personal' && <PersonalTab key="personal" user={user} />}
                            {activeTab === 'security' && <SecurityTab key="security" logout={logout} />}
                            {activeTab === 'app' && <AppTab key="app" />}
                        </AnimatePresence>
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
        <div className="p-5 bg-gradient-to-br from-[#14B8A6]/5 to-[#3B82F6]/5 dark:from-[#14B8A6]/10 dark:to-[#3B82F6]/5 rounded-2xl border border-[#14B8A6]/10 dark:border-[#14B8A6]/20">
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] p-0.5 shadow-lg shadow-[#14B8A6]/20">
                        <div className="w-full h-full rounded-[10px] bg-white dark:bg-slate-900 overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#14B8A6] to-[#0D9488] text-xl font-bold text-white">
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
                            <Sparkles className="w-3 h-3" /> Pro
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DesktopPersonalTab({ user }: { user: any }) {
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
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
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
                            className="px-6 py-3 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white rounded-xl font-semibold text-sm shadow-lg shadow-[#14B8A6]/20 flex items-center gap-2 hover:shadow-xl hover:shadow-[#14B8A6]/30 active:scale-[0.98] transition-all disabled:opacity-50"
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
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
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
                            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
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
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center">
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
                                ? "bg-white border-[#14B8A6] shadow-lg shadow-[#14B8A6]/10 ring-2 ring-[#14B8A6]/20"
                                : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300"
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
                                ? "bg-slate-900 border-[#14B8A6] shadow-lg shadow-[#14B8A6]/10 ring-2 ring-[#14B8A6]/20"
                                : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300"
                        )}
                    >
                        <div className={clsx(
                            "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all",
                            theme === 'dark' ? "bg-gradient-to-br from-[#3B82F6] to-[#14B8A6] shadow-lg shadow-[#14B8A6]/30" : "bg-slate-200 dark:bg-white/10"
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
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#14B8A6] flex items-center justify-center">
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
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-sm disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:text-slate-500"
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
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-[#14B8A6] to-[#0D9488] shadow-lg shadow-[#14B8A6]/20">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#14B8A6] to-[#0D9488] text-2xl font-bold text-white">
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
                    <Sparkles className="w-3 h-3" /> Pro
                </span>
            </div>
        </div>
    );
}

function PersonalTab({ user }: { user: any }) {
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
                            <span className="text-xl">🇺🇸</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">English</span>
                        </div>
                        <Check className="w-5 h-5 text-[#14B8A6]" />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 opacity-50">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🇸🇦</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Arabic</span>
                        </div>
                        <span className="text-xs text-slate-500">Soon</span>
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
