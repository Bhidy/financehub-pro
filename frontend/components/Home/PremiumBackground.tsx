"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { heroBackground, robot, curve } from "./assets";

const PremiumBackground = () => {
    const bgRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.to(bgRef.current, {
                yPercent: 20, // Reduced from 30 for performance
                ease: "none",
                scrollTrigger: {
                    trigger: document.body,
                    start: "top top",
                    end: "bottom top",
                    scrub: 0, // Direct sync, no smoothing lag
                },
            });
        }, bgRef);
        return () => ctx.revert();
    }, []);

    return (
        <div className="absolute -top-[54%] left-1/2 w-[234%] -translate-x-1/2 md:-top-[46%] md:w-[138%] lg:-top-[104%] -z-1 pointer-events-none will-change-transform hidden dark:block">
            <img
                ref={bgRef}
                src={heroBackground}
                className="w-full opacity-60 mix-blend-color-dodge hue-rotate-[-90deg]"
                width={1440}
                height={1800}
                alt="hero"
            />
        </div>
    );
};

export default PremiumBackground;
