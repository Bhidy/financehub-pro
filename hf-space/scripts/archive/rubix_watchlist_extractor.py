import gc
import asyncio
import os
import sys
import logging
import httpx
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional, Set
from playwright.async_api import async_playwright, Page
import asyncpg
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('RubixWatchlist')

# Force unbuffered output
print("🚀 RUBIX BATCH EXTRACTOR STARTED", flush=True)

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
RUBIX_USER = os.getenv('RUBIX_USER', 'bhi1')
RUBIX_PASS = os.getenv('RUBIX_PASS', 'zvevwg')
DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL')

LOGIN_URL = "https://rubixegypt.mubashertrade.com/web/login"
WATCHLIST_URL = "https://rubixegypt.mubashertrade.com/web/secure/watchlist"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

# Column mapping from Mubasher col-ids to database fields (37 columns)
COL_ID_MAP = {
    '0': 'symbol', '1': 'last_price', '2': 'open_price', '3': 'change',
    '4': 'change_percent', '5': 'bid', '6': 'ask', '7': 'day_range_pct',
    '9': 'bid_qty', '10': 'ask_qty', '11': 'currency', '12': 'last_qty',
    '14': 'volume', '15': 'turnover', '16': 'trades', '17': 'bid_ask_spread',
    '18': 'day_high', '19': 'day_low', '21': 'limit_min', '22': 'limit_max',
    '23': 'total_bid_qty', '24': 'total_ask_qty', '30': 'week_52_range',
    '33': 'last_trade_time', '34': 'lt_price', '37': 'market',
    '40': 'description', '41': 'vwap', '42': 'prev_close', '50': 'last_auction_price',
}

# Alternative col-id names used in different ag-grid versions
COL_NAME_MAP = {
    'symbol': 'symbol', 'shortDes': 'description', 'last': 'last_price',
    'open': 'open_price', 'netChange': 'change', 'pctChange': 'change_percent',
    'bid': 'bid', 'ask': 'ask', 'bidQty': 'bid_qty', 'askQty': 'ask_qty',
    'volume': 'volume', 'totalTrades': 'trades', 'turnover': 'turnover',
    'high': 'day_high', 'low': 'day_low', 'vwap': 'vwap',
    'previousClose': 'prev_close', 'limitUp': 'limit_max', 'limitDown': 'limit_min',
    'totBidQty': 'total_bid_qty', 'totAskQty': 'total_ask_qty',
    'lastQty': 'last_qty', 'lastTrdTime': 'last_trade_time',
    'marketName': 'market', 'currency': 'currency'
}

def parse_decimal(value: str) -> Optional[Decimal]:
    if not value or value in ['-', '--', 'N/A', '']: return None
    try:
        clean = str(value).replace(',', '').replace('%', '').strip()
        return Decimal(clean) if clean else None
    except: return None

def parse_int(value: str) -> Optional[int]:
    if not value or value in ['-', '--', 'N/A', '']: return None
    try:
        clean = str(value).replace(',', '').strip()
        return int(float(clean)) if clean else None
    except: return None

async def send_discord_notification(message: str, is_error: bool = False):
    if not DISCORD_WEBHOOK_URL: return
    emoji = "🚨" if is_error else "✅"
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                DISCORD_WEBHOOK_URL,
                json={"content": f"{emoji} **EGX Batch**: {message}"},
                timeout=10
            )
    except: pass

async def get_db_connection():
    if not DATABASE_URL: raise ValueError("DATABASE_URL environment variable not set")
    return await asyncpg.connect(DATABASE_URL, statement_cache_size=0)

