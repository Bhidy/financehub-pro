
# Data Source & Pipeline Report: Real-Time Stock Data

## 1. Data Source
**Primary Provider:** [StockAnalysis.com](https://stockanalysis.com)
**Specific Endpoint:** `https://stockanalysis.com/api/screener/a/f`
**Method:** We utilize a custom `StockAnalysisClient` that acts as a secure browser to query their hidden internal API.

## 2. Extraction Mechanism (The "How")
We do **not** use standard scraping (like Beautiful Soup) for live prices because it is too slow. Instead, we use a specialized "Screener API" approach:

1.  **Direct API Access:** Our backend sends a request to their internal JSON API, asking for a "Screener" view of all EGX stocks.
2.  **Payload:** We request specific columns in a single batch for all 223 stocks:
    *   `price` (Last Traded Price)
    *   `change` (Percentage Change)
    *   `volume` (Volume)
    *   `marketCap`
3.  **Bypass Technology:** We use `tls_client` (a specialized library) to mimic a "Chrome 120" browser, ensuring their security systems (Cloudflare) do not block our automated requests.

## 3. The "Missing Value" Calculation
StockAnalysis.com provides the **Percentage Change** (`+3.36%`) but typically sends `0` or `null` for the **Absolute Change** (`+3.96 EGP`) in their bulk screener API to save bandwidth.

**Our Smart Calculation Logic:**
Since we have the **Price** (`121.71`) and **Percentage** (`3.36%`), we mathematically reverse-engineer the absolute change in our backend before saving it:

$$ \text{Previous Price} = \frac{\text{Current Price}}{1 + (\frac{\text{Change \%}}{100})} $$
$$ \text{Absolute Change} = \text{Current Price} - \text{Previous Price} $$

*Example for CIB (COMI):*
*   Price: 121.71, Change%: 3.363%
*   Prev Price = 121.71 / 1.03363 = 117.75
*   **Absolute Change** = 121.71 - 117.75 = **3.96**

## 4. Storage & Retrieval (The "DB")
Yes, the data is stored in our database for high-speed retrieval by the chatbot.

**Flow:**
1.  **Ingestion:** `market_loader.py` runs (scheduled every 15 mins or triggered manually).
2.  **Storage:** It saves the calculated values into the `market_tickers` table in PostgreSQL (`StartaProd` DB).
3.  **Retrieval:** When you ask the chatbot "Show me CIB", it reads `last_price` and `change` directly from this database table, ensuring sub-millisecond response times.

## Summary
*   **Source:** StockAnalysis.com Internal API
*   **Live:** Yes (Delayed by ~15 mins per standard exchange rules)
*   **Calculated:** Absolute change is derived mathematically to ensure accuracy.
*   **Stored:** Persisted in `market_tickers` table.
