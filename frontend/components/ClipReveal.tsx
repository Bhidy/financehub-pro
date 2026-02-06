"use client";

import { useEffect, useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface ClipRevealProps {
    children: React.ReactNode;
    className?: string;
    direction?: "horizontal" | "vertical" | "center"; // Kept for API compatibility, mapped to different translates
    delay?: number;
}

const ClipReveal = ({
    children,
    className = "",
    direction = "center",
    delay = 0
}: ClipRevealProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

    useIsomorphicLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const el = containerRef.current;
            if (!el) return;

            // "Fluid Physics" Engine (Chief Expert Standard)
            // 4-Way Directional Awareness for "Live" feel

            // Initial State
            gsap.set(el, { autoAlpha: 0, y: 30, scale: 0.95 });

            ScrollTrigger.create({
                trigger: el,
                start: "top 90%", // Trigger almost immediately when entering view
                end: "bottom 10%",
                onEnter: () => {
                    // Scroll Down -> Reveal (Rise Up Fast)
                    gsap.to(el, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out", overwrite: true, delay: delay });
                },
                onLeave: () => {
                    // Scroll Down -> Hide (Float Up)
                    gsap.to(el, { autoAlpha: 0, y: -30, scale: 0.95, duration: 0.4, ease: "power2.out", overwrite: true });
                },
                onEnterBack: () => {
                    // Scroll Up -> Reveal (Drop Down)
                    gsap.fromTo(el,
                        { y: -30, scale: 0.95, autoAlpha: 0 },
                        { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out", overwrite: true }
                    );
                },
                onLeaveBack: () => {
                    // Scroll Up -> Hide (Drop Down)
                    gsap.to(el, { autoAlpha: 0, y: 30, scale: 0.95, duration: 0.4, ease: "power2.out", overwrite: true });
                }
            });

        }, containerRef);

        return () => ctx.revert();
    }, [direction, delay]);

    return (
        <div ref={containerRef} className={`opacity-0 ${className}`}>
            {children}
        </div>
    );
};

export default ClipReveal;
