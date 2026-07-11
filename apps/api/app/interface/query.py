"""Helpers for translating list query params into SQLAlchemy clauses."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import Select


def apply_sort(stmt: Select, sort: Optional[str], allowed: dict, default_col) -> Select:
    """Apply `sort` (`field` asc / `-field` desc) restricted to `allowed` columns."""
    if not sort:
        return stmt.order_by(default_col)
    desc = sort.startswith("-")
    field = sort[1:] if desc else sort
    col = allowed.get(field)
    if col is None:
        return stmt.order_by(default_col)
    return stmt.order_by(col.desc() if desc else col.asc())
