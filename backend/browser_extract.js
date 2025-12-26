const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    console.log("Launching Stealth Browser...");
    const browser = await chromium.launch({
        headless: true
    });

    // Create a context that looks like a real user
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        timezoneId: 'Asia/Riyadh'
    });

    const page = await context.newPage();
    const TARGET_URL = 'https://www.mubasher.info/markets/TDWL/stocks/7200/volume-statistics'; // Volume & Price Stats

    console.log(`Navigating to ${TARGET_URL}...`);

    try {
        const response = await page.goto(TARGET_URL, { timeout: 60000, waitUntil: 'domcontentloaded' });
        console.log(`Status: ${response.status()}`);

        // Wait for table
        try {
            await page.waitForSelector('table', { timeout: 15000 });
        } catch (e) {
            console.log("Table selector timeout. Page likely empty or different structure.");
        }

        console.log("Capturing table...");

        // Extract Table Data
        const historyData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tr'));
            return rows.map(row => {
                const cells = Array.from(row.querySelectorAll('th, td'));
                return cells.map(cell => cell.innerText.trim());
            }).filter(row => row.length > 0);
        });

        console.log(`Extracted ${historyData.length} rows of data.`);
        console.log("Sample Data:", historyData.slice(0, 5));

        // Screenshot history
        await page.screenshot({ path: 'stats_proof.png' });
        console.log("Stats screenshot saved.");

    } catch (error) {
        console.error("Error during navigation:", error);
    }

    await browser.close();
})();
