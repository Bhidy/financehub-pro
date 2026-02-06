"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface AnimatedTitleProps {
    text: string;
    className?: string;
    wordClass?: string;
    charClass?: string;
}

const AnimatedTitle = ({ text, className = "", wordClass = "", charClass = "" }: AnimatedTitleProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const chars = containerRef.current?.querySelectorAll(".char");
            if (chars && chars.length > 0) {
                gsap.fromTo(
                    chars,
                    {
                        opacity: 0,
                        y: 100,
                        rotateX: -90,
                    },
                    {
                        opacity: 1,
                        y: 0,
                        rotateX: 0,
                        stagger: 0.02,
                        duration: 1,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: containerRef.current,
                            start: "top 80%",
                            end: "bottom 20%",
                            toggleActions: "play none none reverse",
                        },
                    }
                );
            }
        }, containerRef);

        return () => ctx.revert();
    }, [text]);

    // Manual splitting logic
    return (
        <div ref={containerRef} className={`animated-title ${className}`}>
            {text.split(" ").map((word, i) => (
                <span
                    key={i}
                    className={`inline-block whitespace-nowrap ${wordClass}`}
                    style={{ marginRight: "0.25em" }}
                >
                    {word.split("").map((char, j) => (
                        <span
                            key={j}
                            className={`inline-block origin-bottom transform will-change-transform char ${charClass}`}
                        >
                            {char}
                        </span>
                    ))}
                </span>
            ))}
        </div>
    );
};

export default AnimatedTitle;
