"""Data models for OpenBounty entities."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar

T = TypeVar("T")


@dataclass(frozen=True)
class Repo:
    """GitHub repository associated with a bounty."""

    owner: str
    name: str
    github_id: str

    @property
    def full_name(self) -> str:
        """Return owner/name."""
        return f"{self.owner}/{self.name}"

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Repo:
        """Create Repo instance from API dictionary."""
        return cls(
            owner=str(data.get("owner", "")),
            name=str(data.get("name", "")),
            github_id=str(data.get("github_id", "")),
        )


@dataclass(frozen=True)
class Bounty:
    """Standard bounty summary object."""

    id: str
    repo: Repo
    issue_number: int
    issue_title: str
    issue_url: str
    amount_cents: int
    eligibility: str
    status: str
    created_at: str
    claimed_at: str | None = None
    pr_url: str | None = None
    pr_number: int | None = None

    @property
    def amount_dollars(self) -> float:
        """Return reward amount formatted in US dollars."""
        return self.amount_cents / 100.0

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Bounty:
        """Create Bounty instance from API dictionary."""
        repo_data = data.get("repo")
        repo = Repo.from_dict(repo_data) if isinstance(repo_data, dict) else Repo("", "", "")
        return cls(
            id=str(data.get("id", "")),
            repo=repo,
            issue_number=int(data.get("issue_number", 0)),
            issue_title=str(data.get("issue_title", "")),
            issue_url=str(data.get("issue_url", "")),
            amount_cents=int(data.get("amount_cents", 0)),
            eligibility=str(data.get("eligibility", "either")),
            status=str(data.get("status", "funded")),
            created_at=str(data.get("created_at", "")),
            claimed_at=data.get("claimed_at"),
            pr_url=data.get("pr_url"),
            pr_number=int(data["pr_number"]) if data.get("pr_number") is not None else None,
        )


@dataclass(frozen=True)
class BountyDetailed(Bounty):
    """Detailed bounty object including instructions, claimer, and repository notes."""

    issue_body: str | None = None
    acceptance_criteria: str | None = None
    claimer: str | None = None
    claim_only_notes: str | None = None
    repo_clone_url: str | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BountyDetailed:
        """Create BountyDetailed instance from API dictionary."""
        repo_data = data.get("repo")
        repo = Repo.from_dict(repo_data) if isinstance(repo_data, dict) else Repo("", "", "")
        return cls(
            id=str(data.get("id", "")),
            repo=repo,
            issue_number=int(data.get("issue_number", 0)),
            issue_title=str(data.get("issue_title", "")),
            issue_url=str(data.get("issue_url", "")),
            amount_cents=int(data.get("amount_cents", 0)),
            eligibility=str(data.get("eligibility", "either")),
            status=str(data.get("status", "funded")),
            created_at=str(data.get("created_at", "")),
            claimed_at=data.get("claimed_at"),
            pr_url=data.get("pr_url"),
            pr_number=int(data["pr_number"]) if data.get("pr_number") is not None else None,
            issue_body=data.get("issue_body"),
            acceptance_criteria=data.get("acceptance_criteria"),
            claimer=data.get("claimer"),
            claim_only_notes=data.get("claim_only_notes"),
            repo_clone_url=data.get("repo_clone_url"),
        )


@dataclass(frozen=True)
class Pagination:
    """Cursor-based pagination metadata."""

    next_cursor: str | None = None
    has_more: bool = False

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> Pagination:
        """Create Pagination instance from API dictionary."""
        if not data:
            return cls(next_cursor=None, has_more=False)
        return cls(
            next_cursor=data.get("next_cursor"),
            has_more=bool(data.get("has_more", False)),
        )


@dataclass(frozen=True)
class Page(Generic[T]):
    """Generic paginated page containing items and cursor metadata."""

    data: list[T] = field(default_factory=list)
    pagination: Pagination = field(default_factory=Pagination)


@dataclass(frozen=True)
class PrDraft:
    """Submitted pull request draft pending operator review."""

    id: str
    bounty_id: str
    branch_name: str
    diff: str
    files_changed: list[str]
    test_output: str | None = None
    status: str = "pending_review"
    created_at: str | None = None
    updated_at: str | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> PrDraft:
        """Create PrDraft instance from API dictionary."""
        files = data.get("files_changed") or []
        return cls(
            id=str(data.get("id", "")),
            bounty_id=str(data.get("bounty_id", "")),
            branch_name=str(data.get("branch_name", "")),
            diff=str(data.get("diff", "")),
            files_changed=[str(f) for f in files],
            test_output=data.get("test_output"),
            status=str(data.get("status", "pending_review")),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )


@dataclass(frozen=True)
class PrDraftCreate:
    """Payload to submit a pull request draft."""

    bounty_id: str
    branch_name: str
    diff: str
    files_changed: list[str]
    test_output: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert payload to JSON-serializable dictionary."""
        payload: dict[str, Any] = {
            "bounty_id": self.bounty_id,
            "branch_name": self.branch_name,
            "diff": self.diff,
            "files_changed": self.files_changed,
        }
        if self.test_output is not None:
            payload["test_output"] = self.test_output
        return payload
