
import os

target_file = 'backend-core/app/chat/chat_service.py'

# The EXACT content we want to replace (from sed output)
old_content = """        \"\"\"Infer peer symbols from the same sector, fallback to largest names in market.\"\"\"
        if not primary_symbol:
            return []

        market = market_code or await self.conn.fetchval(
            "SELECT market_code FROM market_tickers WHERE symbol = $1",
            primary_symbol
        )
        sector = await self.conn.fetchval(
            "SELECT sector_name FROM market_tickers WHERE symbol = $1",
            primary_symbol
        )

        peers: List[str] = []
        try:
            if sector:
                rows = await self.conn.fetch(
                    \"\"\"
                    SELECT symbol
                    FROM market_tickers
                    WHERE symbol <> $1
                      AND market_code = 'EGX'
                      AND sector_name = $3
                    ORDER BY market_cap DESC NULLS LAST, volume DESC NULLS LAST
                    LIMIT $4
                    \"\"\",
                    primary_symbol,
                    market,
                    sector,
                    limit
                )
                peers = [r["symbol"] for r in rows if r.get("symbol")]

            if len(peers) < limit:
                rows = await self.conn.fetch(
                    \"\"\"
                    SELECT symbol
                    FROM market_tickers
                    WHERE symbol <> $1
                      AND market_code = 'EGX'
                    ORDER BY market_cap DESC NULLS LAST
                    LIMIT $3
                    \"\"\",
                    primary_symbol,
                    market,
                    limit + 2
                )
                for row in rows:
                    sym = row.get("symbol")
                    if sym and sym not in peers:
                        peers.append(sym)
                    if len(peers) >= limit:
                        break
        except Exception as e:
            print(f"[ChatService] ⚠️ Failed to infer peers for {primary_symbol}: {e}")
            return []

        return peers[:limit]"""

# The NEW content (Enterprise Logic)
new_content = """        \"\"\"
        Infer peer symbols using SMART SECTOR LOGIC (Enterprise Grade).
        Prioritizes:
        1. Same Sector + EGX Only
        2. Sorted by Market Cap (Leaders)
        3. Fallback: EGX30 Constituents (if sector undefined)
        \"\"\"
        if not primary_symbol:
            return []

        # FORCE EGX
        market = "EGX"
        
        # Get Sector and Market Cap
        row = await self.conn.fetchrow(
            "SELECT sector_name, market_cap FROM market_tickers WHERE symbol = $1",
            primary_symbol
        )
        
        if not row:
            return []
            
        sector = row['sector_name']
        primary_mcap = row['market_cap'] or 0

        peers: List[str] = []
        try:
            # STRATEGY 1: Same Sector, Market Cap Neighbors
            # We want peers that are similar in size OR larger leaders
            if sector:
                # Get top peers in sector by Market Cap
                rows = await self.conn.fetch(
                    \"\"\"
                    SELECT symbol
                    FROM market_tickers
                    WHERE symbol <> $1
                      AND market_code = 'EGX'
                      AND sector_name = $2
                    ORDER BY market_cap DESC NULLS LAST
                    LIMIT $3
                    \"\"\",
                    primary_symbol,
                    sector,
                    limit + 2  # Fetch extra to filter
                )
                peers = [r["symbol"] for r in rows if r.get("symbol")]

            # STRATEGY 2: Fallback to EGX30 (Market Leaders) if no sector peers
            if len(peers) < 1:
                # Fallback to top EGX stocks by Market Cap (Proxy for EGX30)
                rows = await self.conn.fetch(
                    \"\"\"
                    SELECT symbol
                    FROM market_tickers
                    WHERE symbol <> $1
                      AND market_code = 'EGX'
                    ORDER BY market_cap DESC NULLS LAST
                    LIMIT $2
                    \"\"\",
                    primary_symbol,
                    limit
                )
                peers = [r["symbol"] for r in rows]

        except Exception as e:
            print(f"[ChatService] ⚠️ Failed to infer peers for {primary_symbol}: {e}")
            return []

        # Deduplicate and return limit
        return list(dict.fromkeys(peers))[:limit]"""

def patch_file():
    try:
        with open(target_file, 'r') as f:
            content = f.read()
        
        if old_content not in content:
            print("❌ Could not find exact old content! Check indentation/spaces.")
            # Debug: print logic to see nearest match or diff?
            return

        new_file_content = content.replace(old_content, new_content)
        
        with open(target_file, 'w') as f:
            f.write(new_file_content)
            
        print("✅ Successfully patched chat_service.py")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    patch_file()
