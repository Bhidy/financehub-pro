"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
// import { disablePageScroll, enablePageScroll } from "scroll-lock"; 
// Note: scroll-lock might need distinct import, disabling for now to avoid build error 
// until confirmed installed properly or replaced with body overflow style.

import Button from "./Button";
import MenuSvg from "./svg/MenuSvg";
import { HamburgerMenu } from "./design/Header";
import ThemeToggle from "../ThemeToggle";

export const navigation = [
    { id: "0", title: "Features", url: "#features" },
    { id: "1", title: "Pricing", url: "#pricing" },
    { id: "2", title: "How use", url: "#how-to-use" },
    { id: "3", title: "Roadmap", url: "#roadmap" },
    { id: "4", title: "New account", url: "/register", onlyMobile: true },
    { id: "5", title: "Sign in", url: "/login", onlyMobile: true },
];

const Header = () => {
    const pathname = usePathname();
    const [openNavigation, setOpenNavigation] = useState(false);

    const toggleNavigation = () => {
        if (openNavigation) {
            setOpenNavigation(false);
            // enablePageScroll();
            document.body.style.overflow = '';
        } else {
            setOpenNavigation(true);
            // disablePageScroll();
            document.body.style.overflow = 'hidden';
        }
    };

    const handleClick = () => {
        if (!openNavigation) return;
        // enablePageScroll();
        document.body.style.overflow = '';
        setOpenNavigation(false);
    };

    return (
        <div
            className={`fixed top-0 left-0 w-full z-50 border-b border-n-6 lg:backdrop-blur-sm ${openNavigation ? "bg-n-8" : "bg-[var(--color-header-bg)] backdrop-blur-sm"
                }`}
        >
            <div className="flex items-center px-5 lg:px-7.5 xl:px-10 max-lg:py-4">
                <a className="block w-[12rem] xl:mr-8 font-bold text-2xl text-n-1 font-grotesk" href="#hero">
                    Starta Markets
                </a>

                <nav
                    className={`${openNavigation ? "flex" : "hidden"
                        } fixed top-[5rem] left-0 right-0 bottom-0 bg-n-8 lg:static lg:flex lg:mx-auto lg:bg-transparent`}
                >
                    <div className="relative z-2 flex flex-col items-center justify-center m-auto lg:flex-row">
                        {navigation.map((item) => (
                            <a
                                key={item.id}
                                href={item.url}
                                onClick={handleClick}
                                className={`block relative font-code text-2xl uppercase text-n-1 transition-colors hover:text-color-1 ${item.onlyMobile ? "lg:hidden" : ""
                                    } px-6 py-6 md:py-8 lg:-mr-0.25 lg:text-xs lg:font-semibold ${item.url === pathname
                                        ? "z-2 lg:text-n-1"
                                        : "lg:text-n-1/50"
                                    } lg:leading-5 lg:hover:text-n-1 xl:px-12`}
                            >
                                {item.title}
                            </a>
                        ))}
                    </div>

                    <HamburgerMenu />
                </nav>

                <a
                    href="/register"
                    className="button hidden mr-8 text-n-1/50 transition-colors hover:text-n-1 lg:block"
                >
                    New account
                </a>
                <Button className="hidden lg:flex" href="/login">
                    Sign in
                </Button>

                <div className="hidden lg:flex ml-4">
                    <ThemeToggle />
                </div>

                <Button
                    className="ml-auto lg:hidden"
                    px="px-3"
                    onClick={toggleNavigation}
                >
                    <MenuSvg openNavigation={openNavigation} />
                </Button>
            </div>
        </div>
    );
};

export default Header;
