/**
 * ============================================================================
 * ULTRA-PREMIUM FORGOT PASSWORD PAGE - WORLD-CLASS FINTECH DESIGN
 * ============================================================================
 * 
 * Enterprise-grade password recovery with:
 * - Two-column desktop layout matching login/register
 * - Multi-step flow (Email → OTP → New Password → Success)
 * - Animated transitions between steps
 * - Premium OTP input with auto-focus
 * 
 * ============================================================================
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ArrowRight, CheckCircle2, RefreshCw, AlertCircle, Lock, TrendingUp, Shield, Mail, Sparkles, BarChart3, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import Link from "next/link";

type Step = "EMAIL" | "OTP" | "NEW_PASSWORD" | "SUCCESS";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("EMAIL");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Form Data
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetToken, setResetToken] = useState<string | null>(null);

    // Step 1: Request OTP
    const handleRequestOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError(null);
        if (!email.includes("@")) {
            setError("Please enter a valid email address");
            return;
        }

        setIsLoading(true);
        try {
            await api.post("/auth/forgot-password", { email });
            setStep("OTP");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to send code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async () => {
        const code = otp.join("");
        if (code.length !== 4) {
            setError("Please enter the complete 4-digit code");
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
            const res = await api.post("/auth/verify-otp", { email, code });
            setResetToken(res.data.reset_token);
            setStep("NEW_PASSWORD");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Invalid code. Please check your email.");
            setOtp(["", "", "", ""]);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        try {
            await api.post("/auth/reset-password-confirm", {
                token: resetToken,
                new_password: newPassword
            });
            setStep("SUCCESS");
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to reset password.");
        } finally {
            setIsLoading(false);
        }
    };

    // OTP Input Logic
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value[0];
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 3) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // Auto-submit OTP when filled
    useEffect(() => {
        if (otp.join("").length === 4 && !isLoading && step === "OTP") {
            handleVerifyOtp();
        }
    }, [otp]);

    return (
        <div className="min-h-screen w-full flex overflow-hidden bg-white dark:bg-[#0A0F1C]">
            {/* ================================================================
                LEFT PANEL - Ultra Premium Dark Gradient with Benefits
                ================================================================ */}
            <div className="hidden lg:flex w-[48%] relative overflow-hidden">
                {/* Base Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1C] via-[#0D1425] to-[#0A1628]" />

                {/* Animated Floating Orbs */}
                <div className="absolute bottom-10 -right-20 w-[500px] h-[500px] bg-[#14B8A6]/25 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-[#3B82F6]/15 rounded-full blur-[120px] animate-pulse [animation-delay:1.5s]" />
                <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-[#8B5CF6]/10 rounded-full blur-[100px] animate-pulse [animation-delay:3s]" />

                {/* Mesh Gradient Overlays */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.15)_0%,_transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.08)_0%,_transparent_50%)]" />

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }} />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between px-12 xl:px-16 2xl:px-20 py-12 w-full h-full">
                    {/* Top Section - Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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

                    {/* Middle Section - Main Content */}
                    <div className="flex-1 flex flex-col justify-center -mt-8">
                        {/* Main Headline */}
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

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-slate-400 text-lg xl:text-xl leading-relaxed mb-10 max-w-[460px]"
                        >
                            Recover your account to continue accessing professional-grade market intelligence.
                        </motion.p>

                        {/* Premium Benefit Cards */}
                        <div className="space-y-3">
                            {[
                                { icon: Sparkles, text: "Unlimited AI Conversations", description: "Ask anything about stocks" },
                                { icon: BarChart3, text: "Deep Fundamental Analysis", description: "Professional-grade metrics" },
                                { icon: Shield, text: "Daily Market Updates", description: "Stay ahead of the market" },
                            ].map((benefit, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                                    className="group relative"
                                >
                                    <div className="relative flex items-center gap-4 p-4 xl:p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.06] hover:border-[#14B8A6]/40 transition-all duration-500 cursor-default overflow-hidden">
                                        {/* Animated Gradient Line */}
                                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#14B8A6] via-[#3B82F6] to-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        {/* Icon Container */}
                                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-[#14B8A6]/5 border border-[#14B8A6]/20 flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg shadow-[#14B8A6]/10">
                                            <benefit.icon className="w-5 h-5 text-[#14B8A6]" />
                                        </div>

                                        {/* Text */}
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

                    {/* Bottom Section - Social Proof */}
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

            {/* ================================================================
                RIGHT PANEL - Form Content
                ================================================================ */}
            <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 xl:px-20 2xl:px-28 py-10 relative overflow-hidden">
                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.03)_0%,_transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.06)_0%,_transparent_50%)]" />

                {/* Mobile Header */}
                <div className="lg:hidden mb-6">
                    <button
                        onClick={() => step === "EMAIL" ? router.push("/login") : setStep("EMAIL")}
                        className="flex items-center gap-2 text-slate-500 hover:text-[#14B8A6] transition-colors mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </button>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-lg">Starta</span>
                    </div>
                </div>

                {/* Desktop Back Button */}
                <div className="hidden lg:block absolute top-8 left-12">
                    <button
                        onClick={() => step === "EMAIL" ? router.push("/login") : setStep("EMAIL")}
                        className="flex items-center gap-2 text-slate-500 hover:text-[#14B8A6] transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to login</span>
                    </button>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-[420px] mx-auto relative z-10"
                >
                    <AnimatePresence mode="wait">
                        {/* STEP 1: EMAIL */}
                        {step === "EMAIL" && (
                            <motion.div
                                key="email-step"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >


                                <h1 className="text-3xl lg:text-[32px] font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                                    Forgot Password?
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 text-[15px] mb-8">
                                    Enter your email address and we'll send you a verification code to reset your password.
                                </p>

                                {/* Error */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400"
                                    >
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <span className="text-sm font-medium">{error}</span>
                                    </motion.div>
                                )}

                                <form onSubmit={handleRequestOtp} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Email Address
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
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* Premium Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="relative w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 mt-2 overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] via-[#0D9488] to-[#14B8A6] bg-[length:200%_100%] group-hover:bg-right transition-all duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                        <div className="absolute inset-0 shadow-xl shadow-[#14B8A6]/30" />
                                        <span className="relative text-white flex items-center gap-2">
                                            {isLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    Send Code
                                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </form>

                                {/* Back to login */}
                                <div className="text-center mt-8">
                                    <Link href="/login" className="text-[#14B8A6] font-semibold hover:text-[#0D9488] transition-colors text-sm">
                                        ← Back to Sign In
                                    </Link>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: OTP */}
                        {step === "OTP" && (
                            <motion.div
                                key="otp-step"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h1 className="text-3xl lg:text-[32px] font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                                    Check your Email
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 text-[15px] mb-8">
                                    We sent a 4-digit code to <span className="text-[#14B8A6] font-semibold">{email}</span>
                                </p>

                                {/* OTP Inputs */}
                                <div className="space-y-6">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">
                                        Enter Verification Code
                                    </label>
                                    <div className="flex gap-3 justify-center">
                                        {otp.map((digit, idx) => (
                                            <input
                                                key={idx}
                                                ref={(el) => { otpRefs.current[idx] = el; }}
                                                type="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(idx, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                                className="w-16 h-16 text-center text-2xl font-bold rounded-xl bg-slate-50 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/20 outline-none transition-all text-slate-900 dark:text-white"
                                                inputMode="numeric"
                                                autoFocus={idx === 0}
                                            />
                                        ))}
                                    </div>

                                    {isLoading && (
                                        <div className="flex justify-center text-[#14B8A6]">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        </div>
                                    )}

                                    {error && (
                                        <p className="text-center text-red-500 text-sm font-medium">{error}</p>
                                    )}

                                    <div className="text-center pt-4">
                                        <p className="text-sm text-slate-500 mb-2">Didn't receive code?</p>
                                        <button
                                            onClick={() => handleRequestOtp()}
                                            className="text-[#14B8A6] font-semibold hover:text-[#0D9488] flex items-center justify-center gap-2 mx-auto transition-colors"
                                        >
                                            <RefreshCw className="w-4 h-4" /> Resend Email
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: NEW PASSWORD */}
                        {step === "NEW_PASSWORD" && (
                            <motion.div
                                key="password-step"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h1 className="text-3xl lg:text-[32px] font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                                    Create New Password
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 text-[15px] mb-8">
                                    Your identity is verified. Set your new password below.
                                </p>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400"
                                    >
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <span className="text-sm font-medium">{error}</span>
                                    </motion.div>
                                )}

                                <form onSubmit={handleResetPassword} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            New Password
                                        </label>
                                        <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'newpass'
                                            ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10'
                                            : ''
                                            }`}>
                                            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'newpass' ? 'text-[#14B8A6]' : 'text-slate-400'
                                                }`} />
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                onFocus={() => setFocusedField('newpass')}
                                                onBlur={() => setFocusedField(null)}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                                                placeholder="Min. 6 characters"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            Confirm Password
                                        </label>
                                        <div className={`relative rounded-xl transition-all duration-300 ${focusedField === 'confirm'
                                            ? 'ring-2 ring-[#14B8A6]/30 shadow-lg shadow-[#14B8A6]/10'
                                            : ''
                                            }`}>
                                            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'confirm' ? 'text-[#14B8A6]' : 'text-slate-400'
                                                }`} />
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                onFocus={() => setFocusedField('confirm')}
                                                onBlur={() => setFocusedField(null)}
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#14B8A6] transition-all text-[15px]"
                                                placeholder="Re-enter password"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="relative w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 mt-2 overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] via-[#0D9488] to-[#14B8A6] bg-[length:200%_100%] group-hover:bg-right transition-all duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                        <div className="absolute inset-0 shadow-xl shadow-[#14B8A6]/30" />
                                        <span className="relative text-white flex items-center gap-2">
                                            {isLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                "Reset Password"
                                            )}
                                        </span>
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* STEP 4: SUCCESS */}
                        {step === "SUCCESS" && (
                            <motion.div
                                key="success-step"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                                className="text-center"
                            >
                                <div className="w-24 h-24 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                                    Password Reset!
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-xs mx-auto">
                                    Your account has been successfully recovered. You can now log in with your new password.
                                </p>

                                <button
                                    onClick={() => router.push("/login")}
                                    className="relative w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-300 overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] via-[#0D9488] to-[#14B8A6] bg-[length:200%_100%] group-hover:bg-right transition-all duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <div className="absolute inset-0 shadow-xl shadow-[#14B8A6]/30" />
                                    <span className="relative text-white flex items-center gap-2">
                                        Back to Login
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
