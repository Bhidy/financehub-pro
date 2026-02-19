# ============================================================
# followup_engine.py
# General follow-up question generator for Starta AI
#
# How it works:
# 1. After Claude generates main response, call this engine
# 2. Engine sends response + context to Claude Haiku (fast, cheap)
# 3. Haiku generates 3 smart follow-up questions
# 4. Frontend renders them as clickable chips
#
# Cost: ~$0.001 per call (Haiku pricing)
# Speed: ~0.5-1 second additional
# ============================================================

import anthropic
import json
import os
import re
from typing import List, Dict, Optional
from dataclasses import dataclass


# ── DATA STRUCTURES ──────────────────────────────────────────

@dataclass
class FollowUpQuestion:
    text: str           # The clickable chip text (short, engaging)
    full_query: str     # What gets sent to API when user clicks
    type: str           # deeper_dive | risk | catalyst | comparison | macro | historical | sector | next_step
    priority: int       # 1-3, used for ordering


# ── THE 8 FOLLOW-UP TYPES ────────────────────────────────────
# These are injected into Haiku's system prompt
# Ensures variety and genuine value

FOLLOWUP_TYPES = """
When generating follow-up questions, use these 8 types.
Pick the 3 MOST VALUABLE for this specific response.
Never use the same type twice in one set.

TYPE: deeper_dive
When to use: Something important was mentioned but not fully explained
Example: "What's actually driving the margin decline — the full breakdown"
Example: "Walk me through how the Assiut expansion changes the FCF picture"

TYPE: risk_probe  
When to use: A risk was flagged but deserves more attention
Example: "How serious is the NPL risk — and what would a bad scenario look like"
Example: "If EGP depreciates further, how much does that hurt JUFO specifically"

TYPE: catalyst
When to use: After valuation or bull/bear analysis — what changes things
Example: "What specific catalyst would move this from 64 to 75+ on the score"
Example: "Three things that could unlock the Real Estate discount this year"

TYPE: comparison
When to use: When a stock or sector has been analyzed in isolation
Example: "How does COMI's quality score compare to QNBA on the same framework"
Example: "Show me the same analysis for OBOU — is it better or worse value"

TYPE: macro_link
When to use: When individual stock analysis doesn't mention macro context
Example: "How does the CBE rate cycle affect this thesis"
Example: "If remittance flows slow down, what happens to consumer stocks"

TYPE: historical
When to use: When current situation echoes past patterns
Example: "Has JUFO been at this valuation before — what happened next"
Example: "How did Egyptian banks perform the last time they traded below book"

TYPE: sector_view
When to use: When individual stock analysis could benefit from sector context
Example: "Is this cheapness specific to COMI or the whole banking sector"
Example: "Which sector is showing the most dislocation right now"

TYPE: next_step
When to use: When user needs practical guidance on what to monitor
Example: "What's the one number I should watch in COMI's next earnings"
Example: "Set me up with a checklist — what would confirm the bull case here"
"""


# ── HAIKU SYSTEM PROMPT ──────────────────────────────────────

FOLLOWUP_SYSTEM_PROMPT = f"""
You generate follow-up questions for Starta AI, an institutional-quality 
Egyptian stock market analysis platform built by a former Mubasher Asset 
Management CEO with 20 years of experience.

Your job: Given an AI response about Egyptian stocks, generate exactly 3 
follow-up questions a serious investor would genuinely want to ask next.

{FOLLOWUP_TYPES}

RULES:
1. Each question must be SPECIFIC — reference actual numbers, names, or 
   concepts from the response. Never generic ("tell me more").
2. Each question should be a different TYPE from the list above.
3. Questions should progress naturally — not feel random.
4. Keep chip text SHORT (under 12 words) — it's a clickable button.
   The full_query can be longer (1-2 sentences).
5. Don't suggest questions about topics already covered in the conversation.
6. Match the sophistication of the platform — these are for serious investors,
   not beginners asking "what is a stock."

RESPONSE FORMAT (strict JSON, no other text):
[
  {{
    "chip": "Short clickable text (under 12 words)",
    "query": "Full question sent to API when clicked (1-2 sentences)",
    "type": "type_name_from_list"
  }},
  {{
    "chip": "...",
    "query": "...",
    "type": "..."
  }},
  {{
    "chip": "...",
    "query": "...",
    "type": "..."
  }}
]
"""


# ── CONTEXT EXTRACTOR ────────────────────────────────────────

