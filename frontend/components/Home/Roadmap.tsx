"use client";

import Button from "./Button";
import Heading from "./Heading";
import Section from "./Section";
import Tagline from "./Tagline";
import { roadmap } from "./constants";
import { check2, grid, loading1 } from "./assets";
import { Gradient } from "./design/Roadmap";
import ClipReveal from "../ClipReveal";
import ScrubText from "../ScrubText";
import RoadmapVisual from "./RoadmapVisual";
import RoadmapVoice from "./RoadmapVoice";

const Roadmap = () => (
    <Section className="overflow-hidden" id="roadmap">
        <div className="container md:pb-10">
            <div className="md:max-w-md lg:max-w-2xl mx-auto mb-12 lg:mb-20 text-center">
                <p className="caption mb-4 text-n-4">Ready to get started</p>
                <h2 className="h2">
                    <ScrubText text="What we’re working on" type="chars" />
                </h2>
            </div>

            <div className="relative grid gap-5 md:grid-cols-2 md:gap-8 md:pb-[7rem] max-w-6xl mx-auto">
                {roadmap.map((item, index) => {
                    const status = item.status === "done" ? "Done" : "In progress";

                    return (
                        <ClipReveal
                            className={`md:flex even:md:translate-y-[7rem] p-[1px] rounded-[2.5rem] bg-slate-200 dark:bg-gradient-to-b dark:from-n-1/15 dark:to-n-1/0`}
                            key={item.id}
                            delay={index * 0.05}
                        >
                            <div className="relative p-6 bg-white dark:bg-[#0E0C15] rounded-[2.4375rem] overflow-hidden xl:p-10 w-full h-full border dark:border-white/5">
                                <div className="absolute top-0 left-0 max-w-full opacity-10 dark:opacity-20 pointer-events-none">
                                    <img
                                        className="w-full hidden dark:block"
                                        src={grid}
                                        width={550}
                                        height={550}
                                        alt="Grid"
                                    />
                                </div>
                                <div className="relative z-1 flex flex-col h-full">
                                    <div className="flex items-center justify-between max-w-[27rem] mb-8 md:mb-12">
                                        <Tagline>{item.date}</Tagline>

                                        <div className="flex items-center px-4 py-1 bg-n-1 rounded text-n-8">
                                            <img
                                                className="mr-2.5"
                                                src={item.status === "done" ? check2 : loading1}
                                                width={16}
                                                height={16}
                                                alt={status}
                                            />
                                            <div className="tagline">{status}</div>
                                        </div>
                                    </div>

                                    <div className="mb-6 -my-6 -mx-8 relative overflow-hidden rounded-xl">
                                        {/* @ts-ignore */}
                                        {item.customVisual === "voice" ? (
                                            <RoadmapVoice />
                                        ) : item.customVisual === "pipeline" ? (
                                            <RoadmapVisual />
                                        ) : (
                                            <div className="w-full h-[18rem] flex items-center justify-center relative">
                                                {/* Dark Mode Image (Purple/Original) - Visible by default in dark mode */}
                                                <img
                                                    className={`w-full h-full object-contain transform scale-90 ${item.imageUrlLight ? "hidden dark:block" : "block"
                                                        }`}
                                                    src={item.imageUrl}
                                                    width={628}
                                                    height={426}
                                                    alt={item.title}
                                                />
                                                {/* Light Mode Image (Green/Teal) - Visible only in light mode */}
                                                {item.imageUrlLight && (
                                                    <img
                                                        className="w-full h-full object-contain transform scale-90 block dark:hidden"
                                                        src={item.imageUrlLight}
                                                        width={628}
                                                        height={426}
                                                        alt={item.title}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto">
                                        <h4 className="h4 mb-4">{item.title}</h4>
                                        <p className="body-2 text-n-4">{item.text}</p>
                                    </div>
                                </div>
                            </div>
                        </ClipReveal>
                    );
                })}

                <div className="hidden dark:block absolute -z-1 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] opacity-20 pointer-events-none">
                    {/* Ambient Glow for Dark Mode */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#004D87] to-[#13b8a6] rounded-full blur-[8rem]" />
                </div>
            </div>

            <div className="flex justify-center mt-12 md:mt-15 xl:mt-20">
                <Button href="/roadmap">Our roadmap</Button>
            </div>
        </div>
    </Section>
);

export default Roadmap;
