
import sys
import os

# Add hf-space to path
sys.path.append(os.path.join(os.getcwd(), 'hf-space'))

try:
    from app.chat.handlers import analysis_handler
    from app.chat.handlers import statistics_handler
    from app.chat.handlers import financials_handler
    from app.chat import intent_router
    print("Imports successful")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)
