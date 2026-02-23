import asyncio
from backend_core.app.chat.text_normalizer import extract_potential_symbols
from backend_core.app.chat.intent_router import IntentRouter

def test():
    text = "mich valuation"
    symbols = extract_potential_symbols(text)
    print(f"Symbols extracted: {symbols}")
    
    router = IntentRouter()
    context = {}
    res = router.route(text, context)
    print(f"Keyword Intent: {res.intent.value} | Entities: {res.entities}")

if __name__ == "__main__":
    test()
