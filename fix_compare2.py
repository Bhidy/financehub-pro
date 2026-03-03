import os

with open("backend-core/app/chat/handlers/compare_handler.py", "r") as f:
    text = f.read()

# Fixing the remaining current_canonical error
text = text.replace("current_canonical", "primary_canon")

with open("backend-core/app/chat/handlers/compare_handler.py", "w") as f:
    f.write(text)

