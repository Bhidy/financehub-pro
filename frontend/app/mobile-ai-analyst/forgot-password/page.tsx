
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ArrowRight, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

type Step = "EMAIL" | "OTP" | "NEW_PASSWORD" | "SUCCESS";

export default function ForgotPasswordPage() {
    const router = useRouter();
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
            setError(err.response?.data?.detail || "Invalid code. Please checking your email.");
            // Clear invalid OTP for UX
            setOtp(["", "", "", ""]);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
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
        if (value.length > 1) value = value[0]; // limit to 1 char
        if (!/^\d*$/.test(value)) return; // numbers only

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-advance
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
        <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#0B1121] flex flex-col font-sans text-slate-900 dark:text-white transition-colors duration-300" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

            {/* Header */}
            <header className="px-4 py-4">
                <button
                    onClick={() => step === "EMAIL" ? router.push("/mobile-ai-analyst/login") : setStep("EMAIL")}
                    className="flex items-center gap-2 text-slate-500 hover:text-teal-600 transition-colors"
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
                                <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mb-6 text-teal-600 dark:text-teal-400">
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
                                        className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="name@company.com"
                                        autoComplete="email"
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    disabled={isLoading}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
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
                                    We sent a 4-digit code to <span className="text-teal-600 font-semibold">{email}</span>
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
                                            className="w-12 h-14 text-center text-2xl font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all caret-teal-500"
                                            inputMode="numeric"
                                        />
                                    ))}
                                </div>

                                {isLoading && (
                                    <div className="mt-8 flex justify-center text-teal-600 dark:text-teal-400">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    </div>
                                )}

                                {error && (
                                    <p className="text-center text-red-500 text-sm mt-6 animate-shake">
                                        {error}
                                    </p>
                                )}

                                <div className="mt-12 text-center">
                                    <p className="text-sm text-slate-500 mb-2">Didn't receive code?</p>
                                    <button
                                        onClick={handleRequestOtp}
                                        className="text-teal-600 font-medium hover:text-teal-700 flex items-center justify-center gap-2 mx-auto"
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
                                    Your identity is verified. Set your new robust password below.
                                </p>
                            </div>

                            <form onSubmit={handleResetPassword} className="space-y-6 mt-4 mb-auto">
                                <div>
                                    <label className="block text-sm font-medium mb-2">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                                        placeholder="Min. 8 characters"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                                        placeholder="Re-enter password"
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
                                        {error}
                                    </div>
                                )}

                                <button
                                    disabled={isLoading}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-teal-500/20 mt-4"
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
                            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400 animate-bounce-short">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <h1 className="text-3xl font-bold mb-4">Password Reset!</h1>
                            <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-xs mx-auto">
                                Your account has been successfully recovered. You can now log in with your new password.
                            </p>

                            <button
                                onClick={() => router.push("/mobile-ai-analyst/login")}
                                className="w-full max-w-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-xl transition-all hover:scale-[1.02]"
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
