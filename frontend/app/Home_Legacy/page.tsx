"use client";

import ButtonGradient from "@/components/Home/svg/ButtonGradient";
import Benefits from "@/components/Home/Benefits";
import Collaboration from "@/components/Home/CollaborationStarta";
import Footer from "@/components/Home/Footer";
import Header from "@/components/Home/Header";
import Hero from "@/components/Home/Hero";
import Pricing from "@/components/Home/Pricing";
import Roadmap from "@/components/Home/Roadmap";
import Services from "@/components/Home/Services";

const Home = () => {
    return (
        <>
            <div className="pt-[4.75rem] lg:pt-[5.25rem] overflow-hidden">
                <Header />
                <Hero />
                <Benefits />
                <Collaboration />
                <Services />
                <Pricing />
                <Roadmap />
                <Footer />
            </div>

            <ButtonGradient />
        </>
    );
};

export default Home;