async def login(page: Page) -> bool:
    """Robust login logic."""
    try:
        logger.info("🔑 Logging in to Rubix Egypt...")
        await page.goto(LOGIN_URL)
        await page.wait_for_timeout(3000)
        
        # Explicit clearing
        await page.locator('#form-input-live-u').click()
        await page.locator('#form-input-live-u').fill('')
        await page.locator('#form-input-live-u').fill(RUBIX_USER)
        
        await page.locator('#form-input-live-p').click()
        await page.locator('#form-input-live-p').fill('')
        await page.locator('#form-input-live-p').fill(RUBIX_PASS)
        
        await page.click('button[type="submit"], .btn-login, button:has-text("Login")')
        
        try:
            await page.wait_for_url("**/secure/**", timeout=20000)
        except:
            if "login" in page.url.lower(): raise Exception("Stuck on login page")

        logger.info("🧭 Navigating to Watchlist...")
        try:
            await page.wait_for_selector('.sidebar-menu', timeout=10000)
            await page.wait_for_timeout(2000)
            
            markets_btn = page.locator('#MARKETS')
            if await markets_btn.count() > 0 and await markets_btn.is_visible():
                await markets_btn.click()
            else:
                await page.click('a[href*="watchlist"], a[href*="market"]', timeout=5000)
                
            await page.wait_for_url("**/watchlist", timeout=15000)
        except Exception as e:
            logger.warning(f"UI Navigation failed, forcing URL... {e}")
            await page.goto(WATCHLIST_URL)
            await page.wait_for_timeout(5000)
            
        # Select EGX Market if needed
        try:
            await page.wait_for_selector('.ag-root-wrapper', timeout=20000)
            toggle_btn = page.locator('button.top-bar-toggle-btn').first
            if await toggle_btn.count() > 0:
                btn_text = await toggle_btn.text_content()
                if "EGX" not in btn_text:
                    await toggle_btn.click()
                    await page.click('text=EGX')
            await page.wait_for_timeout(3000)
            return True
        except: return True 
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        return False

async def extract_batch(page: Page, already_extracted: Set[str], batch_target: int = 50) -> List[Dict]:
    """Extract a batch of NEW stocks by scrolling."""
    logger.info(f"📊 Seeking {batch_target} NEW stocks...")
    
    await page.wait_for_selector('.ag-row', timeout=60000)
    await page.wait_for_timeout(2000)
    
    current_batch_map = {}
    
    # 1. FAST FORWARD SCROLLING
    # Estimate row height ~35px. Scroll past what we already have.
    # Be conservative: assume we might be missing some, so scroll 90% of expected height
    rows_to_skip = len(already_extracted)
    if rows_to_skip > 0:
        scroll_px = rows_to_skip * 35 
        logger.info(f"⏩ Fast-forward scrolling {scroll_px}px (Skipping ~{rows_to_skip} rows)...")
        await page.locator('.ag-body-viewport').first.evaluate(f'el => el.scrollTop = {scroll_px}')
        await page.wait_for_timeout(2000) # Wait for render

    # 2. SCROLL & COLLECT LOOP
    consecutive_no_new = 0
    max_scrolls = 40 # Limit to prevent infinite loops
    
    for i in range(max_scrolls):
        # Scan visible rows
        visible_rows = await page.evaluate('''() => {
            const rows = [];
            document.querySelectorAll('.ag-row').forEach(row => {
                const s = {};
                row.querySelectorAll('.ag-cell').forEach(c => {
                   const id = c.getAttribute('col-id');
                   if(id) s[id] = c.innerText.trim();
                });
                rows.push(s);
            });
            return rows;
        }''')
        
        found_new_in_pass = 0
        for raw in visible_rows:
            sym = raw.get('0') or raw.get('symbol')
            if sym and len(sym) < 10 and sym not in already_extracted and sym not in current_batch_map:
                current_batch_map[sym] = raw
                found_new_in_pass += 1
        
        logger.info(f"   Pass {i+1}: Found {found_new_in_pass} new stocks (Total Batch: {len(current_batch_map)})")

        if len(current_batch_map) >= batch_target:
            logger.info("✅ Batch target reached!")
            break
            
        if found_new_in_pass == 0:
            consecutive_no_new += 1
            if consecutive_no_new >= 5:
                logger.info("🛑 No new stocks found in 5 scrolls. End of list?")
                break
        else:
            consecutive_no_new = 0
            
        # Scroll down
        await page.locator('.ag-body-viewport').first.evaluate('el => el.scrollTop += 500')
        await page.wait_for_timeout(500)
        
    # 3. HORIZONTAL SCROLL (Get all 37 columns)
    if current_batch_map:
        logger.info("↔️ Horizontal scroll for full data...")
        header = page.locator('.ag-header-viewport').first
        for _ in range(8): # Scroll right enough times
            await header.evaluate('el => el.scrollLeft += 400')
            await page.wait_for_timeout(300)
            
            # Update curr batch with new columns
            updates = await page.evaluate('''() => {
                const rows = [];
                document.querySelectorAll('.ag-row').forEach(row => {
                    const s = {};
                    row.querySelectorAll('.ag-cell').forEach(c => {
                       const id = c.getAttribute('col-id');
                       if(id) s[id] = c.innerText.trim();
                    });
                    rows.push(s);
                });
                return rows;
            }''')

            for raw in updates:
                sym = raw.get('0') or raw.get('symbol')
                if sym in current_batch_map:
                    current_batch_map[sym].update(raw)
                    
    return list(current_batch_map.values())