def extract_context_signals(
    ai_response: str,
    conversation_history: List[Dict],
    intent: Dict
) -> str:
    """
    Pulls key signals from the response to help Haiku generate
    better follow-ups. Avoids sending the full response (saves tokens).
    """
    signals = []

    # What tickers were mentioned?
    from intent_detector import KNOWN_TICKERS
    mentioned_tickers = [t for t in KNOWN_TICKERS if t in ai_response.upper()]
    if mentioned_tickers:
        signals.append(f"Tickers mentioned: {', '.join(mentioned_tickers)}")

    # What metrics were mentioned?
    metrics = []
    metric_patterns = {
        "P/E ratio":        r"p/e|price.to.earnings|pe ratio",
        "P/B ratio":        r"p/b|price.to.book|pb ratio",
        "ROE":              r"\broe\b|return on equity",
        "margins":          r"margin|gross margin|operating margin",
        "free cash flow":   r"free cash flow|fcf",
        "debt":             r"\bdebt\b|d/e|leverage|debt.to.equity",
        "EV/EBITDA":        r"ev/ebitda|enterprise value",
        "NPL":              r"\bnpl\b|non.performing",
        "seasonality":      r"season|ramadan|tourism",
        "valuation":        r"valuation|cheap|expensive|discount|premium",
        "earnings":         r"earnings|net income|profit",
    }
    for label, pattern in metric_patterns.items():
        if re.search(pattern, ai_response, re.IGNORECASE):
            metrics.append(label)
    if metrics:
        signals.append(f"Metrics discussed: {', '.join(metrics)}")

    # What risks were mentioned?
    risks = []
    risk_patterns = {
        "EGP/currency risk":   r"egp|currency|exchange rate|devaluation",
        "leverage risk":       r"leverage|debt|refinanc",
        "margin pressure":     r"margin.*pressure|cost.*inflation|input cost",
        "NPL risk":            r"npl|non.performing|credit",
        "execution risk":      r"execution|capex|expansion",
        "macro risk":          r"macro|inflation|interest rate|cbe",
    }
    for label, pattern in risk_patterns.items():
        if re.search(pattern, ai_response, re.IGNORECASE):
            risks.append(label)
    if risks:
        signals.append(f"Risks mentioned: {', '.join(risks)}")

    # What was the response type?
    if intent:
        rtype = intent.get("type", "general")
        screen = intent.get("screen_type", "")
        signals.append(f"Response type: {rtype} {screen}".strip())

    # What topics were already covered in conversation?
    covered = []
    for msg in conversation_history:
        if msg["role"] == "user":
            covered.append(msg["content"][:80])  # First 80 chars of each user message
    if covered:
        signals.append(f"Already discussed: {' | '.join(covered[-4:])}")  # Last 4 only

    # Score info if present
    score_match = re.search(r"(\d{2,3})/100", ai_response)
    if score_match:
        signals.append(f"Score mentioned: {score_match.group(0)}")

    return "\n".join(signals)


# ── MAIN ENGINE ──────────────────────────────────────────────

