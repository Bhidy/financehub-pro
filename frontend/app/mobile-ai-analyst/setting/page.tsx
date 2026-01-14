"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
    ArrowLeft, Loader2, User as UserIcon, Phone, Lock, Check, AlertCircle,
    Sun, Moon, Mail, LogOut, Camera, Globe, Shield, Palette, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { updateProfile, changePassword } from "@/lib/api";

type Tab = 'personal' | 'security' | 'app';

export default function MobileSettingsPage() {
    const router = useRouter();
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('personal');

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/mobile-ai-analyst/login");
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:bg-[#0B1121] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/50 dark:from-[#0B1121] dark:via-[#0B1121] dark:to-[#0B1121] text-slate-900 dark:text-white font-sans overflow-y-auto overflow-x-hidden relative selection:bg-blue-500/30 transition-colors duration-300">

            {/* Background Decorative Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {/* Light mode: Vibrant, shiny gradients */}
                <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] bg-gradient-to-br from-blue-400/20 via-purple-400/15 to-pink-400/10 dark:from-blue-500/10 dark:via-transparent dark:to-transparent rounded-full blur-[80px]" />
                <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] bg-gradient-to-tl from-purple-400/20 via-pink-400/15 to-orange-400/10 dark:from-purple-500/10 dark:via-transparent dark:to-transparent rounded-full blur-[80px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-gradient-to-r from-cyan-300/10 to-blue-300/10 dark:from-transparent dark:to-transparent rounded-full blur-[60px]" />
            </div>

            {/* Header / Nav */}
            <header className="sticky top-0 z-30 px-5 py-4 flex items-center justify-between bg-white/70 dark:bg-[#0B1121]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/5 shadow-sm dark:shadow-none transition-colors duration-300">
                <button
                    onClick={() => router.push('/mobile-ai-analyst')}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all active:scale-95 shadow-sm dark:shadow-none border border-slate-200/50 dark:border-transparent"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
                <button
                    onClick={logout}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-500/5 text-red-600 dark:text-red-500 hover:from-red-100 hover:to-red-200 dark:hover:from-red-500/20 dark:hover:to-red-500/10 transition-all active:scale-95 border border-red-200/50 dark:border-red-500/20 shadow-sm dark:shadow-none"
                    title="Sign Out"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </header>

            <main className="relative z-10 pb-20">
                {/* Profile Header Card */}
                <ProfileHeader user={user} />

                {/* Custom Tab Navigation */}
                <div className="px-5 mt-6 mb-8">
                    <div className="p-1.5 bg-white/60 dark:bg-white/5 rounded-2xl flex relative backdrop-blur-sm border border-slate-200/50 dark:border-transparent shadow-sm dark:shadow-none transition-colors duration-300">
                        {/* Active Tab Indicator */}
                        <motion.div
                            className="absolute top-1.5 bottom-1.5 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-600 dark:to-purple-600 rounded-xl shadow-lg shadow-blue-500/20"
                            layoutId="activeTabIndicator"
                            initial={false}
                            animate={{
                                left: activeTab === 'personal' ? '6px' : activeTab === 'security' ? '33.33%' : '66.66%',
                                width: 'calc(33.33% - 8px)',
                                x: activeTab === 'personal' ? 0 : activeTab === 'security' ? 2 : 2
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />

                        <button
                            onClick={() => setActiveTab('personal')}
                            className={clsx(
                                "flex-1 relative z-10 py-2.5 text-sm font-bold text-center transition-colors rounded-xl",
                                activeTab === 'personal' ? "text-white" : "text-slate-600 dark:text-slate-400"
                            )}
                        >
                            Personal
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={clsx(
                                "flex-1 relative z-10 py-2.5 text-sm font-bold text-center transition-colors rounded-xl",
                                activeTab === 'security' ? "text-white" : "text-slate-600 dark:text-slate-400"
                            )}
                        >
                            Security
                        </button>
                        <button
                            onClick={() => setActiveTab('app')}
                            className={clsx(
                                "flex-1 relative z-10 py-2.5 text-sm font-bold text-center transition-colors rounded-xl",
                                activeTab === 'app' ? "text-white" : "text-slate-600 dark:text-slate-400"
                            )}
                        >
                            App
                        </button>
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
    );
}

function ProfileHeader({ user }: { user: any }) {
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
            {/* Avatar with premium glow effect */}
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity scale-90" />
                <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 overflow-hidden relative p-0.5">
                        <div className="w-full h-full rounded-full overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white">
                                    {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 right-0 w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-4 border-slate-50 dark:border-[#0B1121] shadow-lg transition-colors duration-300">
                    <Camera className="w-4 h-4 text-white" />
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            <div className="mt-5 space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">{user?.full_name || 'User'}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium transition-colors">{user?.email}</p>
            </div>

            <div className="mt-5 flex items-center gap-3">
                <div className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200/50 dark:border-emerald-500/20 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 shadow-sm dark:shadow-none transition-colors">
                    <Check className="w-3.5 h-3.5" /> Verified
                </div>
                <div className="px-3.5 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-full text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 shadow-sm dark:shadow-none transition-colors">
                    <Sparkles className="w-3.5 h-3.5" /> Pro Member
                </div>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
            <div className="p-1 mb-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Personal Details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors">Manage your identity information.</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-5">
                <PremiumInput
                    icon={UserIcon}
                    label="Full Name"
                    value={formData.full_name}
                    onChange={(e: any) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter full name"
                />
                <PremiumInput
                    icon={Phone}
                    label="Phone Number"
                    value={formData.phone}
                    onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    type="tel"
                />
                <PremiumInput
                    icon={Mail}
                    label="Email Address"
                    value={user?.email || ""}
                    disabled
                    readOnly
                />

                <StatusMessages success={successMsg} error={errorMsg} />

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-5 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_100%] hover:bg-right text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:scale-100"
                >
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
            setSuccessMsg("Password changed successfully");
            setPassData({ old_password: "", new_password: "" });
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Failed to change password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
            <div className="p-1 mb-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Security</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors">Protect your account with a strong password.</p>
            </div>

            <form onSubmit={handleChange} className="space-y-5">
                <PremiumInput
                    icon={Lock}
                    label="Current Password"
                    value={passData.old_password}
                    onChange={(e: any) => setPassData({ ...passData, old_password: e.target.value })}
                    placeholder="••••••••"
                    type="password"
                />
                <PremiumInput
                    icon={Shield}
                    label="New Password"
                    value={passData.new_password}
                    onChange={(e: any) => setPassData({ ...passData, new_password: e.target.value })}
                    placeholder="•••••••• (min 8 chars)"
                    type="password"
                />

                <StatusMessages success={successMsg} error={errorMsg} />

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-white font-bold text-sm rounded-2xl border border-slate-300 dark:border-white/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm dark:shadow-none disabled:opacity-50 disabled:scale-100"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                </button>
            </form>

            <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/5 transition-colors">
                <h3 className="text-sm font-bold text-red-500 dark:text-red-400 mb-4 uppercase tracking-wider">Danger Zone</h3>
                <button
                    onClick={logout}
                    className="w-full py-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-500/5 hover:from-red-100 hover:to-red-200 dark:hover:from-red-500/20 dark:hover:to-red-500/10 text-red-600 dark:text-red-500 font-bold text-sm rounded-2xl border border-red-200 dark:border-red-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm dark:shadow-none"
                >
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>
        </motion.div>
    );
}

function AppTab() {
    const { theme, setTheme } = useTheme();

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="space-y-8">

            {/* Appearance */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                        <Palette className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Appearance</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setTheme('light')}
                        className={clsx(
                            "relative group p-5 rounded-2xl border text-left transition-all overflow-hidden",
                            theme === 'light'
                                ? "bg-white text-slate-900 border-blue-300 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/30"
                                : "bg-white/80 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:bg-white/10 shadow-sm dark:shadow-none"
                        )}
                    >
                        <div className={clsx(
                            "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all",
                            theme === 'light' ? "bg-gradient-to-br from-orange-400 to-yellow-400 shadow-md shadow-orange-400/30" : "bg-slate-100 dark:bg-white/10"
                        )}>
                            <Sun className={clsx("w-6 h-6 transition-colors", theme === 'light' ? "text-white" : "text-slate-400")} />
                        </div>
                        <span className={clsx("block text-sm font-bold", theme === 'light' ? "text-slate-900" : "text-slate-600 dark:text-slate-400")}>Light</span>
                        <span className="block text-xs text-slate-400 mt-0.5">Bright & vibrant</span>
                        {theme === 'light' && <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shadow-sm" />}
                    </button>

                    <button
                        onClick={() => setTheme('dark')}
                        className={clsx(
                            "relative group p-5 rounded-2xl border text-left transition-all overflow-hidden",
                            theme === 'dark'
                                ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white border-blue-500/50 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/30"
                                : "bg-white/80 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:bg-white/10 shadow-sm dark:shadow-none"
                        )}
                    >
                        <div className={clsx(
                            "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all",
                            theme === 'dark' ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-md shadow-blue-500/30" : "bg-slate-100 dark:bg-white/10"
                        )}>
                            <Moon className={clsx("w-6 h-6 transition-colors", theme === 'dark' ? "text-white" : "text-slate-400")} />
                        </div>
                        <span className={clsx("block text-sm font-bold", theme === 'dark' ? "text-white" : "text-slate-600 dark:text-slate-400")}>Dark</span>
                        <span className={clsx("block text-xs mt-0.5", theme === 'dark' ? "text-slate-400" : "text-slate-400")}>Easy on eyes</span>
                        {theme === 'dark' && <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                    </button>
                </div>
            </section>

            {/* Language */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-sm">
                        <Globe className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Language</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:bg-white/10 transition-colors cursor-pointer group shadow-sm dark:shadow-none">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🇺🇸</span>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white transition-colors">English</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 transition-colors">Default</div>
                            </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
                            <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🇸🇦</span>
                            <div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white transition-colors">Arabic</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 transition-colors">Coming Soon</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </motion.div>
    );
}

function PremiumInput({ icon: Icon, label, value, onChange, placeholder, type = "text", disabled, readOnly }: any) {
    return (
        <div className="space-y-2 group">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider transition-colors">{label}</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors">
                    <Icon className="w-5 h-5" />
                </div>
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    readOnly={readOnly}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-500/50 border border-slate-200 dark:border-white/10 focus:border-blue-500/50 dark:focus:border-blue-500/50 rounded-2xl transition-all shadow-sm dark:shadow-none disabled:bg-slate-50 dark:disabled:bg-white/5 disabled:text-slate-500 dark:disabled:text-slate-500"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}

function StatusMessages({ success, error }: { success: string, error: string }) {
    if (!success && !error) return null;
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
        >
            {success && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-sm dark:shadow-none">
                    <Check className="w-5 h-5" /> {success}
                </div>
            )}
            {error && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10 border border-red-200/50 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-sm dark:shadow-none">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}
        </motion.div>
    );
}
