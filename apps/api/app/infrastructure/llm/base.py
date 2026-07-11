"""LLM provider abstraction (vendor-neutral)."""
from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Optional


@dataclass
class LLMResult:
    text: str
    provider: str
    model: Optional[str] = None
    is_fallback: bool = False
    tokens_in: int = 0
    tokens_out: int = 0
    error: Optional[str] = None


class LLMProvider(abc.ABC):
    name: str = "base"

    @abc.abstractmethod
    async def generate(
        self, prompt: str, *, system: Optional[str] = None, model: Optional[str] = None
    ) -> LLMResult:
        ...
