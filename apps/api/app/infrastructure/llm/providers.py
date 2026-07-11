"""Concrete LLM providers. Imported lazily so missing SDKs never break startup."""
from __future__ import annotations

from typing import Optional

from app.infrastructure.llm.base import LLMProvider, LLMResult


class GeminiProvider(LLMProvider):
    name = "gemini"

    def __init__(self, api_key: str, default_model: str = "gemini-2.5-flash") -> None:
        self._api_key = api_key
        self._default_model = default_model

    async def generate(
        self, prompt: str, *, system: Optional[str] = None, model: Optional[str] = None
    ) -> LLMResult:
        from google import genai  # lazy import

        client = genai.Client(api_key=self._api_key)
        contents = f"{system}\n\n{prompt}" if system else prompt
        resp = await client.aio.models.generate_content(
            model=model or self._default_model, contents=contents
        )
        return LLMResult(text=resp.text or "", provider=self.name, model=model or self._default_model)


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self, api_key: str, default_model: str = "claude-sonnet-5") -> None:
        self._api_key = api_key
        self._default_model = default_model

    async def generate(
        self, prompt: str, *, system: Optional[str] = None, model: Optional[str] = None
    ) -> LLMResult:
        from anthropic import AsyncAnthropic  # lazy import

        client = AsyncAnthropic(api_key=self._api_key)
        msg = await client.messages.create(
            model=model or self._default_model,
            max_tokens=4096,
            system=system or "",
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(block.text for block in msg.content if getattr(block, "type", "") == "text")
        return LLMResult(
            text=text, provider=self.name, model=model or self._default_model,
            tokens_in=getattr(msg.usage, "input_tokens", 0),
            tokens_out=getattr(msg.usage, "output_tokens", 0),
        )
