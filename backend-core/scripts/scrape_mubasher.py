
import asyncio
import os
import csv
import aiohttp
import asyncpg
from datetime import datetime, timezone
from playwright.async_api import async_playwright
import sys, os as _os
sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
from data_pipeline.nav_alignment import check_alignment, describe
from dotenv import load_dotenv
import io
import ssl

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
# Credentials
MUBASHER_USER = os.environ.get("MUBASHER_USER", "")
MUBASHER_PASS = os.environ.get("MUBASHER_PASS", "")
if not (MUBASHER_USER and MUBASHER_PASS):
    raise SystemExit(
        "FATAL: MUBASHER_USER / MUBASHER_PASS must be set in the environment. "
        "Credentials are never hardcoded (2026-08-15 security audit).")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

BASE_URL = "https://english.mubasher.info"
LIST_URL = f"{BASE_URL}/countries/eg/funds"
LOGIN_URL = f"{BASE_URL}/login?country=eg"
CSV_BASE_URL = "https://static.mubasher.info/File.MubasherCharts/File.Mutual_Fund_Charts_Dir/priceChartFund_{fund_id}.csv"

async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL, statement_cache_size=0)

def clean_text(text):
    if not text: return None
    return text.strip().replace('\xa0', ' ')

def parse_decimal(text):
    if not text: return None
    clean = str(text).replace(',', '').replace('%', '').replace('EGP', '').replace('USD', '').strip()
    if not clean or clean == '-' or clean == '--': return None
    try:
        return float(clean)
    except Exception:
        return None

def parse_date(text):
    if not text: return None
    clean = clean_text(text)
    for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d']:
        try:
            return datetime.strptime(clean, fmt).date()
        except Exception:
            continue
    return None

async def login(page):
    """Authenticate with Mubasher."""
    print("🔑 Logging in...")
    try:
        await page.goto(LOGIN_URL)
        await page.wait_for_timeout(3000)
        
        frame_element = await page.wait_for_selector('iframe[src*="community"]', timeout=10000)
        if frame_element:
            frame = await frame_element.content_frame()
            if frame:
                print("   Found Login Iframe. Filling credentials...")
                await frame.fill('input[type="email"]', MUBASHER_USER)
                await frame.fill('input[type="password"]', MUBASHER_PASS)
                await frame.click('button.btn-submit')
                print("   Clicked Sign In. Waiting for redirect...")
                await page.wait_for_timeout(5000)
                print("   ✅ Login logic completed.")
                return True
    except Exception as e:
        print(f"   ⚠️ Login Failed/Skipped: {e}")
    return False

async def scrape_census(page):
    """Scrape the main list of funds."""
    funds = []
    print("📋 Starting Census (List Page)...")
    await page.goto(LIST_URL)
    
    try:
        await page.wait_for_selector('tr.mi-table__tbody-tr', timeout=20000)
    except Exception:
        print("   ⚠️ Timeout waiting for table rows. Checking for spinner...")
        
    await page.wait_for_timeout(2000)

    while True:
        rows = await page.query_selector_all('tr.mi-table__tbody-tr')
        print(f"   Scanning {len(rows)} funds on current page...")
        
        for row in rows:
            cols = await row.query_selector_all('td')
            if len(cols) >= 5:
                link_elem = await cols[0].query_selector('a')
                if link_elem:
                    url = await link_elem.get_attribute('href')
                    name = await link_elem.inner_text()
                    fund_id = url.split('/')[-1] if url else None
                    
                    market = await cols[1].inner_text()
                    manager = await cols[2].inner_text()
                    owner = await cols[3].inner_text()
                    price_text = await cols[4].inner_text()
                    
                    date_text = None
                    if len(cols) >= 7:
                         date_text = await cols[6].inner_text()
                    
                    if fund_id:
                        funds.append({
                            'fund_id': fund_id,
                            'name': clean_text(name),
                            'market': clean_text(market),
                            'manager': clean_text(manager),
                            'owner': clean_text(owner),
                            'latest_nav': parse_decimal(price_text),
                            'last_update_date': parse_date(date_text),
                            'url': f"{BASE_URL}{url}"
                        })

        next_btn = await page.query_selector('ul.cd-pagination li a:has-text("Next")')
        if not next_btn:
            next_btn = await page.query_selector('.pagination .next a')
            
        if next_btn and await next_btn.is_visible():
            print("   ➡️ Next page...")
            await next_btn.click()
            await page.wait_for_load_state('networkidle')
            await page.wait_for_timeout(2000)
        else:
            print("   ⛔ No more pages.")
            break
            
    if not funds:
        print("   ⚠️ DOM extraction failed. Trying Regex Fallback...")
        import re
        content = await page.content()
        matches = re.findall(r'/countries/EG/funds/(\d+)', content)
        unique_ids = set(matches)
        print(f"   Found {len(unique_ids)} IDs via Regex.")
        
        for fid in unique_ids:
            funds.append({
                'fund_id': fid,
                'name': f"Fund {fid}",
                'market': 'Egypt',
                'manager': 'Unknown',
                'owner': 'Unknown',
                'latest_nav': 0,
                'last_update_date': datetime.now().date(),
                'url': f"{BASE_URL}/countries/EG/funds/{fid}"
            })

    print(f"✅ Census complete. Found {len(funds)} funds.")
    return funds

