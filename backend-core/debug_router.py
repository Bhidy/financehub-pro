import sys
import os
import json
sys.path.append(os.path.abspath('backend-core'))

from app.chat.intent_router import IntentRouter, INTENT_KEYWORDS
from app.chat.text_normalizer import normalize_text

router = IntentRouter()

msg = "What is COMI debt structure?"
normalized = normalize_text(msg)
print(f"Normalized text: '{normalized.normalized}'")
text_lower = normalized.normalized.lower()

scores = {}
for intent, (en_keywords, ar_keywords, weight) in INTENT_KEYWORDS.items():
    score = 0.0
    for kw in en_keywords:
        if kw in text_lower:
            score += weight * (1.0 if len(kw) > 5 else 0.7)
            print(f"Matched EN: '{kw}' for {intent} with score {score}")
    for kw in ar_keywords:
        if kw in normalized.normalized:
            score += weight * (1.0 if len(kw) > 3 else 0.7)
            print(f"Matched AR: '{kw}' for {intent} with score {score}")
    if score > 0:
        scores[intent.value] = score

print("Final Scores:", json.dumps(scores, indent=2))
res = router.route(msg)
print("Intent:", res.intent)
print("Confidence:", res.confidence)
