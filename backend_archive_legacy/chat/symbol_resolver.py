"""
Symbol Resolver - 4-tier resolution for stock symbols.

Resolution order:
1. Exact ticker match (COMI, 2222)
2. Alias match (CIB→COMI, ارامكو→2222)
3. Name match (Commercial International→COMI)
4. Fuzzy match (for names only)
"""

import asyncpg
from typing import Optional, List
from .text_normalizer import normalize_text
from .schemas import ResolvedSymbol


class SymbolResolver:
    """Resolves user input to stock symbols."""
    
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn
        self._cache = {}  # Simple in-memory cache
    
    async def resolve(self, query: str, market_code: Optional[str] = None) -> Optional[ResolvedSymbol]:
        """
        Resolve a query to a stock symbol.
        
        Args:
            query: User input (symbol, name, or alias)
            market_code: Optional market filter (EGX, SAUDI)
        
        Returns:
            ResolvedSymbol or None
        """
        if not query:
            return None
        
        # Normalize input
        normalized = normalize_text(query)
        query_norm = normalized.normalized
        
        # Check cache
        cache_key = f"{query_norm}:{market_code or 'all'}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        result = None
        
        # 1. Exact ticker match
        result = await self._match_exact_ticker(query_norm.upper(), market_code)
        if result:
            self._cache[cache_key] = result
            return result
        
        # 2. Alias match
        result = await self._match_alias(query_norm, market_code)
        if result:
            self._cache[cache_key] = result
            return result
        
        # 3. Name match
        result = await self._match_name(query_norm, market_code)
        if result:
            self._cache[cache_key] = result
            return result
        
        # 4. Fuzzy match (only for longer queries)
        if len(query_norm) >= 4:
            result = await self._match_fuzzy(query_norm, market_code)
            if result:
                self._cache[cache_key] = result
                return result
        
        return None
    
    async def _match_exact_ticker(self, symbol: str, market_code: Optional[str]) -> Optional[ResolvedSymbol]:
        """Match exact ticker symbol."""
        sql = """
            SELECT symbol, name_en, name_ar, market_code
            FROM market_tickers
            WHERE symbol = $1
        """
        params = [symbol]
        
        if market_code:
            sql += " AND market_code = $2"
            params.append(market_code)
        
        sql += " LIMIT 1"
        
        row = await self.conn.fetchrow(sql, *params)
        if row:
            return ResolvedSymbol(
                symbol=row['symbol'],
                name_en=row['name_en'],
                name_ar=row['name_ar'],
                market_code=row['market_code'],
                confidence=1.0,
                match_type="exact"
            )
        return None
    
    async def _match_alias(self, query_norm: str, market_code: Optional[str]) -> Optional[ResolvedSymbol]:
        """Match via ticker_aliases table."""
        sql = """
            SELECT ta.symbol, ta.market_code, ta.priority,
                   mt.name_en, mt.name_ar
            FROM ticker_aliases ta
            LEFT JOIN market_tickers mt ON ta.symbol = mt.symbol AND ta.market_code = mt.market_code
            WHERE ta.alias_text_norm = $1
        """
        params = [query_norm]
        
        if market_code:
            sql += " AND ta.market_code = $2"
            params.append(market_code)
        
        sql += " ORDER BY ta.priority DESC LIMIT 1"
        
        row = await self.conn.fetchrow(sql, *params)
        if row:
            return ResolvedSymbol(
                symbol=row['symbol'],
                name_en=row['name_en'],
                name_ar=row['name_ar'],
                market_code=row['market_code'],
                confidence=0.95,
                match_type="alias"
            )
        return None
    
    async def _match_name(self, query_norm: str, market_code: Optional[str]) -> Optional[ResolvedSymbol]:
        """Match via company name (English or Arabic)."""
        # Try exact name match first
        sql = """
            SELECT symbol, name_en, name_ar, market_code
            FROM market_tickers
            WHERE LOWER(name_en) = $1 OR LOWER(name_ar) = $1
        """
        params = [query_norm]
        
        if market_code:
            sql += " AND market_code = $2"
            params.append(market_code)
        
        sql += " LIMIT 1"
        
        row = await self.conn.fetchrow(sql, *params)
        if row:
            return ResolvedSymbol(
                symbol=row['symbol'],
                name_en=row['name_en'],
                name_ar=row['name_ar'],
                market_code=row['market_code'],
                confidence=0.90,
                match_type="name"
            )
        
        # Try partial name match
        sql = """
            SELECT symbol, name_en, name_ar, market_code
            FROM market_tickers
            WHERE LOWER(name_en) LIKE $1 OR LOWER(name_ar) LIKE $1
        """
        params = [f"%{query_norm}%"]
        
        if market_code:
            sql += " AND market_code = $2"
            params.append(market_code)
        
        sql += " ORDER BY LENGTH(name_en) LIMIT 1"
        
        row = await self.conn.fetchrow(sql, *params)
        if row:
            return ResolvedSymbol(
                symbol=row['symbol'],
                name_en=row['name_en'],
                name_ar=row['name_ar'],
                market_code=row['market_code'],
                confidence=0.80,
                match_type="name"
            )
        
        return None
    
    async def _match_fuzzy(self, query_norm: str, market_code: Optional[str]) -> Optional[ResolvedSymbol]:
        """Fuzzy match using trigram similarity (if available) or LIKE patterns."""
        # Use simple word-based matching
        words = query_norm.split()
        if not words:
            return None
        
        # Match any word in the name
        conditions = []
        params = []
        for i, word in enumerate(words[:3], 1):  # Max 3 words
            if len(word) >= 3:  # Only meaningful words
                params.append(f"%{word}%")
                conditions.append(f"(LOWER(name_en) LIKE ${i} OR LOWER(name_ar) LIKE ${i})")
        
        if not conditions:
            return None
        
        sql = f"""
            SELECT symbol, name_en, name_ar, market_code
            FROM market_tickers
            WHERE {' OR '.join(conditions)}
        """
        
        if market_code:
            params.append(market_code)
            sql += f" AND market_code = ${len(params)}"
        
        sql += " ORDER BY LENGTH(name_en) LIMIT 1"
        
        row = await self.conn.fetchrow(sql, *params)
        if row:
            return ResolvedSymbol(
                symbol=row['symbol'],
                name_en=row['name_en'],
                name_ar=row['name_ar'],
                market_code=row['market_code'],
                confidence=0.60,
                match_type="fuzzy"
            )
        
        return None
    
    async def get_suggestions(self, query: str, limit: int = 5) -> List[ResolvedSymbol]:
        """Get symbol suggestions for autocomplete."""
        normalized = normalize_text(query)
        query_norm = normalized.normalized
        
        if len(query_norm) < 2:
            return []
        
        # Search aliases and names
        sql = """
            SELECT DISTINCT ta.symbol, mt.name_en, mt.name_ar, ta.market_code
            FROM ticker_aliases ta
            LEFT JOIN market_tickers mt ON ta.symbol = mt.symbol
            WHERE ta.alias_text_norm LIKE $1
            ORDER BY ta.priority DESC
            LIMIT $2
        """
        
        rows = await self.conn.fetch(sql, f"{query_norm}%", limit)
        
        return [
            ResolvedSymbol(
                symbol=row['symbol'],
                name_en=row['name_en'],
                name_ar=row['name_ar'],
                market_code=row['market_code'],
                confidence=0.70,
                match_type="alias"
            )
            for row in rows
        ]
    
    def clear_cache(self):
        """Clear the resolution cache."""
        self._cache.clear()
