"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Button from "./Button";
import Section from "./Section";
import { BackgroundCircles, BottomLine, Gradient } from "./design/Hero";
import dynamic from "next/dynamic";
import { heroBackground, robot, robotLight, curve } from "./assets";
import ScrubText from "../ScrubText";
import ClipReveal from "../ClipReveal";
import PremiumBackground from "./PremiumBackground";
import HeroVectorV4 from "./HeroVectorV4";

const ScrollParallax = dynamic(
    () => import("react-just-parallax").then((mod) => mod.ScrollParallax),
    { ssr: false }
);

const Hero = () => {
    const parallaxRef = useRef(null);
    const heroRef = useRef(null);

    // Entrance animation for robot is handled by ClipReveal now, 
    // but we can keep additional logic here if needed.
    // Background parallax is moved to PremiumBackground.tsx

    return (
        <Section
            className="pt-[12rem] -mt-[5.25rem]"
            crosses
            crossesOffset="lg:translate-y-[5.25rem]"
            customPaddings
            id="hero"
        >
            <div className="container relative" ref={parallaxRef}>
                <div ref={heroRef} className="relative z-1 max-w-[62rem] mx-auto text-center mb-[3.875rem] md:mb-20 lg:mb-[6.25rem]">
                    <div className="h1 mb-6 text-n-1 font-semibold">
                        <ScrubText
                            text="Master the EGX with"
                            className="block"
                            type="chars"
                        />
                        <span className="inline-block relative">
                            Institutional Intelligence{" "}
                            <img
                                src={curve}
                                className="absolute top-full left-0 w-full xl:-mt-2"
                                width={624}
                                height={28}
                                alt="Curve"
                            />
                        </span>
                    </div>
                    <div className="max-w-3xl mx-auto mb-6 text-n-2 lg:mb-8 text-xl">
                        <ScrubText
                            text="Your personal CFA-level analyst, powered by real-time exchange data. Deep insights, zero hallucinations."
                            type="words"
                        />
                    </div>
                    <Button href="/register" white>
                        Start Free Analysis
                    </Button>
                </div>

                <div className="relative max-w-[23rem] mx-auto md:max-w-5xl xl:mb-24">
                    <div className="relative z-1 p-[1px] rounded-2xl bg-slate-200 dark:bg-gradient-to-b dark:from-n-1/15 dark:to-n-1/0">
                        <div className="relative bg-white dark:bg-[#0E0C15] rounded-[1rem] border dark:border-white/5 overlay-hidden">
                            <div className="h-[1.4rem] bg-slate-100 dark:bg-n-10 rounded-t-[0.9rem]" />

                            <div className="aspect-[33/40] rounded-b-[0.9rem] overflow-hidden md:aspect-[688/490] lg:aspect-[1024/490]">
                                {/* The Holographic Product (App Interface Visualization) */}
                                <div className="w-full h-full scale-[0.8] md:scale-100">
                                    <HeroVectorV4 className="w-full h-full object-cover" />
                                </div>
                            </div>
                        </div>

                        {/* Floating Cards - Moved Outside for Full Visibility */}
                        <ScrollParallax isAbsolutelyPositioned>
                            <ul className="hidden absolute -left-[5.5rem] bottom-[7.5rem] px-1 py-1 bg-white/60 dark:bg-n-9/60 backdrop-blur-xl border border-n-1/10 dark:border-white/10 rounded-2xl xl:flex shadow-2xl">
                                <li className="p-5"><div className="w-6 h-6 bg-color-1 rounded-full animate-pulse shadow-[0_0_15px_rgba(19,184,166,0.5)]"></div></li>
                                <li className="p-5"><div className="w-6 h-6 bg-color-2 rounded-full shadow-[0_0_10px_rgba(255,199,209,0.3)]"></div></li>
                                <li className="p-5"><div className="w-6 h-6 bg-color-3 rounded-full shadow-[0_0_10px_rgba(255,214,99,0.3)]"></div></li>
                            </ul>
                        </ScrollParallax>

                        <ScrollParallax isAbsolutelyPositioned>
                            <div className="hidden absolute -right-[5.5rem] bottom-[11rem] w-[18rem] xl:flex p-4 bg-white/60 dark:bg-n-9/60 backdrop-blur-xl border border-n-1/10 dark:border-white/10 rounded-2xl items-center gap-4 shadow-2xl">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-color-4 to-color-4/50 flex items-center justify-center shadow-lg">
                                    <div className="w-6 h-6 bg-white rounded-full opacity-50 mix-blend-overlay"></div>
                                </div>
                                <div>
                                    <h6 className="body-2 font-bold dark:text-n-1 text-n-8">Strong Buy Signal</h6>
                                    <p className="caption dark:text-n-4 text-n-4">COMI.CA breaking 52w High</p>
                                </div>
                            </div>
                        </ScrollParallax>

                        {/* Ambient Glow behind the main card */}
                        <div className="hidden dark:block absolute -z-1 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-b from-[#004D87]/20 to-[#13b8a6]/20 blur-3xl pointer-events-none" />

                        <Gradient />
                    </div>

                    <PremiumBackground />

                    <BackgroundCircles parallaxRef={parallaxRef} />
                </div>

                <BottomLine />
            </div>
        </Section>
    );
};

export default Hero;
