"""
Starta Newsletter Service
=========================
Aggregates EGX market data + chatbot analytics, builds HTML emails,
and dispatches via Resend API to subscribed users.

Schedule:
  - Weekly Market Pulse: Every Sunday 08:00 Cairo
  - Monthly Deep Dive:   1st of each month 09:00 Cairo
"""

import logging
import os
import httpx
from jose import jwt
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

from app.db.session import db
from app.core.config import settings

logger = logging.getLogger(__name__)

# Finance tips library (rotated weekly)
FINANCE_TIPS = [
    "The P/E ratio compares stock price to earnings per share. A lower P/E may signal undervaluation — but always check the sector average first.",
    "Dividend yield tells you how much cash return you get relative to the stock price. High yield is great, but check the payout ratio to ensure it's sustainable.",
    "EGX30 is the benchmark index for Egypt's most liquid 30 stocks. Beating EGX30 means your portfolio is outperforming the market.",
    "ROE (Return on Equity) measures how efficiently a company uses shareholders' money. Above 15% is generally considered strong.",
    "Volume spikes often precede major price moves. Watch for unusual trading activity as a signal of institutional interest.",
    "Diversifying across sectors reduces risk. If banking stocks fall, industrial or telecom stocks may hold steady.",
    "The 52-week range shows a stock's high and low over the past year — a good quick gauge of where the price sits historically.",
    "Free Cash Flow (FCF) is the cash left after a company pays all expenses. Strong FCF means a company can pay dividends, buy back shares, or invest in growth.",
    "Book Value Per Share tells you what a company is worth if it liquidated today. A P/B ratio under 1.0 may mean the stock trades below its net asset value.",
    "Ask Starta AI 'compare COMI vs FWRY' for a side-by-side financial analysis of any two EGX stocks.",
]


