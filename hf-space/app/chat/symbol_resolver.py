"""
Symbol Resolver - Enterprise-Grade Entity Resolution.

Features:
1. Multi-candidate ranked scoring (not binary)
2. Nickname dictionary integration
3. Alias type weighting (official > common > auto)
4. Fund-first resolution for collisions
5. Clarification candidates for ambiguous queries
"""

import asyncpg
from typing import Optional, List, Tuple
from pydantic import BaseModel
from .text_normalizer import normalize_text
from .schemas import ResolvedSymbol
from .nickname_dict import NICKNAME_AR, NICKNAME_EN, get_popularity, AR_STOPWORDS, EN_STOPWORDS

# Common words that should NOT trigger fuzzy matching
STOPWORDS = {
    # English common words
    'now', 'price', 'stock', 'what', 'please', 'show', 'tell', 'give', 'get',
    'today', 'current', 'latest', 'about', 'the', 'for', 'how', 'much',
    'market', 'value', 'info', 'information', 'data', 'quote', 'quotes',
    'buy', 'sell', 'hold', 'rate', 'rates', 'chart', 'charts', 'history',
    'financial', 'financials', 'earnings', 'revenue', 'profit', 'loss',
    'dividend', 'dividends', 'sector', 'sectors', 'compare', 'vs', 'versus',
    'top', 'best', 'worst', 'gainers', 'losers', 'movers', 'all', 'list',
    'debt', 'equity', 'metric', 'metrics', 'ratio',
    # Arabic transliterations often seen  
    'سعر', 'اليوم', 'كم', 'ايش', 'شو', 'معلومات', 'بيانات',
}

# Alias type weights for scoring
ALIAS_TYPE_WEIGHTS = {
    'nickname': 100,   # Curated nicknames (highest)
    'official': 95,    # Official names
    'short': 85,       # Short forms
    'common': 70,      # Common variations
    'brand': 65,       # Brand names
    'auto': 50,        # Auto-generated
    'typo': 40,        # Common typos
}


class ResolutionCandidate(BaseModel):
    """A candidate match with scoring."""
    symbol: str
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    market_code: Optional[str] = "EGX"
    entity_type: str = "stock"
    match_type: str = "unknown"
    alias_type: str = "common"
    base_score: float = 0.0
    final_score: float = 0.0


