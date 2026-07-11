"""Common schemas: pagination envelope & query params."""
from typing import Generic, Optional, TypeVar

from fastapi import Query
from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int


class PageParams:
    """Reusable list query params (search/sort/pagination)."""

    def __init__(
        self,
        q: Optional[str] = Query(None, description="free-text search"),
        sort: Optional[str] = Query(None, description="field or -field for desc"),
        page: int = Query(1, ge=1),
        size: int = Query(20, ge=1, le=200),
    ) -> None:
        self.q = q
        self.sort = sort
        self.page = page
        self.size = size
