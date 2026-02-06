"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";

// Register GSAP ScrollTrigger once
if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

const SmoothScroll = () => {
    const pathname = usePathname();

    useEffect(() => {
        const lenis = new Lenis({
            duration: 0.9, // Snappier response (Standard is 1.0, 1.2 felt heavy)
            easing: (t) => 1 - Math.pow(1 - t, 3), // Cubic ease-out (Standard, predictable)
            orientation: "vertical",
            gestureOrientation: "vertical",
            smoothWheel: true,
            wheelMultiplier: 1.2, // Slightly faster natural scroll
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
            gsap.ticker.remove((time) => {
                lenis.raf(time * 1000);
            });
        };
    }, []);

    // Reset scroll on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null; // Logic only
};

export default SmoothScroll;
