const { chromium } = require('playwright');

(async () => {
    console.log("Starting Playwright E2E test for startamarkets.com/AiChat...");
    const browser = await chromium.launch({ headless: true });
    
    try {
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log("Navigating to https://startamarkets.com/AiChat...");
        await page.goto('https://startamarkets.com/AiChat', { waitUntil: 'networkidle' });

        console.log("Waiting for chat input...");
        const chatInput = page.locator('textarea[placeholder*="Ask"], input[placeholder*="Ask"], textarea, input[type="text"]').last();
        await chatInput.waitFor({ state: 'visible', timeout: 15000 });

        console.log("Asking Question 1...");
        await chatInput.fill("What is the current state of Apple stock?");
        await chatInput.press('Enter');

        console.log("Waiting for Assistant response 1...");
        await page.waitForTimeout(5000); 
        
        console.log("Asking Question 2...");
        await chatInput.fill("Are there any good dividend stocks right now?");
        await chatInput.press('Enter');

        console.log("Checking for the login/registration modal or limit message...");
        await page.waitForTimeout(4000); 

        const bodyText = await page.evaluate(() => document.body.innerText);
        
        if (bodyText.includes("You've used your 1 free question") || bodyText.includes("Register for unlimited") || bodyText.includes("سؤالك المجاني الواحد")) {
            console.log("✅ SUCCESS: Playwright verified that the 1-question limit was enforced! The user was prompted to register/login.");
            process.exitCode = 0;
        } else {
            console.error("❌ FAILED: The 1-question limit does not appear to be enforced on the UI layer.");
            process.exitCode = 1;
        }

    } catch (e) {
        console.error("Playwright Test Failed due to exception:", e.message);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
