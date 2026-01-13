"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight,
    Sparkles, CheckCircle, Loader2, AlertCircle, TrendingUp, Shield, Zap
} from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
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
            phone: formData.phone || undefined,
        });

        setIsLoading(false);

        if (result.success) {
            const redirectTo = sessionStorage.getItem("loginRedirect") || "/ai-analyst";
            sessionStorage.removeItem("loginRedirect");
            router.push(redirectTo);
        } else {
            setError(result.error || "Registration failed");
        }
    };

    const benefits = [
        { icon: Sparkles, text: "AI-powered analysis" },
        { icon: TrendingUp, text: "Real-time Egypt market data" },
        { icon: Shield, text: "Custom watchlists & alerts" },
    ];

    // Password strength indicator
    const getPasswordStrength = () => {
        const p = formData.password;
        if (!p) return { strength: 0, label: "", color: "" };
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
        <div className="min-h-screen w-full flex bg-[#0B1121] text-white overflow-hidden font-sans selection:bg-teal-500/30">

            {/* Left Panel - Visual/Brand */}
            <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-slate-950 items-center justify-center p-16">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_#0f766e_0%,_#0f172a_50%,_#020617_100%)]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />

                {/* Abstract Shapes */}
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-teal-500/20 rounded-full blur-[100px] opacity-40 animate-pulse duration-[8s]" />

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative z-20 max-w-md"
                >
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-16 h-16 relative flex items-center justify-center">
                            <div className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-xl" />
                            <img src="/app-icon.png" alt="Starta" className="w-16 h-16 object-contain relative z-10 drop-shadow-2xl" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-white">Starta</span>
                    </div>

                    <h1 className="text-5xl font-bold leading-tight mb-6 text-white">
                        Unlock Full <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">AI Analysis</span>
                    </h1>

                    <p className="text-lg text-slate-400 leading-relaxed mb-10">
                        Create your free account to ask Starta questions about the Egypt Stock Market.
                    </p>

                    <div className="space-y-6 mb-12">
                        {[
                            { icon: Sparkles, text: "Advanced AI Conversations" },
                            { icon: TrendingUp, text: "Deep Dive Fundamentals" },
                            { icon: Shield, text: "Daily Market Updates" }
                        ].map((benefit, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + idx * 0.1 }}
                                className="flex items-center gap-4 group"
                            >
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-teal-500/20 group-hover:border-teal-500/30 transition-all">
                                    <benefit.icon className="w-5 h-5 text-teal-400" />
                                </div>
                                <span className="text-lg text-slate-300 font-medium">{benefit.text}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Social Proof */}

                </motion.div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative z-10 overflow-y-auto w-full">
                {/* Mobile Background */}
                <div className="lg:hidden absolute inset-0 bg-[#0B1121]">
                    <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-teal-900/20 to-transparent" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg space-y-6 relative z-10 my-auto py-10"
                >
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-white">Create Account</h2>
                        <p className="mt-2 text-slate-400">Start your journey with Starta today</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3.5 pl-11 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-medium"
                                        placeholder="John Doe"
                                    />
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3.5 pl-11 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-medium"
                                        placeholder="name@company.com"
                                    />
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Phone Number <span className="text-slate-500 text-xs font-normal ml-1">(Optional)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3.5 pl-11 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-medium"
                                        placeholder="+966 50 123 4567"
                                    />
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                                <div className="relative group">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3.5 pl-11 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-medium"
                                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {/* Password Strength Meter */}
                                {formData.password && (
                                    <div className="mt-2.5 flex items-center gap-3">
                                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
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

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3.5 pl-11 pr-10 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all font-medium"
                                        placeholder="Retype password"
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                        <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl py-4 font-bold text-base shadow-lg shadow-teal-900/20 ring-1 ring-white/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="pt-6 text-center border-t border-slate-800">
                        <p className="text-slate-500">
                            Already have an account?{' '}
                            <Link href="/login" className="font-semibold text-teal-400 hover:text-teal-300 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </motion.div>

                {/* Footer simple mobile only */}
                <div className="lg:hidden mt-8 text-center pb-6">
                    <p className="text-xs text-slate-600">© 2026 Starta</p>
                </div>
            </div>
        </div>
    );
}
