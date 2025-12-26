import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest_asyncio.fixture(scope="function")
async def db_lifespan():
    from app.db.session import db
    await db.connect()
    yield
    await db.close()

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_get_tickers(db_lifespan):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/tickers")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_auth_flow(db_lifespan):
    import uuid
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Signup
        email = f"test_{uuid.uuid4()}@financehub.pro"
        
        # 1. Signup
        r = await ac.post("/api/v1/auth/signup", json={
            "email": email,
            "password": "Password123!",
            "full_name": "Test User"
        })
        assert r.status_code == 200
            
        # Login
        response = await ac.post("/api/v1/auth/token", data={
            "username": email,
            "password": "Password123!"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Protected Route
        headers = {"Authorization": f"Bearer {token}"}
        resp_protected = await ac.get("/api/v1/portfolio", headers=headers)
        assert resp_protected.status_code == 200

@pytest.mark.asyncio
async def test_ai_chat_price_query(db_lifespan):
    """Test AI chat with a price query - should call get_stock_price tool."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", timeout=30.0) as ac:
        response = await ac.post("/api/v1/ai/chat", json={
            "message": "What is the price of Aramco?",
            "history": []
        })
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "data" in data
    # Should have called get_stock_price tool
    if "tools_used" in data:
        assert "get_stock_price" in data["tools_used"]

@pytest.mark.asyncio
async def test_ai_chat_market_summary(db_lifespan):
    """Test AI chat with market summary query."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", timeout=30.0) as ac:
        response = await ac.post("/api/v1/ai/chat", json={
            "message": "How is the market today?",
            "history": []
        })
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    # Should have market_summary in data
    if "tools_used" in data:
        assert "get_market_summary" in data["tools_used"]
