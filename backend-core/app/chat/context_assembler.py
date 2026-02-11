"""
Context Assembler - Conversation Memory & Entity Tracking
==========================================================
World-Class Conversational AI Component.

Provides rich conversational context for Claude AI by:
1. Storing last N conversation turns
2. Tracking active entities (symbol, sector, metric)
3. Detecting follow-up patterns ("yes", "ok", "أيوه")
4. Managing pending suggestions from previous responses

This enables Claude to understand:
- "yes" → Execute the suggested action
- "tell me more" → Expand on the same entity
- "what about dividends?" → New intent, inherit symbol
"""

import re
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum


logger = logging.getLogger(__name__)


class FollowUpType(Enum):
    """Types of follow-up patterns detected."""
    NONE = "none"  # Not a follow-up
    CONFIRMATION = "confirmation"  # "yes", "ok", "sure"
    EXPANSION = "expansion"  # "tell me more", "explain", "details"
    TOPIC_SHIFT = "topic_shift"  # New topic but same entity
    COMPARISON_ADD = "comparison_add"  # "compare with X"
    PRONOUN_REFERENCE = "pronoun_reference"  # "is it good?", "how is that?"
    LIST_REFERENCE = "list_reference" # "which of them", "filter these", "sort by PE"


# ============================================================================
# WORLD-CLASS FOLLOW-UP PATTERNS (50+ per language for enterprise-grade accuracy)
# ============================================================================

CONFIRMATION_PATTERNS = {
    "en": [
        # Basic affirmatives
        r"^(yes|yeah|yep|yup|sure|ok|okay|alright|right)[\.\!\?]?$",
        r"^(go ahead|proceed|do it|show me|let's do it)[\.\!\?]?$",
        r"^(sounds good|looks good|perfect|great|nice|cool)[\.\!\?]?$",
        r"^(absolutely|definitely|certainly|of course|for sure)[\.\!\?]?$",
        r"^(please|please do|go for it|i'm interested)[\.\!\?]?$",
        # Casual confirmations
        r"^(yea|ya|uh huh|mhm|mm|mmm|ahuh)[\.\!\?]?$",
        r"^(fine|good|that's fine|works for me)[\.\!\?]?$",
        r"^(approved|confirmed|agreed|deal)[\.\!\?]?$",
        # Requesting action
        r"^(show|show it|show me that|let me see)[\.\!\?]?$",
        r"^(continue|go on|carry on|keep going)[\.\!\?]?$",
        r"^(next|what's next|and then|then what)[\.\!\?]?$",
        # Emoji confirmations
        r"^(👍|✅|👌|🙏|💯|✔️)$",
    ],
    "ar": [
        # Basic Arabic affirmatives
        r"^(نعم|أيوه|ايوه|اه|آه|إي)[\.\!\?]?$",
        r"^(تمام|ماشي|حسناً|حسنا|أوكي|أوك|اوك|اوكي)[\.\!\?]?$",
        r"^(موافق|صحيح|بالظبط|مظبوط|طيب|كويس)[\.\!\?]?$",
        # Egyptian dialect
        r"^(يلا|يلا بينا|امشي|عال|شيك|تمام التمام)[\.\!\?]?$",
        r"^(خلاص|أكيد|طبعاً|بالتأكيد)[\.\!\?]?$",
        # Request action
        r"^(ورّيني|وريني|أوريني|عايز أشوف|عاوز اشوف)[\.\!\?]?$",
        r"^(كمّل|كمل|استمر|امشي|زي ما قلت)[\.\!\?]?$",
        # Gulf dialect
        r"^(زين|اوكي|اي|إيه|إيوا|صح)[\.\!\?]?$",
        # Short forms
        r"^(ا|اوه|آ)[\.\!\?]?$",
        # Emoji
        r"^(👍|✅|👌|🙏|💯|✔️)$",
    ]
}

EXPANSION_PATTERNS = {
    "en": [
        # Request for more info
        r"(tell me more|more details?|explain|elaborate|go deeper|dive deeper)",
        r"(what does (that|this|it) mean|why is that|how come)",
        r"(expand on (that|this)|break (it|this|that) down)",
        # Clarification requests
        r"(can you clarify|clarify|what do you mean|i don't understand)",
        r"(help me understand|walk me through|break it down for me)",
        r"(give me more context|more info|more information)",
        # Interest expressions
        r"(interesting|that's interesting|tell more|go on|keep going)",
        r"(what else|anything else|is there more|more please)",
        r"(why|how|when|where)[\s\?]?$",
        # Deep dive requests
        r"(deep dive|full analysis|complete picture|comprehensive view)",
        r"(drill down|zoom in|focus on|details on)",
    ],
    "ar": [
        # Request for more info
        r"(أكثر|المزيد|وضّح|وضح|اشرح|فصّل|فصل|بالتفصيل)",
        r"(يعني إيه|يعني ايه|ليه كده|ليه كدة|إزاي|ازاي|ما معنى)",
        r"(أكمل|استمر|زيد|كمان)",
        # Clarification
        r"(مش فاهم|فهمني|وضحلي|اشرحلي)",
        r"(قولي أكتر|قولي اكتر|عايز أفهم|عاوز افهم)",
        # Interest
        r"(إيه كمان|ايه تاني|فيه إيه تاني|وبعدين)",
        r"(ليه|إزاي|فين|إمتى)[\s\?]?$",
        # Deep dive
        r"(تحليل كامل|صورة كاملة|بالتفصيل الممل)",
    ]
}

