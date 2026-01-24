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
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Zap, BarChart3, Shield, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import GoogleLoginButton, { OrDivider } from "@/components/GoogleLoginButton";
import { useMobileRoutes } from "../hooks/useMobileRoutes";
import { useDeviceDetect } from "@/hooks/useDeviceDetect";

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const { getRoute } = useMobileRoutes();
    const { isDesktop, isSSR } = useDeviceDetect();

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
                router.push(getRoute('home'));
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
            router.push(getRoute('home'));
        } else {
            setError(result.error || "Login failed");
        }
    };

    // Loading state
    if (isSSR) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center bg-[#0A0F1C]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        );
    }

    // Feature items for left panel
    const features = [
        { icon: Zap, text: "Instant Market Insights", delay: 0.1 },
        { icon: BarChart3, text: "Deep Fundamental Analysis", delay: 0.2 },
        { icon: Shield, text: "Institutional-Grade Data", delay: 0.3 },
    ];

    // ========================================================================
    // DESKTOP LAYOUT - Ultra Premium Two Column Split
    // ========================================================================
    if (isDesktop) {
        return (
            <div className="min-h-screen w-full flex overflow-hidden">
                {/* ================================================================
                    LEFT PANEL - Premium Dark Gradient with Animated Effects
                    ================================================================ */}
                <div className="hidden lg:flex w-[48%] relative overflow-hidden">
                    {/* Animated Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1C] via-[#0D1425] to-[#0A1628]" />

                    {/* Animated Floating Orbs */}
                    <div className="absolute top-20 -left-20 w-96 h-96 bg-[#14B8A6]/30 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#3B82F6]/20 rounded-full blur-[100px] animate-pulse [animation-delay:1s]" />
                    <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#14B8A6]/15 rounded-full blur-[80px] animate-pulse [animation-delay:2s]" />

                    {/* Mesh Gradient Overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.15)_0%,_transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(59,130,246,0.1)_0%,_transparent_50%)]" />

                    {/* Subtle Grid Pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }} />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-16 w-full">
                        {/* Logo with Glow */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="mb-16"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[#14B8A6] rounded-xl blur-xl opacity-50" />
                                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center shadow-lg">
                                        <BarChart3 className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <span className="text-xl font-bold text-white tracking-tight">Starta</span>
                            </div>
                        </motion.div>

                        {/* Main Headline with Gradient */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="mb-8"
                        >
                            <h1 className="text-[42px] xl:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-3">
                                Your Personal
                            </h1>
                            <h1 className="text-[42px] xl:text-5xl font-bold leading-[1.1] tracking-tight">
                                <span className="bg-gradient-to-r from-[#14B8A6] via-[#2DD4BF] to-[#14B8A6] bg-clip-text text-transparent">
                                    AI Market Analyst
                                </span>
                            </h1>
                        </motion.div>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-slate-400 text-lg leading-relaxed mb-14 max-w-[420px]"
                        >
                            Professional-grade financial intelligence for Egypt and Saudi markets.
                            Get instant answers, analyze stocks, and make informed decisions.
                        </motion.p>

                        {/* Premium Feature Cards */}
                        <div className="space-y-4">
                            {features.map((feature, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 + feature.delay }}
                                    className="group relative"
                                >
                                    {/* Glassmorphism Card */}
                                    <div className="relative flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:bg-white/[0.06] hover:border-[#14B8A6]/30 transition-all duration-300 cursor-default overflow-hidden">
                                        {/* Hover Glow Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6]/0 via-[#14B8A6]/5 to-[#14B8A6]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        {/* Icon Container */}
                                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-[#14B8A6]/5 border border-[#14B8A6]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <feature.icon className="w-5 h-5 text-[#14B8A6]" />
                                        </div>

                                        {/* Text */}
                                        <span className="relative text-white font-medium text-[15px] group-hover:text-[#14B8A6] transition-colors duration-300">
                                            {feature.text}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Trust Badge */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                            className="mt-16 flex items-center gap-3"
                        >
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-[#0A0F1C] flex items-center justify-center text-[10px] font-bold text-white">
                                        {String.fromCharCode(64 + i)}
                                    </div>
                                ))}
                            </div>
                            <p className="text-slate-500 text-sm">
                                <span className="text-white font-semibold">2,500+</span> traders trust Starta
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* ================================================================
                    RIGHT PANEL - Premium Light Form
                    ================================================================ */}
                <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-12 bg-white dark:bg-[#0F172A] relative overflow-hidden">
                    {/* Subtle Background Pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.03)_0%,_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.05)_0%,_transparent_50%)]" />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-full max-w-[420px] mx-auto relative z-10"
                    >
                        {/* Header */}
                        <div className="mb-10">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                                Welcome back
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Email address
                                </label>
                                <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'email'
                                        ? 'ring-2 ring-[#14B8A6]/20 shadow-lg shadow-[#14B8A6]/5'
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
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-sm"
                                        placeholder="name@company.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Password
                                </label>
                                <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'password'
                                        ? 'ring-2 ring-[#14B8A6]/20 shadow-lg shadow-[#14B8A6]/5'
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
                                        className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-sm"
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
                                                ? "bg-[#14B8A6] border-[#14B8A6] scale-105"
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
                                    href={getRoute('forgotPassword')}
                                    className="text-sm font-medium text-[#14B8A6] hover:text-[#0D9488] transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            {/* Premium Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="relative w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 mt-4 overflow-hidden group"
                            >
                                {/* Gradient Background */}
                                <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] via-[#0D9488] to-[#14B8A6] bg-[length:200%_100%] group-hover:bg-right transition-all duration-500" />

                                {/* Shine Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                                {/* Shadow */}
                                <div className="absolute inset-0 shadow-xl shadow-[#14B8A6]/30" />

                                {/* Content */}
                                <span className="relative text-white flex items-center gap-2">
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Sign In
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="my-8">
                            <OrDivider />
                        </div>

                        {/* Google Login */}
                        <div className="relative">
                            <GoogleLoginButton
                                mode="login"
                                onError={(err) => setError(err)}
                            />
                        </div>

                        {/* Register link */}
                        <div className="text-center mt-8">
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Don't have an account?{" "}
                                <Link href={getRoute('register')} className="text-[#14B8A6] font-semibold hover:text-[#0D9488] transition-colors hover:underline">
                                    Create free account
                                </Link>
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-12 pt-8 border-t border-slate-100 dark:border-white/5">
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

    // ========================================================================
    // MOBILE LAYOUT - Ultra Premium Single Column
    // ========================================================================
    return (
        <div className="relative w-full min-h-[100dvh] bg-white dark:bg-[#0A0F1C] overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0">
                <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-[#14B8A6]/5 to-transparent dark:from-[#14B8A6]/10" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#14B8A6]/5 dark:bg-[#14B8A6]/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 flex flex-col min-h-[100dvh] p-6">
                {/* Header */}
                <header className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">Starta</span>
                    </div>
                </header>

                {/* Form Content */}
                <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Header */}
                        <div className="mb-8 text-center">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                Welcome back
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Email address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all text-sm"
                                        placeholder="name@company.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/20 transition-all text-sm"
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me + Forgot Password */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div
                                        onClick={() => setRememberMe(!rememberMe)}
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${rememberMe
                                                ? "bg-[#14B8A6] border-[#14B8A6]"
                                                : "border-slate-300 dark:border-slate-600"
                                            }`}
                                    >
                                        {rememberMe && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
                                </label>
                                <Link
                                    href={getRoute('forgotPassword')}
                                    className="text-sm font-medium text-[#14B8A6] hover:text-[#0D9488] transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-[#14B8A6]/20 mt-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="my-6">
                            <OrDivider />
                        </div>

                        {/* Google Login */}
                        <GoogleLoginButton
                            mode="login"
                            onError={(err) => setError(err)}
                        />

                        {/* Register link */}
                        <div className="text-center mt-6">
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Don't have an account?{" "}
                                <Link href={getRoute('register')} className="text-[#14B8A6] font-semibold hover:text-[#0D9488] transition-colors">
                                    Create free account
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <div className="text-center py-4">
                    <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Shield className="w-3.5 h-3.5" />
                        © 2026 Starta. Secure & Encrypted.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function MobileLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-white dark:bg-[#0A0F1C]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    );
}
