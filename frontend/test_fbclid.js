const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR CONSOLE:', msg.text());
  });
  page.on('pageerror', error => console.error('BROWSER ERROR STACK:', error.stack));
  await page.goto('http://localhost:3000/shared/sess_1768861489037?fbclid=IwY2xjawQIUrBleHRuA2FlbQIxMQBzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEe7eRhCnaWkVGb_OhL-O9GKLMfyDZqh-80jvkw6TVrVyZakZzVNrd6aqoUl1Y_aem_GF4y7fehig6GwDyvJFZU0A');
  await page.waitForTimeout(5000);
  await browser.close();
})();
