# Hybrid Chatbot Architecture: Deterministic Brain + LLM Explainer

## 1. Executive Summary
This plan implements the "Brain + Explainer" architecture for the FinanceHub Pro chatbot. It preserves the existing robust, deterministic logic (the "Brain") for data fetching and guardrails, while adding a Groq-powered LLM layer (the "Explainer") to humanize responses and provide context, strictly adhering to the "No Hallucination" rule.

## 2. Architecture Overview

### Current State (The "Brain")
- **Component:** `ChatService` (`backend-core/app/chat/chat_service.py`)
- **Role:** NLU (IntentRouter), Symbol Resolution, Data Fetching (Handlers), Compliance.
- **Output:** Structured JSON (Cards, Charts, Actions) with robotic/template text.
- **Status:** **KEEP AS IS**. This mimics the "Rasa" role described by providing ground-truth data.

### New Layer (The "Explainer")
- **Component:** `LLMExplainerService` (New Component)
- **Role:** Takes the structured data from the Brain + User Query and generates a natural language summary.
- **Constraint:** NEVER invents data. ONLY explains the provided JSON payload.
- **Integration Point:** `ChatService.process_message` - immediately after handler execution and before response building.

## 3. Implementation Steps

### Step 1: Install & Configure Groq
- Ensure `groq` is in `backend-core/requirements.txt` (Confirmed).
- Ensure `GROQ_API_KEY` is available in environment variables.

### Step 2: Create `LLMExplainerService`
Create `backend-core/app/chat/llm_explainer.py`:
- **Function:** `generate_explanation(query: str, data: dict, language: str) -> str`
- **System Prompt:**
  ```text
  You are Starta, a financial assistant. 
  You MUST only describe the data given in the CONTEXT below. 
  Do NOT invent any numbers or facts. 
  Respond in {language}. 
  Tone: Friendly, professional, concise.
  Context: {data_json}
  User Query: {query}
  ```
- **Fallback:** If LLM fails/timeouts, return empty string (frontend uses default template).

### Step 3: Integrate into `ChatService`
Modify `backend-core/app/chat/chat_service.py`:
1.  Import `LLMExplainerService`.
2.  In `process_message`, after `_dispatch_handler` returns `result`:
    - Check if `result` has valid data (success=True).
    - Call `LLMExplainerService.generate_explanation` asynchronously (or strictly timed).
    - Override `result['message']` with the LLM output.
3.  Ensure `_log_analytics` captures the LLM generation status.

### Step 4: Frontend Updates (Minimal)
- The Frontend `ChatResponse` interface already accepts `message_text`.
- The improved text from backend will automatically flow to the UI.
- No sensitive keys exposed to client.

## 4. Phase 1: Pilot Implementation (Stock Price & Summary)
We will enable the LLM Explainer only for specific high-value intents initially:
- `STOCK_PRICE`
- `STOCK_SNAPSHOT`
- `FINANCIALS`
- `DIVIDENDS`

Intents like `HELP` or `unknown` will remain template-based to save tokens.

## 5. Safety & Guardrails
- **Token Budget:** Set `max_tokens=300` for Groq calls.
- **Latency:** Set timeout `2.0s`. If Groq is slow, return robotic response immediately (fail-safe).
- **Compliance:** The LLM does not decide *what* to show, only *how* to describe it.

## 6. Verification
- **Test:** Run specific queries ("Price of COMI", "Is that good?") and verify the text is conversational but the numbers match the cards exactly.
