"use client";

import { useEffect, useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface ScrubTextProps {
    text: string;
    className?: string;
    wordClass?: string;
    charClass?: string;
    type?: "words" | "chars" | "lines";
}

const ScrubText = ({
    text,
    className = "",
    wordClass = "",
    charClass = "",
    type = "words"
}: ScrubTextProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

    useIsomorphicLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const targets = type === "chars"
                ? containerRef.current?.querySelectorAll(".char")
                : containerRef.current?.querySelectorAll(".word");

            if (targets && targets.length > 0) {
                // "Fluid Physics" Text Engine
                // Direction-aware staggering for ultra-premium text feel

                // Set initial state
                gsap.set(targets, { autoAlpha: 0, y: 20 });

                ScrollTrigger.create({
                    trigger: containerRef.current,
                    start: "top 90%",
                    end: "bottom 20%",
                    onEnter: () => {
                        // Rise Up
                        gsap.to(targets, {
                            autoAlpha: 1, y: 0, stagger: 0.015, duration: 0.8, ease: "expo.out", overwrite: true
                        });
                    },
                    onLeave: () => {
                        // Float Up
                        gsap.to(targets, {
                            autoAlpha: 0, y: -20, stagger: 0.01, duration: 0.5, ease: "power2.out", overwrite: true
                        });
                    },
                    onEnterBack: () => {
                        // Drop Down (Re-enter from top)
                        gsap.fromTo(targets,
                            { y: -20, autoAlpha: 0 },
                            { autoAlpha: 1, y: 0, stagger: 0.015, duration: 0.8, ease: "expo.out", overwrite: true }
                        );
                    },
                    onLeaveBack: () => {
                        // Fall Down (Exit to bottom)
                        gsap.to(targets, {
                            autoAlpha: 0, y: 20, stagger: 0.01, duration: 0.5, ease: "power2.out", overwrite: true
                        });
                    }
                });
            }
        }, containerRef);

        return () => ctx.revert();
    }, [type]); // Re-run if type changes

    const words = text.split(" ");

    return (
        <div ref={containerRef} className={`scrub-text ${className}`}>
            {words.map((word, i) => (
                <span
                    key={i}
                    className={`inline-block whitespace-nowrap overflow-hidden ${wordClass}`}
                    style={{ marginRight: "0.25em", verticalAlign: "bottom" }}
                >
                    {type === "chars" ? (
                        word.split("").map((char, j) => (
                            <span
                                key={j}
                                className={`inline-block char ${charClass}`}
                            >
                                {char}
                            </span>
                        ))
                    ) : (
                        <span
                            className={`inline-block word ${charClass}`}
                        >
                            {word}
                        </span>
                    )}
                </span>
            ))}
        </div>
    );
};

export default ScrubText;
