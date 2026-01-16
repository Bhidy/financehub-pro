import asyncio
import websockets
import json

async def hello():
    uri = "ws://localhost:8000/api/v1/ws/market"
    async with websockets.connect(uri) as websocket:
        print("[TEST] Connected to WebSocket Feed")
        
        # Wait for first message
        print("[TEST] Waiting for Market Update (up to 120s)...")
        message = await websocket.recv()
        
        data = json.loads(message)
        print(f"[TEST] Received: {json.dumps(data, indent=2)}")
        
        if data.get("type") == "MARKET_UPDATE":
             print("[PASS] Validation Successful")
        else:
             print("[FAIL] Unexpected Message Type")

asyncio.run(hello())
