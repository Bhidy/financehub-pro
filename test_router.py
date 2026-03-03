import sys
import os
sys.path.append(os.path.abspath('backend-core'))
from app.chat.intent_router import IntentRouter

router = IntentRouter()
res = router.route('What is COMI debt structure?', {'last_symbol': None})
print("Result Intent:", res.intent)
print("Confidence:", res.confidence)
print("Entities:", res.entities)
