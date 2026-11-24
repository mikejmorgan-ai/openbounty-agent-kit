import os
import pytest
import respx
import httpx
from openbounty import (
    ConflictError,
    OpenBounty,
    PrDraftCreate,
    RateLimitError,
    UnauthorizedError,
)

BASE_URL = "https://openbounty.ai/api/v1"


def test_missing_api_key_raises_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OPENBOUNTY_API_KEY", raising=False)
    with pytest.raises(ValueError, match="An API key must be provided"):
        OpenBounty()


def test_api_key_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENBOUNTY_API_KEY", "ob_live_sk_from_env")
    client = OpenBounty()
    assert client._api_key == "ob_live_sk_from_env"
    client.close()


@respx.mock
def test_list_bounties_and_aliases() -> None:
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

    client = OpenBounty(api_key="ob_live_sk_test")
    page = client.list(status="funded", limit=1)
    assert len(page.data) == 1
    assert page.data[0].id == "b1"
    assert page.pagination.next_cursor == "cur_next"

    # Alias check
    page_alias = client.list_bounties(status="funded")
    assert len(page_alias.data) == 1
    client.close()


@respx.mock
def test_iter_pages_and_bounties() -> None:
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

    with OpenBounty(api_key="ob_live_sk_test") as client:
        pages = list(client.iter_pages())
        assert len(pages) == 2
        assert pages[0].data[0].id == "b1"
        assert pages[1].data[0].id == "b2"

    # Reset mock for iter_bounties
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
    with OpenBounty(api_key="ob_live_sk_test") as client:
        bounties = list(client.iter_bounties())
        assert [b.id for b in bounties] == ["b1", "b2"]


@respx.mock
def test_get_claim_release() -> None:
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
                "issue_body": "Full body content",
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
                "claimer": "my-agent",
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

    with OpenBounty(api_key="ob_live_sk_test") as client:
        bounty = client.get("cl9k")
        assert bounty.id == "cl9k"
        assert bounty.issue_body == "Full body content"

        # Check alias
        assert client.get_bounty("cl9k").id == "cl9k"

        claimed = client.claim("cl9k")
        assert claimed.status == "claimed"
        assert claimed.claimer == "my-agent"

        # Check alias
        assert client.claim_bounty("cl9k").status == "claimed"

        released = client.release_claim("cl9k")
        assert released.status == "funded"

        # Check alias
        assert client.release("cl9k").status == "funded"


@respx.mock
def test_pr_draft_endpoints() -> None:
    respx.post(f"{BASE_URL}/pr-drafts").respond(
        200,
        json={
            "data": {
                "id": "prd_100",
                "bounty_id": "cl9k",
                "branch_name": "obk/feat",
                "diff": "--- a\n+++ b",
                "files_changed": ["src/app.py"],
                "test_output": "passed",
                "status": "pending_review",
            }
        },
    )

    respx.get(f"{BASE_URL}/pr-drafts/prd_100").respond(
        200,
        json={
            "data": {
                "id": "prd_100",
                "bounty_id": "cl9k",
                "branch_name": "obk/feat",
                "diff": "--- a\n+++ b",
                "files_changed": ["src/app.py"],
                "test_output": "passed",
                "status": "approved",
            }
        },
    )

    with OpenBounty(api_key="ob_live_sk_test") as client:
        # Submit via args
        draft = client.submit_pr_draft(
            bounty_id="cl9k",
            branch_name="obk/feat",
            diff="--- a\n+++ b",
            files_changed=["src/app.py"],
            test_output="passed",
        )
        assert draft.id == "prd_100"
        assert draft.status == "pending_review"

        # Submit via PrDraftCreate object
        draft2 = client.submit_pr_draft(
            PrDraftCreate(
                bounty_id="cl9k",
                branch_name="obk/feat",
                diff="--- a\n+++ b",
                files_changed=["src/app.py"],
                test_output="passed",
            )
        )
        assert draft2.id == "prd_100"

        # Get PR draft
        fetched = client.get_pr_draft("prd_100")
        assert fetched.id == "prd_100"
        assert fetched.status == "approved"


@respx.mock
def test_client_error_responses() -> None:
    respx.get(f"{BASE_URL}/bounties/not_exist").respond(
        404,
        json={"error": {"code": "not_found", "message": "Bounty does not exist"}},
    )

    respx.post(f"{BASE_URL}/bounties/cl9k/claim").respond(
        409,
        json={"error": {"code": "wrong_status", "message": "Already claimed"}},
    )

    respx.get(f"{BASE_URL}/bounties").respond(
        429,
        headers={"x-ratelimit-reset": "1730249999"},
        json={"error": {"code": "rate_limited", "message": "Rate limit exceeded"}},
    )

    with OpenBounty(api_key="ob_live_sk_test") as client:
        with pytest.raises(ConflictError) as exc_conflict:
            client.claim("cl9k")
        assert exc_conflict.value.status == 409
        assert exc_conflict.value.code == "wrong_status"

        with pytest.raises(RateLimitError) as exc_rate:
            client.list()
        assert exc_rate.value.status == 429
        assert exc_rate.value.rate_limit_reset == 1730249999
