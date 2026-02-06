"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { brainwaveSymbol, check } from "./assets";
import { collabApps, collabContent, collabText } from "./constants";
import Button from "./Button";
import Section from "./Section";
import { LeftCurve, RightCurve } from "./design/Collaboration";
import ScrubText from "../ScrubText";
import ClipReveal from "../ClipReveal";
import StockLogo from "./StockLogo";

const Collaboration = () => {
    const orbitRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: orbitRef.current,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1, // Slow consistent rotation on scroll
                },
            });

            // "Ferris Wheel" Effect:
            // 1. Container rotates 360 (Clockwise)
            // 2. Icons rotate -360 (Counter-Clockwise) to stay upright
            tl.to(".orbit-container", {
                rotation: 360,
                ease: "none",
            }).to(
                ".orbit-icon-container",
                {
                    rotation: -360,
                    ease: "none",
                },
                0 // Sync with start of timeline
            );
        }, orbitRef);
        return () => ctx.revert();
    }, []);

    return (
        <Section crosses>
            <div className="container lg:flex items-center justify-between max-w-6xl mx-auto" ref={orbitRef}>
                <div className="max-w-[25rem] lg:max-w-[30rem]">
                    <h2 className="h2 mb-4 md:mb-8 dark:text-white text-n-8">
                        <ScrubText text="Seamless Integration for" type="chars" />
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#13b8a6] to-[#3B82F6]">
                            <ScrubText text="Modern Traders" type="chars" />
                        </span>
                    </h2>

                    {/* Premium Checklist Cards */}
                    <ul className="max-w-[25rem] mb-10 md:mb-14 space-y-4">
                        {collabContent.map((item, index) => (
                            <ClipReveal
                                className="block relative p-[1px] bg-no-repeat bg-[length:100%_100%] rounded-2xl bg-slate-200 dark:bg-gradient-to-r dark:from-n-1/15 dark:to-n-1/0"
                                key={item.id}
                                delay={index * 0.1}
                            >
                                <div className="relative p-5 bg-white dark:bg-[#0E0C15] rounded-2xl overflow-hidden flex items-start">
                                    <div className="mt-1">
                                        <img src={check} width={24} height={24} alt="check" />
                                    </div>
                                    <div className="ml-4">
                                        <h6 className="body-2 font-bold dark:text-white text-n-8">{item.title}</h6>
                                        {item.text && (
                                            <p className="body-2 mt-2 text-n-4 dark:text-n-3 text-sm">{item.text}</p>
                                        )}
                                    </div>
                                </div>
                            </ClipReveal>
                        ))}
                    </ul>
                    <Button>Try it now</Button>
                </div>

                <div className="lg:ml-auto xl:w-[38rem] mt-10 lg:mt-0 flex justify-center lg:justify-end">
                    {/* Orbit Container */}
                    <div className="relative">
                        <p className="body-2 mb-8 text-n-4 md:mb-16 lg:mb-12 lg:w-[22rem] lg:mx-auto text-center hidden lg:block">
                            <ScrubText text={collabText} type="words" />
                        </p>

                        <ClipReveal className="mt-4">
                            <div className="orbit-container relative left-1/2 flex w-[22rem] aspect-square border border-stroke-1 rounded-full -translate-x-1/2 scale:90 md:scale-100">
                                <div className="flex w-60 aspect-square m-auto border border-stroke-1 rounded-full">
                                    <div className="w-[6rem] aspect-square m-auto p-[0.2rem] bg-conic-gradient rounded-full">
                                        <div className="flex items-center justify-center w-full h-full bg-n-6 rounded-full">
                                            <img
                                                src={brainwaveSymbol}
                                                width={48}
                                                height={48}
                                                alt="brainwave"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <ul>
                                    {collabApps.map((app, index) => (
                                        <li
                                            key={app.id}
                                            className="absolute top-0 left-1/2 h-1/2 -ml-[2.25rem] origin-bottom"
                                            style={{ transform: `rotate(${index * 45}deg)` }}
                                        >
                                            {/* Dynamic Ferris Wheel Counter-Rotation (-360deg) */}
                                            <div className="orbit-icon-container w-[4.5rem] h-[4.5rem] -top-[2.25rem] relative">
                                                {/* Static Initial Offset (Keeps text horizontal relative to position) */}
                                                <div
                                                    className="w-full h-full"
                                                    style={{ transform: `rotate(-${index * 45}deg)` }}
                                                >
                                                    {/* Hover Scale Wrapper */}
                                                    <div className="w-full h-full transition-transform duration-300 hover:scale-125 cursor-pointer rounded-full">
                                                        <StockLogo
                                                            ticker={app.ticker}
                                                            color={app.ticker === "TMGH" ? "#3b82f6" : app.color} // Brighter Blue for TMGH
                                                            className="w-full h-full shadow-2xl"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <LeftCurve />
                                <RightCurve />
                            </div>
                        </ClipReveal>
                    </div>
                </div>
            </div>
        </Section>
    );
};

export default Collaboration;
