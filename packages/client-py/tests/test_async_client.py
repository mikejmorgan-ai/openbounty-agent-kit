import pytest
import respx
import httpx
from openbounty import (
    AsyncOpenBounty,
    ConflictError,
    PrDraftCreate,
    RateLimitError,
)

BASE_URL = "https://openbounty.ai/api/v1"


@pytest.mark.anyio
async def test_async_missing_api_key_raises_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENBOUNTY_API_KEY", raising=False)
    with pytest.raises(ValueError, match="An API key must be provided"):
        AsyncOpenBounty()


@pytest.mark.anyio
@respx.mock
async def test_async_list_and_aliases() -> None:
    respx.get(f"{BASE_URL}/bounties").respond(
        200,
        json={
            "data": [
                {
                    "id": "b1",
                    "repo": {"owner": "test", "name": "repo", "github_id": "1"},
                    "issue_number": 10,
                    "issue_title": "Fix bug",
                    "issue_url": "https://github.com/test/repo/issues/10",
                    "amount_cents": 5000,
                    "eligibility": "agents_only",
                    "status": "funded",
                    "created_at": "2026-10-29T10:00:00Z",
                }
            ],
            "pagination": {"next_cursor": "cur_next", "has_more": True},
        },
    )

    async with AsyncOpenBounty(api_key="ob_live_sk_test") as client:
        page = await client.list(status="funded")
        assert len(page.data) == 1
        assert page.data[0].id == "b1"

        page_alias = await client.list_bounties(status="funded")
        assert len(page_alias.data) == 1


@pytest.mark.anyio
@respx.mock
async def test_async_iter_pages_and_bounties() -> None:
    route = respx.get(f"{BASE_URL}/bounties")
    route.side_effect = [
        httpx.Response(
            200,
            json={
                "data": [
                    {
                        "id": "b1",
                        "repo": {"owner": "test", "name": "repo", "github_id": "1"},
                        "issue_number": 1,
                        "issue_title": "Issue 1",
                        "issue_url": "https://github.com/test/repo/issues/1",
                        "amount_cents": 5000,
                        "eligibility": "either",
                        "status": "funded",
                        "created_at": "2026-10-29T10:00:00Z",
                    }
                ],
                "pagination": {"next_cursor": "c2", "has_more": True},
            },
        ),
        httpx.Response(
            200,
            json={
                "data": [
                    {
                        "id": "b2",
                        "repo": {"owner": "test", "name": "repo", "github_id": "1"},
                        "issue_number": 2,
                        "issue_title": "Issue 2",
                        "issue_url": "https://github.com/test/repo/issues/2",
                        "amount_cents": 10000,
                        "eligibility": "either",
                        "status": "funded",
                        "created_at": "2026-10-29T10:00:00Z",
                    }
                ],
                "pagination": {"next_cursor": None, "has_more": False},
            },
        ),
    ]

    async with AsyncOpenBounty(api_key="ob_live_sk_test") as client:
        pages = []
        async for page in client.iter_pages():
            pages.append(page)
        assert len(pages) == 2
        assert pages[0].data[0].id == "b1"
        assert pages[1].data[0].id == "b2"

    route.side_effect = [
        httpx.Response(
            200,
            json={
                "data": [
                    {
                        "id": "b1",
                        "repo": {"owner": "test", "name": "repo", "github_id": "1"},
                        "issue_number": 1,
                        "issue_title": "Issue 1",
                        "issue_url": "https://github.com/test/repo/issues/1",
                        "amount_cents": 5000,
                        "eligibility": "either",
                        "status": "funded",
                        "created_at": "2026-10-29T10:00:00Z",
                    }
                ],
                "pagination": {"next_cursor": "c2", "has_more": True},
            },
        ),
        httpx.Response(
            200,
            json={
                "data": [
                    {
                        "id": "b2",
                        "repo": {"owner": "test", "name": "repo", "github_id": "1"},
                        "issue_number": 2,
                        "issue_title": "Issue 2",
                        "issue_url": "https://github.com/test/repo/issues/2",
                        "amount_cents": 10000,
                        "eligibility": "either",
                        "status": "funded",
                        "created_at": "2026-10-29T10:00:00Z",
                    }
                ],
                "pagination": {"next_cursor": None, "has_more": False},
            },
        ),
    ]

    async with AsyncOpenBounty(api_key="ob_live_sk_test") as client:
        bounties = []
        async for b in client.iter_bounties():
            bounties.append(b)
        assert [b.id for b in bounties] == ["b1", "b2"]


