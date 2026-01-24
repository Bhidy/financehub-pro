/**
 * ============================================================================
 * DEVICE DETECTION HOOK
 * ============================================================================
 * 
 * Enterprise-grade device detection for responsive UI.
 * Detects viewport size to switch between desktop and mobile layouts.
 * 
 * Breakpoints:
 * - Desktop: ≥1024px
 * - Tablet: 768-1023px
 * - Mobile: <768px
 * 
 * ============================================================================
 */

"use client";

import { useState, useEffect } from "react";

interface DeviceInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isSSR: boolean;
    width: number;
}

const MOBILE_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

export function useDeviceDetect(): DeviceInfo {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isSSR: true,
        width: 0,
    });

    useEffect(() => {
        const updateDeviceInfo = () => {
            const width = window.innerWidth;

            setDeviceInfo({
                isMobile: width < MOBILE_BREAKPOINT,
                isTablet: width >= MOBILE_BREAKPOINT && width < DESKTOP_BREAKPOINT,
                isDesktop: width >= DESKTOP_BREAKPOINT,
                isSSR: false,
                width,
            });
        };

        // Initial check
        updateDeviceInfo();

        // Listen for resize
        window.addEventListener("resize", updateDeviceInfo);

        return () => window.removeEventListener("resize", updateDeviceInfo);
    }, []);

    return deviceInfo;
}
