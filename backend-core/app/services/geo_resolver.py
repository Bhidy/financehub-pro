"""
Geo Resolver Service - IP to Country Resolution
Uses ip-api.com (free, no API key, 100 req/min) with DB caching.
"""

import httpx
from typing import Optional, Dict
from app.db.session import db


# In-memory LRU for hot IPs (avoid DB hits for repeated IPs in same minute)
_mem_cache: Dict[str, str] = {}
_MAX_MEM_CACHE = 500


async def resolve_country(ip_address: Optional[str]) -> Optional[str]:
    """
    Resolve an IP address to a 2-letter country code.
    Uses: memory cache -> DB cache -> ip-api.com (free tier)
    Returns: ISO 3166-1 alpha-2 country code (e.g., 'EG', 'SA', 'US') or None
    """
    if not ip_address or ip_address in ('127.0.0.1', '::1', 'localhost'):
        return None

    # Strip port if present
    ip_clean = ip_address.split(':')[0].strip() if ':' not in ip_address or '.' in ip_address else ip_address.strip()

    # 1. Memory cache (instant)
    if ip_clean in _mem_cache:
        return _mem_cache[ip_clean]

    # 2. DB cache
    try:
        if db._pool:
            row = await db.fetch_one(
                "SELECT country_code FROM ip_geo_cache WHERE ip_address = $1",
                ip_clean
            )
            if row:
                cc = row['country_code']
                _mem_cache[ip_clean] = cc
                return cc
    except Exception:
        pass  # Table might not exist yet on first run

    # 3. External API lookup (ip-api.com - free, no key needed)
    country_code = None
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"http://ip-api.com/json/{ip_clean}?fields=status,countryCode,country,city")
            if resp.status_code == 200:
                data = resp.json()
                if data.get('status') == 'success':
                    country_code = data.get('countryCode')  # 'EG', 'SA', 'US', etc.
    except Exception as e:
        print(f"[GeoResolver] API error for {ip_clean}: {e}")
        return None

    # 4. Cache result in DB + memory
    if country_code:
        _mem_cache[ip_clean] = country_code
        # Trim memory cache
        if len(_mem_cache) > _MAX_MEM_CACHE:
            # Remove oldest ~100 entries
            keys = list(_mem_cache.keys())[:100]
            for k in keys:
                _mem_cache.pop(k, None)

        try:
            if db._pool:
                await db.execute(
                    """
                    INSERT INTO ip_geo_cache (ip_address, country_code)
                    VALUES ($1, $2)
                    ON CONFLICT (ip_address) DO UPDATE SET country_code = $2
                    """,
                    ip_clean, country_code
                )
        except Exception as e:
            print(f"[GeoResolver] DB cache write error: {e}")

    return country_code
