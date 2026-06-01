import asyncio
import asyncpg
import sys
import os

# Add backend core to path
sys.path.append("/Users/home/Documents/startamarkets/backend-core")

from app.chat.scoring_engine import calculate_score

async def main():
    conn = await asyncpg.connect(
        user="postgres",
        password="postgrespassword",
        database="postgres",
        host="46.224.223.172",
        port=5432
    )

    query = """
    WITH sector_averages AS (
        SELECT
            sector_name,
            AVG(NULLIF(pe_ratio, 0)) AS avg_pe,
            AVG(NULLIF(pb_ratio, 0)) AS avg_pb
        FROM market_tickers
        WHERE market_code = 'EGX'
          AND sector_name IS NOT NULL
        GROUP BY sector_name
    )
    SELECT
        t.symbol,
        t.name_en,
        t.name_ar,
        t.sector_name,
        t.market_cap,
        t.last_price,
        t.logo_url,
        t.pe_ratio,
        t.pb_ratio,
        t.dividend_yield,
        ss.roe,
        ss.profit_margin,
        ss.revenue_growth,
        ss.gross_margin,
        ss.operating_margin,
        ss.debt_equity,
        ss.current_ratio,
        ss.altman_z_score,
        ss.piotroski_f_score,
        CASE
            WHEN t.pe_ratio > 0 AND sa.avg_pe > 0
            THEN ((sa.avg_pe - t.pe_ratio) / sa.avg_pe) * 100
            ELSE 0
        END AS pe_discount,
        CASE
            WHEN t.pb_ratio > 0 AND sa.avg_pb > 0
            THEN ((sa.avg_pb - t.pb_ratio) / sa.avg_pb) * 100
            ELSE 0
        END AS pb_discount
    FROM market_tickers t
    LEFT JOIN sector_averages sa
        ON t.sector_name = sa.sector_name
    LEFT JOIN stock_statistics ss
        ON t.symbol = ss.symbol AND t.market_code = ss.market_code
    WHERE t.market_code = 'EGX'
      AND t.last_price IS NOT NULL
      AND ($1::text IS NULL OR t.sector_name ILIKE $1)
      AND (
            (t.pe_ratio > 0 AND sa.avg_pe IS NOT NULL)
         OR (t.pb_ratio > 0 AND sa.avg_pb IS NOT NULL)
      )
    LIMIT $2
    """
    
    # We test sector=None, Limit=200 to see all potential hits
    rows = await conn.fetch(query, None, 200)
    print(f"Total rows fetched: {len(rows)}")

    scored_rows = []
    for row in rows:
        metrics = dict(row)
        for k in ['roe', 'profit_margin', 'gross_margin', 'operating_margin', 'revenue_growth', 'dividend_yield']:
            v = metrics.get(k)
            if v is not None and abs(v) <= 1.0:
                metrics[k] = v * 100
        
        score_res = calculate_score(metrics, {})
        print(f"{row['symbol']}: ValScore={score_res.valuation}, Total={score_res.total}")
        if score_res.valuation >= 20: # The current filter
            scored_rows.append((score_res, dict(row)))
            
    print(f"Total matching Valuation >= 20: {len(scored_rows)}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
