import asyncio
from playwright.async_api import async_playwright
import json
import logging

logging.basicConfig(level=logging.INFO)

async def extract_highcharts(fund_id):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        url = f"https://www.mubasher.info/countries/sa/funds/{fund_id}"
        print(f"Navigating to {url}...")
        try:
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            print("Page loaded. Waiting 5s for scripts...")
            await page.wait_for_timeout(5000)
            
            print("Evaluating Highcharts...")
            data = await page.evaluate("""() => {
                if (typeof Highcharts === 'undefined') return { error: 'No Highcharts' };
                if (!Highcharts.charts) return { error: 'Highcharts.charts undefined' };
                
                // Filter out undefined in sparse array
                const validCharts = Highcharts.charts.filter(c => c);
                if (validCharts.length === 0) return { error: 'No active charts' };
                
                const chart = validCharts[0];
                const series = chart.series[0];
                if (!series) return { error: 'No series in chart' };
                
                return {
                    name: series.name,
                    data_length: series.data ? series.data.length : 0,
                    options_data_length: series.options.data ? series.options.data.length : 0,
                    sample: series.options.data ? series.options.data.slice(0, 3) : 'No options.data'
                };
            }""")
            
            print(f"Result: {data}")
            
        except Exception as e:
            print(f"Error: {e}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(extract_highcharts(1853))
