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
        { icon: Sparkles, text: "Unlimited AI-powered analysis" },
        { icon: TrendingUp, text: "Real-time MENA market data" },
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
        <div className="min-h-screen w-full relative overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900" />

            {/* Animated orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 80, 0],
                        y: [0, -40, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, -60, 0],
                        y: [0, 60, 0],
                        scale: [1, 1.3, 1],
                    }}
                    transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, 40, 0],
                        y: [0, -40, 0],
                        scale: [1, 1.15, 1],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl"
                />
            </div>

            {/* Shiny grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                     linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Glowing line at top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

            {/* Content */}
            <div className="relative z-10 min-h-screen flex">
                {/* Left side - Form */}
                <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="w-full max-w-lg"
                    >
                        {/* Glassmorphism card */}
                        <div className="relative">
                            {/* Shiny border effect */}
                            <div className="absolute -inset-px bg-gradient-to-b from-teal-500/50 via-transparent to-blue-500/50 rounded-3xl opacity-50" />

                            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 lg:p-10 border border-white/10 shadow-2xl">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                                        <TrendingUp className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-white">FinanceHub Pro</h1>
                                        <p className="text-sm text-slate-400">Create your account</p>
                                    </div>
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
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                            <input
                                                type="text"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                                placeholder="name@company.com"
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Phone <span className="text-slate-500">(optional)</span>
                                        </label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                                placeholder="+966 50 123 4567"
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full pl-12 pr-12 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                                placeholder="Min 8 chars, 1 uppercase, 1 number"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {/* Password strength */}
                                        {formData.password && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${passwordStrength.strength}%` }}
                                                        className={`h-full ${passwordStrength.color} rounded-full`}
                                                    />
                                                </div>
                                                <span className="text-xs text-slate-400">{passwordStrength.label}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                                placeholder="Confirm your password"
                                            />
                                            {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                                <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:from-teal-500 hover:to-blue-500 hover:shadow-xl hover:shadow-teal-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-6 group relative overflow-hidden"
                                    >
                                        {/* Shiny effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <span className="relative">Create Account</span>
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* Login link */}
                                <p className="text-center text-slate-400 mt-6">
                                    Already have an account?{" "}
                                    <Link href="/login" className="text-teal-400 font-semibold hover:text-teal-300 transition-colors">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right side - Branding (hidden on mobile) */}
                <div className="hidden lg:flex flex-1 items-center justify-center p-12">
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-lg text-center"
                    >
                        {/* AI Robot illustration */}
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/30 to-blue-500/30 rounded-full blur-3xl scale-75" />
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="relative w-32 h-32 mx-auto bg-gradient-to-br from-teal-500/20 to-blue-500/20 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl"
                            >
                                <img src="/ai-robot.png" alt="Finny AI" className="w-20 h-20" />
                            </motion.div>
                        </div>

                        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                            Join <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">Thousands</span> of Traders
                        </h2>

                        <p className="text-lg text-slate-400 mb-10">
                            Get unlimited access to Finny, your personal AI financial analyst for MENA markets.
                        </p>

                        {/* Benefits */}
                        <div className="space-y-4">
                            {benefits.map((benefit, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 + idx * 0.1 }}
                                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center">
                                        <benefit.icon className="w-5 h-5 text-teal-400" />
                                    </div>
                                    <span className="text-white font-medium">{benefit.text}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Social proof */}
                        <div className="mt-10 flex items-center justify-center gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">10K+</div>
                                <div className="text-sm text-slate-400">Active Users</div>
                            </div>
                            <div className="w-px h-10 bg-slate-700" />
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">500+</div>
                                <div className="text-sm text-slate-400">Stocks Covered</div>
                            </div>
                            <div className="w-px h-10 bg-slate-700" />
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">24/7</div>
                                <div className="text-sm text-slate-400">AI Available</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
