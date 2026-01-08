"use client";

import { useState } from "react";
import { useAuth, User } from "@/contexts/AuthContext";
import { updateProfile, changePassword } from "@/lib/api";
import { Loader2, Check, AlertCircle, Lock, User as UserIcon, Phone } from "lucide-react";
import { motion } from "framer-motion";

export default function ProfileTab() {
    const { user, login } = useAuth(); // We might need to refresh user data context after update
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Profile Form State
    const [formData, setFormData] = useState({
        full_name: user?.full_name || "",
        phone: user?.phone || "",
    });

    // Password Form State
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
            setSuccessMsg("Profile updated successfully");
            // Ideally trigger a user reload in context here, but for now local state is fine 
            // user object in context is immutable from here unless we add a setUser method exposed via context
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
            setSuccessMsg("Password changed successfully");
            setPassData({ old_password: "", new_password: "" });
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || "Failed to change password");
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-hide messages
    if (successMsg || errorMsg) {
        setTimeout(() => {
            setSuccessMsg("");
            setErrorMsg("");
        }, 5000);
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Personal Information</h3>
                <p className="text-sm text-slate-500 mb-6">Update your personal details here.</p>

                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2 text-sm font-medium border border-emerald-100"
                    >
                        <Check className="w-4 h-4" />
                        {successMsg}
                    </motion.div>
                )}

                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium border border-red-100"
                    >
                        <AlertCircle className="w-4 h-4" />
                        {errorMsg}
                    </motion.div>
                )}

                <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 opacity-60 cursor-not-allowed">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                        <input
                            type="email"
                            value={user?.email || ""}
                            disabled
                            className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm"
                        />
                        <p className="text-xs text-slate-400">Email address cannot be changed.</p>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

            <hr className="border-slate-100" />

            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Security</h3>
                <p className="text-sm text-slate-500 mb-6">Manage your password and account security.</p>

                <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    value={passData.old_password}
                                    onChange={(e) => setPassData({ ...passData, old_password: e.target.value })}
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    value={passData.new_password}
                                    onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                                    required
                                    minLength={8}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
