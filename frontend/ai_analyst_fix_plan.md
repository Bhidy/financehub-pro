# Chatbot Accuracy Improvement Plan

## 1. Problem Analysis

**User Report:**
- **Issue:** Chatbot provides incorrect answers (e.g., "Banking sector stocks" returns "Fawry").
- **Goal:** Achieve 100% accuracy and relevance in responses.
- **Root Cause:**
    1.  **Missing Intents:** The training data `intents.yaml` is missing critical intents like `SECTOR_STOCKS`, `TOP_GAINERS`, `NEWS`, and others that are implemented in the backend code but not trained.
    2.  **Aggressive Symbol Resolution:** The `SymbolResolver` matches common words (like "Banking" in "Fawry for Banking Technology") as stock symbols, overriding weaker intent signals.
    3.  **Fallback Logic Failure:** When the NLU fails to find a high-confidence intent (due to missing data), the system defaults to "Stock Mode" if it finds *any* potential symbol, leading to false positives.

## 2. Solution Strategy

To achieve "Ultra World Class" accuracy, we will implement a 3-layered improvement plan:

### Layer 1: Comprehensive NLU Training (The Foundation)
We will align the training data with the backend capabilities.
- **Action:** Add all missing intents to `hf-space/app/chat/nlu/intents.yaml`.
- **New Intents:**
    - `SECTOR_STOCKS`: Examples like "Banking sector", "Show me real estate stocks".
    - `TOP_GAINERS` / `TOP_LOSERS`: "Top movers", "Worst performers".
    - `NEWS`: "Latest news", "What is happening with [Symbol]".
    - `MARKET_SUMMARY`: "How is the market?", "EGX30 status".
    - `SCREENER_*`: "Undervalued stocks", "High growth companies".

### Layer 2: Intelligent Entity Resolution
Stop the "Fawry" false positive by contextualizing symbol lookup.
- **Action:** Modify `chat_service.py`.
- **Logic Change:**
    - If the Intent is `SECTOR_STOCKS`, **disable** stock symbol resolution. instead, look for *Sector Names* (e.g., "Banks", "Real Estate", "Health").
    - Implement a simple `SectorResolver` or keyword map.
    - Add a "Stoplist" for Sector names so they are strictly treated as sectors, not partial stock matches.

### Layer 3: Robust Fallback & Confidence
Ensure the bot admits ignorance rather than guessing.
- **Action:** Adjust confidence thresholds in `hf-space/app/chat/nlu/engine.py` (if needed) or `chat_service.py`.
- **Logic:** If intent confidence is low (< 0.6) and symbol match is "Fuzzy" (not exact ticker), ask for clarification instead of showing a potentially wrong stock.

## 3. Implementation Steps

1.  **Update Training Data (`intents.yaml`)**: Add the missing ~10 intents with 10+ varied examples each.
2.  **Refine Chat Service (`chat_service.py`)**:
    - Add `extract_sector(message)` helper.
    - blocking symbol resolution for `SECTOR_STOCKS` intent.
3.  **Verify**: Test "Banking sector stocks", "Top gainers", and "Real estate" to ensure they route correctly.

## 4. Expected Outcome
- "Banking sector stocks" -> Shows list of banks (Intent: `SECTOR_STOCKS`).
- "Fawry price" -> Shows Fawry data (Intent: `STOCK_PRICE`).
- "What is the market doing" -> Shows Market Summary (Intent: `MARKET_SUMMARY`).
- **Zero Hallucinations**: The bot will strictly follow the trained intents.
