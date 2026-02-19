"""
Multi-Provider LLM Client (Restored)
=====================================
Provides resilient LLM access with automatic failover between providers.
Priority: Groq → Cerebras → Mistral → Anthropic (Claude)

Strategy:
1. Try primary provider (Groq - fastest, free tier)
2. If rate limited or failed, try Cerebras
3. If Cerebras fails, try Mistral
4. Final fallback to Anthropic Claude (paid)
5. Only give up after ALL providers exhausted
"""

import os
import logging
import asyncio
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class LLMProvider:
    name: str
    base_url: str
    api_key: str
    models: List[str]
    timeout: float = 8.0
    
    def is_available(self) -> bool:
        return bool(self.api_key)

# Provider configurations
def get_providers() -> List[LLMProvider]:
    """Get all configured providers in priority order.
    
    Priority:
    1. Groq (fastest inference, 100K tokens/day free)
    2. Cerebras (fast, 14400 requests/day)
    3. Mistral (reliable, 1B tokens/month)
    4. Anthropic Claude (paid unlimited, highest quality but currently 400 errors)
    """
    providers = []
    
    # PRIMARY: Groq (fastest inference)
    if groq_key := settings.GROQ_API_KEY:
        providers.append(LLMProvider(
            name="groq",
            base_url="https://api.groq.com/openai/v1",
            api_key=groq_key,
            models=["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
            timeout=8.0
        ))
    
    # FALLBACK 1: Cerebras (fast inference)
    if cerebras_key := settings.CEREBRAS_API_KEY:
        providers.append(LLMProvider(
            name="cerebras",
            base_url="https://api.cerebras.ai/v1",
            api_key=cerebras_key,
            models=["llama3.1-8b"],
            timeout=8.0
        ))
    
    # FALLBACK 2: Mistral (reliable)
    if mistral_key := settings.MISTRAL_API_KEY:
        providers.append(LLMProvider(
            name="mistral",
            base_url="https://api.mistral.ai/v1",
            api_key=mistral_key,
            models=["mistral-small-latest"],
            timeout=10.0
        ))
    
    # FALLBACK 3: Anthropic Claude (paid, highest quality)
    if anthropic_key := settings.ANTHROPIC_API_KEY:
        providers.append(LLMProvider(
            name="anthropic",
            base_url="https://api.anthropic.com/v1",
            api_key=anthropic_key,
            models=["claude-3-5-sonnet-20241022"],
            timeout=12.0
        ))
    
    return providers


class MultiProviderLLM:
    """
    Resilient LLM client that automatically fails over between providers.
    """
    
    def __init__(self):
        self.providers = get_providers()
        self._last_successful_provider: Optional[str] = None
        provider_names = [p.name for p in self.providers]
        logger.info(f"Multi-Provider LLM initialized with {len(self.providers)} providers: {provider_names}")
    
    async def complete(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 250,
        temperature: float = 0.5,
        purpose: str = "narrative",
        model_override: Optional[str] = None
    ) -> Optional[str]:
        """
        Make a chat completion request with automatic failover.
        
        Args:
            messages: List of {"role": "system"|"user"|"assistant", "content": "..."}
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            purpose: For logging ("narrative", "paraphrase", etc.)
            model_override: Specific model to use
        
        Returns:
            Generated text or None if all providers fail
        """
        if not self.providers:
            logger.error("No LLM providers configured! Check API keys.")
            return None
        
        # Try each provider in order
        for provider in self.providers:
            if not provider.is_available():
                continue
                
            # Determine models to try for this provider
            models_to_try = provider.models
            
            # If override requested and this provider supports it
            if model_override and provider.name == "groq":
                models_to_try = [model_override] + [m for m in provider.models if m != model_override]

            # Try each model in the provider
            for model in models_to_try:
                try:
                    result = await self._call_provider(
                        provider, model, messages, max_tokens, temperature
                    )
                    if result:
                        if provider.name != self._last_successful_provider:
                            logger.info(f"✅ [{purpose}] Using {provider.name}/{model}")
                        self._last_successful_provider = provider.name
                        return result
                        
                except Exception as e:
                    error_str = str(e)
                    if "429" in error_str or "rate" in error_str.lower():
                        logger.warning(f"⚠️ [{purpose}] Rate limit on {provider.name}/{model}, trying next...")
                    else:
                        logger.warning(f"⚠️ [{purpose}] Error on {provider.name}/{model}: {e}")
                    continue
        
        logger.error(f"❌ [{purpose}] All LLM providers exhausted!")
        return None
    
    async def _call_provider(
        self,
        provider: LLMProvider,
        model: str,
        messages: List[Dict[str, str]],
        max_tokens: int,
        temperature: float
    ) -> Optional[str]:
        """Make the actual API call to a provider."""
        
        # Handle Anthropic (Claude) separately - different API format
        if provider.name == "anthropic":
            return await self._call_anthropic(provider, model, messages, max_tokens, temperature)
        
        headers = {
            "Authorization": f"Bearer {provider.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        async with httpx.AsyncClient(timeout=provider.timeout) as client:
            response = await client.post(
                f"{provider.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 429:
                raise Exception(f"429 Rate Limit Exceeded")
            
            if response.status_code != 200:
                body = response.text[:200]
                raise Exception(f"{response.status_code}: {body}")
            
            data = response.json()
            
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return content.strip() if content else None
    
    async def _call_anthropic(
        self,
        provider: LLMProvider,
        model: str,
        messages: List[Dict[str, str]],
        max_tokens: int,
        temperature: float
    ) -> Optional[str]:
        """
        Call Anthropic's Claude API with proper format.
        Claude uses /v1/messages with different request structure.
        """
        headers = {
            "x-api-key": provider.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        # Extract system message if present (Claude wants it separate)
        system_content = None
        user_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_content = msg["content"]
            else:
                user_messages.append(msg)
        
        # Ensure at least one user message exists
        if not user_messages:
            user_messages = [{"role": "user", "content": "Analyze this data."}]
        
        payload = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": user_messages
        }
        
        # Add system message if present
        if system_content:
            payload["system"] = system_content
        
        async with httpx.AsyncClient(timeout=provider.timeout) as client:
            response = await client.post(
                f"{provider.base_url}/messages",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 429:
                raise Exception(f"429 Rate Limit Exceeded")
            
            if response.status_code != 200:
                # Log the actual error body for debugging
                error_body = response.text[:300]
                logger.error(f"[Anthropic] {response.status_code} error body: {error_body}")
                raise Exception(f"{response.status_code}: {error_body}")
            
            data = response.json()
            
            # Claude returns content array with text blocks
            content_blocks = data.get("content", [])
            if content_blocks and len(content_blocks) > 0:
                text_content = content_blocks[0].get("text", "")
                return text_content.strip() if text_content else None
            return None
    
    def get_status(self) -> Dict[str, Any]:
        """Get provider status for debugging."""
        return {
            "providers": [
                {"name": p.name, "available": p.is_available(), "models": p.models}
                for p in self.providers
            ],
            "last_successful": self._last_successful_provider
        }


# Singleton
_multi_llm: Optional[MultiProviderLLM] = None

def get_multi_llm() -> MultiProviderLLM:
    global _multi_llm
    if _multi_llm is None:
        _multi_llm = MultiProviderLLM()
    return _multi_llm
