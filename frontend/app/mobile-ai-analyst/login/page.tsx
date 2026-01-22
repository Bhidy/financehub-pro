"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import GoogleLoginButton, { OrDivider } from "@/components/GoogleLoginButton";

function MobileLoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Handle Google OAuth callback
    useEffect(() => {
        const token = searchParams.get("token");
        const userStr = searchParams.get("user");
        const googleAuth = searchParams.get("google_auth");
        const errorParam = searchParams.get("error");

        if (errorParam) {
            setError("Google login failed. Please try again.");
            return;
        }

        if (googleAuth === "success" && token && userStr) {
            try {
                const user = JSON.parse(decodeURIComponent(userStr));
                localStorage.setItem("fh_auth_token", token);
                localStorage.setItem("fh_user", JSON.stringify(user));
                router.push("/mobile-ai-analyst");
            } catch (e) {
                console.error("Failed to parse Google auth response", e);
            }
        }
    }, [searchParams, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim()) {
            setError("Please enter your email");
            return;
        }
        if (!password.trim()) {
            setError("Please enter your password");
            return;
        }

        setIsLoading(true);

        const result = await login(email, password);

        setIsLoading(false);

        if (result.success) {
            router.push("/mobile-ai-analyst");
        } else {
            setError(result.error || "Login failed");
        }
    };

    return (
        <div className="relative w-full h-full min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0F172A] text-[#0F172A] dark:text-white font-sans selection:bg-[#14B8A6]/30 overflow-x-hidden flex flex-col">
            {/* Background Effects - Midnight Teal */}
            <div className="fixed inset-0 bg-transparent dark:bg-[radial-gradient(circle_at_50%_0%,_#14B8A6_0%,_#0F172A_50%)] opacity-20 pointer-events-none transition-opacity duration-300" />
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 dark:opacity-15 brightness-100 contrast-150 mix-blend-overlay pointer-events-none" />

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-6 relative z-10">

                {/* Header */}
                <header className="py-2 mb-8">
                    <button
                        onClick={() => router.push('/mobile-ai-analyst')}
                        className="flex items-center gap-2 text-slate-500 hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white transition-colors font-medium active:scale-95 duration-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="text-sm font-semibold">Back to Starta</span>
                    </button>
                </header>

                {/* Main Content Centered Vertically if space permits, otherwise flows */}
                <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full pb-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Logo area */}
                        <div className="flex flex-col items-center mb-10">
                            <div className="w-24 h-24 relative flex items-center justify-center mb-6">
                                <div className="absolute inset-0 bg-[#14B8A6]/20 rounded-full blur-2xl" />
                                <div className="relative z-10 w-full h-full bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700">
                                    <img src="/app-icon.png" alt="Starta" className="w-16 h-16 object-contain" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-[#0F172A] dark:text-white mb-3 text-center">Welcome Back</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-center font-medium">Sign in to your Starta account</p>
                        </div>

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    className="mb-6 overflow-hidden"
                                >
                                    <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl flex items-center gap-3 text-[#EF4444]">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <span className="text-sm font-bold">{error}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-[#3B82F6] transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-2xl text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-[#3B82F6]/10 focus:border-[#3B82F6] transition-all font-medium text-base shadow-sm"
                                        placeholder="name@company.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-[#3B82F6] transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-2xl text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-[#3B82F6]/10 focus:border-[#3B82F6] transition-all font-medium text-base shadow-sm"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white transition-colors p-2"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Forgot Password */}
                            <div className="flex justify-end">
                                <Link
                                    href="/mobile-ai-analyst/forgot-password"
                                    className="text-sm font-bold text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            {/* Submit - Ultra Premium Gradient CTA */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-gradient-to-r from-[#3B82F6] via-[#14B8A6] to-[#3B82F6] bg-[length:200%_100%] hover:bg-right text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 mt-8 shadow-xl shadow-[#3B82F6]/20"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Google Login */}
                        <div className="my-8">
                            <OrDivider />
                            <div className="mt-8">
                                <GoogleLoginButton
                                    mode="login"
                                    onError={(err) => setError(err)}
                                />
                            </div>
                        </div>

                        {/* Register link */}
                        <div className="text-center">
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                Don't have an account?{" "}
                                <Link href="/mobile-ai-analyst/register" className="text-[#14B8A6] font-black hover:text-[#0D9488] transition-colors ml-1">
                                    Create Account
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div >
    );
}

export default function MobileLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0F172A]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        }>
            <MobileLoginPageContent />
        </Suspense>
    );
}
