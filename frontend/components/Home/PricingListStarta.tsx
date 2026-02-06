import ClipReveal from "../ClipReveal";
import { check } from "./assets";
import { pricing } from "./constants";
import Button from "./Button";

const PricingListStarta = () => {
    return (
        <div className="flex gap-[1rem] max-lg:flex-wrap justify-center w-full">
            {pricing.map((item, index) => (
                <ClipReveal
                    key={item.id}
                    className={`w-[19rem] max-lg:w-full h-full px-6 py-6 rounded-[2rem] lg:w-auto flex-1 max-w-[26rem] transition-all hover:-translate-y-2 duration-300 bg-n-6 border border-stroke-1 hover:border-n-3
                        ${index === 1
                            ? "shadow-2xl relative group border-n-3"
                            : ""
                        }
                    `}
                    delay={index * 0.05}
                >
                    {/* Shiny Border Effect for Analyst */}
                    {index === 1 && (
                        <div className="absolute inset-0 rounded-[2rem] border-2 border-transparent bg-gradient-to-b from-[#13b8a6]/20 to-transparent mask-border pointer-events-none" style={{ maskImage: "linear-gradient(#fff, #fff), linear-gradient(#fff, #fff)", maskClip: "padding-box, border-box", maskComposite: "exclude" }} />
                    )}

                    <h4 className={`h4 mb-4 ${index === 1 ? "text-[#13b8a6]" : "text-color-1"}`}>{item.title}</h4>

                    <p className="body-2 min-h-[4rem] mb-3 text-n-1/50">
                        {item.description}
                    </p>

                    <div className="flex flex-col h-[5.5rem] mb-6">
                        {item.price && (
                            <>
                                <div className="text-[3.5rem] leading-none font-bold">
                                    {item.price === "Free" ? "Free" : (
                                        <div className="flex items-center">
                                            {item.price.includes("EGP") ? (
                                                <>
                                                    <span className="text-[1.5rem] mr-2">EGP</span>
                                                    {item.price.replace(" EGP", "")}
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-[1.5rem] mr-2">$</span>
                                                    {item.price}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* @ts-ignore */}
                                {item.priceDetails && (
                                    <div className="text-n-1/50 text-sm mt-1 font-grotesk">{item.priceDetails}</div>
                                )}
                            </>
                        )}
                        {!item.price && (
                            <div className="text-[3rem] leading-none font-bold text-n-1">
                                Custom
                            </div>
                        )}
                    </div>

                    <Button
                        className="w-full mb-6"
                        href={item.price ? "/pricing" : "mailto:sales@startamarkets.com"}
                        white={index !== 1}
                    >
                        {item.price ? "Get started" : "Contact Sales"}
                    </Button>

                    <ul>
                        {item.features.map((feature, index) => (
                            <li
                                key={index}
                                className="flex items-start py-5 border-t border-stroke-1"
                            >
                                <img src={check} width={24} height={24} alt="Check" className={index === 1 ? "tint-teal" : "opacity-50"} />
                                <p className="body-2 ml-4 text-sm">{feature}</p>
                            </li>
                        ))}
                    </ul>
                </ClipReveal>
            ))}
        </div>
    );
};

export default PricingListStarta;
