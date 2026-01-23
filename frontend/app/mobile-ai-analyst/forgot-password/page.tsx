"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ArrowRight, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useMobileRoutes } from "../hooks/useMobileRoutes";

type Step = "EMAIL" | "OTP" | "NEW_PASSWORD" | "SUCCESS";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { getRoute } = useMobileRoutes();
    const [step, setStep] = useState<Step>("EMAIL");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Data
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [resetToken, setResetToken] = useState<string | null>(null);

    // Step 1: Request OTP
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
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
        <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col font-sans text-[#0F172A] dark:text-white transition-colors duration-300" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

            {/* Header */}
            <header className="px-4 py-4">
                <button
                    onClick={() => step === "EMAIL" ? router.push(getRoute('login')) : setStep("EMAIL")}
                    className="flex items-center gap-2 text-slate-500 hover:text-[#14B8A6] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back</span>
                </button>
            </header>

            <main className="flex-1 flex flex-col px-6 pt-4 pb-10 max-w-md mx-auto w-full">

                <AnimatePresence mode="wait">
                    {/* STEP 1: EMAIL */}
                    {step === "EMAIL" && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            <div className="mb-8">
                                <div className="w-16 h-16 bg-[#14B8A6]/10 dark:bg-[#14B8A6]/20 rounded-xl flex items-center justify-center mb-6 text-[#14B8A6]">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <h1 className="text-3xl font-bold mb-3">Forgot Password?</h1>
                                <p className="text-slate-500 dark:text-slate-400">
                                    Enter your email address and we'll send you a verification code to reset your password.
                                </p>
                            </div>

                            <form onSubmit={handleRequestOtp} className="mt-auto mb-auto space-y-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-4 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] outline-none transition-all placeholder:text-slate-400"
                                        placeholder="name@company.com"
                                        autoComplete="email"
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-[#EF4444]/10 dark:bg-[#EF4444]/20 text-[#EF4444] text-sm rounded-lg flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-[#3B82F6] via-[#14B8A6] to-[#3B82F6] bg-[length:200%_100%] hover:bg-right text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-[#3B82F6]/30"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Code"}
                                    {!isLoading && <ArrowRight className="w-5 h-5" />}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* STEP 2: OTP */}
                    {step === "OTP" && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            <div className="mb-8">
                                <h1 className="text-2xl font-bold mb-2">Check your Email</h1>
                                <p className="text-slate-500 dark:text-slate-400">
                                    We sent a 4-digit code to <span className="text-[#14B8A6] font-semibold">{email}</span>
                                </p>
                            </div>

                            <div className="mt-8 mb-auto">
                                <label className="block text-sm font-medium mb-4 text-center text-slate-700 dark:text-slate-300">
                                    Enter Verification Code
                                </label>
                                <div className="flex gap-2 justify-center">
                                    {otp.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={(el) => { otpRefs.current[idx] = el; }}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                            className="w-12 h-14 text-center text-2xl font-bold rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 outline-none transition-all caret-[#3B82F6]"
                                            inputMode="numeric"
                                        />
                                    ))}
                                </div>

                                {isLoading && (
                                    <div className="mt-8 flex justify-center text-[#14B8A6]">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    </div>
                                )}

                                {error && (
                                    <p className="text-center text-[#EF4444] text-sm mt-6">
                                        {error}
                                    </p>
                                )}

                                <div className="mt-12 text-center">
                                    <p className="text-sm text-slate-500 mb-2">Didn't receive code?</p>
                                    <button
                                        onClick={handleRequestOtp}
                                        className="text-[#14B8A6] font-medium hover:text-[#0D9488] flex items-center justify-center gap-2 mx-auto"
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
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            <div className="mb-8">
                                <h1 className="text-2xl font-bold mb-2">Create New Password</h1>
                                <p className="text-slate-500 dark:text-slate-400">
                                    Your identity is verified. Set your new password below.
                                </p>
                            </div>

                            <form onSubmit={handleResetPassword} className="space-y-6 mt-4 mb-auto">
                                <div>
                                    <label className="block text-sm font-medium mb-2">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full p-4 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] outline-none"
                                        placeholder="Min. 8 characters"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full p-4 rounded-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6] outline-none"
                                        placeholder="Re-enter password"
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-[#EF4444]/10 dark:bg-[#EF4444]/20 text-[#EF4444] text-sm rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <button
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-[#3B82F6] via-[#14B8A6] to-[#3B82F6] bg-[length:200%_100%] hover:bg-right text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#3B82F6]/30 mt-4"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Reset Password"}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === "SUCCESS" && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-full text-center p-6"
                        >
                            <div className="w-24 h-24 bg-[#22C55E]/10 dark:bg-[#22C55E]/20 rounded-full flex items-center justify-center mb-6 text-[#22C55E]">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <h1 className="text-3xl font-bold mb-4">Password Reset!</h1>
                            <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-xs mx-auto">
                                Your account has been successfully recovered. You can now log in with your new password.
                            </p>

                            <button
                                onClick={() => router.push(getRoute('login'))}
                                className="w-full max-w-sm bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] font-bold py-4 rounded-lg transition-all hover:scale-[1.02]"
                            >
                                Back to Login
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