async def get_existing_funds_from_db(conn):
    """Fallback: Get all fund IDs from DB."""
    print("   ⚠️ fetching existing funds from DB as fallback...")
    rows = await conn.fetch('SELECT fund_id, fund_name FROM mutual_funds')
    funds = []
    for r in rows:
        funds.append({
            'fund_id': r['fund_id'],
            'name': r['fund_name'],
            'url': f"{BASE_URL}/countries/EG/funds/{r['fund_id']}",
            'market': 'Egypt', 'manager': 'Unknown', 'owner': 'Unknown',
            'latest_nav': 0, 'last_update_date': datetime.now().date()
        })
    return funds

async def extract_highcharts_history(page):
    """Extract history from Highcharts object."""
    try:
        try:
            max_btn = page.locator('button:has-text("Max"), a:has-text("Max")').first
            if await max_btn.count() > 0 and await max_btn.is_visible():
                print("   Clicking Max button...")
                await max_btn.click()
                await page.wait_for_timeout(2000) 
        except Exception:
            pass 

        data = await page.evaluate('''() => {
            if (window.Highcharts && window.Highcharts.charts && window.Highcharts.charts[0]) {
                const series = window.Highcharts.charts[0].series.find(s => s.name === 'Value' || s.name === 'Price' || s.name === 'NAV') || window.Highcharts.charts[0].series[0];
                if (series && series.options.data) {
                    return series.options.data;
                }
                if (series && series.data) {
                     return series.data.map(p => ({x: p.x, y: p.y}));
                }
            }
            return null;
        }''')
        
        history = []
        if data:
            print(f"   Found {len(data)} data points from Chart.")
            for point in data:
                ts = None
                val = None
                if isinstance(point, list) and len(point) >= 2:
                    ts = point[0]
                    val = point[1]
                elif isinstance(point, dict):
                    ts = point.get('x') or point.get('date')
                    val = point.get('y') or point.get('value')
                
                if ts and val is not None:
                     try:
                        # UTC, NOT LOCAL TIME. Highcharts sends epoch
                        # milliseconds at UTC midnight; datetime.fromtimestamp
                        # reads them in the RUNNER's timezone, which put every
                        # single point on the previous day. Measured on the
                        # first live run: 13,313 rows written, and 100% of them
                        # (1573/1573, 1047/1047, 273/273 on the funds checked)
                        # were one-day-shifted duplicates carrying the NEXT
                        # day's value. That is worse than a missing point — it
                        # makes a weekly fund look like it publishes twice a
                        # week and corrupts cadence, gaps and every return.
                        dt = datetime.fromtimestamp(ts / 1000.0, timezone.utc).date()
                        history.append({'date': dt, 'nav': float(val)})
                     except Exception: pass
        return history
    except Exception as e:
        print(f"   ⚠️ Chart Extraction Error: {e}")
        return []

async def scrape_profile_and_history(page, url):
    """Scrape details and history from profile page."""
    data = {}
    history = []
    try:
        await page.goto(url)
        await page.wait_for_timeout(2000)
        
        labels = ['YTD Profit', '1 Year Profit', '3 Year Profit', '5 Year Profit']
        keys = ['ytd_return', 'one_year_return', 'returns_3y', 'returns_5y']
        
        for i, label in enumerate(labels):
            val_el = page.locator(f'xpath=//td[contains(., "{label}")]/following-sibling::td').first
            if await val_el.count() > 0:
                val = await val_el.inner_text()
                if val:
                    data[keys[i]] = parse_decimal(val)
        
        history = await extract_highcharts_history(page)
        
    except Exception as e:
        print(f"   ⚠️ Profile Error: {e}")
        
    return data, history

