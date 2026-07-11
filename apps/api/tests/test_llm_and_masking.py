"""Unit tests for PII masking and the LLM gateway fallback."""
from __future__ import annotations

import asyncio

from app.core.config import Settings
from app.core.masking import mask_text
from app.infrastructure.llm.gateway import LLMGateway


def test_masking_redacts_pii():
    text = "문의: hong@example.com, 010-1234-5678, 주민 900101-1234567"
    masked, count = mask_text(text)
    assert "example.com" not in masked
    assert "1234-5678" not in masked
    assert "900101" not in masked
    assert count >= 3


def test_masking_leaves_clean_text():
    masked, count = mask_text("워터파크 캠페인 ROI 800%")
    assert count == 0
    assert masked == "워터파크 캠페인 ROI 800%"


def test_gateway_no_key_uses_fallback():
    gw = LLMGateway(Settings(anthropic_api_key=None, gemini_api_key=None, openai_api_key=None))
    assert gw.provider_name == "mock"
    res = asyncio.run(gw.generate("prompt", fallback="FALLBACK-TEXT"))
    assert res.is_fallback is True
    assert res.text == "FALLBACK-TEXT"


def test_gateway_missing_sdk_falls_back_with_error():
    # key present but SDK not installed → error path returns fallback
    gw = LLMGateway(Settings(gemini_api_key="dummy-key"))
    assert gw.provider_name == "gemini"
    res = asyncio.run(gw.generate("prompt", fallback="FB"))
    assert res.is_fallback is True
    assert res.text == "FB"
    assert res.error is not None