class FollowUpEngine:

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def generate(
        self,
        ai_response: str,
        conversation_history: List[Dict],
        intent: Dict,
        fallback_on_error: bool = True
    ) -> List[FollowUpQuestion]:
        """
        Main entry point. Returns 3 follow-up questions.

        Args:
            ai_response: The full text Claude just returned
            conversation_history: Full conversation so far
            intent: The detected intent dict from intent_detector
            fallback_on_error: Use rule-based fallback if Haiku call fails
        """
        try:
            return self._generate_with_haiku(
                ai_response,
                conversation_history,
                intent
            )
        except Exception as e:
            print(f"Follow-up generation error: {e}")
            if fallback_on_error:
                return self._rule_based_fallback(ai_response, intent)
            return []

    def _generate_with_haiku(
        self,
        ai_response: str,
        conversation_history: List[Dict],
        intent: Dict
    ) -> List[FollowUpQuestion]:
        """
        Uses Claude Haiku to generate contextual follow-ups.
        Fast (~0.5s) and cheap (~$0.001 per call).
        """
        context = extract_context_signals(
            ai_response,
            conversation_history,
            intent
        )

        # Truncate response to keep tokens low
        # Haiku needs the gist, not every word
        truncated_response = ai_response[:1500] + ("..." if len(ai_response) > 1500 else "")

        user_message = f"""
AI response to analyze:
{truncated_response}

Context signals:
{context}

Generate 3 follow-up questions following the rules.
Return ONLY the JSON array, no other text.
"""

        response = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            system=FOLLOWUP_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}]
        )

        raw = response.content[0].text.strip()

        # Parse JSON
        # Strip markdown fences if present
        raw = re.sub(r"```json\s*|\s*```", "", raw).strip()
        parsed = json.loads(raw)

        return [
            FollowUpQuestion(
                text=item["chip"],
                full_query=item["query"],
                type=item["type"],
                priority=i + 1
            )
            for i, item in enumerate(parsed[:3])
        ]

    def _rule_based_fallback(
        self,
        ai_response: str,
        intent: Dict
    ) -> List[FollowUpQuestion]:
        """
        Simple rule-based fallback if Haiku call fails.
        Less intelligent but always works.
        """
        from intent_detector import KNOWN_TICKERS

        questions = []
        response_lower = ai_response.lower()

        # Find first ticker mentioned
        ticker = None
        for t in KNOWN_TICKERS:
            if t in ai_response.upper():
                ticker = t
                break

        # Rule: If score mentioned → offer breakdown
        if re.search(r"\d{2,3}/100", ai_response) and ticker:
            questions.append(FollowUpQuestion(
                text=f"What's inside the {ticker} score?",
                full_query=f"Break down exactly what drives the {ticker} score — component by component",
                type="deeper_dive",
                priority=1
            ))

        # Rule: If risk mentioned → probe it
        if any(w in response_lower for w in ["risk", "concern", "watch", "caution"]):
            questions.append(FollowUpQuestion(
                text="How serious are the risks?",
                full_query="Walk me through the biggest risks in more detail — what's the worst case scenario?",
                type="risk_probe",
                priority=2
            ))

        # Rule: If valuation mentioned → ask about catalyst
        if any(w in response_lower for w in ["cheap", "discount", "undervalued", "valuation"]):
            name = ticker or "this"
            questions.append(FollowUpQuestion(
                text=f"What unlocks {name}?",
                full_query=f"What catalyst or event would close the valuation gap for {name}?",
                type="catalyst",
                priority=3
            ))

        # Rule: Comparison always available
        if ticker and len(questions) < 3:
            questions.append(FollowUpQuestion(
                text=f"Compare {ticker} to sector peers",
                full_query=f"How does {ticker} compare to its direct competitors on the same framework?",
                type="comparison",
                priority=3
            ))

        # Rule: Macro always available
        if len(questions) < 3:
            questions.append(FollowUpQuestion(
                text="What's the macro picture?",
                full_query="How does the current Egyptian macro environment affect this analysis?",
                type="macro_link",
                priority=3
            ))

        return questions[:3]


# ── ASYNC VERSION (for FastAPI) ──────────────────────────────

import asyncio

