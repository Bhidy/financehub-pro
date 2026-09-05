import type { Viewport } from "next";
import StartaMobileApp from "./StartaMobileApp";

/** The native-style app shell keeps the locked viewport the public pages gave up. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#0f172a",
};

export const metadata = {
  title: "Starta Markets App",
  description: "Institutional-grade mobile experience for Starta Markets.",
};

export default function MobilePage() {
  return <StartaMobileApp />;
}
