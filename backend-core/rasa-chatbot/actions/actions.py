"""
Rasa Action Server for FinanceHub Pro
=====================================
Custom actions that call the FastAPI backend and return structured responses.
"""
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import httpx
import os
from datetime import datetime

# API configuration
API_BASE = os.environ.get("API_BASE_URL", "https://starta.46-224-223-172.sslip.io/api/v1")
TIMEOUT = 30.0


class ApiClient:
    """Async HTTP client for FastAPI backend."""
    
    @staticmethod
    async def get(endpoint: str, params: dict = None) -> dict:
        """Make GET request to API."""
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            url = f"{API_BASE}{endpoint}"
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                return resp.json()
            return None
    
    @staticmethod
    async def resolve_symbol(query: str) -> str:
        """Resolve stock symbol from alias/name."""
        # First try direct match in tickers
        tickers = await ApiClient.get("/tickers")
        if tickers:
            query_upper = query.upper()
            for t in tickers:
                if t.get("symbol") == query_upper:
                    return query_upper
                if query.lower() in (t.get("name_en") or "").lower():
                    return t.get("symbol")
        return query.upper()
    
    @staticmethod
    async def resolve_fund(query: str) -> str:
        """Resolve fund ID from name."""
        funds = await ApiClient.get("/funds")
        if funds:
            for f in funds:
                if str(f.get("fund_id")) == str(query):
                    return str(query)
                if query.lower() in (f.get("fund_name") or "").lower():
                    return str(f.get("fund_id"))
        return str(query)


def detect_language(tracker: Tracker) -> str:
    """Detect language from user message."""
    message = tracker.latest_message.get("text", "")
    arabic_chars = sum(1 for c in message if '\u0600' <= c <= '\u06FF')
    return "ar" if arabic_chars > len(message) * 0.3 else "en"


def build_response(
    title: str,
    cards: list = None,
    chart: dict = None,
    actions: list = None,
    as_of: str = None,
    language: str = "en"
) -> dict:
    """Build response in ChatResponse format."""
    return {
        "title": title,
        "cards": cards or [],
        "chart": chart,
        "actions": actions or [],
        "as_of": as_of or datetime.utcnow().isoformat(),
        "source": "FinanceHub DB",
        "language": language
    }


# ============================================================
# STOCK ACTIONS
# ============================================================

class ActionStockPrice(Action):
    def name(self) -> Text:
        return "action_stock_price"
    
    async def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any]
    ) -> List[Dict[Text, Any]]:
        
        language = detect_language(tracker)
        symbol = tracker.get_slot("stock_symbol") or tracker.get_slot("stock_name")
        
        if not symbol:
            # Try extracting from entities
            for entity in tracker.latest_message.get("entities", []):
                if entity["entity"] in ["stock_symbol", "stock_name"]:
                    symbol = entity["value"]
                    break
        
        if not symbol:
            msg = "أي سهم تريد معرفة سعره؟" if language == "ar" else "Which stock would you like to check?"
            dispatcher.utter_message(text=msg)
            return []
        
        # Resolve symbol
        resolved = await ApiClient.resolve_symbol(symbol)
        
        # Fetch data
        tickers = await ApiClient.get("/tickers")
        stock = next((t for t in (tickers or []) if t.get("symbol") == resolved), None)
        
        if not stock:
            msg = f"لم أجد سهم {symbol}" if language == "ar" else f"Stock {symbol} not found"
            dispatcher.utter_message(text=msg)
            return []
        
        # Build response
        price = stock.get("last_price", 0)
        change = stock.get("change", 0)
        change_pct = stock.get("change_percent", 0)
        name = stock.get("name_en", symbol)
        
        response = build_response(
            title=f"{name} ({resolved})",
            cards=[{
                "type": "stock_header",
                "data": {
                    "symbol": resolved,
                    "name": name,
                    "price": price,
                    "change": change,
                    "change_percent": change_pct,
                    "currency": "EGP" if stock.get("market_code") == "EGX" else "SAR"
                }
            }],
            actions=[
                {"label": "📊 Chart", "action_type": "query", "payload": f"chart {resolved}"},
                {"label": "📋 Financials", "action_type": "query", "payload": f"{resolved} financials"},
                {"label": "💰 Dividends", "action_type": "query", "payload": f"{resolved} dividends"}
            ],
            language=language
        )
        
        dispatcher.utter_message(json_message=response)
        return [SlotSet("last_symbol", resolved), SlotSet("stock_symbol", resolved)]


