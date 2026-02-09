"""
Context Store - In-memory conversation state management.

Tracks conversation context for multi-turn interactions.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict
from .schemas import ConversationContext
import uuid


class ContextStore:
    """Manages conversation context with TTL."""
    
    def __init__(self, ttl_minutes: int = 30):
        self._store: Dict[str, ConversationContext] = {}
        self.ttl_minutes = ttl_minutes
    
    def get(self, session_id: str) -> Optional[ConversationContext]:
        """Get context for a session."""
        if session_id not in self._store:
            return None
        
        ctx = self._store[session_id]
        
        # Check expiry
        if datetime.utcnow() > ctx.expires_at:
            del self._store[session_id]
            return None
        
        return ctx
    
    def set(self, session_id: str, **kwargs) -> ConversationContext:
        """Update or create context for a session."""
        existing = self.get(session_id)
        
        if existing:
            # Update existing context - increment turn_count
            # Handle conversation_history append
            conversation_history = existing.conversation_history.copy() if existing.conversation_history else []
            if 'new_message' in kwargs:
                conversation_history.append(kwargs.pop('new_message'))
                # Keep only last 10 turns
                if len(conversation_history) > 10:
                    conversation_history = conversation_history[-10:]
            
            # Merge active_entities
            active_entities = existing.active_entities.copy() if existing.active_entities else {}
            if 'active_entities' in kwargs:
                active_entities.update(kwargs.pop('active_entities'))
            
            # Handle pending_suggestions
            pending_suggestions = kwargs.get('pending_suggestions', existing.pending_suggestions) or []
            
            updates = {
                'session_id': session_id,
                'last_symbol': kwargs.get('last_symbol', existing.last_symbol),
                'last_market': kwargs.get('last_market', existing.last_market),
                'last_intent': kwargs.get('last_intent', existing.last_intent),
                'last_range': kwargs.get('last_range', existing.last_range),
                'compare_symbols': kwargs.get('compare_symbols', existing.compare_symbols),
                'expires_at': datetime.utcnow() + timedelta(minutes=self.ttl_minutes),
                # Phase 1: Enhanced Session State
                'turn_count': existing.turn_count + 1,  # Increment on each set
                'greeting_shown': kwargs.get('greeting_shown', existing.greeting_shown),
                'last_greeting_category': kwargs.get('last_greeting_category', existing.last_greeting_category),
                'last_opening_used': kwargs.get('last_opening_used', existing.last_opening_used),
                'last_cards_shown': kwargs.get('last_cards_shown', existing.last_cards_shown),
                'user_name': kwargs.get('user_name', existing.user_name),
                'detected_language': kwargs.get('detected_language', existing.detected_language),
                # World-Class Context (NEW)
                'conversation_history': conversation_history,
                'active_entities': active_entities,
                'user_profile': kwargs.get('user_profile', existing.user_profile) or {},
                'pending_suggestions': pending_suggestions,
                'last_response_sentiment': kwargs.get('last_response_sentiment', existing.last_response_sentiment),
                'last_followup_type': kwargs.get('last_followup_type', existing.last_followup_type),
                'is_in_followup_chain': kwargs.get('is_in_followup_chain', existing.is_in_followup_chain),
            }
            ctx = ConversationContext(**updates)
        else:
            # Create new context
            ctx = ConversationContext(
                session_id=session_id,
                last_symbol=kwargs.get('last_symbol'),
                last_market=kwargs.get('last_market'),
                last_intent=kwargs.get('last_intent'),
                last_range=kwargs.get('last_range'),
                compare_symbols=kwargs.get('compare_symbols'),
                expires_at=datetime.utcnow() + timedelta(minutes=self.ttl_minutes),
                # Phase 1: Enhanced Session State (initialize)
                turn_count=1,  # First message
                greeting_shown=kwargs.get('greeting_shown', False),
                last_greeting_category=kwargs.get('last_greeting_category'),
                last_opening_used=kwargs.get('last_opening_used'),
                last_cards_shown=kwargs.get('last_cards_shown'),
                user_name=kwargs.get('user_name'),
                detected_language=kwargs.get('detected_language', 'en'),
                # World-Class Context (NEW) - Initialize empty
                conversation_history=[],
                active_entities={},
                user_profile={},
                pending_suggestions=[],
                last_response_sentiment='neutral',
                last_followup_type=None,
                is_in_followup_chain=False,
            )
        
        self._store[session_id] = ctx
        return ctx
    
    def delete(self, session_id: str):
        """Delete context for a session."""
        if session_id in self._store:
            del self._store[session_id]
    
    def cleanup(self):
        """Remove expired contexts."""
        now = datetime.utcnow()
        expired = [
            sid for sid, ctx in self._store.items()
            if now > ctx.expires_at
        ]
        for sid in expired:
            del self._store[sid]
    
    def generate_session_id(self) -> str:
        """Generate a new session ID."""
        return str(uuid.uuid4())


# Global context store instance
_context_store: Optional[ContextStore] = None


def get_context_store() -> ContextStore:
    """Get or create the global context store."""
    global _context_store
    if _context_store is None:
        _context_store = ContextStore()
    return _context_store
