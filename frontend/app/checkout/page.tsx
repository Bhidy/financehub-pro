"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createCheckoutSession } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function CheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initiateCheckout = async () => {
            const plan = searchParams.get("plan");

            // Map plan names to Stripe Price IDs
            let stripePriceId = "";
            if (plan === "analyst") {
                // Verified price ID from previous deployment
                stripePriceId = "price_1T66bq2UXuH5fA2IQIuSelxJ";
            } else {
                setError("Invalid plan selected.");
                return;
            }

            // Check authentication
            const token = localStorage.getItem("fh_auth_token");
            if (!token) {
                // Not logged in, redirect to register with return URL
                router.push(`/register?redirect=/checkout?plan=${plan}`);
                return;
            }

            try {
                const data = await createCheckoutSession(stripePriceId);
                if (data?.url) {
                    window.location.href = data.url;
                } else {
                    setError("Failed to create checkout session URL.");
                }
            } catch (err: any) {
                console.error("Checkout error:", err);
                if (err?.response?.status === 401) {
                    // Token expired or invalid
                    localStorage.removeItem("fh_auth_token");
                    router.push(`/register?redirect=/checkout?plan=${plan}`);
                } else {
                    setError("An error occurred while initiating checkout. Please try again.");
                }
            }
        };

        initiateCheckout();
    }, [router, searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0A0F1C] px-4">
                <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl max-w-md text-center">
                    <h3 className="text-red-600 dark:text-red-400 font-bold mb-2">Checkout Error</h3>
                    <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
                    <button
                        onClick={() => router.push("/")}
                        className="mt-4 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0A0F1C]">
            <Loader2 className="w-10 h-10 animate-spin text-[#14B8A6] mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Preparing your checkout...</h2>
            <p className="text-slate-500 dark:text-slate-400">Please wait while we securely redirect you to Stripe.</p>
        </div>
    );
}