@pytest.mark.anyio
@respx.mock
async def test_async_get_claim_release_pr_draft() -> None:
    respx.get(f"{BASE_URL}/bounties/cl9k").respond(
        200,
        json={
            "data": {
                "id": "cl9k",
                "repo": {"owner": "test", "name": "repo", "github_id": "1"},
                "issue_number": 1,
                "issue_title": "Title",
                "issue_url": "https://github.com/test/repo/issues/1",
                "amount_cents": 5000,
                "eligibility": "either",
                "status": "funded",
                "created_at": "2026-10-29T10:00:00Z",
                "issue_body": "Body",
            }
        },
    )

    respx.post(f"{BASE_URL}/bounties/cl9k/claim").respond(
        200,
        json={
            "data": {
                "id": "cl9k",
                "repo": {"owner": "test", "name": "repo", "github_id": "1"},
                "issue_number": 1,
                "issue_title": "Title",
                "issue_url": "https://github.com/test/repo/issues/1",
                "amount_cents": 5000,
                "eligibility": "either",
                "status": "claimed",
                "created_at": "2026-10-29T10:00:00Z",
                "claimed_at": "2026-10-29T11:00:00Z",
                "claimer": "agent-007",
            }
        },
    )

    respx.post(f"{BASE_URL}/bounties/cl9k/release-claim").respond(
        200,
        json={
            "data": {
                "id": "cl9k",
                "repo": {"owner": "test", "name": "repo", "github_id": "1"},
                "issue_number": 1,
                "issue_title": "Title",
                "issue_url": "https://github.com/test/repo/issues/1",
                "amount_cents": 5000,
                "eligibility": "either",
                "status": "funded",
                "created_at": "2026-10-29T10:00:00Z",
            }
        },
    )

    respx.post(f"{BASE_URL}/pr-drafts").respond(
        200,
        json={
            "data": {
                "id": "prd_async_1",
                "bounty_id": "cl9k",
                "branch_name": "obk/async",
                "diff": "--- a\n+++ b",
                "files_changed": ["main.py"],
                "status": "pending_review",
            }
        },
    )

    respx.get(f"{BASE_URL}/pr-drafts/prd_async_1").respond(
        200,
        json={
            "data": {
                "id": "prd_async_1",
                "bounty_id": "cl9k",
                "branch_name": "obk/async",
                "diff": "--- a\n+++ b",
                "files_changed": ["main.py"],
                "status": "approved",
            }
        },
    )

    async with AsyncOpenBounty(api_key="ob_live_sk_test") as client:
        bounty = await client.get("cl9k")
        assert bounty.id == "cl9k"
        assert (await client.get_bounty("cl9k")).id == "cl9k"

        claimed = await client.claim("cl9k")
        assert claimed.status == "claimed"
        assert (await client.claim_bounty("cl9k")).status == "claimed"

        released = await client.release_claim("cl9k")
        assert released.status == "funded"
        assert (await client.release("cl9k")).status == "funded"

        draft = await client.submit_pr_draft(
            bounty_id="cl9k",
            branch_name="obk/async",
            diff="--- a\n+++ b",
            files_changed=["main.py"],
        )
        assert draft.id == "prd_async_1"

        draft_from_obj = await client.submit_pr_draft(
            PrDraftCreate(
                bounty_id="cl9k",
                branch_name="obk/async",
                diff="--- a\n+++ b",
                files_changed=["main.py"],
            )
        )
        assert draft_from_obj.id == "prd_async_1"

        fetched_draft = await client.get_pr_draft("prd_async_1")
        assert fetched_draft.id == "prd_async_1"
        assert fetched_draft.status == "approved"
