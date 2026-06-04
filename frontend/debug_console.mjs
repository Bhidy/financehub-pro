import { chromium } from 'playwright';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const errors = [];

    page.on('pageerror', err => {
        errors.push({ message: err.message, stack: err.stack });
    });

    // Test against the LIVE custom domain
    const url = 'https://startamarkets.com/symbol/COMI';
    console.log(`Testing: ${url}`);
    
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
        console.log('Nav timeout:', e.message);
    }
    
    await page.waitForTimeout(8000);

    console.log('\n=== PAGE ERRORS ===');
    if (errors.length === 0) {
        console.log('ZERO page errors - the fix is live!');
    } else {
        for (const e of errors) {
            console.log('ERROR:', e.message);
            console.log('STACK:', e.stack);
        }
    }

    // Get the page title to confirm it loaded
    const title = await page.title();
    console.log('\nPage title:', title);
    
    // Check if the error message is visible
    const errorText = await page.locator('text=Application error').count();
    console.log('Error message visible:', errorText > 0);

    await browser.close();
}

run();
