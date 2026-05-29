const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    let exceptionCaught = false;

    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.error(`[BROWSER EXCEPTION] ${err.toString()}`);
        exceptionCaught = true;
    });

    try {
        console.log("Navigating to https://startamarkets.com/symbol/COMI...");
        await page.goto('https://startamarkets.com/symbol/COMI', { waitUntil: 'domcontentloaded' });
        // Wait 4 seconds for client-side queries to settle and verify no exceptions are thrown
        await page.waitForTimeout(4000);
        console.log("Finished waiting.");
        if (exceptionCaught) {
            console.log("FAILED: Exception was caught.");
            process.exit(1);
        } else {
            console.log("SUCCESS: No exception caught.");
            process.exit(0);
        }
    } catch (err) {
        console.error("Navigation error:", err);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
