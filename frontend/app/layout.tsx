import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import ShellWrapper from "@/components/ShellWrapper";
import { ToastProvider } from "@/components/ToastProvider";


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content"
};

export const metadata: Metadata = {
  title: "Starta",
  description: "Your AI Market Analyst for MENA Markets",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Starta"
  }
};

import { Suspense } from "react";
import { BuildInfo } from "@/components/BuildInfo";

// ... existing imports

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased flex h-screen overflow-hidden bg-[var(--background)] transition-colors duration-300`}
      >
        <div id="build-id" data-timestamp={new Date().toISOString()} className="hidden" />
        <Suspense fallback={null}>
          <BuildInfo />
        </Suspense>
        <Providers>
          <ToastProvider>
            {/* ShellWrapper conditionally renders sidebar based on route */}
            <ShellWrapper>
              {children}
            </ShellWrapper>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
