from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.db.session import db
from app.services.ai_service import chat_with_analyst
from app.services.sentiment import analyze_headlines

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []

@router.get("/briefing")
async def get_ai_briefing():
    # Fetch last 50 news items
    news = await db.fetch_all("SELECT headline FROM market_news ORDER BY published_at DESC LIMIT 50")
    if not news:
        return {
            "themes": [],
            "sentiment": "NEUTRAL",
            "score": 0,
            "summary": "Not enough data to generate briefing."
        }
        
    headlines = [row['headline'] for row in news]
    analysis = analyze_headlines(headlines)
    return analysis

@router.post("/chat")
async def ai_chat_endpoint(req: ChatRequest):
    try:
        result = await chat_with_analyst(req.message, req.history)
        return result
    except Exception as e:
        return {"reply": "I'm having trouble accessing the market feed right now. Please try again.", "data": None, "error": str(e)}