class ActionStockChart(Action):
    def name(self) -> Text:
        return "action_stock_chart"
    
    async def run(self, dispatcher, tracker, domain):
        language = detect_language(tracker)
        symbol = tracker.get_slot("stock_symbol") or tracker.get_slot("last_symbol")
        range_val = tracker.get_slot("range") or "1M"
        
        if not symbol:
            msg = "أي سهم تريد رؤية شارته؟" if language == "ar" else "Which stock chart would you like to see?"
            dispatcher.utter_message(text=msg)
            return []
        
        resolved = await ApiClient.resolve_symbol(symbol)
        
        # Fetch OHLC data
        period_map = {"1D": 1, "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "5Y": 1825, "MAX": 3650}
        limit = period_map.get(range_val.upper(), 30)
        
        ohlc = await ApiClient.get(f"/ohlc/{resolved}", {"period": range_val.lower()})
        
        if not ohlc:
            msg = f"لا توجد بيانات شارت لـ {symbol}" if language == "ar" else f"No chart data for {symbol}"
            dispatcher.utter_message(text=msg)
            return []
        
        response = build_response(
            title=f"{resolved} - {range_val} Chart",
            chart={
                "type": "candlestick",
                "symbol": resolved,
                "title": f"{resolved} Price Chart ({range_val})",
                "data": ohlc[:limit] if isinstance(ohlc, list) else [],
                "range": range_val
            },
            actions=[
                {"label": "📊 1M", "action_type": "query", "payload": f"chart {resolved} 1M"},
                {"label": "📈 1Y", "action_type": "query", "payload": f"chart {resolved} 1Y"},
                {"label": "📉 5Y", "action_type": "query", "payload": f"chart {resolved} 5Y"}
            ],
            language=language
        )
        
        dispatcher.utter_message(json_message=response)
        return [SlotSet("last_symbol", resolved), SlotSet("range", range_val)]


class ActionTopGainers(Action):
    def name(self) -> Text:
        return "action_top_gainers"
    
    async def run(self, dispatcher, tracker, domain):
        language = detect_language(tracker)
        
        tickers = await ApiClient.get("/tickers")
        if not tickers:
            msg = "لا توجد بيانات متاحة" if language == "ar" else "No data available"
            dispatcher.utter_message(text=msg)
            return []
        
        # Sort by change percent descending
        sorted_tickers = sorted(
            [t for t in tickers if t.get("change_percent")],
            key=lambda x: float(x.get("change_percent", 0)),
            reverse=True
        )[:10]
        
        response = build_response(
            title="الأكثر ارتفاعاً" if language == "ar" else "Top Gainers",
            cards=[{
                "type": "movers_table",
                "data": {
                    "movers": [{
                        "symbol": t["symbol"],
                        "name": t.get("name_en"),
                        "price": t.get("last_price"),
                        "change_percent": t.get("change_percent")
                    } for t in sorted_tickers]
                }
            }],
            language=language
        )
        
        dispatcher.utter_message(json_message=response)
        return []


class ActionTopLosers(Action):
    def name(self) -> Text:
        return "action_top_losers"
    
    async def run(self, dispatcher, tracker, domain):
        language = detect_language(tracker)
        
        tickers = await ApiClient.get("/tickers")
        if not tickers:
            msg = "لا توجد بيانات متاحة" if language == "ar" else "No data available"
            dispatcher.utter_message(text=msg)
            return []
        
        # Sort by change percent ascending (biggest losers)
        sorted_tickers = sorted(
            [t for t in tickers if t.get("change_percent")],
            key=lambda x: float(x.get("change_percent", 0))
        )[:10]
        
        response = build_response(
            title="الأكثر انخفاضاً" if language == "ar" else "Top Losers",
            cards=[{
                "type": "movers_table",
                "data": {
                    "movers": [{
                        "symbol": t["symbol"],
                        "name": t.get("name_en"),
                        "price": t.get("last_price"),
                        "change_percent": t.get("change_percent")
                    } for t in sorted_tickers]
                }
            }],
            language=language
        )
        
        dispatcher.utter_message(json_message=response)
        return []


class ActionSectorStocks(Action):
    def name(self) -> Text:
        return "action_sector_stocks"
    
    async def run(self, dispatcher, tracker, domain):
        language = detect_language(tracker)
        sector = tracker.get_slot("sector") or "Financial Services"
        
        tickers = await ApiClient.get("/tickers")
        if not tickers:
            msg = "لا توجد بيانات متاحة" if language == "ar" else "No data available"
            dispatcher.utter_message(text=msg)
            return []
        
        # Filter by sector
        sector_stocks = [t for t in tickers if sector.lower() in (t.get("sector_name") or "").lower()][:20]
        
        if not sector_stocks:
            msg = f"لم أجد أسهم في قطاع {sector}" if language == "ar" else f"No stocks found in {sector} sector"
            dispatcher.utter_message(text=msg)
            return []
        
        response = build_response(
            title=f"قطاع {sector}" if language == "ar" else f"{sector} Sector",
            cards=[{
                "type": "sector_list",
                "data": {
                    "sector": sector,
                    "stocks": [{
                        "symbol": t["symbol"],
                        "name": t.get("name_en"),
                        "price": t.get("last_price"),
                        "change_percent": t.get("change_percent")
                    } for t in sector_stocks]
                }
            }],
            language=language
        )
        
        dispatcher.utter_message(json_message=response)
        return []


# ============================================================
# FUND ACTIONS (NEW)
# ============================================================

class ActionFundNAV(Action):
    def name(self) -> Text:
        return "action_fund_nav"
    
    async def run(self, dispatcher, tracker, domain):
        language = detect_language(tracker)
        fund_id = tracker.get_slot("fund_id") or tracker.get_slot("fund_name")
        
        if not fund_id:
            for entity in tracker.latest_message.get("entities", []):
                if entity["entity"] in ["fund_id", "fund_name"]:
                    fund_id = entity["value"]
                    break
        
        if not fund_id:
            msg = "أي صندوق تريد معرفة سعره؟" if language == "ar" else "Which fund would you like to check?"
            dispatcher.utter_message(text=msg)
            return []
        
        # Resolve fund ID
        resolved = await ApiClient.resolve_fund(fund_id)
        
        # Fetch fund data
        fund = await ApiClient.get(f"/funds/{resolved}")
        
        if not fund:
            msg = f"لم أجد صندوق {fund_id}" if language == "ar" else f"Fund {fund_id} not found"
            dispatcher.utter_message(text=msg)
            return []
        
        response = build_response(
            title=fund.get("fund_name", f"Fund {resolved}"),
            cards=[{
                "type": "fund_nav",
                "data": {
                    "fund_id": resolved,
                    "name": fund.get("fund_name"),
                    "nav": fund.get("latest_nav"),
                    "currency": fund.get("currency", "EGP"),
                    "aum_millions": fund.get("aum_millions"),
                    "is_shariah": fund.get("is_shariah", False),
                    "returns_ytd": fund.get("returns_ytd"),
                    "returns_1y": fund.get("returns_1y"),
                    "returns_3m": fund.get("returns_3m"),
                    "manager": fund.get("manager_name") or fund.get("manager")
                }
            }],
            actions=[
                {"label": "📈 Performance", "action_type": "query", "payload": f"fund {resolved} performance"},
                {"label": "🔍 Compare", "action_type": "query", "payload": f"compare funds"}
            ],
            as_of=fund.get("last_updated"),
            language=language
        )
        
        dispatcher.utter_message(json_message=response)
        return [SlotSet("last_fund_id", resolved), SlotSet("fund_id", resolved)]


class ActionFundSearch(Action):
    def name(self) -> Text:
        return "action_fund_search"
    
    async def run(self, dispatcher, tracker, domain):
        language = detect_language(tracker)
        shariah = tracker.get_slot("shariah_filter")
        category = tracker.get_slot("fund_category")
        
        funds = await ApiClient.get("/funds")
        if not funds:
            msg = "لا توجد صناديق متاحة" if language == "ar" else "No funds available"
            dispatcher.utter_message(text=msg)
            return []
        
        # Filter
        if shariah:
            funds = [f for f in funds if f.get("is_shariah")]
        if category:
            funds = [f for f in funds if category.lower() in (f.get("fund_type") or "").lower()]
        
        filter_desc = ""
        if shariah:
            filter_desc = "متوافقة مع الشريعة" if language == "ar" else "Shariah Compliant"
        elif category:
            filter_desc = category
        
        response = build_response(
            title=f"الصناديق {filter_desc}" if language == "ar" else f"{filter_desc} Funds" if filter_desc else "All Funds",
            cards=[{
                "type": "fund_list",
                "data": {
                    "count": len(funds),
                    "funds": [{
                        "fund_id": f.get("fund_id"),
                        "name": f.get("fund_name"),
                        "nav": f.get("latest_nav"),
                        "returns_ytd": f.get("returns_ytd"),
                        "returns_1y": f.get("returns_1y"),
                        "is_shariah": f.get("is_shariah")
                    } for f in funds[:15]]
                }
            }],
            language=language
        )
        
        dispatcher.utter_message(json_message=response)
        return []


class ActionFundMovers(Action):
    def name(self) -> Text:
        return "action_fund_movers"
    
    async def run(self, dispatcher, tracker, domain):
        language = detect_language(tracker)
        range_val = tracker.get_slot("range") or "YTD"
        
        stats = await ApiClient.get("/funds/stats/summary")
        if not stats:
            msg = "لا توجد بيانات متاحة" if language == "ar" else "No data available"
            dispatcher.utter_message(text=msg)
            return []
        
        response = build_response(
            title="أداء الصناديق" if language == "ar" else "Fund Performance",
            cards=[
                {
                    "type": "fund_movers",
                    "title": "Top Gainers (3M)" if language == "en" else "الأكثر ارتفاعاً",
                    "data": {"funds": stats.get("gainers_3m", [])}
                },
                {
                    "type": "fund_movers",
                    "title": "Annual Champions" if language == "en" else "أبطال السنة",
                    "data": {"funds": stats.get("gainers_1y", [])}
                }
            ],
            language=language
        )
        
        dispatcher.utter_message(json_message=response)
        return []


# ============================================================
# SYSTEM ACTIONS
# ============================================================

class ActionDefaultFallback(Action):
    def name(self) -> Text:
        return "action_default_fallback"
    
    async def run(self, dispatcher, tracker, domain):
        language = detect_language(tracker)
        
        if language == "ar":
            msg = "لم أفهم طلبك. يمكنك سؤالي عن:\n• سعر سهم (مثل: سعر COMI)\n• شارت (مثل: شارت SWDY)\n• صندوق (مثل: صندوق 2742)\n\nاكتب 'مساعدة' لمزيد من الأمثلة."
        else:
            msg = "I didn't understand that. You can ask me about:\n• Stock prices (e.g., price of COMI)\n• Charts (e.g., SWDY chart)\n• Funds (e.g., fund 2742)\n\nType 'help' for more examples."
        
        dispatcher.utter_message(text=msg)
        return []


class ActionLogAnalytics(Action):
    """Log analytics for monitoring."""
    def name(self) -> Text:
        return "action_log_analytics"
    
    async def run(self, dispatcher, tracker, domain):
        # This action logs to chat_analytics table
        # Implementation depends on DB access from action server
        intent = tracker.latest_message.get("intent", {})
        entities = tracker.latest_message.get("entities", [])
        
        # Log would be: INSERT INTO chat_analytics (...)
        # For now, just passing through
        return []
