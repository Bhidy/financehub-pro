import React from "react";
import Section from "./Section";
import { socials } from "./constants";
import ScrubText from "../ScrubText";
import ClipReveal from "../ClipReveal";

const Footer = () => {
    return (
        <Section crosses className="!px-0 !py-10">
            <div className="container flex sm:justify-between justify-center items-center gap-10 max-sm:flex-col">
                <div className="caption text-n-4 lg:block">
                    © {new Date().getFullYear()}. All rights reserved.
                </div>

                <div className="flex-1 text-center">
                    <p className="h4 text-n-1/50 uppercase tracking-widest">
                        <ScrubText text="Starta Markets" type="chars" />
                    </p>
                </div>

                <ul className="flex gap-5 flex-wrap">
                    {socials.map((item, index) => (
                        <ClipReveal
                            key={item.id}
                            className="block"
                            delay={index * 0.05}
                        >
                            <a
                                href={item.url}
                                target="_blank"
                                className="flex items-center justify-center w-10 h-10 bg-n-6 rounded-full transition-colors hover:bg-n-6"
                            >
                                <img
                                    src={item.iconUrl}
                                    width={16}
                                    height={16}
                                    alt={item.title}
                                />
                            </a>
                        </ClipReveal>
                    ))}
                </ul>
            </div>
        </Section>
    );
};

export default Footer;
