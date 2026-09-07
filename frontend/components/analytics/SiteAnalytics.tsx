"use client";

/**
 * ============================================================================
 * SITE ANALYTICS — Google Analytics + Hotjar, for the PUBLIC site only
 * ============================================================================
 *
 * These two scripts used to sit inline in the root layout, which meant they
 * loaded on /admin as well. Two problems, one of them serious:
 *
 *  1. PRIVACY. Hotjar records sessions. /admin/users renders every registered
 *     account's full name, email address and phone number, so the console was
 *     shipping the entire user table into a third-party recording tool, frame
 *     by frame, every time an operator opened it. Nobody consented to that and
 *     it is not data we should be exporting.
 *
 *  2. MEASUREMENT. Operator page views are not visitor behaviour. Counting
 *     them makes every funnel and engagement number quietly wrong.
 *
 * …plus the reason it got noticed: Hotjar's floating "Feedback" tab sat on top
 * of the console UI.
 *
 * Not loading a script is the only reliable way to stop it — Hotjar has no
 * supported teardown, so once injected it stays for the life of the document.
 * That leaves one gap this component cannot close on its own: a client-side
 * navigation from a public page INTO /admin arrives with Hotjar already
 * running. globals.css hides the widget in that case (`body:has(.admin-light)`);
 * a hard load of any /admin URL — which is how the console is actually opened —
 * never injects it at all.
 */

import Script from "next/script";
import { usePathname } from "next/navigation";

const GA_MEASUREMENT_ID = "G-X86G4NMVFJ";
const HOTJAR_ID = 6628829;

export default function SiteAnalytics() {
    const pathname = usePathname();

    // Startswith, not equality: /admin/users and every future section too.
    if (pathname === "/admin" || pathname?.startsWith("/admin/")) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
            </Script>
            <Script id="hotjar-snippet" strategy="afterInteractive">
                {`
            (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:${HOTJAR_ID},hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
            </Script>
        </>
    );
}
