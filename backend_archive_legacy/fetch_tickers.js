const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    console.log("Launching Ticker Scraper with Scroll...");
    const browser = await chromium.launch({ headless: true });

    // Create a context
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();
    const TARGET_URL = 'https://www.mubasher.info/countries/sa/companies';

    console.log(`Navigating to ${TARGET_URL}...`);

    try {
        const response = await page.goto(TARGET_URL, { timeout: 60000, waitUntil: 'networkidle' });
        console.log(`Status: ${response.status()}`);

        await page.waitForTimeout(3000);

        console.log("Scrolling to load all companies...");
        // Scroll repeatedly to trigger lazy load
        let previousHeight = 0;
        for (let i = 0; i < 20; i++) { // Try 20 times max
            const currentHeight = await page.evaluate(() => document.body.scrollHeight);
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2000); // Wait for load

            // Optional: check if height changed, break if stable (simplistic check)
            // if (currentHeight === previousHeight && i > 5) break; 
            previousHeight = currentHeight;
            process.stdout.write(".");
        }
        console.log("\nScroll complete.");

        console.log("Extracting links...");

        // Extract all company profile links
        const tickers = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/stocks/"]')); // Broad filter
            const seen = new Set();
            const results = [];

            links.forEach(link => {
                const href = link.getAttribute('href');
                // Regex for /markets/TDWL/stocks/(\d+)
                // Sometimes format is /markets/TDWL/stocks/7200/profile
                const match = href.match(/\/markets\/TDWL\/stocks\/(\d+)/);
                if (match) {
                    const symbol = match[1];
                    if (!seen.has(symbol)) {
                        seen.add(symbol);
                        results.push({
                            symbol: symbol,
                            full_href: href,
                            name: link.innerText.trim()
                        });
                    }
                }
            });
            return results;
        });

        console.log(`Found ${tickers.length} unique tickers.`);

        if (tickers.length > 0) {
            fs.writeFileSync('tickers.json', JSON.stringify(tickers, null, 2));
            console.log("Saved to tickers.json");
            console.log("Preview:", tickers.slice(0, 5));
        } else {
            await page.screenshot({ path: 'tickers_fail.png' });
        }

    } catch (error) {
        console.error("Error:", error);
    }

    await browser.close();
})();
