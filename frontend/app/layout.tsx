import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import ShellWrapper from "@/components/ShellWrapper";
import SmoothScroll from "@/components/SmoothScroll";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

// Manrope - Landing Page Match (Google Fonts)
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

// JetBrains Mono - Monospace for code/data
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

// Brainwave Fonts
import { Sora, Source_Code_Pro, Space_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-sora",
  display: "swap",
});

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  // ONE Arabic typeface site-wide. The static pages (home, /Funds, /Learn,
  // /News) load IBM Plex Sans Arabic while this app loaded Cairo, so the same
  // nav — and every heading — rendered in a different face depending on which
  // renderer served the route. IBM Plex is canonical because the static
  // marketing surfaces are.
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-code",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300"],
  variable: "--font-grotesk",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://startamarkets.com"),
  title: {
    default: "Starta Markets — Egyptian Exchange Stocks, Funds & Market Intelligence",
    template: "%s | Starta Markets",
  },
  description:
    "Live EGX stock prices, 20 years of financials, mutual-fund NAVs and returns, Egyptian market news, and an AI market analyst — in Arabic and English.",
  // Self-referencing canonical on every app route (resolved against
  // metadataBase + the current path; strips query params).
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: "Starta Markets",
    locale: "en_US",
    url: "./",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Starta Markets" }],
  },
  twitter: {
    card: "summary_large_image",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Starta"
  }
};

import { Suspense } from "react";
import { headers } from "next/headers";
import { BuildInfo } from "@/components/BuildInfo";

// ... existing imports

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // URL-derived document language, stamped by middleware (x-starta-lang).
  // A single root layout serves BOTH language trees, so the language cannot
  // come from a route param — the request header is the only source available
  // before <html> is emitted. Falls back to "en" when the header is absent
  // (direct render paths that bypass middleware, e.g. error pages).
  const lang = (await headers()).get("x-starta-lang") === "ar" ? "ar" : "en";
  return (
    // data-theme + class mirror the static pages' SSR default (LIGHT). The boot
    // script below corrects them from storage before first paint; hydration
    // warnings are suppressed because that mutation is intentional and happens
    // before React attaches (the standard theme-script pattern).
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} data-theme="light" className="light" suppressHydrationWarning>
      <head>
        {/* THEME BOOT — must be the first thing that runs, before any paint.
            Single source of truth for the React side of the theme, mirroring
            /assets/starta-theme.js used by the static pages: same storage key
            ("theme"), same LIGHT default, and it stamps BOTH representations —
            the data-theme attribute (public-chrome --c-* tokens) and the
            .light/.dark class (Tailwind `dark:` variants + app tokens) — so
            the two engines can never disagree and no page can flip theme on
            navigation. */}
        <script
          id="starta-theme-boot"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");t=(t==="dark"||t==="light")?t:"light";var d=document.documentElement;d.setAttribute("data-theme",t);d.classList.remove("light","dark");d.classList.add(t);d.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${manrope.variable} ${jetbrainsMono.variable} ${sora.variable} ${sourceCodePro.variable} ${spaceGrotesk.variable} ${arabic.variable} font-sans antialiased flex flex-col min-h-screen bg-[var(--background)] transition-colors duration-300`}
      >
        <Script id="finhub-domain-scale" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var hostname = window.location.hostname.toLowerCase();
                var isFinhubDomain =
                  hostname.includes("finhub-pro.vercel.app") ||
                  (hostname.includes("finhub") && !hostname.includes("startamarkets"));

                if (isFinhubDomain) {
                  document.documentElement.classList.add("finhub-pro-domain");
                }
              } catch (e) {}
            })();
          `}
        </Script>
        <Script id="auth-param-scrub" strategy="beforeInteractive">
          {`
            // SECURITY: the OAuth callback lands on /login|/register with tokens in
            // the query string. Stash them into sessionStorage and scrub the URL
            // BEFORE analytics (GA/Hotjar record page_location) and before the URL
            // can settle into history. The auth pages read the stash back.
            (function () {
              try {
                if (!/^\\/(login|register)$/.test(window.location.pathname)) return;
                var params = new URLSearchParams(window.location.search);
                if (!params.get("google_auth") && !params.get("token")) return;
                var keys = ["token", "refresh_token", "user", "google_auth", "redirect", "error", "checkout", "plan"];
                var stash = {};
                for (var i = 0; i < keys.length; i++) {
                  var v = params.get(keys[i]);
                  if (v !== null) { stash[keys[i]] = v; params.delete(keys[i]); }
                }
                sessionStorage.setItem("starta-auth-handoff", JSON.stringify(stash));
                var rest = params.toString();
                history.replaceState(null, "", window.location.pathname + (rest ? "?" + rest : "") + window.location.hash);
              } catch (e) {}
            })();
          `}
        </Script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-X86G4NMVFJ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-X86G4NMVFJ');
          `}
        </Script>
        <Script id="hotjar-snippet" strategy="afterInteractive">
          {`
            (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:6628829,hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </Script>
        <div id="build-id" data-timestamp={new Date().toISOString()} className="hidden" />
        <Suspense fallback={null}>
          <BuildInfo />
        </Suspense>
        <SmoothScroll />
        <Providers>
          <ThemeProvider>
            <ToastProvider>
              {/* ShellWrapper is a plain pass-through (legacy finhub styling only).
                  The old AppSidebar shell is permanently removed — build-gated. */}
              <ShellWrapper>
                {children}
              </ShellWrapper>
            </ToastProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