PRONOUN_PATTERNS = {
    "en": [
        # Stock/company references
        r"\b(it|this|that|the stock|the company|this one|that one)\b",
        r"^(is (it|this|that)|how is (it|this|that)|what about (it|this|that))",
        # Questions about current entity
        r"^(how('s| is)|what('s| is)|is (it|the))\b",
        r"(should i.*\b(it|this|that)\b|buy (it|this)|sell (it|this))",
        r"(good|bad|safe|risky|worth it|undervalued|overvalued)\?",
        # Short questions implying context
        r"^(and|but|so|also|what about|how about)",
    ],
    "ar": [
        # Stock/company references
        r"\b(السهم|الشركة|ده|دي|دا|هذا|هذه|هو|هي)\b",
        r"^(هل (هو|هي|ده|دي)|إيه (حالته|وضعه|أخباره))",
        # Questions about current entity
        r"^(إزاي|ازاي|عامل إزاي|عامل ازاي|إيه أخباره)",
        r"(أشتري|ابيع|كويس|وحش|آمن|خطر)\?",
        # Short questions implying context
        r"^(و|بس|يعني|طب|وإيه عن|وايه عن)",
    ]
}

# Topic shift keywords - when user asks about new topic but same entity
TOPIC_SHIFT_KEYWORDS = {
    "en": [
        "dividend", "dividends", "financials", "financial", "balance sheet", "income",
        "chart", "technical", "analysis", "compare", "comparison", "vs", "versus",
        "valuation", "value", "fair value", "target", "price target", "forecast",
        "growth", "revenue", "profit", "margin", "debt", "cash flow", "eps",
        "pe", "p/e", "pb", "p/b", "roe", "roa", "risk", "safety", "health",
        "news", "update", "latest", "recent", "history", "trend", "performance",
        "buy", "sell", "hold", "recommendation", "rating", "sector", "industry",
    ],
    "ar": [
        "توزيعات", "أرباح", "قوائم مالية", "ميزانية", "دخل", "إيرادات",
        "رسم", "رسم بياني", "تحليل", "تحليل فني", "مقارنة", "مقابل",
        "تقييم", "قيمة", "قيمة عادلة", "مستهدف", "سعر مستهدف", "توقعات",
        "نمو", "ربح", "هامش", "ديون", "تدفق نقدي", "ربحية السهم",
        "مضاعف", "عائد", "مخاطر", "أمان", "صحة مالية",
        "أخبار", "تحديث", "جديد", "أداء", "اتجاه", "تاريخ",
        "شراء", "بيع", "احتفاظ", "توصية", "تصنيف", "قطاع",
    ]
}


@dataclass
class ConversationTurn:
    """A single turn in the conversation."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime
    intent: Optional[str] = None
    entities: Dict[str, Any] = field(default_factory=dict)
    language: str = "en"


@dataclass
class ActiveEntities:
    """Currently active entities in the conversation."""
    symbol: Optional[str] = None
    sector: Optional[str] = None
    market: Optional[str] = None
    metric: Optional[str] = None  # e.g., "PE", "dividends", "financials"
    filters: List[Dict[str, Any]] = field(default_factory=list) # For Universal Screener
    sort_by: Optional[str] = None
    last_intent: Optional[str] = None
    compare_symbols: List[str] = field(default_factory=list)
    last_updated: datetime = field(default_factory=datetime.utcnow)
    
    def update(self, **kwargs):
        """Update entities and refresh timestamp."""
        for key, value in kwargs.items():
            if hasattr(self, key) and value is not None:
                setattr(self, key, value)
        self.last_updated = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for LLM context."""
        return {
            "symbol": self.symbol,
            "sector": self.sector,
            "market": self.market,
            "metric": self.metric,
            "filters": self.filters,
            "sort_by": self.sort_by,
            "last_intent": self.last_intent,
            "compare_symbols": self.compare_symbols,
        }


