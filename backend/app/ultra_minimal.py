"""
Ultra-minimal ASGI application for Railway diagnostic.
This has ZERO dependencies except built-in Python and uvicorn.
"""
import os
import json

async def app(scope, receive, send):
    """Minimal ASGI app that always returns 200 OK"""
    if scope['type'] == 'http':
        # Read request
        await receive()
        
        # Build response
        response_body = json.dumps({
            "status": "healthy",
            "mode": "ultra_minimal",
            "port": os.environ.get("PORT", "not_set"),
            "path": scope.get('path', '/'),
        }).encode()
        
        # Send response
        await send({
            'type': 'http.response.start',
            'status': 200,
            'headers': [
                [b'content-type', b'application/json'],
            ],
        })
        await send({
            'type': 'http.response.body',
            'body': response_body,
        })

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting ultra-minimal ASGI app on port {port}")
    uvicorn.run("app.ultra_minimal:app", host="0.0.0.0", port=port)
