import pytest
from openbounty.models import Page, Pagination
from openbounty.pagination import (
    AsyncItemIterator,
    AsyncPageIterator,
    SyncItemIterator,
    SyncPageIterator,
)


def test_sync_page_and_item_iterator() -> None:
    pages_store = {
        None: Page(
            data=["b1", "b2"],
            pagination=Pagination(next_cursor="cur_2", has_more=True),
        ),
        "cur_2": Page(
            data=["b3"],
            pagination=Pagination(next_cursor=None, has_more=False),
        ),
    }

    def fetch_page(cursor: str | None) -> Page[str]:
        return pages_store[cursor]

    page_iter = SyncPageIterator(fetch_page)
    pages = list(page_iter)
    assert len(pages) == 2
    assert pages[0].data == ["b1", "b2"]
    assert pages[1].data == ["b3"]

    item_iter = SyncItemIterator(fetch_page)
    items = list(item_iter)
    assert items == ["b1", "b2", "b3"]


@pytest.mark.anyio
async def test_async_page_and_item_iterator() -> None:
    pages_store = {
        None: Page(
            data=["b1", "b2"],
            pagination=Pagination(next_cursor="cur_2", has_more=True),
        ),
        "cur_2": Page(
            data=["b3"],
            pagination=Pagination(next_cursor=None, has_more=False),
        ),
    }

    async def fetch_page(cursor: str | None) -> Page[str]:
        return pages_store[cursor]

    page_iter = AsyncPageIterator(fetch_page)
    pages: list[Page[str]] = []
    async for p in page_iter:
        pages.append(p)
    assert len(pages) == 2

    item_iter = AsyncItemIterator(fetch_page)
    items: list[str] = []
    async for item in item_iter:
        items.append(item)
    assert items == ["b1", "b2", "b3"]
