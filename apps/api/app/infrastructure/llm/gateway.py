"""LLM gateway: provider selection, PII masking, graceful fallback.

- Selects a provider from configured API keys (Claude > Gemini > OpenAI order can
  be tuned per-agent later via DB settings — ADR-003).
- Masks every outbound prompt/system through the PII boundary (ADR-005).
- On missing key or provider error, returns the caller-supplied `fallback` text
  flagged `is_fallback=True`, so the platform degrades gracefully (never 500s on
  a quota/outage) — mirroring the legacy demo's mock fallback.
"""
from __future__ import annotations

from typing import Optional

from app.core.config import Settings, get_settings
from app.core.masking import mask_text
from app.infrastructure.llm.base import LLMProvider, LLMResult


class LLMGateway:
    def __init__(self, settings: Optional[Settings] = None) -> None:
        self._settings = settings or get_settings()
        self._provider = self._select_provider()

    def _select_provider(self) -> Optional[LLMProvider]:
        s = self._settings
        if s.anthropic_api_key:
            from app.infrastructure.llm.providers import AnthropicProvider

            return AnthropicProvider(s.anthropic_api_key)
        if s.gemini_api_key:
            from app.infrastructure.llm.providers import GeminiProvider

            return GeminiProvider(s.gemini_api_key)
        return None

    @property
    def provider_name(self) -> str:
        return self._provider.name if self._provider else "mock"

    async def generate(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        fallback: str = "",
        model: Optional[str] = None,
    ) -> LLMResult:
        # Hard PII boundary before anything leaves the process.
        masked_prompt, _ = mask_text(prompt)
        masked_system = mask_text(system)[0] if system else None

        if self._provider is None:
            return LLMResult(text=fallback, provider="mock", is_fallback=True)
        try:
            return await self._provider.generate(
                masked_prompt, system=masked_system, model=model
            )
        except Exception as exc:  # quota / network / SDK missing → graceful fallback
            return LLMResult(
                text=fallback, provider="mock", is_fallback=True, error=str(exc)
            )


_gateway: Optional[LLMGateway] = None


def get_gateway() -> LLMGateway:
    global _gateway
    if _gateway is None:
        _gateway = LLMGateway()
    return _gateway