@dataclass
class UserProfile:
    """User preferences and profile."""
    user_id: Optional[str] = None
    name: str = "Analyst"
    preferred_language: str = "en"
    detail_level: str = "standard"  # "brief", "standard", "detailed"
    is_returning_user: bool = False


@dataclass 
class ConversationMemory:
    """Complete conversation memory for a session."""
    session_id: str
    turns: List[ConversationTurn] = field(default_factory=list)
    active_entities: ActiveEntities = field(default_factory=ActiveEntities)
    user_profile: UserProfile = field(default_factory=UserProfile)
    pending_suggestions: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: datetime = field(default_factory=lambda: datetime.utcnow() + timedelta(minutes=30))
    
    MAX_TURNS = 10  # Keep last 10 turns for context
    
    def add_turn(
        self,
        role: str,
        content: str,
        intent: Optional[str] = None,
        entities: Optional[Dict] = None,
        language: str = "en"
    ):
        """Add a conversation turn."""
        turn = ConversationTurn(
            role=role,
            content=content,
            timestamp=datetime.utcnow(),
            intent=intent,
            entities=entities or {},
            language=language
        )
        self.turns.append(turn)
        
        # Trim to max turns
        if len(self.turns) > self.MAX_TURNS:
            self.turns = self.turns[-self.MAX_TURNS:]
        
        # Update entities if provided
        if entities:
            self.active_entities.update(**entities)
        
        # Refresh expiry
        self.expires_at = datetime.utcnow() + timedelta(minutes=30)
    
    def get_last_user_message(self) -> Optional[str]:
        """Get the last user message."""
        for turn in reversed(self.turns):
            if turn.role == "user":
                return turn.content
        return None
    
    def get_last_intent(self) -> Optional[str]:
        """Get the last detected intent."""
        for turn in reversed(self.turns):
            if turn.intent:
                return turn.intent
        return None
    
    def get_conversation_summary(self, max_turns: int = 5) -> str:
        """Get a summary of recent conversation for LLM context."""
        recent_turns = self.turns[-max_turns:] if self.turns else []
        
        if not recent_turns:
            return "No previous conversation."
        
        summary_lines = []
        for turn in recent_turns:
            role_label = "User" if turn.role == "user" else "Assistant"
            # Truncate long messages
            content = turn.content[:200] + "..." if len(turn.content) > 200 else turn.content
            summary_lines.append(f"{role_label}: {content}")
        
        return "\n".join(summary_lines)
    
    def is_expired(self) -> bool:
        """Check if the session has expired."""
        return datetime.utcnow() > self.expires_at


