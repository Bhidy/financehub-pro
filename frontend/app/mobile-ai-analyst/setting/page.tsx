"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Loader2, User as UserIcon, Phone, Lock, Check, AlertCircle, Sun, Moon, Monitor, Mail, Smartphone, Zap, ShieldAlert, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { updateProfile, changePassword } from "@/lib/api";

type Tab = 'profile' | 'appearance' | 'notifications';

export default function MobileSettingsPage() {
    const router = useRouter();
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/mobile-ai-analyst/login");
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-500" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 w-full bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-white font-sans overflow-y-auto overflow-x-hidden transition-colors duration-300">
            {/* Header */}
            <header className="px-4 py-4 flex items-center gap-4 sticky top-0 z-30 bg-white/90 dark:bg-[#0B1121]/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5 transition-colors duration-300" style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}>
                <button
                    onClick={() => router.push('/mobile-ai-analyst')}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 flex-none"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">Settings</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Manage your account</p>
                </div>
                <button
                    onClick={logout}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all active:scale-95 flex-none border border-red-200 dark:border-red-500/20"
                    title="Sign Out"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            {/* Tabs Navigation */}
            <div className="sticky top-[73px] z-20 bg-slate-50/95 dark:bg-[#0B1121]/95 backdrop-blur-sm px-4 py-2 border-b border-slate-200/60 dark:border-white/5 overflow-x-auto no-scrollbar transition-colors duration-300">
                <div className="flex gap-2">
                    {(['profile', 'appearance', 'notifications'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={clsx(
                                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                                activeTab === tab
                                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                                    : "bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <main className="px-5 py-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'profile' && (
                        <ProfileSection key="profile" user={user} logout={logout} />
                    )}
                    {activeTab === 'appearance' && (
                        <AppearanceSection key="appearance" />
                    )}
                    {activeTab === 'notifications' && (
                        <NotificationsSection key="notifications" />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

function ProfileSection({ user, logout }: { user: any, logout: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const [formData, setFormData] = useState({
        full_name: user?.full_name || "",
        phone: user?.phone || "",
    });

    const [passData, setPassData] = useState({
        old_password: "",
        new_password: "",
    });

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            await updateProfile(formData);
            setSuccessMsg("Profile updated");
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            await changePassword(passData);
            setSuccessMsg("Password changed");
            setPassData({ old_password: "", new_password: "" });
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Failed to change password");
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-hide messages
    useEffect(() => {
        if (successMsg || errorMsg) {
            const timer = setTimeout(() => {
                setSuccessMsg("");
                setErrorMsg("");
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [successMsg, errorMsg]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
        >
            {/* Status Messages */}
            <AnimatePresence>
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl text-sm font-medium flex items-center gap-2 overflow-hidden"
                    >
                        <Check className="w-4 h-4 shrink-0" />
                        {successMsg}
                    </motion.div>
                )}
                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2 overflow-hidden"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {errorMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Personal Info */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Personal Information</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Update your personal details here.</p>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                placeholder="+1 234 567 890"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 opacity-60">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                        <input
                            type="email"
                            value={user?.email || ""}
                            disabled
                            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-sm"
                        />
                        <p className="text-[10px] text-slate-500 dark:text-slate-600">Email address cannot be changed.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-blue-500/20 dark:shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                    </button>
                </form>
            </section>

            <hr className="border-slate-200 dark:border-white/5" />

            {/* Security */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Security</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage your password security.</p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <input
                                type="password"
                                value={passData.old_password}
                                onChange={(e) => setPassData({ ...passData, old_password: e.target.value })}
                                required
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <input
                                type="password"
                                value={passData.new_password}
                                onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                                required
                                minLength={8}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-medium text-sm rounded-xl transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                    </button>
                </form>
            </section>

            <hr className="border-slate-200 dark:border-white/5" />

            {/* Account Actions */}
            <section className="space-y-4 pt-2">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Account Session</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage your active session.</p>
                </div>

                <button
                    type="button"
                    onClick={logout}
                    className="w-full py-3.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 font-bold text-sm rounded-xl transition-all border border-red-200 dark:border-red-500/20 flex items-center justify-center gap-2"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                    Signing out will not delete your chat history.
                </p>
            </section>
        </motion.div>
    );
}

function AppearanceSection() {
    const { theme, setTheme } = useTheme();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
        >
            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Theme Preferences</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Choose how Starta looks to you.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setTheme('light')}
                        className={clsx(
                            "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all relative overflow-hidden group",
                            theme === 'light'
                                ? "border-blue-500/50 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-500"
                        )}
                    >
                        <div className={clsx(
                            "p-3 rounded-xl transition-colors",
                            theme === 'light' ? "bg-white text-orange-500 shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                            <Sun className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">Light Mode</span>
                        {theme === 'light' && (
                            <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />
                        )}
                    </button>

                    <button
                        onClick={() => setTheme('dark')}
                        className={clsx(
                            "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all relative overflow-hidden group",
                            theme === 'dark'
                                ? "border-teal-500/50 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-500"
                        )}
                    >
                        <div className={clsx(
                            "p-3 rounded-xl transition-colors",
                            theme === 'dark' ? "bg-teal-500/20 text-teal-600 dark:text-teal-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                            <Moon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold">Dark Mode</span>
                        {theme === 'dark' && (
                            <div className="absolute top-3 right-3 w-2 h-2 bg-teal-500 rounded-full shadow-lg shadow-teal-500/50" />
                        )}
                    </button>
                </div>
            </section>

            <section className="space-y-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Language</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Select your preferred language.</p>
                </div>

                <div className="space-y-2">
                    <button className="w-full flex items-center justify-between p-4 rounded-xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-500/5 text-slate-900 dark:text-white transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-[10px]">EN</div>
                            <span className="font-semibold text-sm">English</span>
                        </div>
                        <Check className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    </button>

                    <button className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 text-slate-400 dark:text-slate-500 transition-all opacity-60 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-600 font-bold text-[10px]">AR</div>
                            <span className="font-medium text-sm">العربية (Soon)</span>
                        </div>
                    </button>
                </div>
            </section>
        </motion.div>
    );
}

function NotificationsSection() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
        >
            <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Control your alert preferences.</p>
            </div>

            <div className="space-y-3">
                <NotificationItem
                    icon={Mail}
                    title="Email Price Alerts"
                    description="Get email alerts for price targets."
                    comingSoon
                />
                <NotificationItem
                    icon={Smartphone}
                    title="Push Notifications"
                    description="Alerts on your mobile device."
                    comingSoon
                />
                <NotificationItem
                    icon={Zap}
                    title="Weekly Market Report"
                    description="Summary sent every Sunday."
                    comingSoon
                />
                <NotificationItem
                    icon={ShieldAlert}
                    title="Security Alerts"
                    description="New sign-ins or suspicious activity."
                    comingSoon
                />
            </div>
        </motion.div>
    );
}

function NotificationItem({ icon: Icon, title, description, isOn, onToggle, comingSoon }: any) {
    return (
        <div
            className={clsx(
                "w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 transition-all text-left shadow-sm dark:shadow-none",
                comingSoon ? "opacity-75 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer"
            )}
            onClick={!comingSoon ? onToggle : undefined}
        >
            <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">{title}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
                </div>
            </div>

            {comingSoon ? (
                <span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-bold whitespace-nowrap">
                    Coming Soon
                </span>
            ) : (
                <div className={clsx(
                    "relative w-10 h-6 rounded-full transition-colors duration-200 ease-in-out border",
                    isOn ? 'bg-teal-500 border-teal-500' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                )}>
                    <span className={clsx(
                        "inline-block w-3 h-3 transform bg-white rounded-full mt-1.5 ml-1 transition-transform font",
                        isOn ? 'translate-x-4' : 'translate-x-0'
                    )} />
                </div>
            )}
        </div>
    );
}
