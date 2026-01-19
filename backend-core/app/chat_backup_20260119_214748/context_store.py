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
            # Update existing context
            updates = {
                'session_id': session_id,
                'last_symbol': kwargs.get('last_symbol', existing.last_symbol),
                'last_market': kwargs.get('last_market', existing.last_market),
                'last_intent': kwargs.get('last_intent', existing.last_intent),
                'last_range': kwargs.get('last_range', existing.last_range),
                'compare_symbols': kwargs.get('compare_symbols', existing.compare_symbols),
                'expires_at': datetime.utcnow() + timedelta(minutes=self.ttl_minutes)
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
                expires_at=datetime.utcnow() + timedelta(minutes=self.ttl_minutes)
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