class ContextAssembler:
    """
    Assembles rich conversation context for Claude AI.
    
    Responsibilities:
    1. Manage conversation memory per session
    2. Detect follow-up patterns
    3. Build context prompts for Claude
    4. Track and inherit entities across turns
    """
    
    def __init__(self, max_sessions: int = 1000):
        self._sessions: Dict[str, ConversationMemory] = {}
        self._max_sessions = max_sessions
    
    def get_or_create_session(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        user_name: str = "Analyst"
    ) -> ConversationMemory:
        """Get existing session or create new one."""
        if session_id in self._sessions:
            memory = self._sessions[session_id]
            if not memory.is_expired():
                return memory
            # Expired - remove and create new
            del self._sessions[session_id]
        
        # Create new session
        memory = ConversationMemory(
            session_id=session_id,
            user_profile=UserProfile(
                user_id=user_id,
                name=user_name
            )
        )
        self._sessions[session_id] = memory
        
        # Cleanup old sessions if too many
        if len(self._sessions) > self._max_sessions:
            self._cleanup_expired_sessions()
        
        return memory
    
    def detect_follow_up(
        self,
        message: str,
        session_id: str\
    ) -> tuple[FollowUpType, Dict[str, Any]]:
        """
        Detect if the message is a follow-up and what type.
        
        Returns:
            Tuple of (FollowUpType, metadata dict with inherited entities)
        """
        memory = self._sessions.get(session_id)
        if not memory or not memory.turns:
            return FollowUpType.NONE, {}
        
        msg_lower = message.lower().strip()
        msg_clean = re.sub(r'[^\w\s\u0600-\u06FF]', '', msg_lower)
        
        # Detect language
        is_arabic = any('\u0600' <= c <= '\u06FF' for c in message)
        lang_key = "ar" if is_arabic else "en"
        
        # 1. Check confirmation patterns
        for pattern in CONFIRMATION_PATTERNS.get(lang_key, []):
            if re.match(pattern, msg_clean, re.IGNORECASE):
                return FollowUpType.CONFIRMATION, {
                    "inherited_entities": memory.active_entities.to_dict(),
                    "pending_action": memory.pending_suggestions[0] if memory.pending_suggestions else None
                }
        
        # 2. Check expansion patterns
        for pattern in EXPANSION_PATTERNS.get(lang_key, []):
            if re.search(pattern, msg_lower, re.IGNORECASE):
                return FollowUpType.EXPANSION, {
                    "inherited_entities": memory.active_entities.to_dict(),
                    "expand_topic": memory.get_last_intent()
                }
        
        # 3. Check pronoun references (short messages with pronouns)
        if len(message.split()) <= 6:
            for pattern in PRONOUN_PATTERNS.get(lang_key, []):
                if re.search(pattern, msg_lower, re.IGNORECASE):
                    return FollowUpType.PRONOUN_REFERENCE, {
                        "inherited_entities": memory.active_entities.to_dict()
                    }
        
        # 3.5 Check List References (Referring to previous screener results)
        if memory.get_last_intent() in ["SCREENER_DEEP", "SCREENER_VALUE", "SCREENER_GROWTH", "SECTOR_STOCKS", "TOP_GAINERS", "TOP_LOSERS"]:
            for pattern in LIST_REFERENCE_PATTERNS.get(lang_key, []):
                if re.search(pattern, msg_lower, re.IGNORECASE):
                     return FollowUpType.LIST_REFERENCE, {
                        "inherited_entities": memory.active_entities.to_dict(),
                        "refers_to": "last_results"
                    }
        
        # 4. Check if this is a topic shift with same entity
        if memory.active_entities.symbol:
            symbol = memory.active_entities.symbol.upper()
            if symbol not in message.upper():
                # No symbol mentioned - might be using context
                # Check against comprehensive topic shift keywords
                keywords = TOPIC_SHIFT_KEYWORDS.get(lang_key, [])
                if any(kw in msg_lower for kw in keywords):
                    return FollowUpType.TOPIC_SHIFT, {
                        "inherited_entities": memory.active_entities.to_dict(),
                        "detected_topic": next((kw for kw in keywords if kw in msg_lower), None)
                    }
        
        return FollowUpType.NONE, {}
    
    def build_context_for_claude(
        self,
        session_id: str,
        current_message: str,
        include_history: bool = True
    ) -> Dict[str, Any]:
        """
        Build rich context for Claude AI prompt.
        
        Returns dict with:
        - conversation_history: Summary of recent turns
        - active_entities: Current entities in context
        - user_profile: User preferences
        - follow_up_info: If this is a follow-up and what type
        - pending_suggestions: Previous suggestions not yet acted upon
        """
        memory = self.get_or_create_session(session_id)
        
        # Detect follow-up
        follow_up_type, follow_up_meta = self.detect_follow_up(current_message, session_id)
        
        context = {
            "session_id": session_id,
            "turn_count": len(memory.turns) + 1,
            "is_first_message": len(memory.turns) == 0,
            "user_name": memory.user_profile.name,
            "preferred_language": memory.user_profile.preferred_language,
            "active_entities": memory.active_entities.to_dict(),
            "pending_suggestions": memory.pending_suggestions,
            "follow_up": {
                "is_follow_up": follow_up_type != FollowUpType.NONE,
                "type": follow_up_type.value,
                "metadata": follow_up_meta
            }
        }
        
        if include_history and memory.turns:
            context["conversation_history"] = memory.get_conversation_summary(max_turns=5)
        
        return context
    
    def update_after_response(
        self,
        session_id: str,
        user_message: str,
        assistant_response: str,
        intent: str,
        entities: Dict[str, Any],
        language: str,
        suggestions: Optional[List[str]] = None
    ):
        """Update conversation memory after processing a response."""
        memory = self.get_or_create_session(session_id)
        
        # Add user turn
        memory.add_turn(
            role="user",
            content=user_message,
            intent=intent,
            entities=entities,
            language=language
        )
        
        # Add assistant turn
        memory.add_turn(
            role="assistant",
            content=assistant_response[:500],  # Truncate for memory
            intent=intent,
            language=language
        )
        
        # Update pending suggestions
        if suggestions:
            memory.pending_suggestions = suggestions
        else:
            memory.pending_suggestions = []
        
        logger.info(f"[ContextAssembler] Session {session_id}: {len(memory.turns)} turns, entities={memory.active_entities.to_dict()}")
    
    def _cleanup_expired_sessions(self):
        """Remove expired sessions."""
        expired = [
            sid for sid, mem in self._sessions.items()
            if mem.is_expired()
        ]
        for sid in expired:
            del self._sessions[sid]
        
        if expired:
            logger.info(f"[ContextAssembler] Cleaned up {len(expired)} expired sessions")


# Singleton instance
_context_assembler: Optional[ContextAssembler] = None


def get_context_assembler() -> ContextAssembler:
    """Get or create the global context assembler."""
    global _context_assembler
    if _context_assembler is None:
        _context_assembler = ContextAssembler()
    return _context_assembler
