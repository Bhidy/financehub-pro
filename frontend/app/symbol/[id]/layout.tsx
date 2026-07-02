import type { Metadata } from "next";

// L-2: per-symbol, server-rendered <title> (was the generic "Starta" for every
// symbol, hurting SEO and tab identification). A server layout is the reliable
// App-Router way to set a dynamic title for a "use client" page — imperative
// document.title from the client is overridden by Next's metadata handling.
export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params;
    const symbol = (id || "").toUpperCase();
    return {
        title: symbol ? `${symbol} — EGX Stock Price, Financials & News` : "Starta",
        description: symbol ? `${symbol} — live EGX price, financials, technicals and news on Starta.` : undefined,
    };
}

export default function SymbolLayout({ children }: { children: React.ReactNode }) {
    return children;
}