class AsyncFollowUpEngine:
    """
    Async version for use in FastAPI endpoints.
    Runs follow-up generation in parallel with response storage.
    """

    def __init__(self):
        self.engine = FollowUpEngine()

    async def generate(
        self,
        ai_response: str,
        conversation_history: List[Dict],
        intent: Dict
    ) -> List[FollowUpQuestion]:
        """Run in thread pool to avoid blocking event loop."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.engine.generate,
            ai_response,
            conversation_history,
            intent
        )


# ── INTEGRATION: UPDATE main.py ─────────────────────────────
#
# Replace your existing /api/chat endpoint with this:
#
# @app.post("/api/chat")
# async def chat(request: ChatRequest):
#
#     # 1. Get main response (existing logic)
#     result = await handle_chat(
#         message=request.message,
#         session_id=request.session_id,
#         history=request.conversation_history or []
#     )
#
#     # 2. Generate follow-up questions IN PARALLEL
#     engine = AsyncFollowUpEngine()
#     followups = await engine.generate(
#         ai_response=result["response"],
#         conversation_history=request.conversation_history or [],
#         intent=result["intent"]
#     )
#
#     # 3. Store conversation
#     db.store_conversation(...)
#
#     # 4. Return everything
#     return {
#         "response": result["response"],
#         "followups": [
#             {
#                 "text": f.text,           # Short chip label
#                 "query": f.full_query,    # Sent to API on click
#                 "type": f.type
#             }
#             for f in followups
#         ],
#         "data": result["data"],
#         "intent": result["intent"],
#         "tokens": result["tokens"]
#     }


# ── INTEGRATION: UPDATE Chat.tsx ─────────────────────────────
#
# The frontend now receives followups from API directly.
# No need to parse chips from AI response text.
#
# interface FollowUp {
#   text: string;    // chip label
#   query: string;   // sent to API when clicked
#   type: string;
# }
#
# interface ChatResponse {
#   response: string;
#   followups: FollowUp[];
#   data: any;
# }
#
# // In your message state, store followups per message:
# interface Message {
#   role: 'user' | 'assistant';
#   content: string;
#   followups?: FollowUp[];
# }
#
# // After API call:
# const aiMessage: Message = {
#   role: 'assistant',
#   content: data.response,
#   followups: data.followups    // attach to this message
# };
#
# // Render chips only below the LAST assistant message:
# {message.role === 'assistant' &&
#  isLastMessage &&
#  message.followups && (
#   <div className="flex flex-col gap-2 mt-3 ml-11">
#     {message.followups.map((f, i) => (
#       <button
#         key={i}
#         onClick={() => {
#           sendMessage(f.query);  // send full query, not chip text
#         }}
#         className="text-left px-4 py-2.5 bg-gray-50 border border-gray-200
#                    rounded-xl text-sm text-gray-700
#                    hover:bg-teal-50 hover:border-teal-300
#                    transition-all duration-150 group"
#       >
#         <span className="text-teal-600 font-semibold mr-2 group-hover:mr-3 transition-all">
#           {['1️⃣','2️⃣','3️⃣'][i]}
#         </span>
#         {f.text}
#       </button>
#     ))}
#   </div>
# )}


# ── EXAMPLE OUTPUT ───────────────────────────────────────────
#
# After a COMI score breakdown response, Haiku might generate:
#
# [
#   {
#     "chip": "How serious is the NPL risk really?",
#     "query": "Walk me through COMI's NPL ratio in detail — 
#               current level, trend, and what a deterioration 
#               scenario looks like for the 76/100 score",
#     "type": "risk_probe"
#   },
#   {
#     "chip": "COMI vs QNBA on the same framework",
#     "query": "Run the same 5-component score on QNBA and 
#               compare it directly to COMI — which is the 
#               better setup right now?",
#     "type": "comparison"
#   },
#   {
#     "chip": "What would move COMI back to 1.3x P/B?",
#     "query": "What specific catalyst or combination of factors 
#               would close COMI's discount from 0.9x P/B back 
#               toward its 1.4x historical average?",
#     "type": "catalyst"
#   }
# ]
#
# After a Hidden Gems response, Haiku might generate:
#
# [
#   {
#     "chip": "Why is the market ignoring MNHD?",
#     "query": "MNHD has 24% ROE and trades at 5.8x EV/EBITDA — 
#               why hasn't the market noticed? What's keeping 
#               it undiscovered?",
#     "type": "deeper_dive"
#   },
#   {
#     "chip": "ALEX's cash flow vs earnings — what does it mean?",
#     "query": "Walk me through what a 1.3x OCF/NI ratio actually 
#               means for ALEX — why does cash materially exceed 
#               reported earnings and is that sustainable?",
#     "type": "deeper_dive"
#   },
#   {
#     "chip": "What surfaces hidden gems faster?",
#     "query": "These gems can stay undiscovered for 12-24 months. 
#               What catalysts — earnings surprise, analyst 
#               initiation, index inclusion — tend to surface 
#               Egyptian small-caps faster?",
#     "type": "catalyst"
#   }
# ]
#
# Notice: completely different questions each time, specific to
# what was actually in the response, never repeating what was
# already discussed.


# ── TESTING ──────────────────────────────────────────────────

def test_followup_engine():
    """
    Quick test — run this to verify engine works.
    Requires ANTHROPIC_API_KEY in environment.
    """
    engine = FollowUpEngine()

    # Simulate a COMI score breakdown response
    test_response = """
    COMI's 76/100 is the cleanest setup on today's screen.

    Valuation 20/20 — P/B at 0.9x vs 5yr average of 1.4x (36% below history).
    Profitability 16/20 — ROE 18.2%, above the 15% good threshold for banks.
    Financial Health 16/20 — D/E 0.42x, conservative for a bank.
    Earnings Quality 16/20 — OCF/NI ratio 1.1x, cash confirming profits.
    Momentum 8/20 — Price -8% last 3 months, unloved right now.

    The one thing to watch: NPL ratio. If non-performing loans start 
    creeping up as Egyptian businesses feel macro pressure, that 18% ROE 
    deteriorates fast and the valuation discount becomes a trap.

    Educational analysis only.
    """

    test_history = [
        {"role": "user",      "content": "Get me the most undervalued stocks"},
        {"role": "assistant", "content": "COMI 76/100, OCDI 71/100, JUFO 64/100..."},
        {"role": "user",      "content": "Show me what's inside the COMI score"},
    ]

    test_intent = {
        "type": "followup",
        "followup_path": "deep_dive_score",
        "followup_ticker": "COMI"
    }

    questions = engine.generate(test_response, test_history, test_intent)

    print("Generated follow-ups:")
    for i, q in enumerate(questions, 1):
        print(f"\n{i}. [{q.type}]")
        print(f"   Chip:  {q.text}")
        print(f"   Query: {q.full_query}")

    return questions


if __name__ == "__main__":
    test_followup_engine()
