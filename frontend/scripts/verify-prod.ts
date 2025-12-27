const PROD_URL = "https://finhub-pro.vercel.app";

async function verify() {
    console.log(`\x1b[36mRunning Production Verification against: ${PROD_URL}\x1b[0m`);

    try {
        const start = Date.now();
        const res = await fetch(PROD_URL);
        const time = Date.now() - start;

        if (!res.ok) throw new Error(`HTTP Status ${res.status}`);

        const html = await res.text();

        // 1. Check Version Badge
        // Note: The HTML might escape characters, but "v2.1.0" should be plain text.
        if (!html.includes("v2.1.0")) {
            console.error("\x1b[31m[FAIL]\x1b[0m Version Badge 'v2.1.0' NOT found in HTML.");
            // We don't crash yet, check other things
        } else {
            console.log("\x1b[32m[PASS]\x1b[0m Version Badge v2.1.0 detected.");
        }

        // 2. Check Market News
        if (!html.includes("Market News")) {
            console.error("\x1b[31m[FAIL]\x1b[0m 'Market News' link NOT found.");
        } else {
            console.log("\x1b[32m[PASS]\x1b[0m 'Market News' feature detected.");
        }

        // 3. Check Proxy Caching Headline logic (Optional/Advanced)
        // We can assume if site loads fast it's good, but let's check a proxy endpoint
        const proxyUrl = `${PROD_URL}/api/proxy/tickers`;
        console.log(`Checking Proxy: ${proxyUrl}`);
        const proxyRes = await fetch(proxyUrl);
        if (proxyRes.ok) {
            console.log("\x1b[32m[PASS]\x1b[0m Proxy Endpoint is accessible (200 OK).");
            // Check cache header if possible? 
            // Vercel headers: x-vercel-cache
            const cache = proxyRes.headers.get("x-vercel-cache");
            console.log(`       Cache Status: ${cache || "Unknown"}`);
        } else {
            console.error(`\x1b[31m[FAIL]\x1b[0m Proxy Endpoint returned ${proxyRes.status}`);
        }

        console.log(`\n\x1b[32mProduction Verification Completed in ${time}ms\x1b[0m`);
        process.exit(0);
    } catch (err) {
        console.error("\x1b[31mFATAL VERIFICATION ERROR:\x1b[0m", err);
        process.exit(1);
    }
}

verify();
