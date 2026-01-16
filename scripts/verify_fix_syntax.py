
import sys
import os
from pathlib import Path

# Add backend-core to path
sys.path.append(str(Path.cwd() / "backend-core"))

try:
    from app.api.v1.endpoints import analytics_router
    print("Successfully imported analytics_router. Syntax is correct.")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)
