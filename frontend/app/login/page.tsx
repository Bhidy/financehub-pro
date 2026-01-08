"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Loader2, AlertCircle, TrendingUp, Shield, Zap } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
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
            const redirectTo = sessionStorage.getItem("loginRedirect") || "/ai-analyst";
            sessionStorage.removeItem("loginRedirect");
            router.push(redirectTo);
        } else {
            setError(result.error || "Login failed");
        }
    };

    return (
        <div className="min-h-screen w-full relative overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />

            {/* Animated orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, -80, 0],
                        y: [0, 80, 0],
                        scale: [1, 1.3, 1],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, 60, 0],
                        y: [0, 60, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl"
                />
            </div>

            {/* Shiny grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                     linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
            />

            {/* Glowing line at top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

            {/* Content */}
            <div className="relative z-10 min-h-screen flex">
                {/* Left side - Branding (hidden on mobile) */}
                <div className="hidden lg:flex flex-1 items-center justify-center p-12">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-lg"
                    >
                        {/* Logo */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <TrendingUp className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">FinanceHub</h1>
                                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Pro Edition</span>
                            </div>
                        </div>

                        <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                            Unlock the Power of
                            <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent"> AI-Driven </span>
                            Market Intelligence
                        </h2>

                        <p className="text-lg text-slate-400 mb-10">
                            Access real-time analytics, AI-powered insights, and comprehensive market data for MENA region stocks.
                        </p>

                        {/* Feature cards */}
                        <div className="space-y-4">
                            {[
                                { icon: Zap, title: "Real-time Data", desc: "Live market updates & quotes" },
                                { icon: Sparkles, title: "AI Analysis", desc: "Powered by Finny AI assistant" },
                                { icon: Shield, title: "Enterprise Security", desc: "Bank-grade data protection" },
                            ].map((feature, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.1 }}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center">
                                        <feature.icon className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{feature.title}</h3>
                                        <p className="text-sm text-slate-400">{feature.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Right side - Login Form */}
                <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-full max-w-md"
                    >
                        {/* Glassmorphism card */}
                        <div className="relative">
                            {/* Shiny border effect */}
                            <div className="absolute -inset-px bg-gradient-to-b from-blue-500/50 via-transparent to-teal-500/50 rounded-3xl opacity-50" />

                            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 lg:p-10 border border-white/10 shadow-2xl">
                                {/* Mobile logo */}
                                <div className="lg:hidden flex items-center gap-3 mb-8">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                        <TrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-white">FinanceHub Pro</h1>
                                    </div>
                                </div>

                                {/* Header */}
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">Welcome back</h2>
                                    <p className="text-slate-400">Sign in to continue to your dashboard</p>
                                </div>

                                {/* Error message */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400"
                                    >
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <span className="text-sm">{error}</span>
                                    </motion.div>
                                )}

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder="name@company.com"
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-12 pr-12 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Remember me & Forgot password */}
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                            />
                                            <span className="text-sm text-slate-400">Remember me</span>
                                        </label>
                                        <button type="button" className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                            Forgot password?
                                        </button>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:from-blue-500 hover:to-teal-500 hover:shadow-xl hover:shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-8 group relative overflow-hidden"
                                    >
                                        {/* Shiny effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <span className="relative">Sign In</span>
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* Register link */}
                                <p className="text-center text-slate-400 mt-8">
                                    Don't have an account?{" "}
                                    <Link href="/register" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
                                        Create account
                                    </Link>
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <p className="text-center text-sm text-slate-500 mt-8">
                            © 2026 FinanceHub Pro. All rights reserved.
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
