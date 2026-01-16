const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    console.log("Hunting for History API...");
    const browser = await chromium.launch({ headless: true });

    // Stealth
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'en-US'
    });

    const page = await context.newPage();
    const TARGET_URL = 'https://www.mubasher.info/markets/TDWL/stocks/7200'; // Al Moammar Profile

    // Log Requests
    const capturedRequests = [];
    page.on('response', async response => {
        const url = response.url();
        const type = response.request().resourceType();
        if (['fetch', 'xhr'].includes(type) && !url.includes('google') && !url.includes('analytics')) {
            capturedRequests.push({
                url: url,
                status: response.status(),
                type: type
            });
            if (url.includes('history') || url.includes('chart') || url.includes('price')) {
                console.log(`[POTENTIAL] ${response.status()} ${url}`);
            }
        }
    });

    console.log(`Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { timeout: 60000, waitUntil: 'networkidle' });

    // Interact
    console.log("Clicking Chart buttons...");
    try {
        // Try common chart selectors
        const buttons = await page.getByRole('button').all();
        for (const btn of buttons) {
            const text = await btn.innerText();
            if (['1Y', '3Y', '5Y', 'Max', 'سنة', 'الكل'].some(t => text.includes(t))) {
                console.log(`Clicking ${text}...`);
                await btn.click();
                await page.waitForTimeout(1000);
            }
        }
    } catch (e) {
        console.log("Interaction error:", e.message);
    }

    fs.writeFileSync('network_log.json', JSON.stringify(capturedRequests, null, 2));
    console.log(`Saved ${capturedRequests.length} requests to network_log.json`);

    await browser.close();
})();
