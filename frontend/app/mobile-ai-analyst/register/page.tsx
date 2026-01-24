/**
 * ============================================================================
 * ULTRA-PREMIUM MOBILE REGISTER PAGE - WORLD-CLASS FINTECH DESIGN
 * ============================================================================
 * 
 * Enterprise-grade registration with:
 * - Desktop/Mobile responsive handling
 * - Animated gradients and glassmorphism
 * - Password strength meter
 * - Premium typography
 * 
 * ============================================================================
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
    AlertCircle, ArrowLeft, CheckCircle, Sparkles, BarChart3,
    TrendingUp, Shield, Zap, Check, Star, Users
} from "lucide-react";
import Link from "next/link";
import GoogleLoginButton, { OrDivider } from "@/components/GoogleLoginButton";
import { useMobileRoutes } from "../hooks/useMobileRoutes";
import { useDeviceDetect } from "@/hooks/useDeviceDetect";

function MobileRegisterPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register } = useAuth();
    const { getRoute } = useMobileRoutes();
    const { isDesktop, isSSR } = useDeviceDetect();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
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
            setError("Google sign-up failed. Please try again.");
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

        if (!formData.full_name.trim()) {
            setError("Please enter your full name");
            return;
        }
        if (!formData.email.trim()) {
            setError("Please enter your email");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);

        const result = await register({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
        });

        setIsLoading(false);

        if (result.success) {
            router.push(getRoute('home'));
        } else {
            setError(result.error || "Registration failed");
        }
    };

    // Password strength indicator
    const getPasswordStrength = () => {
        const p = formData.password;
        if (!p) return { strength: 0, label: "", color: "" };
        let score = 0;
        if (p.length >= 6) score++;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;

        if (score <= 1) return { strength: 20, label: "Weak", color: "bg-red-500" };
        if (score === 2) return { strength: 40, label: "Fair", color: "bg-orange-500" };
        if (score === 3) return { strength: 60, label: "Good", color: "bg-yellow-500" };
        if (score === 4) return { strength: 80, label: "Strong", color: "bg-[#14B8A6]" };
        return { strength: 100, label: "Excellent", color: "bg-green-500" };
    };

    const passwordStrength = getPasswordStrength();

    // Benefits for left panel (Desktop)
    const benefits = [
        { icon: Sparkles, text: "Unlimited AI Conversations", description: "Ask anything about stocks" },
        { icon: BarChart3, text: "Deep Fundamental Analysis", description: "Professional-grade metrics" },
        { icon: Shield, text: "Daily Market Updates", description: "Stay ahead of the market" },
    ];

    if (isSSR) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        );
    }

    // ========================================================================
    // DESKTOP LAYOUT - World-Class Split Screen
    // ========================================================================
    if (isDesktop) {
        return (
            <div className="min-h-screen w-full flex overflow-hidden bg-white dark:bg-[#0A0F1C]">
                {/* Left Panel - Premium Marketing */}
                <div className="hidden lg:flex w-[48%] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1C] via-[#0D1425] to-[#0A1628]" />

                    {/* Floating Orbs */}
                    <div className="absolute bottom-10 -right-20 w-[500px] h-[500px] bg-[#14B8A6]/25 rounded-full blur-[140px] animate-pulse" />
                    <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-[#3B82F6]/15 rounded-full blur-[120px] animate-pulse [animation-delay:1.5s]" />
                    <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-[#8B5CF6]/10 rounded-full blur-[100px] animate-pulse [animation-delay:3s]" />

                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.15)_0%,_transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.08)_0%,_transparent_50%)]" />

                    <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px'
                    }} />

                    <div className="relative z-10 flex flex-col justify-between px-12 xl:px-16 2xl:px-20 py-12 w-full h-full">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Link href={getRoute('home')} className="flex items-center gap-3">
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
                            </Link>
                        </motion.div>

                        <div className="flex-1 flex flex-col justify-center -mt-8">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                className="mb-6"
                            >
                                <h1 className="text-[44px] xl:text-[52px] 2xl:text-[58px] font-bold text-white leading-[1.05] tracking-tight mb-2">
                                    Unlock Full
                                </h1>
                                <h1 className="text-[44px] xl:text-[52px] 2xl:text-[58px] font-bold leading-[1.05] tracking-tight">
                                    <span className="bg-gradient-to-r from-[#14B8A6] via-[#2DD4BF] to-[#14B8A6] bg-clip-text text-transparent">
                                        AI Analysis
                                    </span>
                                </h1>
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="text-slate-400 text-lg xl:text-xl leading-relaxed mb-10 max-w-[460px]"
                            >
                                Create your free account to access professional-grade market intelligence for Egyptian stocks.
                            </motion.p>

                            <div className="space-y-3">
                                {benefits.map((benefit, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                                        className="group relative"
                                    >
                                        <div className="relative flex items-center gap-4 p-4 xl:p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.06] hover:border-[#14B8A6]/40 transition-all duration-500 cursor-default overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#14B8A6] via-[#3B82F6] to-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-[#14B8A6]/5 border border-[#14B8A6]/20 flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg shadow-[#14B8A6]/10">
                                                <benefit.icon className="w-5 h-5 text-[#14B8A6]" />
                                            </div>
                                            <div className="relative">
                                                <span className="text-white font-semibold text-[15px] group-hover:text-[#14B8A6] transition-colors duration-300 block">
                                                    {benefit.text}
                                                </span>
                                                <span className="text-slate-500 text-sm">{benefit.description}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                            className="flex items-center gap-4"
                        >
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 border-2 border-[#0A0F1C] flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                                        {String.fromCharCode(64 + i)}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-[#14B8A6]" />
                                <p className="text-slate-400 text-sm">
                                    Join <span className="text-white font-semibold">2,500+</span> traders
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Right Panel - Form (Shared Logic) */}
                <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 xl:px-16 2xl:px-24 py-8 relative overflow-y-auto">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.03)_0%,_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.06)_0%,_transparent_50%)]" />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-full max-w-[440px] mx-auto relative z-10"
                    >
                        {/* Desktop Header */}
                        <div className="mb-6">
                            <h1 className="text-3xl lg:text-[32px] font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                                Create Account
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-[15px]">
                                Start your journey with Starta today
                            </p>
                        </div>

                        {renderSharedForm(formData, setFormData, showPassword, setShowPassword, isLoading, error, setError, focusedField, setFocusedField, passwordStrength, handleSubmit, getRoute)}
                    </motion.div>
                </div>
            </div>
        );
    }

    // ========================================================================
    // MOBILE LAYOUT - Ultra Premium Single Column
    // ========================================================================
    return (
        <div className="min-h-[100dvh] w-full bg-[#F8FAFC] dark:bg-[#0B1121] flex flex-col font-sans transition-colors duration-300" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Background Effects */}
            <div className="fixed inset-0 bg-transparent dark:bg-[radial-gradient(circle_at_50%_0%,_#14B8A6_0%,_#0B1121_50%)] opacity-20 pointer-events-none" />

            <header className="px-4 py-4 relative z-10">
                <button
                    onClick={() => router.push(getRoute('home'))}
                    className="flex items-center gap-2 text-slate-500 hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white transition-colors font-medium"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Starta</span>
                </button>
            </header>

            <main className="flex-1 flex flex-col justify-center px-6 pb-10 overflow-y-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="py-6"
                >
                    {/* Logo area */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 relative flex items-center justify-center mb-4">
                            <div className="absolute inset-0 bg-[#14B8A6]/20 rounded-full blur-xl" />
                            <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center shadow-lg shadow-[#14B8A6]/30 text-white">
                                <TrendingUp className="w-8 h-8" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white mb-2">Create Account</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-center">Join Starta for AI market analysis</p>
                    </div>

                    {renderSharedForm(formData, setFormData, showPassword, setShowPassword, isLoading, error, setError, focusedField, setFocusedField, passwordStrength, handleSubmit, getRoute)}
                </motion.div>
            </main>
        </div>
    );
}

// Helper to render form fields (Shared between Mobile/Desktop to ensure consistency)
function renderSharedForm(formData: any, setFormData: any, showPassword: boolean, setShowPassword: any, isLoading: boolean, error: string | null, setError: any, focusedField: any, setFocusedField: any, passwordStrength: any, handleSubmit: any, getRoute: any) {
    return (
        <>
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="mb-5 overflow-hidden"
                    >
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Full Name
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'name' ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10' : ''}`}>
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'name' ? 'text-[#14B8A6]' : 'text-slate-400'}`} />
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            onFocus={() => setFocusedField('name')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                            placeholder="John Doe"
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Email address
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'email' ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10' : ''}`}>
                        <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'email' ? 'text-[#14B8A6]' : 'text-slate-400'}`} />
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                            placeholder="name@company.com"
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Password
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'password' ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10' : ''}`}>
                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-[#14B8A6]' : 'text-slate-400'}`} />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                            placeholder="Min 6 characters"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {/* Password Strength Meter */}
                    {formData.password && (
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full ${passwordStrength.color}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${passwordStrength.strength}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <span className={`text-xs font-semibold ${passwordStrength.color.replace('bg-', 'text-')}`}>
                                {passwordStrength.label}
                            </span>
                        </div>
                    )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Confirm Password
                    </label>
                    <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'confirm' ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10' : ''}`}>
                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'confirm' ? 'text-[#14B8A6]' : 'text-slate-400'}`} />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            onFocus={() => setFocusedField('confirm')}
                            onBlur={() => setFocusedField(null)}
                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                            placeholder="Confirm your password"
                        />
                        {formData.confirmPassword && formData.password === formData.confirmPassword && (
                            <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                        )}
                    </div>
                </div>

                {/* Premium Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 mt-4 overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] via-[#0D9488] to-[#14B8A6] bg-[length:200%_100%] group-hover:bg-right transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <div className="absolute inset-0 shadow-xl shadow-[#14B8A6]/30" />
                    <span className="relative text-white flex items-center gap-2">
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Get Started
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                            </>
                        )}
                    </span>
                </button>
            </form>

            {/* Divider */}
            <div className="my-6">
                <OrDivider />
            </div>

            {/* Google Sign Up */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                <div className="relative">
                    <GoogleLoginButton
                        mode="register"
                        onError={(err) => setError(err)}
                    />
                </div>
            </div>

            {/* Login link */}
            <div className="text-center mt-6">
                <p className="text-slate-500 dark:text-slate-400 text-[15px]">
                    Already have an account?{" "}
                    <Link href={getRoute('login')} className="text-[#14B8A6] font-bold hover:text-[#0D9488] transition-colors hover:underline underline-offset-2">
                        Sign in
                    </Link>
                </p>
            </div>
        </>
    );
}

export default function MobileRegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0F1C]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        }>
            <MobileRegisterPageContent />
        </Suspense>
    );
}
