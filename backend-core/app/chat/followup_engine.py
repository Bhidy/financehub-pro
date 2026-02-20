import json
import logging
import re
from typing import List, Dict, Optional
from dataclasses import dataclass
from .llm_clients import MultiProviderLLM

logger = logging.getLogger(__name__)

# ── DATA STRUCTURES ──

@dataclass
class FollowUpQuestion:
    text: str           # The clickable chip text (short, engaging)
    full_query: str     # What gets sent to API when user clicks
    type: str           # deeper_dive | risk | catalyst | comparison | macro | historical | sector | next_step
    priority: int       # 1-3, used for ordering


# ── THE 8 FOLLOW-UP TYPES ──

FOLLOWUP_TYPES = """
When generating follow-up questions, use these 8 types.
Pick the 3 MOST VALUABLE for this specific response.
Never use the same type twice in one set.

TYPE: deeper_dive
When to use: Something important was mentioned but not fully explained
Example: "What's actually driving the margin decline — the full breakdown"

TYPE: risk_probe  
When to use: A risk was flagged but deserves more attention
Example: "How serious is the NPL risk — and what would a bad scenario look like"

TYPE: catalyst
When to use: After valuation or bull/bear analysis — what changes things
Example: "What specific catalyst would move this from 64 to 75+ on the score"

TYPE: comparison
When to use: When a stock or sector has been analyzed in isolation
Example: "How does COMI's quality score compare to QNBA on the same framework"

TYPE: macro_link
When to use: When individual stock analysis doesn't mention macro context
Example: "How does the CBE rate cycle affect this thesis"

TYPE: historical
When to use: When current situation echoes past patterns
Example: "Has JUFO been at this valuation before — what happened next"

TYPE: sector_view
When to use: When individual stock analysis could benefit from sector context
Example: "Is this cheapness specific to COMI or the whole banking sector"

TYPE: next_step
When to use: When user needs practical guidance on what to monitor
Example: "What's the one number I should watch in COMI's next earnings"
"""


# ── LLM SYSTEM PROMPT ──

FOLLOWUP_SYSTEM_PROMPT = """
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
7. CRITICAL LANGUAGE RULE: You MUST generate all 'chip' and 'query' text EXACTLY in {language_name}. Do NOT use any other language, even if the context contains it. If {language_name} is English, absolutely NO Arabic. If {language_name} is Arabic, absolutely NO English.

RESPONSE FORMAT (strict JSON, no other text):
[
  {{
    "chip": "Short clickable text (under 12 words) in {language_name}",
    "query": "Full question sent to API when clicked (1-2 sentences) in {language_name}",
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


# ── CONTEXT EXTRACTOR ──

def extract_context_signals(
    ai_response: str,
    conversation_history: List[Dict],
    intent: Dict
) -> str:
    """
    Pulls key signals from the response to help LLM generate
    better follow-ups. Avoids sending the full response.
    """
    signals = []

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
        rtype = intent.get("intent", "general")
        signals.append(f"Response type: {rtype}".strip())

    # Score info if present
    score_match = re.search(r"(\d{2,3})/100", ai_response)
    if score_match:
        signals.append(f"Score mentioned: {score_match.group(0)}")

    return "\n".join(signals)


# ── MAIN ENGINE ──

class FollowUpEngine:

    def __init__(self):
        self.llm = MultiProviderLLM()

    async def generate(
        self,
        ai_response: str,
        conversation_history: List[Dict],
        intent: Dict,
        symbol: Optional[str] = None,
        language: str = "en"
    ) -> List[Dict]:
        """
        Main entry point. Returns 3 follow-up questions formatted for the frontend chips.
        """
        try:
            return await self._generate_with_llm(
                ai_response,
                conversation_history,
                intent,
                symbol,
                language
            )
        except Exception as e:
            logger.error(f"Follow-up generation error: {e}")
            return self._rule_based_fallback(ai_response, symbol)

    async def _generate_with_llm(
        self,
        ai_response: str,
        conversation_history: List[Dict],
        intent: Dict,
        symbol: Optional[str] = None,
        language: str = "en"
    ) -> List[Dict]:
        """
        Uses standard MultiProviderLLM to generate contextual follow-ups.
        """
        context = extract_context_signals(
            ai_response,
            conversation_history,
            intent
        )
        if symbol:
            context += f"\\nPrimary ticker focused on: {symbol}"

        # Truncate response to keep tokens low
        truncated_response = ai_response[:1500] + ("..." if len(ai_response) > 1500 else "")

        user_message = f'''AI response to analyze:
{truncated_response}

Context signals:
{context}

Generate 3 follow-up questions following the rules.
Return ONLY the JSON array, no other text.'''

        lang_name = "Arabic" if language == "ar" else "English"
        
        # Inject the dynamic language variable into the system prompt
        system_prompt = FOLLOWUP_SYSTEM_PROMPT.format(
            FOLLOWUP_TYPES=FOLLOWUP_TYPES,
            language_name=lang_name
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]

        response_text = await self.llm.complete(
            messages=messages,
            max_tokens=400,
            temperature=0.7,
            purpose="followup-engine"
        )
        
        if not response_text:
            return self._rule_based_fallback(ai_response, symbol)

        # Parse JSON
        raw = response_text.strip()
        raw = re.sub(r"```json\s*|\s*```", "", raw).strip()
        parsed = json.loads(raw)

        followups = []
        for i, item in enumerate(parsed[:3]):
            followups.append({
                "text": item.get("chip", "More Details"),
                "type": item.get("type", "general"),
                "payload": item.get("query", "Tell me more")
            })
            
        if not followups:
            return self._rule_based_fallback(ai_response, symbol)
            
        return followups

    def _rule_based_fallback(
        self,
        ai_response: str,
        ticker: Optional[str] = None
    ) -> List[Dict]:
        """
        Simple rule-based fallback if LLM call fails.
        """
        questions = []
        response_lower = ai_response.lower()

        # Rule: If score mentioned → offer breakdown
        if re.search(r"\d{2,3}/100", ai_response) and ticker:
            questions.append({
                "text": f"What's inside the {ticker} score?",
                "type": "deeper_dive",
                "payload": f"Break down exactly what drives the {ticker} score — component by component"
            })

        # Rule: If risk mentioned → probe it
        if any(w in response_lower for w in ["risk", "concern", "watch", "caution"]):
            questions.append({
                "text": "How serious are the risks?",
                "type": "risk_probe",
                "payload": "Walk me through the biggest risks in more detail — what's the worst case scenario?"
            })

        # Rule: If valuation mentioned → ask about catalyst
        if any(w in response_lower for w in ["cheap", "discount", "undervalued", "valuation"]):
            name = ticker or "this"
            questions.append({
                "text": f"What unlocks {name}?",
                "type": "catalyst",
                "payload": f"What catalyst or event would close the valuation gap for {name}?"
            })

        # Rule: Comparison always available
        if ticker and len(questions) < 3:
            questions.append({
                "text": f"Compare {ticker} to peers",
                "type": "comparison",
                "payload": f"How does {ticker} compare to its direct competitors on the same framework?"
            })

        # Rule: Macro always available
        if len(questions) < 3:
            questions.append({
                "text": "What's the macro picture?",
                "type": "macro_link",
                "payload": "How does the current Egyptian macro environment affect this analysis?"
            })

        return questions[:3]
