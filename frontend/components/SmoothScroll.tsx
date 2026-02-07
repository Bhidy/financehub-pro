"use client";

import { useEffect, useState } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";

// Register GSAP ScrollTrigger once
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

// Routes where Lenis should be DISABLED (native scroll only)
const NATIVE_SCROLL_ROUTES = ["/", "/mobile-ai-analyst"];

// Domains where Lenis should be DISABLED (mobile-first domains)
const NATIVE_SCROLL_DOMAINS = ["startamarkets.com", "www.startamarkets.com"];

const SmoothScroll = () => {
    const pathname = usePathname();
    const [shouldUseLenis, setShouldUseLenis] = useState(false);

    // Determine if Lenis should be active
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Check 1: Is this a mobile/touch device?
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Check 2: Is this a mobile-first domain?
        const hostname = window.location.hostname;
        const isMobileDomain = NATIVE_SCROLL_DOMAINS.some(domain => hostname.includes(domain));

        // Check 3: Is this a route that needs native scroll?
        const isNativeScrollRoute = NATIVE_SCROLL_ROUTES.some(route =>
            pathname === route || pathname.startsWith("/mobile-ai-analyst")
        );

        // Lenis is ONLY active on desktop, non-mobile domains, and non-chatbot routes
        const enableLenis = !isTouchDevice && !isMobileDomain && !isNativeScrollRoute;

        setShouldUseLenis(enableLenis);
    }, [pathname]);

    useEffect(() => {
        // CRITICAL: Skip Lenis entirely if we shouldn't use it
        if (!shouldUseLenis) {
            // Ensure native scroll is enabled
            if (typeof document !== "undefined") {
                document.documentElement.style.removeProperty('overflow');
                document.body.style.removeProperty('overflow');
            }
            return;
        }

        const lenis = new Lenis({
            duration: 0.9,
            easing: (t) => 1 - Math.pow(1 - t, 3),
            orientation: "vertical",
            gestureOrientation: "vertical",
            smoothWheel: true,
            wheelMultiplier: 1.2,
            touchMultiplier: 2,
        });

        // Loop Lenis RAF
        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        // Connect GSAP ScrollTrigger to Lenis
        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);

        return () => {
            lenis.destroy();
            // Restore native scroll when Lenis is destroyed
            if (typeof document !== "undefined") {
                document.documentElement.style.removeProperty('overflow');
                document.body.style.removeProperty('overflow');
            }
            gsap.ticker.remove((time) => {
                lenis.raf(time * 1000);
            });
        };
    }, [shouldUseLenis]);

    // Reset scroll on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null; // Logic only
};

export default SmoothScroll;
