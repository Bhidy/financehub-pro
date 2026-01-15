"""
Rasa Integration Layer for FinanceHub Pro
==========================================
Provides a client to forward chat messages to Rasa server
and parse responses back to ChatResponse format.

Usage:
    from app.chat.rasa_client import RasaClient
    
    client = RasaClient()
    response = await client.process_message("سعر COMI", session_id="123")
"""

import httpx
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from .schemas import ChatResponse, Card, CardType, Action, ChartPayload, ChartType, ResponseMeta

# Rasa server configuration
RASA_URL = os.environ.get("RASA_URL", "http://localhost:5005")
RASA_ENABLED = os.environ.get("RASA_ENABLED", "false").lower() == "true"
TIMEOUT = 30.0


class RasaClient:
    """Client for Rasa server communication."""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or RASA_URL
        self.enabled = RASA_ENABLED
    
    async def is_healthy(self) -> bool:
        """Check if Rasa server is available."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/status")
                return resp.status_code == 200
        except:
            return False
    
    async def process_message(
        self,
        message: str,
        session_id: str = None,
        metadata: dict = None
    ) -> ChatResponse:
        """
        Send message to Rasa and parse response.
        
        Args:
            message: User message
            session_id: Conversation session ID
            metadata: Additional metadata (language, etc.)
        
        Returns:
            ChatResponse in standard format
        """
        if not self.enabled:
            raise RuntimeError("Rasa is not enabled. Set RASA_ENABLED=true")
        
        sender_id = session_id or "default"
        
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                start_time = datetime.now()
                
                # Send message to Rasa
                resp = await client.post(
                    f"{self.base_url}/webhooks/rest/webhook",
                    json={
                        "sender": sender_id,
                        "message": message,
                        "metadata": metadata or {}
                    }
                )
                
                latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)
                
                if resp.status_code != 200:
                    return self._error_response(f"Rasa error: {resp.status_code}", latency_ms)
                
                # Parse Rasa response
                rasa_responses = resp.json()
                return self._parse_rasa_response(rasa_responses, latency_ms)
                
        except Exception as e:
            return self._error_response(str(e), 0)
    
    def _parse_rasa_response(
        self,
        rasa_responses: List[dict],
        latency_ms: int
    ) -> ChatResponse:
        """Convert Rasa response to ChatResponse format."""
        
        if not rasa_responses:
            return self._error_response("No response from Rasa", latency_ms)
        
        # Combine text responses
        text_parts = []
        cards = []
        chart = None
        actions = []
        intent = "UNKNOWN"
        confidence = 0.0
        entities = {}
        
        for resp in rasa_responses:
            # Handle text response
            if "text" in resp:
                text_parts.append(resp["text"])
            
            # Handle custom JSON response (from our actions)
            if "custom" in resp or "json_message" in resp:
                custom = resp.get("custom") or resp.get("json_message", {})
                
                # Extract cards
                if "cards" in custom:
                    for card_data in custom["cards"]:
                        try:
                            card_type = CardType(card_data.get("type", "error"))
                        except ValueError:
                            card_type = CardType.ERROR
                        
                        cards.append(Card(
                            type=card_type,
                            title=card_data.get("title"),
                            data=card_data.get("data", {})
                        ))
                
                # Extract chart
                if "chart" in custom and custom["chart"]:
                    chart_data = custom["chart"]
                    try:
                        chart_type = ChartType(chart_data.get("type", "candlestick"))
                    except ValueError:
                        chart_type = ChartType.CANDLESTICK
                    
                    chart = ChartPayload(
                        type=chart_type,
                        symbol=chart_data.get("symbol", ""),
                        title=chart_data.get("title", ""),
                        data=chart_data.get("data", []),
                        range=chart_data.get("range", "1M")
                    )
                
                # Extract actions
                if "actions" in custom:
                    for action_data in custom["actions"]:
                        actions.append(Action(
                            label=action_data.get("label", ""),
                            label_ar=action_data.get("label_ar"),
                            action_type=action_data.get("action_type", "query"),
                            payload=action_data.get("payload", "")
                        ))
            
            # Handle buttons
            if "buttons" in resp:
                for btn in resp["buttons"]:
                    actions.append(Action(
                        label=btn.get("title", ""),
                        action_type="query",
                        payload=btn.get("payload", "")
                    ))
        
        # Detect language from response text
        combined_text = " ".join(text_parts)
        arabic_chars = sum(1 for c in combined_text if '\u0600' <= c <= '\u06FF')
        language = "ar" if arabic_chars > len(combined_text) * 0.3 else "en"
        
        return ChatResponse(
            message_text=combined_text or "Response received",
            message_text_ar=combined_text if language == "ar" else None,
            language=language,
            cards=cards,
            chart=chart,
            actions=actions,
            disclaimer=None,
            meta=ResponseMeta(
                intent=intent,
                confidence=confidence,
                entities=entities,
                latency_ms=latency_ms,
                cached=False,
                as_of=datetime.utcnow()
            )
        )
    
    def _error_response(self, error_msg: str, latency_ms: int) -> ChatResponse:
        """Generate error response."""
        return ChatResponse(
            message_text=f"Sorry, I encountered an error: {error_msg}",
            message_text_ar=f"عذراً، حدث خطأ: {error_msg}",
            language="en",
            cards=[Card(type=CardType.ERROR, title="Error", data={"error": error_msg})],
            chart=None,
            actions=[],
            disclaimer=None,
            meta=ResponseMeta(
                intent="ERROR",
                confidence=0.0,
                entities={},
                latency_ms=latency_ms,
                cached=False,
                as_of=datetime.utcnow(),
                error=error_msg
            )
        )


# Singleton instance
_rasa_client = None

def get_rasa_client() -> RasaClient:
    """Get singleton Rasa client."""
    global _rasa_client
    if _rasa_client is None:
        _rasa_client = RasaClient()
    return _rasa_client


async def process_with_rasa(
    message: str,
    session_id: str = None,
    metadata: dict = None
) -> ChatResponse:
    """Convenience function to process message with Rasa."""
    client = get_rasa_client()
    return await client.process_message(message, session_id, metadata)
