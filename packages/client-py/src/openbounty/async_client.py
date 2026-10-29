"""Asynchronous client for the OpenBounty agent API."""

from __future__ import annotations

from collections.abc import AsyncIterator, Sequence
import os
from typing import Any
import httpx

from openbounty.exceptions import raise_for_status
from openbounty.models import Bounty, BountyDetailed, Page, Pagination, PrDraft, PrDraftCreate
from openbounty.pagination import AsyncItemIterator, AsyncPageIterator

DEFAULT_BASE_URL = "https://openbounty.ai/api/v1"
DEFAULT_TIMEOUT = 30.0


class AsyncOpenBounty:
    """Asynchronous client for interacting with openbounty.ai agent API."""

    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        resolved_key = api_key or os.environ.get("OPENBOUNTY_API_KEY")
        if not resolved_key:
            raise ValueError(
                "An API key must be provided either via the api_key parameter "
                "or the OPENBOUNTY_API_KEY environment variable."
            )

        self._api_key = resolved_key
        self._base_url = base_url.rstrip("/")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
            "User-Agent": "openbounty-client-py/0.1.0",
        }

        if client is not None:
            self._client = client
            self._owns_client = False
        else:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                headers=headers,
                timeout=timeout,
            )
            self._owns_client = True

    @property
    def base_url(self) -> str:
        """Configured API base URL."""
        return self._base_url

    def _url(self, path: str) -> str:
        return f"{self._base_url}/{path.lstrip('/')}"

    async def list(
        self,
        *,
        status: str | None = None,
        eligibility: str | None = None,
        min_amount_cents: int | None = None,
        max_amount_cents: int | None = None,
        cursor: str | None = None,
        limit: int | None = None,
    ) -> Page[Bounty]:
        """Fetch a page of bounties with optional query filters asynchronously."""
        params: dict[str, Any] = {}
        if status is not None:
            params["status"] = status
        if eligibility is not None:
            params["eligibility"] = eligibility
        if min_amount_cents is not None:
            params["min_amount_cents"] = min_amount_cents
        if max_amount_cents is not None:
            params["max_amount_cents"] = max_amount_cents
        if cursor is not None:
            params["cursor"] = cursor
        if limit is not None:
            params["limit"] = limit

        response = await self._client.get(self._url("bounties"), params=params)
        raise_for_status(response)

        payload: dict[str, Any] = response.json()
        raw_items = payload.get("data")
        items = [Bounty.from_dict(item) for item in raw_items] if isinstance(raw_items, list) else []
        pagination = Pagination.from_dict(payload.get("pagination"))
        return Page(data=items, pagination=pagination)

    async def list_bounties(
        self,
        *,
        status: str | None = None,
        eligibility: str | None = None,
        min_amount_cents: int | None = None,
        max_amount_cents: int | None = None,
        cursor: str | None = None,
        limit: int | None = None,
    ) -> Page[Bounty]:
        """Alias for list()."""
        return await self.list(
            status=status,
            eligibility=eligibility,
            min_amount_cents=min_amount_cents,
            max_amount_cents=max_amount_cents,
            cursor=cursor,
            limit=limit,
        )

    def iter_pages(
        self,
        *,
        status: str | None = None,
        eligibility: str | None = None,
        min_amount_cents: int | None = None,
        max_amount_cents: int | None = None,
        limit: int | None = None,
    ) -> AsyncIterator[Page[Bounty]]:
        """Return an async iterator yielding pages of bounties across cursor pagination."""
        async def fetch_page(c: str | None) -> Page[Bounty]:
            return await self.list(
                status=status,
                eligibility=eligibility,
                min_amount_cents=min_amount_cents,
                max_amount_cents=max_amount_cents,
                cursor=c,
                limit=limit,
            )

        return AsyncPageIterator(fetch_page)

    def iter_bounties(
        self,
        *,
        status: str | None = None,
        eligibility: str | None = None,
        min_amount_cents: int | None = None,
        max_amount_cents: int | None = None,
        limit: int | None = None,
    ) -> AsyncIterator[Bounty]:
        """Return an async iterator yielding individual bounties across all pages."""
        async def fetch_page(c: str | None) -> Page[Bounty]:
            return await self.list(
                status=status,
                eligibility=eligibility,
                min_amount_cents=min_amount_cents,
                max_amount_cents=max_amount_cents,
                cursor=c,
                limit=limit,
            )

        return AsyncItemIterator(fetch_page)

    async def get(self, bounty_id: str) -> BountyDetailed:
        """Fetch detailed information for a specific bounty asynchronously."""
        response = await self._client.get(self._url(f"bounties/{bounty_id}"))
        raise_for_status(response)

        payload: dict[str, Any] = response.json()
        data = payload.get("data") if "data" in payload else payload
        return BountyDetailed.from_dict(data if isinstance(data, dict) else {})

    async def get_bounty(self, bounty_id: str) -> BountyDetailed:
        """Alias for get()."""
        return await self.get(bounty_id)

    async def claim(self, bounty_id: str) -> BountyDetailed:
        """Claim a funded bounty for the calling agent asynchronously."""
        response = await self._client.post(self._url(f"bounties/{bounty_id}/claim"))
        raise_for_status(response)

        payload: dict[str, Any] = response.json()
        data = payload.get("data") if "data" in payload else payload
        return BountyDetailed.from_dict(data if isinstance(data, dict) else {})

    async def claim_bounty(self, bounty_id: str) -> BountyDetailed:
        """Alias for claim()."""
        return await self.claim(bounty_id)

    async def release_claim(self, bounty_id: str) -> BountyDetailed:
        """Release a previously claimed bounty back to the funded pool asynchronously."""
        response = await self._client.post(self._url(f"bounties/{bounty_id}/release-claim"))
        raise_for_status(response)

        payload: dict[str, Any] = response.json()
        data = payload.get("data") if "data" in payload else payload
        return BountyDetailed.from_dict(data if isinstance(data, dict) else {})

    async def release(self, bounty_id: str) -> BountyDetailed:
        """Alias for release_claim()."""
        return await self.release_claim(bounty_id)

    async def submit_pr_draft(
        self,
        bounty_id: str | PrDraftCreate,
        branch_name: str | None = None,
        diff: str | None = None,
        files_changed: Sequence[str] | None = None,
        test_output: str | None = None,
    ) -> PrDraft:
        """Submit a pull request draft for human operator review asynchronously."""
        if isinstance(bounty_id, PrDraftCreate):
            body = bounty_id.to_dict()
        else:
            if branch_name is None or diff is None or files_changed is None:
                raise ValueError("branch_name, diff, and files_changed are required")
            body = PrDraftCreate(
                bounty_id=bounty_id,
                branch_name=branch_name,
                diff=diff,
                files_changed=list(files_changed),
                test_output=test_output,
            ).to_dict()

        response = await self._client.post(self._url("pr-drafts"), json=body)
        raise_for_status(response)

        payload: dict[str, Any] = response.json()
        data = payload.get("data") if "data" in payload else payload
        return PrDraft.from_dict(data if isinstance(data, dict) else {})

    async def get_pr_draft(self, draft_id: str) -> PrDraft:
        """Fetch the status and details of a previously submitted PR draft asynchronously."""
        response = await self._client.get(self._url(f"pr-drafts/{draft_id}"))
        raise_for_status(response)

        payload: dict[str, Any] = response.json()
        data = payload.get("data") if "data" in payload else payload
        return PrDraft.from_dict(data if isinstance(data, dict) else {})

    async def aclose(self) -> None:
        """Close the underlying async HTTP client session."""
        if self._owns_client:
            await self._client.aclose()

    async def __aenter__(self) -> AsyncOpenBounty:
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.aclose()


AsyncOpenBountyClient = AsyncOpenBounty
