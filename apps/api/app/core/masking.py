"""PII masking — safety net enforced before any outbound LLM/search payload.

The domain already passes only aggregated, de-identified data to the LLM layer
(ADR-005). This module is a hard boundary: it redacts anything that still looks
like PII so raw personal data can never leave the platform.
"""
from __future__ import annotations

import re

_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("email", re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")),
    ("phone", re.compile(r"\b01[016-9][-\s]?\d{3,4}[-\s]?\d{4}\b")),
    ("rrn", re.compile(r"\b\d{6}[-\s]?\d{7}\b")),  # 주민등록번호 형태
    ("card", re.compile(r"\b(?:\d[ -]?){13,16}\b")),
]

_REDACTED = "[REDACTED]"


def mask_text(text: str) -> tuple[str, int]:
    """Return (masked_text, redaction_count)."""
    if not text:
        return text, 0
    count = 0
    for _label, pattern in _PATTERNS:
        text, n = pattern.subn(_REDACTED, text)
        count += n
    return text, count