async def save_fund_data(conn, fund, history, profile_data, history_only=False):
    """Save all data to DB.

    HISTORY_ONLY EXISTS BECAUSE GAP MODE HAS NO METADATA TO OFFER, AND WRITING
    WHAT IT DOES HAVE WOULD BE DESTRUCTIVE. Its fund list comes from
    get_existing_funds_from_db, which fills the metadata fields with
    placeholders — manager 'Unknown', latest_nav 0, last_update_date today. Fed
    to the upsert below those are not harmless: `latest_nav = COALESCE(EXCLUDED
    .latest_nav, ...)` would set a live NAV to 0, and
    `GREATEST(..., EXCLUDED.last_update_date)` would stamp today onto a fund
    whose real last publication was months ago — which is precisely the freshness
    signal the staleness alarms read.

    A repair job exists to add missing history. It has no business touching
    anything else.
    """
    # 1. Upsert Fund
    if not history_only:
        await conn.execute('''
            INSERT INTO mutual_funds (fund_id, fund_name, fund_name_en, market, manager_name, owner, latest_nav, last_update_date, updated_at)
            -- $2 fills two columns, and without a cast asyncpg cannot deduce one
            -- type for it: "inconsistent types deduced for parameter $2". Every
            -- parameter is cast, so the statement can never again depend on
            -- inference across a growing column list.
            VALUES ($1::text, $2::text, $2::text, $3::text, $4::text, $5::text,
                    $6::numeric, $7::date, NOW())
            ON CONFLICT (fund_id) DO UPDATE SET
                -- freshest-wins / fill-don't-null: never overwrite a populated metadata
                -- field with a blank scrape, and never regress the NAV date.
                latest_nav = COALESCE(EXCLUDED.latest_nav, mutual_funds.latest_nav),
                last_update_date = GREATEST(mutual_funds.last_update_date, EXCLUDED.last_update_date),
                market = COALESCE(NULLIF(EXCLUDED.market, ''), mutual_funds.market),
                manager_name = COALESCE(NULLIF(EXCLUDED.manager_name, ''), mutual_funds.manager_name),
                owner = COALESCE(NULLIF(EXCLUDED.owner, ''), mutual_funds.owner),
                fund_name = COALESCE(NULLIF(EXCLUDED.fund_name, ''), mutual_funds.fund_name),
                -- fund_name_en is what the funds API/sitemap require to make a fund visible;
                -- the census name is English, so seed it here (Arabic fund_name filled later).
                fund_name_en = COALESCE(NULLIF(mutual_funds.fund_name_en, ''), EXCLUDED.fund_name_en),
                updated_at = NOW()
        ''', fund['fund_id'], fund['name'], fund['market'], fund['manager'], fund['owner'], fund['latest_nav'], fund['last_update_date'])

    # 2. Update Profile Data
    if profile_data and not history_only:
        await conn.execute('''
            UPDATE mutual_funds SET
                ytd_return = COALESCE($2, ytd_return),
                one_year_return = COALESCE($3, one_year_return),
                returns_3y = COALESCE($4, returns_3y),
                returns_5y = COALESCE($5, returns_5y)
            WHERE fund_id = $1
        ''', fund['fund_id'], profile_data.get('ytd_return'), profile_data.get('one_year_return'), profile_data.get('returns_3y'), profile_data.get('returns_5y'))

    # 3. Batch Insert History
    if history:
        # ── PROVE THE DATES BEFORE WRITING THEM ─────────────────────────────
        # Every other NAV source here reconciles against data already held
        # before it writes. This one did not, and on its first live run it
        # wrote 13,313 rows dated one day early, each carrying the following
        # day's value.
        #
        # Note what would NOT have caught it: a tolerance on the values. Most
        # of these are money-market funds moving ~0.01% a day, so a one-day
        # shift still agrees to 0.01%. The values were never wrong; the dates
        # were. So the check asks which alignment best explains the series, and
        # refuses to write when some offset other than zero fits decisively
        # better — whatever the errors look like at zero.
        #
        # Validated against rows this scraper did NOT write, so a bad run can
        # never ratify itself on a later one.
        held = {r["date"]: float(r["nav"]) for r in await conn.fetch(
            "SELECT date, nav FROM nav_history "
            "WHERE fund_id = $1 AND COALESCE(source, '') <> $2",
            fund['fund_id'], SOURCE_TAG)}
        verdict = check_alignment({h['date']: float(h['nav']) for h in history}, held)
        if not verdict["ok"]:
            print(f"   ⛔ REFUSED — {describe(verdict)}")
            return {"written": 0, "refused": 1}
        print(f"   ✅ {describe(verdict)}")

        records = [(fund['fund_id'], h['date'], h['nav']) for h in history]
        # EXPLICIT CASTS. Adding the source column left asyncpg unable to
        # deduce a type for $2 across the statement — "inconsistent types
        # deduced for parameter $2" — and it failed after reading 1,108 points
        # off the chart, which is the worst possible moment to fall over.
        await conn.executemany('''
            INSERT INTO nav_history (fund_id, date, nav, source, ingested_at)
            VALUES ($1::text, $2::date, $3::numeric, 'mubasher_page', NOW())
            ON CONFLICT (fund_id, date) DO NOTHING
        ''', records)
        print(f"   Saved {len(records)} history points.")
        return {"written": len(records), "refused": 0}
    return {"written": 0, "refused": 0}

