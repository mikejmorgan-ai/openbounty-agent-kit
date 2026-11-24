from openbounty.models import (
    Bounty,
    BountyDetailed,
    Page,
    Pagination,
    PrDraft,
    PrDraftCreate,
    Repo,
)


def test_repo_model() -> None:
    repo = Repo(owner="acme", name="widgets", github_id="123")
    assert repo.owner == "acme"
    assert repo.name == "widgets"
    assert repo.github_id == "123"
    assert repo.full_name == "acme/widgets"

    from_d = Repo.from_dict({"owner": "openbot", "name": "core", "github_id": "456"})
    assert from_d.owner == "openbot"
    assert from_d.name == "core"
    assert from_d.full_name == "openbot/core"


def test_bounty_model() -> None:
    data = {
        "id": "cl9k12345",
        "repo": {"owner": "acme", "name": "widgets", "github_id": "123"},
        "issue_number": 42,
        "issue_title": "Add retry to fetcher",
        "issue_url": "https://github.com/acme/widgets/issues/42",
        "amount_cents": 15000,
        "eligibility": "either",
        "status": "funded",
        "created_at": "2026-10-29T18:00:00.000Z",
        "claimed_at": None,
        "pr_url": None,
        "pr_number": None,
    }
    bounty = Bounty.from_dict(data)
    assert bounty.id == "cl9k12345"
    assert bounty.repo.full_name == "acme/widgets"
    assert bounty.issue_number == 42
    assert bounty.amount_cents == 15000
    assert bounty.amount_dollars == 150.0
    assert bounty.eligibility == "either"
    assert bounty.status == "funded"
    assert bounty.claimed_at is None


def test_bounty_detailed_model() -> None:
    data = {
        "id": "cl9k12345",
        "repo": {"owner": "acme", "name": "widgets", "github_id": "123"},
        "issue_number": 42,
        "issue_title": "Add retry to fetcher",
        "issue_url": "https://github.com/acme/widgets/issues/42",
        "amount_cents": 15000,
        "eligibility": "agents_only",
        "status": "claimed",
        "created_at": "2026-10-29T18:00:00.000Z",
        "claimed_at": "2026-10-29T19:00:00.000Z",
        "pr_url": "https://github.com/acme/widgets/pull/43",
        "pr_number": 43,
        "issue_body": "Detailed description of retry logic",
        "acceptance_criteria": "Must retry on 5xx",
        "claimer": "agent-007",
        "claim_only_notes": "Internal CI secrets configured",
        "repo_clone_url": "https://github.com/acme/widgets.git",
    }
    detailed = BountyDetailed.from_dict(data)
    assert detailed.id == "cl9k12345"
    assert detailed.issue_body == "Detailed description of retry logic"
    assert detailed.acceptance_criteria == "Must retry on 5xx"
    assert detailed.claimer == "agent-007"
    assert detailed.claim_only_notes == "Internal CI secrets configured"
    assert detailed.repo_clone_url == "https://github.com/acme/widgets.git"
    assert detailed.pr_number == 43


def test_pagination_and_page() -> None:
    pagination = Pagination.from_dict({"next_cursor": "cur_abc123", "has_more": True})
    assert pagination.next_cursor == "cur_abc123"
    assert pagination.has_more is True

    empty_pag = Pagination.from_dict(None)
    assert empty_pag.next_cursor is None
    assert empty_pag.has_more is False

    page: Page[str] = Page(data=["item1", "item2"], pagination=pagination)
    assert len(page.data) == 2
    assert page.pagination.has_more is True


def test_pr_draft_models() -> None:
    create = PrDraftCreate(
        bounty_id="cl9k12345",
        branch_name="obk/retry-fetcher",
        diff="diff --git a/file b/file",
        files_changed=["src/fetcher.ts"],
        test_output="3 passed",
    )
    d = create.to_dict()
    assert d["bounty_id"] == "cl9k12345"
    assert d["branch_name"] == "obk/retry-fetcher"
    assert d["diff"] == "diff --git a/file b/file"
    assert d["files_changed"] == ["src/fetcher.ts"]
    assert d["test_output"] == "3 passed"

    data = {
        "id": "prd_987",
        "bounty_id": "cl9k12345",
        "branch_name": "obk/retry-fetcher",
        "diff": "diff content",
        "files_changed": ["src/fetcher.ts"],
        "test_output": "3 passed",
        "status": "pending_review",
        "created_at": "2026-10-29T20:00:00.000Z",
        "updated_at": "2026-10-29T20:00:00.000Z",
    }
    draft = PrDraft.from_dict(data)
    assert draft.id == "prd_987"
    assert draft.status == "pending_review"
    assert draft.files_changed == ["src/fetcher.ts"]
