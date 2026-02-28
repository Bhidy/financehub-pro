import Section from "./Section";
import { smallSphere, stars } from "./assets";
import Heading from "./Heading";
import PricingList from "./PricingListStarta";
import { LeftLine, RightLine, PremiumGlobalSphere } from "./design/Pricing";
import ScrubText from "../ScrubText";

const Pricing = () => {
    return (
        <Section className="overflow-hidden hidden" id="pricing">
            <div className="container relative z-2">
                <div className="hidden relative justify-center mb-[3rem] lg:flex">
                    {/* Light Mode Sphere (Premium Vector Global) */}
                    <div className="relative z-1 block dark:hidden scale-110">
                        <PremiumGlobalSphere />
                    </div>
                    {/* Dark Mode Sphere (Original) */}
                    <img
                        src={smallSphere}
                        className="relative z-1 hidden dark:block"
                        width={255}
                        height={255}
                        alt="Sphere"
                    />
                    {/* Light Mode Grid (Ethereal Dot Matrix) */}
                    <div className="absolute top-1/2 left-1/2 w-[60rem] -translate-x-1/2 -translate-y-1/2 pointer-events-none block dark:hidden">
                        <div className="w-full h-[400px] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-50"></div>
                    </div>

                    <div className="absolute top-1/2 left-1/2 w-[60rem] -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden dark:block">
                        <img
                            src={stars}
                            className="w-full"
                            width={950}
                            height={400}
                            alt="Stars"
                        />
                    </div>
                </div>

                <div className="md:max-w-md lg:max-w-2xl mx-auto mb-12 lg:mb-20 text-center">
                    <p className="caption mb-4 text-n-4">Invest with Confidence</p>
                    <h2 className="h2">
                        <ScrubText text="Flexible Plans for Every Investor" type="chars" />
                    </h2>
                </div>

                <div className="relative max-w-6xl mx-auto">
                    <PricingList />
                    <LeftLine />
                    <RightLine />
                </div>


            </div>
        </Section>
    );
};

export default Pricing;