# A hole no publication cadence explains. The widest genuine rhythm in the book
# is monthly; three months of silence is missing data.
GAP_DAYS = 90

SQL_GAPPED_FUNDS = """
    WITH d AS (
        SELECT fund_id, date,
               LAG(date) OVER (PARTITION BY fund_id ORDER BY date) AS prev
          FROM nav_history
         WHERE fund_id ~ '^[0-9]+$'
    )
    SELECT fund_id, MAX(date - prev) AS worst
      FROM d
     WHERE prev IS NOT NULL
       -- The EGX was genuinely shut 2011-01-27 -> 2011-03-23. That is real
       -- market history and re-scraping for it would be chasing a hole that
       -- is supposed to be there.
       AND NOT (prev < DATE '2011-03-23' AND date > DATE '2011-01-27')
     GROUP BY fund_id
    HAVING MAX(date - prev) >= $1
     ORDER BY MAX(date - prev) DESC
"""


async def gapped_fund_ids(conn) -> set:
    rows = await conn.fetch(SQL_GAPPED_FUNDS, GAP_DAYS)
    return {r["fund_id"] for r in rows}


SOURCE_TAG = "mubasher_page"


async def purge_scraped(conn) -> int:
    """Remove rows THIS script wrote, and only those.

    Needed the day gap mode shipped: a timezone bug dated every scraped point
    one day early, so 13,313 rows landed carrying the following day's value.
    Every one is re-derivable, so the safe repair is to drop the source and
    re-run the fixed reader rather than hand-pick duplicates.

    The source filter is what makes this impossible to turn into an accident:
    no vendor observation, and no other pipeline's row, can be reached from here.
    """
    rows = await conn.fetch(
        "DELETE FROM nav_history WHERE source = $1 RETURNING fund_id", SOURCE_TAG)
    funds = sorted({r["fund_id"] for r in rows})
    print(f"🧹 PURGED {len(rows)} '{SOURCE_TAG}' row(s) across {len(funds)} fund(s).")
    return len(rows)


