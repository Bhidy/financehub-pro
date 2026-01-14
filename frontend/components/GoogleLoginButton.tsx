"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface GoogleLoginButtonProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    redirectUri?: string;
    className?: string;
    mode?: "login" | "register";
    isMobile?: boolean;
}

// Official Google "G" logo SVG
const GoogleLogo = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0">
        <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

export default function GoogleLoginButton({
    onSuccess,
    onError,
    redirectUri,
    className = "",
    mode = "login",
    isMobile,
}: GoogleLoginButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);

        try {
            // Detect mobile from current URL path if not explicitly set
            const currentPath = window.location.pathname;
            const isMobileFlow = isMobile ?? currentPath.includes("/mobile-ai-analyst");

            // Get the Google OAuth URL from our backend
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://bhidy-financehub-api.hf.space";
            const callbackUrl = redirectUri || `${window.location.origin}/api/auth/google/callback`;

            // Create state parameter to track mobile vs desktop
            const stateParam = encodeURIComponent(JSON.stringify({ mobile: isMobileFlow }));

            const response = await fetch(
                `${baseUrl}/api/v1/auth/google/url?redirect_uri=${encodeURIComponent(callbackUrl)}&state=${stateParam}`
            );

            if (!response.ok) {
                throw new Error("Failed to get Google auth URL");
            }

            const data = await response.json();

            // Redirect to Google OAuth
            window.location.href = data.auth_url;
        } catch (error: any) {
            console.error("Google login error:", error);
            onError?.(error.message || "Failed to initiate Google login");
            setIsLoading(false);
        }
    };

    return (
        <motion.button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`
                w-full flex items-center justify-center gap-3 
                bg-white dark:bg-slate-800/80
                border border-slate-200 dark:border-slate-700
                hover:bg-slate-50 dark:hover:bg-slate-800
                hover:border-slate-300 dark:hover:border-slate-600
                text-slate-700 dark:text-slate-200
                font-medium text-base
                rounded-xl py-3.5 px-4
                transition-all duration-200
                shadow-sm hover:shadow-md
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
            `}
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            ) : (
                <>
                    <GoogleLogo />
                    <span>
                        {mode === "register" ? "Sign up with Google" : "Continue with Google"}
                    </span>
                </>
            )}
        </motion.button>
    );
}

// OR Divider Component
export function OrDivider() {
    return (
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-50 dark:bg-[#0B1121] text-slate-500 dark:text-slate-500 font-medium">
                    or
                </span>
            </div>
        </div>
    );
}
