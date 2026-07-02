import Link from 'next/link';

/** Real 404 for unknown tickers (kills the infinite soft-404 space). */
export default function SymbolNotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7fb] px-6 text-center text-[#10182d] dark:bg-[#0b0f19] dark:text-[#f1f5f9]">
            <h1 className="text-3xl font-extrabold">Symbol not found</h1>
            <p className="mt-3 max-w-md text-slate-600 dark:text-slate-300">
                We couldn&apos;t find that ticker on the Egyptian Exchange. It may be delisted or mistyped.
            </p>
            <div className="mt-6 flex gap-4 text-sm font-semibold">
                <Link href="/Market-Pulse" className="rounded-full bg-teal-600 px-4 py-2 text-white hover:bg-teal-500">
                    Browse the EGX market
                </Link>
                <Link href="/" className="rounded-full border border-slate-300 px-4 py-2 hover:border-teal-400 dark:border-slate-700">
                    Home
                </Link>
            </div>
        </div>
    );
}
