import os

filepath = "backend-core/app/chat/handlers/compare_handler.py"
with open(filepath, "r") as f:
    text = f.read()

text = text.replace("current_canonical", "primary_canon")

with open(filepath, "w") as f:
    f.write(text)

print("Replaced instances of current_canonical")
