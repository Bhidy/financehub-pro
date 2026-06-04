"""
Egypt Market Service
Handles scraping and updates for Egypt Mutual Funds and NAV History using tls_client
"""

import tls_client
import time
import asyncio
import io
import csv
import logging
import json
import math
import re
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from app.db.session import db
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class EgyptMarketService:
    def __init__(self):
        self.session = None
        self.db_pool = None

    def create_session(self):
        """Create a TLS session that mimics a real browser"""
        self.session = tls_client.Session(
            client_identifier="chrome_120",
            random_tls_extension_order=True
        )
        return self.session

    def get_headers(self, referer=None):
        """Browser-like headers"""
        return {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": referer or "https://english.mubasher.info/countries/eg/funds",
            "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"macOS"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
            "Connection": "keep-alive"
        }

    async def get_all_funds(self) -> List[Dict]:
        """Get all funds from database."""
        return await db.fetch_all("""
            SELECT 
                fund_id, fund_name, market_code, last_updated,
                fund_type, manager, issuer, aum_millions, is_shariah,
                returns_3m, returns_1y, returns_ytd, currency
            FROM mutual_funds 
            WHERE market_code = 'EGX' OR market_code = 'TDWL'
            ORDER BY fund_id
        """)

    def extract_chart_from_page(self, html_content: str, fund_id: str) -> Optional[List[List]]:
        """Extract chart data from page HTML/JS"""
        chart_data = None
        
        # Regex patterns to find embedded JSON data
        patterns = [
            r'chartData\s*=\s*(\[[\s\S]*?\]);',
            r'priceData\s*=\s*(\[[\s\S]*?\]);',
            r'navData\s*=\s*(\[[\s\S]*?\]);',
            r'"data"\s*:\s*(\[\[[\d,\.]+\](?:,\s*\[\d+,[\d\.]+\])*\])',
            r'series\s*:\s*\[\s*\{\s*data\s*:\s*(\[[\s\S]*?\])',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, html_content)
            for match in matches:
                try:
                    data = json.loads(match)
                    if isinstance(data, list) and len(data) > 10:
                        # Validate it looks like NAV data [[timestamp, value], ...]
                        if isinstance(data[0], list) and len(data[0]) == 2:
                            return data
                except:
                    continue
        
        # Fallback: Parse script tags via BeautifulSoup
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            scripts = soup.find_all('script')
            for script in scripts:
                if script.string and ('Highcharts' in script.string or 'chart' in script.string.lower()):
                    data_matches = re.findall(r'\[\s*\[\s*\d+\s*,\s*[\d\.]+\s*\](?:\s*,\s*\[\s*\d+\s*,\s*[\d\.]+\s*\])+\s*\]', script.string)
                    for match in data_matches:
                        try:
                            data = json.loads(match)
                            if len(data) > 10:
                                return data
                        except:
                            continue
        except Exception as e:
            logger.error(f"Error parsing HTML for fund {fund_id}: {e}")

        return None

    def fetch_chart_via_api(self, fund_id: str) -> Optional[List[List]]:
        """Try fetching chart via API with session cookies"""
        periods = ['all', '5y', '3y', '1y', 'ytd', '6m']
        headers = self.get_headers(referer=f"https://english.mubasher.info/markets/EGX/funds/{fund_id}")
        headers.update({
            "Accept": "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest"
        })
        
        for period in periods:
            try:
                url = f"https://english.mubasher.info/api/1/funds/{fund_id}/chart?type={period}"
                resp = self.session.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and len(data) > 2:
                        return data
            except:
                pass
        return None

    # Mubasher publishes a clean, NO-AUTH per-fund NAV CSV that stays fresh to
    # ~2 days. This is the reliable PRIMARY source — the chart API below now
    # returns HTTP 500 and the funds list page is JS-rendered.
    CSV_URL = ("https://static.mubasher.info/File.MubasherCharts/"
               "File.Mutual_Fund_Charts_Dir/priceChartFund_{fund_id}.csv")

    def fetch_nav_csv(self, fund_id: str):
        """PRIMARY: fetch+validate the static Mubasher NAV CSV.

        Returns a sorted list[(date, float)] or None. Drops NaN/Inf/<=0/absurd
        NAVs and out-of-range dates so a malformed row can never poison the DB.
        """
        try:
            if not self.session:
                self.create_session()
            resp = self.session.get(self.CSV_URL.format(fund_id=fund_id), headers=self.get_headers())
            if resp.status_code != 200 or not resp.text or len(resp.text) < 50:
                return None
            out = {}
            today = datetime.now().date()
            for line in resp.text.splitlines():
                parts = line.split(',')
                if len(parts) < 2:
                    continue
                head = parts[0].strip()
                d = None
                for fmt in ('%Y/%m/%d/%H:%M:%S', '%Y/%m/%d', '%Y-%m-%d'):
                    try:
                        d = datetime.strptime(head, fmt).date()
                        break
                    except ValueError:
                        continue
                if not d or d.year < 1990 or d > today:
                    continue
                try:
                    nav = float(parts[1].replace(',', '').strip())
                except ValueError:
                    continue
                if not math.isfinite(nav) or nav <= 0 or nav > 1e9:
                    continue
                out[d] = round(nav, 6)  # last value wins on duplicate date
            return sorted(out.items()) if out else None
        except Exception as e:
            logger.debug(f"CSV fetch failed for {fund_id}: {e}")
            return None

    async def _reconcile_latest_nav(self, fund_id: str):
        """Keep mutual_funds.latest_nav in sync with the freshest nav_history row."""
        try:
            await db.execute("""
                UPDATE mutual_funds f SET
                    latest_nav = nh.nav, last_update_date = nh.date, updated_at = NOW()
                FROM (SELECT nav, date FROM nav_history WHERE fund_id = $1 ORDER BY date DESC LIMIT 1) nh
                WHERE f.fund_id = $1
            """, fund_id)
        except Exception:
            pass

    async def update_fund_nav_history(self, fund_id: str, fund_name: str) -> int:
        """Update NAV history for a single fund (CSV-primary, layered fallback)."""
        # Method 0: Static CSV (PRIMARY — no auth, fresh, reliable)
        csv_points = self.fetch_nav_csv(fund_id)
        if csv_points:
            inserted = 0
            for d, nav in csv_points:
                try:
                    await db.execute("""
                        INSERT INTO nav_history (fund_id, date, nav)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                    """, fund_id, d, nav)
                    inserted += 1
                except Exception:
                    pass
            if inserted:
                await self._reconcile_latest_nav(fund_id)
                return inserted

        if not self.session:
            self.create_session()
            # Visit main page to establish cookies
            try:
                self.session.get("https://english.mubasher.info/countries/eg/funds", headers=self.get_headers())
                await asyncio.sleep(1)
            except:
                pass

        chart_data = None

        # Method 1: Scrape Page
        try:
            url = f"https://english.mubasher.info/markets/EGX/funds/{fund_id}"
            resp = self.session.get(url, headers=self.get_headers())
            if resp.status_code == 200:
                chart_data = self.extract_chart_from_page(resp.text, fund_id)
        except Exception as e:
            logger.debug(f"Page scrape failed for {fund_id}: {e}")

        # Method 2: API
        if not chart_data:
            chart_data = self.fetch_chart_via_api(fund_id)

        if not chart_data:
            return 0

        # Save to DB
        inserted = 0
        records = []
        for point in chart_data:
            try:
                ts = point[0]
                nav = point[1]
                # Handle ms vs s stats
                if ts > 9999999999:
                    dt = datetime.fromtimestamp(ts / 1000.0)
                else:
                    dt = datetime.fromtimestamp(ts)
                records.append((fund_id, dt.date(), float(nav)))
            except:
                continue

        if records:
            # Batch insert
            for record in records:
                try:
                    await db.execute("""
                        INSERT INTO nav_history (fund_id, date, nav)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (fund_id, date) DO UPDATE SET nav = EXCLUDED.nav
                    """, record[0], record[1], record[2])
                    inserted += 1
                except Exception:
                    pass
            if inserted:
                await self._reconcile_latest_nav(fund_id)

        return inserted

    async def update_all_navs(self, limit: int = None):
        """Update NAVs for all funds. Returns stats with funds_updated so callers
        can detect a silent failure (0 funds updated) instead of false-greening."""
        funds = await self.get_all_funds()
        if limit:
            funds = funds[:limit]

        stats = {"processed": 0, "funds_updated": 0, "points_saved": 0, "errors": []}

        for i, fund in enumerate(funds):
            try:
                count = await self.update_fund_nav_history(fund['fund_id'], fund['fund_name'])
                stats["processed"] += 1
                stats["points_saved"] += count
                if count > 0:
                    stats["funds_updated"] += 1
                logger.info(f"Updated {fund['fund_name']}: {count} points")

                # Rate limit
                await asyncio.sleep(1)
            except Exception as e:
                stats["errors"].append(f"{fund['fund_id']}: {str(e)}")

        logger.info(f"update_all_navs done: {stats['funds_updated']}/{stats['processed']} "
                    f"funds updated, {stats['points_saved']} points")
        return stats

egypt_market_service = EgyptMarketService()
