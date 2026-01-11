"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MobileLoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            // HARDCODED REDIRECT - No sessionStorage dependency
            router.push("/mobile-ai-analyst");
        } else {
            setError(result.error || "Login failed");
        }
    };

    return (
        <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-100 via-slate-50 to-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header */}
            <header className="px-4 py-4">
                <button
                    onClick={() => router.push('/mobile-ai-analyst')}
                    className="flex items-center gap-2 text-slate-500 font-medium"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Finny</span>
                </button>
            </header>

            {/* Content */}
            <main className="flex-1 flex flex-col justify-center px-6 pb-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50">
                            <img src="/ai-robot.png" alt="Finny AI" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-black text-slate-900 text-center mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-slate-500 text-center mb-8">
                        Sign in to continue with Finny
                    </p>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
                        >
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                                    placeholder="name@company.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 mt-6 shadow-lg shadow-blue-500/20"
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

                    {/* Register link */}
                    <p className="text-center text-slate-500 mt-8">
                        Don't have an account?{" "}
                        <Link href="/mobile-ai-analyst/register" className="text-blue-600 font-bold">
                            Create account
                        </Link>
                    </p>
                </motion.div>
            </main>
        </div>
    );
}