async def run_extraction_session(already_extracted: Set[str], batch_target: int, session_id: int) -> List[Dict]:
    """Isolate browser execution to a single function to ensure clean exit."""
    logger.info(f"\n🔄 SESSION {session_id}: Launching Browser (Mobile Mode)...")
    
    # Aggressive Args
    args = [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas', '--disable-gpu', '--disable-extensions',
        '--disable-features=site-per-process', '--disable-background-networking'
    ]
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=args)
        
        # MOBILE EMULATION: iPhone 12 Pro
        iphone_12 = p.devices['iPhone 12 Pro']
        context = await browser.new_context(
            **iphone_12,
            is_mobile=True,
            has_touch=True
        )
        
        # BLOCK RESOURCES
        await context.route("**/*", lambda route: route.abort() 
            if route.request.resource_type in ["image", "media", "font", "stylesheet"] 
            else route.continue_())
            
        page = await context.new_page()
        
        try:
            if not await login(page): return []
            
            logger.info(f"🎯 Target: Extract {batch_target} NEW stocks (skipping {len(already_extracted)})...")
            return await extract_batch(page, already_extracted, batch_target)
            
        finally:
            await context.close()
            await browser.close()
            logger.info(f"🔄 SESSION {session_id}: Browser Closed.")

async def save_raw_batch(conn, batch: List[Dict]) -> int:
    """Save batch to database using COL_ID_MAP."""
    if not batch or not conn: return 0
    
    count = 0
    for raw in batch:
        try:
            # 1. Map Keys (Mubasher ID -> DB Column)
            clean_row = {}
            # Also handle alternative names if present
            raw_normalized = {}
            for k, v in raw.items():
                # Try direct map
                if k in COL_ID_MAP:
                    raw_normalized[COL_ID_MAP[k]] = v
                # Try name map
                elif k in COL_NAME_MAP:
                    raw_normalized[COL_NAME_MAP[k]] = v
                else:
                    raw_normalized[k] = v

            # 2. Extract Fields
            symbol = raw_normalized.get('symbol')
            if not symbol: continue
            
            # Clean Symbol (remove .CA if exists, though Rubix usually plain)
            symbol = symbol.split('.')[0]
            
            last_price = parse_decimal(raw_normalized.get('last_price'))
            change = parse_decimal(raw_normalized.get('change'))
            change_percent = parse_decimal(raw_normalized.get('change_percent'))
            volume = parse_int(raw_normalized.get('volume'))
            high = parse_decimal(raw_normalized.get('day_high'))
            low = parse_decimal(raw_normalized.get('day_low'))
            open_p = parse_decimal(raw_normalized.get('open_price'))
            prev_close = parse_decimal(raw_normalized.get('prev_close'))
            
            # 3. UPSERT
            await conn.execute("""
                INSERT INTO market_tickers (
                    symbol, last_price, change, change_percent, volume, 
                    high, low, open_price, prev_close, last_updated
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (symbol) DO UPDATE SET
                    last_price = EXCLUDED.last_price,
                    change = EXCLUDED.change,
                    change_percent = EXCLUDED.change_percent,
                    volume = COALESCE(EXCLUDED.volume, market_tickers.volume),
                    high = COALESCE(EXCLUDED.high, market_tickers.high),
                    low = COALESCE(EXCLUDED.low, market_tickers.low),
                    open_price = COALESCE(EXCLUDED.open_price, market_tickers.open_price),
                    prev_close = COALESCE(EXCLUDED.prev_close, market_tickers.prev_close),
                    last_updated = NOW()
            """, symbol, last_price, change, change_percent, volume, high, low, open_p, prev_close)
            
            count += 1
        except Exception as e:
            logger.error(f"Save Error {raw.get('symbol')}: {e}")
            
    return count

