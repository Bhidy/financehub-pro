"use client";

import Section from "./Section";
import Heading from "./Heading";
import { benefits } from "./constants";
import Arrow from "./svg/Arrow";
import { GradientLight } from "./design/Benefits";
import ClipPath from "./svg/ClipPath";
import ClipReveal from "../ClipReveal";
import ScrubText from "../ScrubText";

const Benefits = () => {
    return (
        <Section id="features">
            <div className="container relative z-2">
                <div className="md:max-w-md lg:max-w-2xl mx-auto mb-12 lg:mb-20 text-center">
                    <h2 className="h2 mb-4">
                        <ScrubText text="Smarter Market Intelligence" type="chars" />
                    </h2>
                    <div className="body-1 text-n-4">
                        <ScrubText text="Data-driven insights for the modern investor." type="words" />
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-10 max-w-6xl mx-auto">
                    {benefits.map((item) => (
                        <ClipReveal
                            className="block relative p-[1px] bg-no-repeat bg-[length:100%_100%] md:max-w-[24rem] bg-slate-200 dark:bg-gradient-to-b dark:from-n-1/15 dark:to-n-1/0 rounded-[2rem]"
                            direction="vertical"
                            key={item.id}
                        >
                            <div
                                className="block relative h-full rounded-[2rem] overflow-hidden bg-white dark:bg-[#0E0C15]"
                                style={{
                                    backgroundImage: `url(${item.backgroundUrl})`,
                                }}
                            >
                                <div className="relative z-2 flex flex-col min-h-[20rem] p-[2rem] pointer-events-none">
                                    <h5 className="h5 mb-5 dark:text-white text-n-8">{item.title}</h5>
                                    <p className="body-2 mb-6 text-n-4 dark:text-n-3">{item.text}</p>
                                    <div className="flex items-center mt-auto">
                                        <img
                                            src={item.iconUrl}
                                            width={48}
                                            height={48}
                                            alt={item.title}
                                        />
                                        <p className="ml-auto font-code text-xs font-bold text-n-8 dark:text-n-1 uppercase tracking-wider">
                                            Explore more
                                        </p>
                                        <Arrow />
                                    </div>
                                </div>

                                {item.light && <GradientLight />}

                                <div
                                    className="absolute inset-0 bg-transparent"
                                >
                                    <div className="absolute inset-0 opacity-0 transition-opacity hover:opacity-10">
                                        {item.imageUrl && (
                                            <img
                                                src={item.imageUrl}
                                                width={380}
                                                height={362}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ClipReveal>
                    ))}
                </div>
            </div>
        </Section>
    );
};

export default Benefits;