async def main(test_mode=False, gaps_only=False, purge=False):
    print("🚀 Mubasher Scraper Started (Authenticated Mode)")
    conn = await get_db_connection()

    # Purge before anything else, and never open a browser for it: this exists
    # to undo a bad write, so it must not depend on the site being reachable.
    if purge:
        try:
            await purge_scraped(conn)
        finally:
            await conn.close()
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        context = await browser.new_context(
            user_agent=HEADERS['User-Agent'],
            viewport={'width': 1280, 'height': 720}
        )
        page = await context.new_page()
        
        await login(page)

        # ── WHERE THE FUND LIST COMES FROM ──────────────────────────────────
        # Gap mode does not need the census, and should not depend on it. The
        # census walks Mubasher's paginated list page and clicks through it, so
        # it breaks whenever they touch that UI — which is exactly what happened
        # on the first live run: login succeeded, then ElementHandle.click timed
        # out after 30s and took the whole job down with it.
        #
        # The database already knows every fund id, and a fund page URL is
        # `/countries/EG/funds/{id}`. For repairing history that is strictly
        # better: it is the authoritative list, it costs no page loads, and it
        # cannot be broken by a layout change.
        if gaps_only:
            all_funds = await get_existing_funds_from_db(conn)
        else:
            try:
                all_funds = await scrape_census(page)
            except Exception as e:  # noqa: BLE001 — a UI change must not end the run
                print(f"   ⚠️ Census failed ({type(e).__name__}); falling back to the DB list.")
                all_funds = []
            if not all_funds:
                all_funds = await get_existing_funds_from_db(conn)

        # ── GAP-DRIVEN MODE ─────────────────────────────────────────────────
        # THE RESUME GUARD IS WHY THIS JOB NEVER REPAIRED ANYTHING. It skips a
        # fund that has more than ten points and was touched today — which is
        # every fund, because the list-API sync writes today's price to all of
        # them every morning. So the one source that can read a fund's FULL
        # chart history has been running daily and re-reading nothing.
        #
        # That mattered most for the funds it was needed for. The newer funds
        # have no per-fund CSV at all (checked: the file is empty for every one
        # of them), so they live entirely on that daily one-price trickle, and
        # when the NAV job failed six runs in a row in August 2026 those days
        # were lost permanently. There was no way to go back for them.
        #
        # In this mode the fund list is the GAP LEDGER, and the guard is off by
        # construction: a fund is here precisely because its history is
        # incomplete, so "we already have history" is not a reason to skip it.
        gapped = set()
        if gaps_only:
            gapped = await gapped_fund_ids(conn)
            all_funds = [f for f in all_funds if f["fund_id"] in gapped]
            print(f"🎯 GAP MODE: {len(all_funds)} fund(s) carry a {GAP_DAYS}+ day hole.")
            if not all_funds:
                print("   Nothing to repair.")

        if test_mode:
            all_funds = all_funds[:3]
            print("⚠️ TEST MODE: Processing first 3 funds only.")
        
        written = refused = 0
        for i, fund in enumerate(all_funds):
            print(f"[{i+1}/{len(all_funds)}] Processing {fund['name']} ({fund['fund_id']})...")
            
            # Resume Logic: Skip if we have substantial history
            try:
                # Check actual data presence, not just metadata timestamp
                history_count = await conn.fetchval("SELECT count(*) FROM nav_history WHERE fund_id = $1", fund['fund_id'])
                
                # Also check metadata date to ensure it's not stale from last month
                meta_row = await conn.fetchrow("SELECT updated_at FROM mutual_funds WHERE fund_id = $1", fund['fund_id'])
                
                is_fresh = False
                if meta_row and meta_row['updated_at']:
                     is_fresh = meta_row['updated_at'].date() >= datetime.now().date()

                if gaps_only:
                    print(f"   🎯 Re-reading full history (carries a {GAP_DAYS}+ day gap).")
                elif history_count > 10 and is_fresh:
                    print(f"   ⏭️ Skipping (Found {history_count} points & updated today).")
                    continue
                elif history_count > 10:
                     print(f"   ⚠️ History exists ({history_count}) but metadata stale. Re-scraping to update...")
                else:
                     # 0 history or stale
                     pass

            except Exception as e:
                print(f"   ⚠️ Resume check failed: {e}")



            
            profile_data, history = {}, []
            if fund.get('url'):
                 profile_data, history = await scrape_profile_and_history(page, fund['url'])
            
            res = await save_fund_data(conn, fund, history, profile_data,
                                       history_only=gaps_only) or {}
            written += res.get("written", 0)
            refused += res.get("refused", 0)
                
        print(f"\n📊 {written} history point(s) written, {refused} fund(s) REFUSED "
              f"for misaligned dates.")
        if refused:
            print("::warning::some funds were refused because their dates did not "
                  "line up with NAV already held. Nothing was written for them.")
        await browser.close()

    await conn.close()
    print("🏁 Scraping Complete.")

if __name__ == "__main__":
    import sys
    test = '--test' in sys.argv
    gaps = '--gaps-only' in sys.argv
    purge = '--purge-scraped' in sys.argv
    asyncio.run(main(test, gaps, purge))
