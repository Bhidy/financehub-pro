"""
Multi-Provider LLM Client
==========================
Provides resilient LLM access with automatic failover between providers.
Supports: Groq, Cerebras, Mistral, Together AI

Strategy:
1. Try primary provider (Groq)
2. If rate limited or failed, try next provider
3. Cycle through all providers before giving up
"""

import os
import logging
import asyncio
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import httpx

logger = logging.getLogger(__name__)

@dataclass
class LLMProvider:
    name: str
    base_url: str
    api_key: str
    models: List[str]
    timeout: float = 5.0
    
    def is_available(self) -> bool:
        return bool(self.api_key)

# Provider configurations
def get_providers() -> List[LLMProvider]:
    """Get all configured providers in priority order."""
    providers = []
    
    # Priority 1: Groq (fastest inference)
    if groq_key := os.environ.get("GROQ_API_KEY"):
        providers.append(LLMProvider(
            name="groq",
            base_url="https://api.groq.com/openai/v1",
            api_key=groq_key,
            models=["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-8b-8192"],
            timeout=5.0
        ))
    
    # Priority 2: Cerebras (generous free tier: 14,400 RPD)
    if cerebras_key := os.environ.get("CEREBRAS_API_KEY"):
        providers.append(LLMProvider(
            name="cerebras",
            base_url="https://api.cerebras.ai/v1",
            api_key=cerebras_key,
            models=["llama3.1-8b"],
            timeout=8.0
        ))
    
    # Priority 3: Mistral (1B tokens/month free)
    if mistral_key := os.environ.get("MISTRAL_API_KEY"):
        providers.append(LLMProvider(
            name="mistral",
            base_url="https://api.mistral.ai/v1",
            api_key=mistral_key,
            models=["mistral-small-latest", "open-mistral-7b"],
            timeout=8.0
        ))
    
    # Priority 4: Together AI ($25 free credits)
    if together_key := os.environ.get("TOGETHER_API_KEY"):
        providers.append(LLMProvider(
            name="together",
            base_url="https://api.together.xyz/v1",
            api_key=together_key,
            models=["meta-llama/Llama-3.2-3B-Instruct-Turbo", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"],
            timeout=10.0
        ))
    
    # Priority 5: OpenRouter (50 RPD free)
    if openrouter_key := os.environ.get("OPENROUTER_API_KEY"):
        providers.append(LLMProvider(
            name="openrouter",
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_key,
            models=["meta-llama/llama-3.2-3b-instruct:free", "google/gemma-2-9b-it:free"],
            timeout=10.0
        ))
    
    return providers


class MultiProviderLLM:
    """
    Resilient LLM client that automatically fails over between providers.
    """
    
    def __init__(self):
        self.providers = get_providers()
        self._last_successful_provider: Optional[str] = None
        logger.info(f"Multi-Provider LLM initialized with {len(self.providers)} providers: {[p.name for p in self.providers]}")
    
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
            model_override: Specific model to use (e.g. "llama-3.1-8b-instant")
        
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
            
            # If override requested and this provider supports it (or just try it)
            # For Groq, we trust the override exists if valid
            if model_override and provider.name == "groq":
                models_to_try = [model_override] + [m for m in provider.models if m != model_override]

            # Try each model in the provider
            for model in models_to_try:
                try:
                    result = await self._call_provider(
                        provider, model, messages, max_tokens, temperature
                    )
                    if result:
                        if provider.name != "groq" or model != provider.models[0]:
                            logger.info(f"✅ [{purpose}] Fallback/Override using {provider.name}/{model}")
                        self._last_successful_provider = provider.name
                        return result
                        
                except Exception as e:
                    error_str = str(e)
                    if "429" in error_str or "rate" in error_str.lower():
                        logger.warning(f"⚠️ [{purpose}] Rate limit on {provider.name}/{model}")
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
        
        headers = {
            "Authorization": f"Bearer {provider.api_key}",
            "Content-Type": "application/json"
        }
        
        # OpenRouter requires extra headers
        if provider.name == "openrouter":
            headers["HTTP-Referer"] = "https://finhub-pro.vercel.app"
            headers["X-Title"] = "Starta AI"
        
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
            
            response.raise_for_status()
            data = response.json()
            
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return content.strip() if content else None
    
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
