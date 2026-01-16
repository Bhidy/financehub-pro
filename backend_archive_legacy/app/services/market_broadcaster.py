from fastapi import WebSocket
from typing import List
import json

class MarketBroadcaster:
    """
    Manages WebSocket connections for real-time market data updates.
    Singleton-style usage via valid instance in main app state effectively, 
    but here instantiated as a global module-level object for simplicity in MVP.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """
        Sends a message to all connected clients.
        Handles disconnection if a client socket is dead.
        """
        if not self.active_connections:
            return

        json_msg = json.dumps(message, default=str)
        
        # Iterate over a copy to safely remove items during iteration if needed (though disconnect handles removal)
        for connection in self.active_connections:
            try:
                await connection.send_text(json_msg)
            except Exception as e:
                # If send fails, assume connection is dead
                print(f"[WS] Broadcast error: {e}")
                self.disconnect(connection)

# Global Instance
broadcaster = MarketBroadcaster()
