"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Loader2, AlertCircle, TrendingUp, Shield, Zap, BarChart3 } from "lucide-react";
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
                router.push("/ai-analyst");
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
            const redirectTo = sessionStorage.getItem("loginRedirect") || "/ai-analyst";
            sessionStorage.removeItem("loginRedirect");
            router.push(redirectTo);
        } else {
            setError(result.error || "Login failed");
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white overflow-hidden font-sans selection:bg-[#14B8A6]/30">

            {/* Left Panel - Visual/Brand (Midnight Teal Theme) */}
            <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[#0F172A] items-center justify-center p-16">
                {/* Background Effects - Midnight Teal Gradient */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#14B8A6_0%,_#0F172A_40%,_#020617_100%)] opacity-80" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay" />

                {/* Subtle Teal Glow */}
                <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-[#14B8A6]/15 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#0F172A] to-transparent z-10" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative z-20 max-w-md"
                >
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-14 h-14 relative flex items-center justify-center">
                            <div className="absolute inset-0 bg-[#14B8A6]/20 rounded-2xl blur-xl" />
                            <img src="/app-icon.png" alt="Starta" className="w-14 h-14 object-contain relative z-10 drop-shadow-2xl" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-white">Starta</span>
                    </div>

                    <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6 text-white">
                        Your Personal <br />
                        <span className="text-[#14B8A6]">AI Market Analyst</span>
                    </h1>

                    <p className="text-lg text-slate-400 leading-relaxed mb-10">
                        Professional-grade financial intelligence for Egypt and Saudi markets. Get instant answers, analyze stocks, and make informed decisions.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        {[
                            { icon: Zap, label: "Instant Market Insights" },
                            { icon: BarChart3, label: "Deep Fundamental Analysis" },
                            { icon: Shield, label: "Institutional-Grade Data" }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/[0.08] backdrop-blur-sm">
                                <div className="p-2.5 bg-[#14B8A6]/10 rounded-lg">
                                    <item.icon className="w-5 h-5 text-[#14B8A6]" />
                                </div>
                                <span className="font-medium text-slate-200">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-24 relative z-10">
                {/* Mobile Background */}
                <div className="lg:hidden absolute inset-0 bg-slate-50 dark:bg-[#0F172A]">
                    <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-[#14B8A6]/[0.08] to-transparent" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md space-y-8 relative z-10"
                >
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">Sign in to your account to continue</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-12 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-md px-4 pl-11 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] transition-all font-medium"
                                        placeholder="name@company.com"
                                    />
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-md px-4 pl-11 pr-12 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 focus:border-[#14B8A6] transition-all font-medium"
                                        placeholder="Enter your password"
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-[#14B8A6] border-[#14B8A6]' : 'bg-slate-100 dark:bg-[#111827] border-slate-300 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-600'}`}>
                                    {rememberMe && <ArrowRight className="w-3 h-3 text-white rotate-[-45deg]" />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="hidden"
                                />
                                <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors">Remember me</span>
                            </label>
                            <button type="button" className="text-sm font-medium text-[#14B8A6] hover:text-[#0D9488] transition-colors">
                                Forgot password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-[#14B8A6] hover:bg-[#0D9488] text-white rounded-md font-semibold text-base shadow-lg shadow-[#14B8A6]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    {/* Google Login */}
                    <OrDivider />
                    <GoogleLoginButton
                        mode="login"
                        onError={(err) => setError(err)}
                    />

                    <div className="pt-6 text-center border-t border-slate-200 dark:border-white/[0.08]">
                        <p className="text-slate-500 dark:text-slate-500">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="font-semibold text-[#14B8A6] hover:text-[#0D9488] transition-colors">
                                Create free account
                            </Link>
                        </p>
                    </div>
                </motion.div>

                {/* Footer */}
                <div className="absolute bottom-6 left-0 right-0 text-center">
                    <p className="text-xs text-slate-500">© 2026 Starta. Secure & Encrypted.</p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0F172A]">
                <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
            </div>
        }>
            <LoginPageContent />
        </Suspense>
    );
}
