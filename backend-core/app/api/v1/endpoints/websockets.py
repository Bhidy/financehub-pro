from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.market_broadcaster import broadcaster

router = APIRouter()

@router.websocket("/ws/market")
async def websocket_market_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time market data.
    Clients connect here to receive JSON updates pushed by the backend.
    """
    await broadcaster.connect(websocket)
    try:
        while True:
            # Keep connection open. We can also listen for client messages (heartbeats).
            # For now, just wait for text, but we ignore client input in this broadcast-only model.
            await websocket.receive_text()
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)
