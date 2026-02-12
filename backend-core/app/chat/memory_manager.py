
import logging
import json
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.config import settings
import asyncpg

logger = logging.getLogger(__name__)

class MemoryManager:
    """
    Manages long-term user memory using Vector Search.
    Stores and retrieves memories to provide personalized context.
    
    Attributes:
        embedding_dim (int): 1536 (OpenAI standard)
    """
    
    EMBEDDING_DIM = 1536
    
    @classmethod
    async def get_embedding(cls, text: str) -> List[float]:
        """
        Generate embedding for text using OpenAI (or fallback).
        """
        # 1. Try OpenAI if key exists
        if settings.OPENAI_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        "https://api.openai.com/v1/embeddings",
                        headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                        json={
                            "input": text,
                            "model": "text-embedding-3-small" # Efficient model
                        }
                    )
                    response.raise_for_status()
                    data = response.json()
                    return data['data'][0]['embedding']
            except Exception as e:
                logger.error(f"OpenAI Embedding failed: {e}")
        
        # 2. Fallback (Deterministic dummy vector for Dev/Test)
        # We return a vector of zeros to allow the DB operation to succeed.
        logger.warning("⚠️ Using DUMMY embedding (No OpenAI Key or API failed).")
        return [0.0] * cls.EMBEDDING_DIM

    @classmethod
    async def add_memory(
        cls, 
        conn: asyncpg.Connection, 
        user_id: int, 
        content: str, 
        memory_type: str = "interaction",
        session_id: Optional[str] = None,
        metadata: Dict[str, Any] = {}
    ) -> bool:
        """
        Store a new memory with embedding.
        """
        if not user_id or not content:
            return False
            
        try:
            # 1. Generate Vector
            vector = await cls.get_embedding(content)
            
            # 2. Determine Embedding Format
            # If postgres has vector extension, use string repr. If jsonb, use list.
            # We'll need to know which schema is active.
            # For robustness, we check the column type or try/catch.
            # But query parameter handling differs.
            
            # We will rely on asyncpg's ability to handle lists if we cast to vector in SQL
            # OR pass as string format for valid vector input: "[0.1, 0.2, ...]"
            
            # Let's try to detect if we are in fallback JSON mode or Vector mode
            # A simple way is to pass strict SQL based on environment, but we don't know the DB state easily here.
            # We'll try to insert as a standard vector format string.
            
            # string format "[x,y,z]" works for both JSONB and vector input in SQL usually
            vector_str = str(vector) 
            
            await conn.execute("""
                INSERT INTO user_memories (user_id, session_id, memory_type, content, embedding, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, user_id, session_id, memory_type, content, vector_str, json.dumps(metadata))
            
            logger.info(f"💾 Memory stored for User {user_id}: {content[:50]}...")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add memory: {e}")
            return False

    @classmethod
    async def retrieve_relevant_memories(
        cls, 
        conn: asyncpg.Connection, 
        user_id: int, 
        query: str, 
        limit: int = 3,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Retrieve top-k relevant memories for the user.
        """
        if not user_id or not query:
            return []
            
        try:
            query_vector = await cls.get_embedding(query)
            query_vector_str = str(query_vector)
            
            # Check if using pgvector by inspecting table (naive check or assumed)
            # We will use a flexible query that attempts vector syntax
            # The operator <-> is for L2 distance, <=> for cosine distance.
            # We prefer cosine distance for text embeddings. 
            # Note: For OpenAI embeddings (normalized), L2 is equivalent to Cosine rank.
            
            # Since we have a potential JSONB fallback, we can't use `<=>` operator directly.
            # This is tricky. 
            
            # STRATEGY: 
            # 1. Try Vector query.
            # 2. If it fails (operator does not exist), fallback to simple "recent memories" (no semantic search).
            
            try:
                rows = await conn.fetch("""
                    SELECT content, created_at, 1 - (embedding <=> $1) as similarity
                    FROM user_memories
                    WHERE user_id = $2
                    ORDER BY embedding <=> $1
                    LIMIT $3
                """, query_vector_str, user_id, limit)
                
                # Filter by threshold
                return [dict(r) for r in rows if r['similarity'] >= threshold]
                
            except asyncpg.UndefinedFunctionError:
                # pgvector operator <=> not found. Fallback to latest.
                logger.warning("⚠️ pgvector retrieval failed (extension missing?). Falling back to recency.")
                rows = await conn.fetch("""
                    SELECT content, created_at, 1.0 as similarity
                    FROM user_memories
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    LIMIT $2
                """, user_id, limit)
                return [dict(r) for r in rows]
                
        except Exception as e:
            logger.error(f"Memory retrieval failed: {e}")
            return []

    @classmethod
    def format_memories_for_prompt(cls, memories: List[Dict[str, Any]]) -> str:
        """Helper to format memories into a context string."""
        if not memories:
            return ""
            
        text = "PREVIOUS USER CONTEXT:\n"
        for m in memories:
            date_str = m['created_at'].strftime("%Y-%m-%d") if isinstance(m['created_at'], datetime) else "Prior"
            text += f"- [{date_str}] {m['content']}\n"
        return text
