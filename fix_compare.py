import os

with open("backend-core/app/chat/handlers/compare_handler.py", "r") as f:
    text = f.read()

text = text.replace(
    "if _canonical_symbol(peer_data.get('symbol', '')) != current_canonical:",
    "if _canonical_symbol(peer_data.get('symbol', '')) != primary_canon:"
)

with open("backend-core/app/chat/handlers/compare_handler.py", "w") as f:
    f.write(text)

