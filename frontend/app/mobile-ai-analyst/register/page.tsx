"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, ArrowLeft, CheckCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import GoogleLoginButton, { OrDivider } from "@/components/GoogleLoginButton";

function MobileRegisterPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
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
            setError("Google sign-up failed. Please try again.");
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

        if (!formData.full_name.trim()) {
            setError("Please enter your full name");
            return;
        }
        if (!formData.email.trim()) {
            setError("Please enter your email");
            return;
        }
        if (formData.password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        if (!/[A-Z]/.test(formData.password)) {
            setError("Password must contain at least one uppercase letter");
            return;
        }
        if (!/[0-9]/.test(formData.password)) {
            setError("Password must contain at least one number");
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
            // HARDCODED REDIRECT - No sessionStorage dependency
            router.push("/mobile-ai-analyst");
        } else {
            setError(result.error || "Registration failed");
        }
    };

    // Password strength
    const getPasswordStrength = () => {
        const p = formData.password;
        if (!p) return { strength: 0, label: "", color: "bg-slate-200" };
        let score = 0;
        if (p.length >= 8) score++;
        if (/[A-Z]/.test(p)) score++;
        if (/[0-9]/.test(p)) score++;
        if (/[^A-Za-z0-9]/.test(p)) score++;

        if (score <= 1) return { strength: 25, label: "Weak", color: "bg-red-500" };
        if (score === 2) return { strength: 50, label: "Fair", color: "bg-orange-500" };
        if (score === 3) return { strength: 75, label: "Good", color: "bg-yellow-500" };
        return { strength: 100, label: "Strong", color: "bg-green-500" };
    };

    const passwordStrength = getPasswordStrength();

    return (
        <div className="min-h-[100dvh] w-full bg-slate-50 dark:bg-[#0B1121] flex flex-col font-sans selection:bg-teal-500/30 text-slate-900 dark:text-white transition-colors duration-300" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Background Effects */}
            <div className="fixed inset-0 bg-transparent dark:bg-[radial-gradient(circle_at_50%_0%,_#0f766e_0%,_#0B1121_50%)] pointer-events-none transition-opacity duration-300" />
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 dark:opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none" />

            {/* Header */}
            <header className="px-4 py-4 relative z-10">
                <button
                    onClick={() => router.push('/mobile-ai-analyst')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors font-medium"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Starta</span>
                </button>
            </header>

            {/* Content */}
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
                            <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl" />
                            <img src="/app-icon.png" alt="Starta" className="w-20 h-20 object-contain relative z-10 drop-shadow-2xl" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2 transition-colors">Create Account</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-center transition-colors">Join Starta for AI market analysis</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 dark:text-red-400"
                        >
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 transition-colors">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-medium"
                                    placeholder="John Doe"
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 transition-colors">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-medium"
                                    placeholder="name@company.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 transition-colors">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-11 pr-12 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-medium"
                                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {/* Strength bar */}
                            {formData.password && (
                                <div className="mt-2.5 flex items-center gap-3">
                                    <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
                                        <motion.div
                                            className={`h-full ${passwordStrength.color}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${passwordStrength.strength}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                    <span className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                                        {passwordStrength.label}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 transition-colors">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full pl-11 pr-12 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-medium"
                                    placeholder="Confirm your password"
                                    autoComplete="new-password"
                                />
                                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                    <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 mt-6 shadow-lg shadow-teal-500/20 dark:shadow-teal-900/20 ring-1 ring-white/10"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Google Sign Up */}
                    <OrDivider />
                    <GoogleLoginButton
                        mode="register"
                        onError={(err) => setError(err)}
                    />

                    {/* Login link */}
                    <div className="pt-6 text-center mt-4">
                        <p className="text-slate-500 dark:text-slate-500 text-sm">
                            Already have an account?{" "}
                            <Link href="/mobile-ai-analyst/login" className="text-teal-600 dark:text-teal-400 font-bold hover:text-teal-500 dark:hover:text-teal-300 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

export default function MobileRegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-[#0B1121]">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        }>
            <MobileRegisterPageContent />
        </Suspense>
    );
}
