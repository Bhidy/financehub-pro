import asyncio
from app.db.session import get_db_pool

async def test():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            query = """
            WITH sector_averages AS (
                SELECT t.sector_name,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY NULLIF(COALESCE(t.pb_ratio, ss.pb_ratio), 0))::numeric as avg_pb,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY NULLIF(t.pe_ratio, 0))::numeric as avg_pe,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY NULLIF(ss.ev_ebitda, 0))::numeric as avg_ev_ebitda
                FROM market_tickers t
                LEFT JOIN stock_statistics ss ON t.symbol = ss.symbol AND t.market_code = ss.market_code
                WHERE t.market_code = 'EGX' AND t.sector_name IS NOT NULL
                GROUP BY t.sector_name
            ),
            index_perf AS (
                SELECT COALESCE(return_3m, change_3m, 0) as egx_change_3m
                FROM market_tickers 
                WHERE symbol IN ('^EGX30', 'EGX30') 
                LIMIT 1
            )
            SELECT 
                t.symbol, t.name_en, t.name_ar, t.sector_name,
                t.market_cap, t.logo_url, t.pe_ratio,
                COALESCE(t.pb_ratio, ss.pb_ratio) AS pb_ratio,
                COALESCE(t.dividend_yield, ss.dividend_yield) AS dividend_yield,
                ss.roe, ss.profit_margin, ss.roic, ss.ev_ebitda, ss.interest_coverage,
                COALESCE(t.return_3m, t.change_3m, 0) - COALESCE(idx.egx_change_3m, 0) AS relative_alpha_3m,
                ss.debt_equity, ss.net_income_ttm, ss.ocf_ttm,
                sa.avg_pe, sa.avg_pb, sa.avg_ev_ebitda,
                0::numeric as pb_discount, 0::numeric as pe_discount, 0::numeric as ev_ebitda_discount
            FROM market_tickers t
            LEFT JOIN stock_statistics ss ON t.symbol = ss.symbol AND t.market_code = ss.market_code
            LEFT JOIN sector_averages sa ON t.sector_name = sa.sector_name
            CROSS JOIN index_perf idx
            WHERE t.market_code = 'EGX'
              AND t.market_cap > 100000000
              AND (COALESCE(t.pb_ratio, ss.pb_ratio) > 0 OR t.pe_ratio > 0 OR ss.ev_ebitda > 0)
              AND (t.pe_ratio IS NULL OR t.pe_ratio <= 30)
              AND COALESCE(t.sector_name, '') NOT ILIKE '%fund%'
              AND COALESCE(t.name_en, '') NOT ILIKE '%certificate%'
            """
            rows = await conn.fetch(query)
            print("SUCCESS! Rows:", len(rows))
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    import dotenv
    dotenv.load_dotenv()
    asyncio.run(test())
