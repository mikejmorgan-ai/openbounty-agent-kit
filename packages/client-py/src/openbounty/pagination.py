"""Pagination iterators for sync and async OpenBounty clients."""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable, Iterator
from typing import Generic, TypeVar

from openbounty.models import Page

T = TypeVar("T")


class SyncPageIterator(Iterator[Page[T]], Generic[T]):
    """Iterator yielding pages of items synchronously."""

    def __init__(self, fetch_page: Callable[[str | None], Page[T]]) -> None:
        self._fetch_page = fetch_page
        self._next_cursor: str | None = None
        self._started = False
        self._has_more = True

    def __iter__(self) -> SyncPageIterator[T]:
        return self

    def __next__(self) -> Page[T]:
        if self._started and (not self._has_more or not self._next_cursor):
            raise StopIteration

        page = self._fetch_page(self._next_cursor if self._started else None)
        self._started = True
        self._has_more = page.pagination.has_more
        self._next_cursor = page.pagination.next_cursor
        return page


class SyncItemIterator(Iterator[T], Generic[T]):
    """Iterator yielding individual items across all pages synchronously."""

    def __init__(self, fetch_page: Callable[[str | None], Page[T]]) -> None:
        self._page_iter = SyncPageIterator(fetch_page)
        self._current_items: Iterator[T] = iter([])

    def __iter__(self) -> SyncItemIterator[T]:
        return self

    def __next__(self) -> T:
        while True:
            try:
                return next(self._current_items)
            except StopIteration:
                page = next(self._page_iter)
                self._current_items = iter(page.data)


class AsyncPageIterator(AsyncIterator[Page[T]], Generic[T]):
    """Iterator yielding pages of items asynchronously."""

    def __init__(self, fetch_page: Callable[[str | None], Awaitable[Page[T]]]) -> None:
        self._fetch_page = fetch_page
        self._next_cursor: str | None = None
        self._started = False
        self._has_more = True

    def __aiter__(self) -> AsyncPageIterator[T]:
        return self

    async def __anext__(self) -> Page[T]:
        if self._started and (not self._has_more or not self._next_cursor):
            raise StopAsyncIteration

        page = await self._fetch_page(self._next_cursor if self._started else None)
        self._started = True
        self._has_more = page.pagination.has_more
        self._next_cursor = page.pagination.next_cursor
        return page


class AsyncItemIterator(AsyncIterator[T], Generic[T]):
    """Iterator yielding individual items across all pages asynchronously."""

    def __init__(self, fetch_page: Callable[[str | None], Awaitable[Page[T]]]) -> None:
        self._page_iter = AsyncPageIterator(fetch_page)
        self._current_items: Iterator[T] = iter([])

    def __aiter__(self) -> AsyncItemIterator[T]:
        return self

    async def __anext__(self) -> T:
        while True:
            try:
                return next(self._current_items)
            except StopIteration:
                page = await self._page_iter.__anext__()
                self._current_items = iter(page.data)
