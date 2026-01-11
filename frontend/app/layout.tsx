import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "FinanceHub Pro",
  description: "Enterprise Financial Intelligence Platform",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: "cover"
  },
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mubasher Pro"
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
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-slate-50 flex h-screen overflow-hidden`}
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