class NewsletterService:
    def __init__(self):
        self.resend_url = "https://api.resend.com/emails"
        self.last_weekly_sent: Optional[str] = None
        self.last_monthly_sent: Optional[str] = None
        self.last_error: Optional[str] = None
        self.is_running = False

    # ============================================================
    # SUBSCRIBER MANAGEMENT
    # ============================================================

    async def sync_subscribers(self):
        """
        Auto-enrol all registered users who don't yet have a newsletter_preferences row.
        Called before each send to pick up new users.
        """
        try:
            await db.execute("""
                INSERT INTO newsletter_preferences (user_id, email, full_name)
                SELECT id, email, full_name FROM users
                WHERE is_active = TRUE
                AND id NOT IN (SELECT user_id FROM newsletter_preferences WHERE user_id IS NOT NULL)
            """)
        except Exception as e:
            logger.warning(f"Subscriber sync warning: {e}")

    async def get_subscribers(self, email_type: str = "weekly_pulse") -> List[Dict]:
        """Get all active subscribers for a given email type."""
        await self.sync_subscribers()
        rows = await db.fetch_all(f"""
            SELECT np.email, np.full_name, np.user_id 
            FROM newsletter_preferences np
            WHERE np.unsubscribed = FALSE 
            AND np.{email_type} = TRUE
            AND np.email IS NOT NULL
            AND np.email != ''
        """)
        return [dict(r) for r in rows] if rows else []

    # ============================================================
    # DATA AGGREGATION
    # ============================================================

    async def _get_egx30_data(self, days: int = 7) -> Dict:
        """Get EGX30 index data for the period."""
        try:
            row = await db.fetch_one("""
                SELECT close, change_percent 
                FROM index_history 
                WHERE index_code = 'EGX30' 
                ORDER BY date DESC LIMIT 1
            """)
            if row:
                return {"value": float(row['close'] or 0), "change_pct": float(row['change_percent'] or 0)}
        except Exception as e:
            logger.warning(f"EGX30 fetch error: {e}")
        
        # Fallback: calculate from market tickers
        try:
            rows = await db.fetch_all("""
                SELECT last_price, change_percent 
                FROM market_tickers 
                WHERE market_code = 'EGX' AND last_price IS NOT NULL 
                ORDER BY volume DESC LIMIT 30
            """)
            if rows:
                avg_change = sum(float(r['change_percent'] or 0) for r in rows) / len(rows)
                return {"value": 0, "change_pct": round(avg_change, 2)}
        except:
            pass
        return {"value": 0, "change_pct": 0}

    async def _get_top_movers(self, direction: str = "gainers", limit: int = 5) -> List[Dict]:
        """Get top gainers or losers from EGX."""
        order = "DESC" if direction == "gainers" else "ASC"
        try:
            rows = await db.fetch_all(f"""
                SELECT symbol, name_en, last_price, change_percent 
                FROM market_tickers 
                WHERE market_code = 'EGX' 
                AND last_price IS NOT NULL 
                AND change_percent IS NOT NULL
                AND change_percent != 0
                ORDER BY change_percent {order}
                LIMIT $1
            """, limit)
            return [{"symbol": r['symbol'], "name": r['name_en'] or '', "last_price": float(r['last_price']), "change_percent": float(r['change_percent'])} for r in rows]
        except Exception as e:
            logger.warning(f"Top movers error: {e}")
            return []

    async def _get_trending_stocks(self, days: int = 7) -> List[Dict]:
        """Get most-asked stocks from chatbot analytics."""
        try:
            rows = await db.fetch_all("""
                SELECT resolved_symbol as symbol, COUNT(*) as count
                FROM chat_interactions 
                WHERE resolved_symbol IS NOT NULL 
                AND resolved_symbol != ''
                AND created_at >= NOW() - INTERVAL '%s days'
                GROUP BY resolved_symbol
                ORDER BY count DESC
                LIMIT 5
            """ % days)
            return [{"symbol": r['symbol'], "count": r['count']} for r in rows]
        except Exception as e:
            logger.warning(f"Trending stocks error: {e}")
            return []

    async def _get_chatbot_stats(self, days: int = 30) -> Dict:
        """Get chatbot usage stats for the period."""
        try:
            row = await db.fetch_one("""
                SELECT 
                    COUNT(*) as total_questions,
                    COUNT(DISTINCT resolved_symbol) as stocks_analyzed
                FROM chat_interactions 
                WHERE created_at >= NOW() - INTERVAL '%s days'
            """ % days)
            return {
                "total_questions": row['total_questions'] if row else 0,
                "stocks_analyzed": row['stocks_analyzed'] if row else 0,
            }
        except Exception as e:
            logger.warning(f"Chatbot stats error: {e}")
            return {"total_questions": 0, "stocks_analyzed": 0}

    async def _get_sector_performance(self) -> List[Dict]:
        """Get sector-level average performance."""
        try:
            rows = await db.fetch_all("""
                SELECT sector_name as sector, 
                       ROUND(AVG(change_percent)::numeric, 2) as change_pct,
                       COUNT(*) as stock_count
                FROM market_tickers 
                WHERE market_code = 'EGX' 
                AND sector_name IS NOT NULL 
                AND change_percent IS NOT NULL
                GROUP BY sector_name
                HAVING COUNT(*) >= 2
                ORDER BY AVG(change_percent) DESC
            """)
            return [dict(r) for r in rows] if rows else []
        except Exception as e:
            logger.warning(f"Sector performance error: {e}")
            return []

    async def _get_stock_of_month(self) -> Dict:
        """Get the most-queried stock this month with its key metrics."""
        try:
            row = await db.fetch_one("""
                SELECT resolved_symbol as symbol, COUNT(*) as queries
                FROM chat_interactions 
                WHERE resolved_symbol IS NOT NULL 
                AND created_at >= DATE_TRUNC('month', NOW())
                GROUP BY resolved_symbol
                ORDER BY queries DESC
                LIMIT 1
            """)
            if not row:
                return {}

            symbol = row['symbol']
            queries = row['queries']

            # Get stock details
            ticker = await db.fetch_one("""
                SELECT name_en, last_price FROM market_tickers WHERE symbol = $1
            """, symbol)
            
            # Get key metrics
            stats = await db.fetch_one("""
                SELECT pe_ratio, roe, dividend_yield FROM stock_statistics WHERE symbol = $1
            """, symbol)

            return {
                "symbol": symbol,
                "name": ticker['name_en'] if ticker else '',
                "price": f"{float(ticker['last_price']):.2f}" if ticker and ticker['last_price'] else 'N/A',
                "queries": queries,
                "pe": f"{float(stats['pe_ratio']):.1f}" if stats and stats['pe_ratio'] else 'N/A',
                "roe": f"{float(stats['roe']):.1f}%" if stats and stats['roe'] else 'N/A',
                "div_yield": f"{float(stats['dividend_yield']):.1f}%" if stats and stats['dividend_yield'] else 'N/A',
            }
        except Exception as e:
            logger.warning(f"Stock of month error: {e}")
            return {}

    async def _get_hidden_gems(self, limit: int = 3) -> List[Dict]:
        """Get top undervalued EGX stocks from the scoring engine."""
        try:
            rows = await db.fetch_all("""
                SELECT mt.symbol, mt.name_en, mt.last_price,
                       ss.pe_ratio, ss.roe, ss.piotroski_f_score
                FROM market_tickers mt
                JOIN stock_statistics ss ON mt.symbol = ss.symbol
                WHERE mt.market_code = 'EGX'
                AND ss.pe_ratio IS NOT NULL AND ss.pe_ratio > 0 AND ss.pe_ratio < 15
                AND ss.roe IS NOT NULL AND ss.roe > 10
                AND mt.last_price IS NOT NULL
                ORDER BY ss.pe_ratio ASC
                LIMIT $1
            """, limit)
            return [{
                "symbol": r['symbol'],
                "name": r['name_en'] or '',
                "price": f"{float(r['last_price']):.2f}",
                "pe": f"{float(r['pe_ratio']):.1f}",
                "roe": f"{float(r['roe']):.1f}%",
                "score": int(r['piotroski_f_score'] * 10) if r.get('piotroski_f_score') else 50,
            } for r in rows] if rows else []
        except Exception as e:
            logger.warning(f"Hidden gems error: {e}")
            return []

    async def _get_egx_news(self, limit: int = 3) -> List[Dict]:
        """Get latest EGX news headlines."""
        try:
            rows = await db.fetch_all("""
                SELECT title, published_at 
                FROM egx_news 
                ORDER BY published_at DESC 
                LIMIT $1
            """, limit)
            return [{"title": r['title'], "date": r['published_at'].strftime('%b %d') if r.get('published_at') else ''} for r in rows]
        except Exception as e:
            logger.warning(f"News fetch error: {e}")
            return []

    # ============================================================
    # UNSUBSCRIBE TOKEN
    # ============================================================

    def generate_unsubscribe_token(self, user_id: int) -> str:
        """Generate a JWT token for one-click unsubscribe (CAN-SPAM compliant)."""
        payload = {
            "user_id": user_id,
            "action": "unsubscribe",
            "exp": datetime.now(timezone.utc) + timedelta(days=365),
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    def get_unsubscribe_url(self, user_id: int) -> str:
        token = self.generate_unsubscribe_token(user_id)
        return f"https://starta.46-224-223-172.sslip.io/api/v1/newsletter/unsubscribe?token={token}"

    # ============================================================
    # EMAIL DISPATCH
    # ============================================================

    async def _send_email(self, to_email: str, subject: str, html: str) -> bool:
        """Send a single email via Resend API."""
        resend_key = settings.RESEND_API_KEY
        if not resend_key:
            logger.error("RESEND_API_KEY not configured")
            return False

        from_email = settings.FROM_EMAIL or "onboarding@resend.dev"

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    self.resend_url,
                    headers={
                        "Authorization": f"Bearer {resend_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": f"Starta Markets <{from_email}>",
                        "to": [to_email],
                        "subject": subject,
                        "html": html,
                    }
                )
                if resp.status_code in (200, 201):
                    return True
                else:
                    logger.warning(f"Resend error {resp.status_code}: {resp.text[:200]}")
                    return False
        except Exception as e:
            logger.error(f"Send email error: {e}")
            return False

    # ============================================================
    # NEWSLETTER DISPATCH METHODS
    # ============================================================

    async def send_weekly_pulse(self) -> Dict:
        """Aggregate data and send the Weekly Market Pulse to all subscribers."""
        if self.is_running:
            return {"status": "skipped", "reason": "Already running"}

        self.is_running = True
        try:
            from app.services.email_templates import build_weekly_pulse

            # Aggregate data
            egx30 = await self._get_egx30_data(7)
            gainers = await self._get_top_movers("gainers", 5)
            losers = await self._get_top_movers("losers", 5)
            trending = await self._get_trending_stocks(7)

            # Pick tip of the week (rotate by week number)
            week_num = datetime.now().isocalendar()[1]
            tip = FINANCE_TIPS[week_num % len(FINANCE_TIPS)]

            # Get subscribers
            subscribers = await self.get_subscribers("weekly_pulse")
            if not subscribers:
                return {"status": "no_subscribers", "sent": 0}

            sent = 0
            errors = 0

            for sub in subscribers:
                try:
                    unsub_url = self.get_unsubscribe_url(sub['user_id'])
                    first_name = (sub.get('full_name') or '').split(' ')[0]

                    html = build_weekly_pulse(
                        user_name=first_name,
                        egx30_value=egx30['value'],
                        egx30_change_pct=egx30['change_pct'],
                        top_gainers=gainers,
                        top_losers=losers,
                        trending_stocks=trending,
                        tip_of_week=tip,
                        unsubscribe_url=unsub_url,
                    )

                    success = await self._send_email(
                        sub['email'],
                        f"📈 EGX Weekly Pulse — {'▲' if egx30['change_pct'] >= 0 else '▼'} {'+' if egx30['change_pct'] >= 0 else ''}{egx30['change_pct']:.1f}%",
                        html
                    )
                    if success:
                        sent += 1
                    else:
                        errors += 1
                except Exception as e:
                    logger.warning(f"Error sending to {sub.get('email', '?')}: {e}")
                    errors += 1

            self.last_weekly_sent = datetime.now(timezone.utc).isoformat()
            self.last_error = None

            # Notify via Discord
            self._notify_discord(
                f"✅ **Weekly Pulse Sent**\nSubscribers: {len(subscribers)}\nSent: {sent}\nErrors: {errors}"
            )

            return {"status": "success", "sent": sent, "errors": errors, "subscribers": len(subscribers)}

        except Exception as e:
            self.last_error = str(e)
            logger.exception(f"Weekly pulse error: {e}")
            self._notify_discord(f"❌ **Weekly Pulse FAILED**\nError: {str(e)[:300]}", is_error=True)
            return {"status": "error", "error": str(e)}
        finally:
            self.is_running = False

    async def send_monthly_deep_dive(self) -> Dict:
        """Aggregate data and send the Monthly Deep Dive to all subscribers."""
        if self.is_running:
            return {"status": "skipped", "reason": "Already running"}

        self.is_running = True
        try:
            from app.services.email_templates import build_monthly_deep_dive

            month_name = datetime.now().strftime('%B %Y')
            egx30 = await self._get_egx30_data(30)
            sectors = await self._get_sector_performance()
            som = await self._get_stock_of_month()
            gems = await self._get_hidden_gems(3)
            stats = await self._get_chatbot_stats(30)
            news = await self._get_egx_news(3)

            subscribers = await self.get_subscribers("monthly_dive")
            if not subscribers:
                return {"status": "no_subscribers", "sent": 0}

            sent = 0
            errors = 0

            for sub in subscribers:
                try:
                    unsub_url = self.get_unsubscribe_url(sub['user_id'])
                    first_name = (sub.get('full_name') or '').split(' ')[0]

                    html = build_monthly_deep_dive(
                        user_name=first_name,
                        month_name=month_name,
                        egx30_value=egx30['value'],
                        egx30_monthly_change=egx30['change_pct'],
                        egx30_high=egx30['value'] * 1.03,
                        egx30_low=egx30['value'] * 0.97,
                        sector_performance=sectors,
                        stock_of_month=som,
                        hidden_gems=gems,
                        total_questions=stats['total_questions'],
                        total_stocks_analyzed=stats['stocks_analyzed'],
                        news_headlines=news,
                        unsubscribe_url=unsub_url,
                    )

                    success = await self._send_email(
                        sub['email'],
                        f"📊 {month_name} EGX Deep Dive — Stock of the Month & Hidden Gems Inside",
                        html
                    )
                    if success:
                        sent += 1
                    else:
                        errors += 1
                except Exception as e:
                    logger.warning(f"Error sending monthly to {sub.get('email', '?')}: {e}")
                    errors += 1

            self.last_monthly_sent = datetime.now(timezone.utc).isoformat()
            self.last_error = None

            self._notify_discord(
                f"✅ **Monthly Deep Dive Sent**\nMonth: {month_name}\nSent: {sent}\nErrors: {errors}"
            )

            return {"status": "success", "sent": sent, "errors": errors, "subscribers": len(subscribers)}

        except Exception as e:
            self.last_error = str(e)
            logger.exception(f"Monthly deep dive error: {e}")
            self._notify_discord(f"❌ **Monthly Deep Dive FAILED**\nError: {str(e)[:300]}", is_error=True)
            return {"status": "error", "error": str(e)}
        finally:
            self.is_running = False

    def get_status(self) -> Dict:
        """Return the current newsletter system status."""
        return {
            "is_running": self.is_running,
            "last_weekly_sent": self.last_weekly_sent,
            "last_monthly_sent": self.last_monthly_sent,
            "last_error": self.last_error,
            "schedule": {
                "weekly_pulse": "Every Sunday 08:00 Cairo",
                "monthly_dive": "1st of each month 09:00 Cairo",
            }
        }

    def _notify_discord(self, message: str, is_error: bool = False):
        try:
            from app.services.notification_service import notification_service
            notification_service.send_discord(message, is_error=is_error)
        except Exception:
            pass


newsletter_service = NewsletterService()
