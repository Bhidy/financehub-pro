const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    console.log("Starting Bulk Data Extraction...");

    // Load Tickers
    const tickers = JSON.parse(fs.readFileSync('tickers.json', 'utf8'));
    console.log(`Loaded ${tickers.length} tickers to process.`);

    // Init CSV
    const CSV_FILE = 'market_snapshot.csv';
    fs.writeFileSync(CSV_FILE, 'symbol,name,price,change,volume,last_update,status\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    // Process Tickers
    for (const [index, ticker] of tickers.entries()) {
        const symbol = ticker.symbol;
        const url = `https://www.mubasher.info/markets/TDWL/stocks/${symbol}`;

        process.stdout.write(`[${index + 1}/${tickers.length}] Processing ${symbol}... `);

        try {
            await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
            // Quick wait for hydration
            await page.waitForTimeout(2000);

            // Extract Data
            const data = await page.evaluate(() => {
                const priceEl = document.querySelector('.market-price') || document.querySelector('[class*="price"]');
                const changeEl = document.querySelector('[class*="change"]');
                const volumeEl = document.body.innerText.match(/Volume\n([\d,]+)/i) || document.body.innerText.match(/الحجم\n([\d,]+)/);

                return {
                    price: priceEl ? priceEl.innerText.trim() : 'N/A',
                    change: changeEl ? changeEl.innerText.trim() : 'N/A',
                    volume: volumeEl ? volumeEl[1] : 'N/A'
                };
            });

            // Write to CSV
            const row = `${symbol},${ticker.name},${data.price},${data.change},${data.volume},${new Date().toISOString()},OK`;
            fs.appendFileSync(CSV_FILE, row + '\n');
            console.log(`Done. Price: ${data.price}`);

        } catch (e) {
            console.log(`Failed. Error: ${e.message}`);
            fs.appendFileSync(CSV_FILE, `${symbol},${ticker.name},N/A,N/A,N/A,${new Date().toISOString()},ERROR\n`);
        }

        // Random short delay to be nice
        // await page.waitForTimeout(500); 
    }

    await browser.close();
    console.log("Bulk Extraction Complete. Saved to market_snapshot.csv");
})();
