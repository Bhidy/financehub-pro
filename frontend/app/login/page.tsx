/**
 * ============================================================================
 * ULTRA-PREMIUM LOGIN PAGE - WORLD-CLASS FINTECH DESIGN
 * ============================================================================
 * 
 * Enterprise-grade login experience with:
 * - Animated gradient backgrounds with floating orbs
 * - Glassmorphism feature cards
 * - Premium typography and spacing
 * - Smooth micro-interactions
 * - Professional fintech aesthetic
 * 
 * ============================================================================
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Zap, BarChart3, Shield, Check, ArrowRight, TrendingUp, Star } from "lucide-react";
import Link from "next/link";
import GoogleLoginButton, { OrDivider } from "@/components/GoogleLoginButton";

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);

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
                router.push("/");
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
            const redirectTo = sessionStorage.getItem("loginRedirect") || "/";
            sessionStorage.removeItem("loginRedirect");
            router.push(redirectTo);
        } else {
            setError(result.error || "Login failed");
        }
    };

    // Feature items for left panel
    const features = [
        { icon: Zap, text: "Instant Market Insights", description: "Real-time data analysis" },
        { icon: BarChart3, text: "Deep Fundamental Analysis", description: "Comprehensive stock metrics" },
        { icon: Shield, text: "Institutional-Grade Data", description: "Professional-level accuracy" },
    ];

    // Stats for social proof
    const stats = [
        { value: "2,500+", label: "Active Traders" },
        { value: "50K+", label: "Analyses Daily" },
        { value: "99.9%", label: "Uptime" },
    ];

    return (
        <div className="min-h-screen w-full flex overflow-hidden bg-white dark:bg-[#0A0F1C]">
            {/* ================================================================
                LEFT PANEL - Ultra Premium Dark Gradient with Animated Effects
                ================================================================ */}
            <div className="hidden lg:flex w-[48%] relative overflow-hidden">
                {/* Base Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1C] via-[#0D1425] to-[#0A1628]" />

                {/* Animated Floating Orbs */}
                <div className="absolute top-10 -left-32 w-[500px] h-[500px] bg-[#14B8A6]/25 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-10 right-0 w-[400px] h-[400px] bg-[#3B82F6]/15 rounded-full blur-[120px] animate-pulse [animation-delay:1.5s]" />
                <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-[#14B8A6]/10 rounded-full blur-[100px] animate-pulse [animation-delay:3s]" />
                <div className="absolute bottom-1/3 -left-10 w-[250px] h-[250px] bg-[#8B5CF6]/10 rounded-full blur-[80px] animate-pulse [animation-delay:2s]" />

                {/* Mesh Gradient Overlays */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.15)_0%,_transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(59,130,246,0.08)_0%,_transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.05)_0%,_transparent_40%)]" />

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }} />

                {/* Noise Texture */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between px-12 xl:px-16 2xl:px-20 py-12 w-full h-full">
                    {/* Top Section - Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#14B8A6] rounded-xl blur-xl opacity-60" />
                                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center shadow-lg shadow-[#14B8A6]/30">
                                    <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <span className="text-xl font-bold text-white tracking-tight">Starta</span>
                            <div className="ml-2 px-2 py-0.5 bg-[#14B8A6]/20 rounded-full">
                                <span className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-wider">PRO</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Middle Section - Main Content */}
                    <div className="flex-1 flex flex-col justify-center -mt-8">
                        {/* Main Headline with Gradient */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="mb-6"
                        >
                            <h1 className="text-[44px] xl:text-[52px] 2xl:text-[58px] font-bold text-white leading-[1.05] tracking-tight mb-2">
                                Your Personal
                            </h1>
                            <h1 className="text-[44px] xl:text-[52px] 2xl:text-[58px] font-bold leading-[1.05] tracking-tight">
                                <span className="bg-gradient-to-r from-[#14B8A6] via-[#2DD4BF] to-[#14B8A6] bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient">
                                    AI Market Analyst
                                </span>
                            </h1>
                        </motion.div>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-slate-400 text-lg xl:text-xl leading-relaxed mb-10 max-w-[460px]"
                        >
                            Professional-grade financial intelligence for the Egyptian market.
                            Get instant answers, analyze stocks, and make informed decisions.
                        </motion.p>

                        {/* Premium Feature Cards with Glassmorphism */}
                        <div className="space-y-3">
                            {features.map((feature, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                                    className="group relative"
                                >
                                    {/* Glassmorphism Card */}
                                    <div className="relative flex items-center gap-4 p-4 xl:p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.06] hover:border-[#14B8A6]/40 transition-all duration-500 cursor-default overflow-hidden">
                                        {/* Animated Gradient Line on Left */}
                                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#14B8A6] via-[#3B82F6] to-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        {/* Hover Glow Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6]/0 via-[#14B8A6]/5 to-[#14B8A6]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        {/* Icon Container */}
                                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-[#14B8A6]/5 border border-[#14B8A6]/20 flex items-center justify-center group-hover:scale-110 group-hover:border-[#14B8A6]/40 transition-all duration-300 shadow-lg shadow-[#14B8A6]/10">
                                            <feature.icon className="w-5 h-5 text-[#14B8A6]" />
                                        </div>

                                        {/* Text */}
                                        <div className="relative">
                                            <span className="text-white font-semibold text-[15px] group-hover:text-[#14B8A6] transition-colors duration-300 block">
                                                {feature.text}
                                            </span>
                                            <span className="text-slate-500 text-sm">{feature.description}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Section - Stats & Trust */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="space-y-6"
                    >
                        {/* Stats Row */}
                        <div className="flex items-center gap-8">
                            {stats.map((stat, idx) => (
                                <div key={idx} className="text-center">
                                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Trust Badges */}
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 border-2 border-[#0A0F1C] flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                                        {String.fromCharCode(64 + i)}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                ))}
                            </div>
                            <p className="text-slate-400 text-sm">
                                <span className="text-white font-semibold">4.9</span> rating from traders
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ================================================================
                RIGHT PANEL - Premium Light Form
                ================================================================ */}
            <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 xl:px-20 2xl:px-28 py-10 relative overflow-hidden">
                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.03)_0%,_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.06)_0%,_transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(59,130,246,0.02)_0%,_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_bottom_left,_rgba(59,130,246,0.04)_0%,_transparent_50%)]" />

                {/* Mobile Header - Logo */}
                <div className="lg:hidden mb-8 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-lg">Starta</span>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-[420px] mx-auto relative z-10"
                >
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl lg:text-[32px] font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-[15px]">
                            Sign in to your account to continue
                        </p>
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
                                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Email address
                            </label>
                            <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'email'
                                ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10'
                                : ''
                                }`}>
                                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'email' ? 'text-[#14B8A6]' : 'text-slate-400'
                                    }`} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                                    placeholder="name@company.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Password
                            </label>
                            <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'password'
                                ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10'
                                : ''
                                }`}>
                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-[#14B8A6]' : 'text-slate-400'
                                    }`} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me + Forgot Password */}
                        <div className="flex items-center justify-between py-1">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <div
                                    onClick={() => setRememberMe(!rememberMe)}
                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${rememberMe
                                        ? "bg-[#14B8A6] border-[#14B8A6] scale-105 shadow-lg shadow-[#14B8A6]/30"
                                        : "border-slate-300 dark:border-slate-600 group-hover:border-[#14B8A6]/50"
                                        }`}
                                >
                                    <motion.div
                                        initial={false}
                                        animate={{ scale: rememberMe ? 1 : 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Check className="w-3 h-3 text-white" />
                                    </motion.div>
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-400 select-none">Remember me</span>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-sm font-semibold text-[#14B8A6] hover:text-[#0D9488] transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Premium Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="relative w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 mt-2 overflow-hidden group"
                        >
                            {/* Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] via-[#0D9488] to-[#14B8A6] bg-[length:200%_100%] group-hover:bg-right transition-all duration-500" />

                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                            {/* Shadow */}
                            <div className="absolute inset-0 shadow-xl shadow-[#14B8A6]/30" />

                            {/* Content */}
                            <span className="relative text-white flex items-center gap-2">
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                                    </>
                                )}
                            </span>
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-7">
                        <OrDivider />
                    </div>

                    {/* Google Login - Enhanced */}
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                        <div className="relative">
                            <GoogleLoginButton
                                mode="login"
                                onError={(err) => setError(err)}
                            />
                        </div>
                    </div>

                    {/* Register link */}
                    <div className="text-center mt-8">
                        <p className="text-slate-500 dark:text-slate-400 text-[15px]">
                            Don't have an account?{" "}
                            <Link href="/register" className="text-[#14B8A6] font-bold hover:text-[#0D9488] transition-colors hover:underline underline-offset-2">
                                Create free account
                            </Link>
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-10 pt-8 border-t border-slate-100 dark:border-white/5">
                        <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                            <Shield className="w-3.5 h-3.5" />
                            © 2026 Starta. Secure & Encrypted.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0F1C]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    );
}
