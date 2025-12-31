import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import AppSidebar from "@/components/AppSidebar";
import { ToastProvider } from "@/components/ToastProvider";
import GlobalSearchWidget from "@/components/GlobalSearchWidget";


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
        <Providers>
          <ToastProvider>
            {/* Enterprise Shell Layout */}
            <AppSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
              {/* Floating Global Search - Merged Overlay */}
              <div className="absolute top-5 right-8 z-50 pointer-events-none">
                <div className="pointer-events-auto">
                  <GlobalSearchWidget />
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-auto">
                {children}
              </div>
            </div>

          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