async def main(test_mode: bool = False, silent: bool = False):
    start_time = datetime.now()
    # Immediate Startup Notification
    if not test_mode and not silent:
        await send_discord_notification("🚀 Extractor Process Started (Mobile Mode)")

    conn = None
    if not test_mode: conn = await get_db_connection()
    
    # ... [rest of main] ...
    extracted_symbols = set()
    total_saved = 0
    
    # 258 stocks total. 50-60 batch size is safe for 1GB RAM w/ blocking.
    BATCH_SIZE = 25
    MAX_STOCKS = 258 
    
    try:
        session_id = 1
        consecutive_failures = 0
        
        while len(extracted_symbols) < MAX_STOCKS:
            gc.collect() # FORCE PYTHON GC
            
            try:
                # Attempt Session
                raw_data = await run_extraction_session(extracted_symbols, BATCH_SIZE, session_id)
                
                if not raw_data:
                    logger.warning("⚠️ Session Empty.")
                    consecutive_failures += 1
                else:
                    consecutive_failures = 0
                    
                    # Identify NEW items
                    new_batch = []
                    for item in raw_data:
                        s = item.get('0') or item.get('symbol')
                        if s and s not in extracted_symbols:
                            extracted_symbols.add(s)
                            new_batch.append(item)
                    
                    logger.info(f"✅ Session {session_id} yielded {len(new_batch)} fresh stocks.")
                    
                    if not test_mode:
                        c = await save_raw_batch(conn, new_batch)
                        total_saved += c
                        # Granular Notification
                        await send_discord_notification(f"Batch {session_id}: Saved {c} stocks (Total: {total_saved})")

                # Exit conditions
                if consecutive_failures >= 3:
                    logger.info("🛑 3 failures in a row. Stopping.")
                    await send_discord_notification(f"🛑 Stopped after 3 failures. Saved {total_saved}.")
                    break
                
                # If we got less than 50% of batch target, likely near end
                if len(raw_data) < 10 and len(extracted_symbols) > 200:
                    logger.info("🛑 Small batch at end of list. Stopping.")
                    break
                    
                session_id += 1
                await asyncio.sleep(5) # Cooldown
                
            except Exception as e:
                logger.error(f"❌ Session Error: {e}")
                consecutive_failures += 1
                await asyncio.sleep(10)

    finally:
        if conn: await conn.close()
        
    duration = (datetime.now() - start_time).total_seconds()
    logger.info(f"🏁 DONE in {duration:.1f}s. Total Saved: {total_saved}")
    
    if not test_mode and not silent:
        await send_discord_notification(f"🏁 Run Complete: {total_saved} stocks in {duration:.1f}s")

if __name__ == "__main__":
    test = '--test' in sys.argv
    silent = '--silent' in sys.argv
    # Asyncio Main Run
    asyncio.run(main(test, silent))