class SymbolResolver:
    """Resolves user input to stock symbols with ranked scoring."""
    
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn
        self._cache = {}  # Simple in-memory cache
    
    async def resolve(self, query: str, market_code: Optional[str] = None) -> Optional[ResolvedSymbol]:
        """
        Resolve a query to a single best stock/fund symbol.
        Uses ranked scoring to pick the best match.
        
        Returns:
            ResolvedSymbol or None
        """
        candidates = await self.resolve_with_candidates(query, market_code, limit=5)
        
        if not candidates:
            return None
        
        # Get best candidate
        best = candidates[0]
        
        # If confidence is too low, might want to trigger clarification
        # For now, return best match if score >= 50
        if best.final_score >= 50:
            return ResolvedSymbol(
                symbol=best.symbol,
                name_en=best.name_en,
                name_ar=best.name_ar,
                market_code=best.market_code,
                confidence=best.final_score / 100,
                match_type=best.match_type,
                entity_type=best.entity_type
            )
        
        return None
    
    async def resolve_with_candidates(
        self, 
        query: str, 
        market_code: Optional[str] = None,
        limit: int = 5
    ) -> List[ResolutionCandidate]:
        """
        Resolve a query to a ranked list of candidates.
        This is the core enterprise resolution method.
        
        Returns:
            List of ResolutionCandidate, sorted by final_score descending
        """
        if not query:
            return []
        
        # Normalize input
        normalized = normalize_text(query)
        query_norm = normalized.normalized
        
        # Check cache
        cache_key = f"candidates:{query_norm}:{market_code or 'all'}"
        if cache_key in self._cache:
            return self._cache[cache_key][:limit]
        
        # Strip common Arabic prefixes (recursively)
        clean_query = query_norm
        prefixes = ['سهم', 'شركه', 'شركة', 'بنك', 'مجموعه', 'مجموعة', 'صندوق', 'وثيقه', 'وثيقة', 'سعر', 'تحليل']
        
        changed = True
        while changed:
            changed = False
            for prefix in prefixes:
                if clean_query.startswith(prefix + ' '):
                    clean_query = clean_query[len(prefix)+1:].strip()
                    changed = True
                elif clean_query.startswith(prefix) and len(clean_query) > len(prefix):
                    clean_query = clean_query[len(prefix):].strip()
                    changed = True
        
        candidates: List[ResolutionCandidate] = []
        
        # ==========================================
        # TIER 0: Curated Nickname Dictionary (FASTEST, HIGHEST PRIORITY)
        # ==========================================
        nickname_match = await self._match_nickname(query_norm, clean_query)
        if nickname_match:
            candidates.append(nickname_match)
        
        # ==========================================
        # TIER 1: Fund Match (PRIORITY for collisions)
        # ==========================================
        fund_candidates = await self._match_fund_candidates(query_norm, clean_query)
        candidates.extend(fund_candidates)
        
        # ==========================================
        # TIER 2: Exact Ticker Match
        # ==========================================
        exact_match = await self._match_exact_ticker(query_norm.upper(), market_code)
        if exact_match:
            candidates.append(exact_match)
        
        # ==========================================
        # TIER 3: Alias Match (from DB)
        # ==========================================
        alias_candidates = await self._match_alias_candidates(query_norm, clean_query, market_code)
        candidates.extend(alias_candidates)
        
        # ==========================================
        # TIER 4: Name Match
        # ==========================================
        name_candidates = await self._match_name_candidates(query_norm, clean_query, market_code)
        candidates.extend(name_candidates)
        
        # ==========================================
        # TIER 5: Fuzzy Match (only for longer queries)
        # ==========================================
        if len(clean_query) >= 4:
            fuzzy_candidates = await self._match_fuzzy_candidates(clean_query, market_code)
            candidates.extend(fuzzy_candidates)
        
        # ==========================================
        # SCORING: Calculate final scores for all candidates
        # ==========================================
        for c in candidates:
            c.final_score = self._calculate_score(c, market_code)
        
        # Deduplicate by symbol (keep highest score)
        seen = {}
        for c in candidates:
            key = f"{c.entity_type}:{c.symbol}"
            if key not in seen or c.final_score > seen[key].final_score:
                seen[key] = c
        
        # Sort by final score
        result = sorted(seen.values(), key=lambda x: x.final_score, reverse=True)[:limit]
        
        # Cache result
        self._cache[cache_key] = result
        
        return result
    
    def _calculate_score(self, candidate: ResolutionCandidate, market_code: Optional[str]) -> float:
        """
        Calculate weighted final score for a candidate.
        
        Score = base_match_score * 0.4 + alias_type_weight * 0.25 + 
                popularity * 0.2 + market_bonus * 0.10 + entity_bonus * 0.05
        """
        # Base match score
        base = candidate.base_score
        
        # Alias type weight
        alias_weight = ALIAS_TYPE_WEIGHTS.get(candidate.alias_type, 50)
        
        # Popularity score
        popularity = get_popularity(candidate.symbol)
        
        # Market context bonus
        market_bonus = 10 if market_code and candidate.market_code == market_code else 0
        
        # Entity type bonus (funds get slight preference for collision resolution)
        entity_bonus = 5 if candidate.entity_type == "fund" else 0
        
        # Calculate weighted score
        final = (
            base * 0.40 +
            alias_weight * 0.25 +
            popularity * 0.20 +
            market_bonus * 0.10 +
            entity_bonus * 0.05
        )
        
        return min(100, final)  # Cap at 100
    
    async def _match_nickname(self, query_norm: str, clean_query: str) -> Optional[ResolutionCandidate]:
        """Match against curated nickname dictionary."""
        # Try original normalized query
        for query in [query_norm, clean_query]:
            # Check Arabic nicknames
            if query in NICKNAME_AR:
                symbol = NICKNAME_AR[query]
                stock_info = await self._get_stock_info(symbol)
                return ResolutionCandidate(
                    symbol=symbol,
                    name_en=stock_info.get('name_en') if stock_info else None,
                    name_ar=stock_info.get('name_ar') if stock_info else None,
                    market_code=stock_info.get('market_code', 'EGX') if stock_info else 'EGX',
                    entity_type="stock",
                    match_type="nickname",
                    alias_type="nickname",
                    base_score=100
                )
            
            # Check English nicknames
            query_lower = query.lower()
            for name, symbol in NICKNAME_EN.items():
                if name.lower() == query_lower:
                    stock_info = await self._get_stock_info(symbol)
                    return ResolutionCandidate(
                        symbol=symbol,
                        name_en=stock_info.get('name_en') if stock_info else None,
                        name_ar=stock_info.get('name_ar') if stock_info else None,
                        market_code=stock_info.get('market_code', 'EGX') if stock_info else 'EGX',
                        entity_type="stock",
                        match_type="nickname",
                        alias_type="nickname",
                        base_score=100
                    )
        
        return None
    
    async def _get_stock_info(self, symbol: str) -> Optional[dict]:
        """Get stock info from market_tickers."""
        row = await self.conn.fetchrow(
            "SELECT symbol, name_en, name_ar, market_code FROM market_tickers WHERE symbol = $1 LIMIT 1",
            symbol
        )
        return dict(row) if row else None
    
    async def _match_fund_candidates(self, query_norm: str, clean_query: str) -> List[ResolutionCandidate]:
        """Match against fund_aliases table - funds get priority."""
        candidates = []
        
        for query in [query_norm, clean_query]:
            sql = """
                SELECT fa.fund_id, mf.fund_name, mf.fund_name_en, fa.priority
                FROM fund_aliases fa
                JOIN mutual_funds mf ON fa.fund_id = mf.fund_id
                WHERE fa.alias_text_norm = $1
                ORDER BY fa.priority DESC
                LIMIT 3
            """
            rows = await self.conn.fetch(sql, query)
            
            for row in rows:
                candidates.append(ResolutionCandidate(
                    symbol=str(row['fund_id']),
                    name_en=row['fund_name_en'],
                    name_ar=row['fund_name'],
                    market_code="EGX",
                    entity_type="fund",
                    match_type="alias",
                    alias_type="official",
                    base_score=95
                ))
        
        return candidates
    
    async def _match_exact_ticker(self, symbol: str, market_code: Optional[str]) -> Optional[ResolutionCandidate]:
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
            return ResolutionCandidate(
                symbol=row['symbol'],
                name_en=row['name_en'],
                name_ar=row['name_ar'],
                market_code=row['market_code'],
                entity_type="stock",
                match_type="exact",
                alias_type="official",
                base_score=100
            )
        return None
    
    async def _match_alias_candidates(
        self, query_norm: str, clean_query: str, market_code: Optional[str]
    ) -> List[ResolutionCandidate]:
        """Match via ticker_aliases table with scoring."""
        candidates = []
        
        for query in [query_norm, clean_query]:
            sql = """
                SELECT ta.symbol, ta.market_code, ta.priority, 
                       ta.alias_type, ta.popularity_score,
                       mt.name_en, mt.name_ar
                FROM ticker_aliases ta
                LEFT JOIN market_tickers mt ON ta.symbol = mt.symbol AND ta.market_code = mt.market_code
                WHERE ta.alias_text_norm = $1
            """
            params = [query]
            
            if market_code:
                sql += " AND ta.market_code = $2"
                params.append(market_code)
            
            sql += " ORDER BY ta.priority DESC LIMIT 5"
            
            rows = await self.conn.fetch(sql, *params)
            
            for row in rows:
                # Calculate base score from priority (1-10 -> 70-95)
                priority = row.get('priority', 5)
                base_score = 70 + (priority * 2.5)
                
                candidates.append(ResolutionCandidate(
                    symbol=row['symbol'],
                    name_en=row['name_en'],
                    name_ar=row['name_ar'],
                    market_code=row['market_code'] or 'EGX',
                    entity_type="stock",
                    match_type="alias",
                    alias_type=row.get('alias_type') or 'common',
                    base_score=base_score
                ))
        
        return candidates
    
    async def _match_name_candidates(
        self, query_norm: str, clean_query: str, market_code: Optional[str]
    ) -> List[ResolutionCandidate]:
        """Match via company name (English or Arabic)."""
        candidates = []
        
        for query in [query_norm, clean_query]:
            sql = """
                SELECT symbol, name_en, name_ar, market_code
                FROM market_tickers
                WHERE LOWER(name_en) LIKE $1 OR LOWER(name_ar) LIKE $1
            """
            params = [f"%{query}%"]
            
            if market_code:
                sql += " AND market_code = $2"
                params.append(market_code)
            
            sql += " ORDER BY LENGTH(name_en) LIMIT 5"
            
            rows = await self.conn.fetch(sql, *params)
            
            for row in rows:
                candidates.append(ResolutionCandidate(
                    symbol=row['symbol'],
                    name_en=row['name_en'],
                    name_ar=row['name_ar'],
                    market_code=row['market_code'],
                    entity_type="stock",
                    match_type="name",
                    alias_type="common",
                    base_score=75
                ))
        
        return candidates
    
    async def _match_fuzzy_candidates(
        self, query_norm: str, market_code: Optional[str]
    ) -> List[ResolutionCandidate]:
        """
        Enhanced fuzzy matching using PostgreSQL pg_trgm similarity.
        Falls back to LIKE-based matching if pg_trgm is not available.
        """
        candidates = []
        
        # Skip very short queries
        if len(query_norm) < 3:
            return []
        
        # ========================================
        # TIER 5a: pg_trgm similarity search on aliases (PREFERRED)
        # ========================================
        try:
            sql = """
                SELECT ta.symbol, ta.alias_text, ta.alias_text_norm, ta.priority, ta.alias_type,
                       mt.name_en, mt.name_ar, mt.market_code,
                       similarity(ta.alias_text_norm, $1) AS sim_score
                FROM ticker_aliases ta
                LEFT JOIN market_tickers mt ON ta.symbol = mt.symbol AND ta.market_code = mt.market_code
                WHERE similarity(ta.alias_text_norm, $1) > 0.25
            """
            params = [query_norm]
            
            if market_code:
                sql += " AND ta.market_code = $2"
                params.append(market_code)
            
            sql += " ORDER BY sim_score DESC LIMIT 5"
            
            rows = await self.conn.fetch(sql, *params)
            
            for row in rows:
                sim_score = float(row['sim_score'])
                candidates.append(ResolutionCandidate(
                    symbol=row['symbol'],
                    name_en=row['name_en'],
                    name_ar=row['name_ar'],
                    market_code=row['market_code'] or 'EGX',
                    entity_type="stock",
                    match_type="similarity",
                    alias_type=row.get('alias_type', 'auto'),
                    base_score=50 + (sim_score * 45)  # 50-95 range based on similarity
                ))
            
            # If we got results from similarity, return them
            if candidates:
                return candidates
                
        except Exception as e:
            # pg_trgm might not be installed, fall back to LIKE
            pass
        
        # ========================================
        # TIER 5b: LIKE-based fallback (if pg_trgm unavailable)
        # ========================================
        words = query_norm.split()
        clean_words = [w for w in words if len(w) >= 3 and w.lower() not in STOPWORDS]
        
        if not clean_words:
            return []
        
        # Build LIKE conditions for each word
        conditions = []
        params = []
        for i, word in enumerate(clean_words[:3]):  # Max 3 words
            idx = i + 1
            params.append(f"%{word}%")
            conditions.append(f"(LOWER(name_en) LIKE ${idx} OR LOWER(name_ar) LIKE ${idx})")
        
        if not conditions:
            return []
        
        sql = f"""
            SELECT symbol, name_en, name_ar, market_code
            FROM market_tickers
            WHERE {' OR '.join(conditions)}
        """
        
        if market_code:
            params.append(market_code)
            sql += f" AND market_code = ${len(params)}"
        
        sql += " ORDER BY LENGTH(name_en) LIMIT 5"
        
        rows = await self.conn.fetch(sql, *params)
        
        for row in rows:
            candidates.append(ResolutionCandidate(
                symbol=row['symbol'],
                name_en=row['name_en'],
                name_ar=row['name_ar'],
                market_code=row['market_code'],
                entity_type="stock",
                match_type="fuzzy",
                alias_type="auto",
                base_score=60
            ))
        
        return candidates
    
    async def _match_phrase_similarity(
        self, phrase: str, market_code: Optional[str] = None
    ) -> Optional[ResolutionCandidate]:
        """
        Match a multi-word phrase using similarity search.
        Used for Arabic phrases like "المصرية للاتصالات".
        """
        if len(phrase) < 4:
            return None
        
        try:
            sql = """
                SELECT ta.symbol, ta.alias_text_norm, ta.priority,
                       mt.name_en, mt.name_ar, mt.market_code,
                       similarity(ta.alias_text_norm, $1) AS sim_score
                FROM ticker_aliases ta
                LEFT JOIN market_tickers mt ON ta.symbol = mt.symbol AND ta.market_code = mt.market_code
                WHERE similarity(ta.alias_text_norm, $1) > 0.4
            """
            params = [phrase]
            
            if market_code:
                sql += " AND ta.market_code = $2"
                params.append(market_code)
            
            sql += " ORDER BY sim_score DESC LIMIT 1"
            
            row = await self.conn.fetchrow(sql, *params)
            
            if row:
                return ResolutionCandidate(
                    symbol=row['symbol'],
                    name_en=row['name_en'],
                    name_ar=row['name_ar'],
                    market_code=row['market_code'] or 'EGX',
                    entity_type="stock",
                    match_type="phrase_similarity",
                    alias_type="common",
                    base_score=70 + (float(row['sim_score']) * 25)
                )
        except:
            pass
        
        return None
    
    async def get_clarification_candidates(
        self, query: str, limit: int = 5
    ) -> List[ResolutionCandidate]:
        """
        Get candidates for clarification UI.
        Returns top candidates when query is ambiguous.
        """
        candidates = await self.resolve_with_candidates(query, None, limit)
        
        # Check if clarification is needed
        if len(candidates) >= 2:
            # If top two are within 15 points, offer clarification
            if candidates[0].final_score - candidates[1].final_score < 15:
                return candidates
        
        # If top candidate is low confidence, offer suggestions
        if candidates and candidates[0].final_score < 70:
            return candidates
        
        return []
    
    async def get_suggestions(self, query: str, limit: int = 5) -> List[ResolvedSymbol]:
        """Get symbol suggestions for autocomplete."""
        candidates = await self.resolve_with_candidates(query, None, limit)
        
        return [
            ResolvedSymbol(
                symbol=c.symbol,
                name_en=c.name_en,
                name_ar=c.name_ar,
                market_code=c.market_code,
                confidence=c.final_score / 100,
                match_type=c.match_type,
                entity_type=c.entity_type
            )
            for c in candidates
        ]
    
    def clear_cache(self):
        """Clear the resolution cache."""
        self._cache.clear()
