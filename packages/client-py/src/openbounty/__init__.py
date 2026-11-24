"""Official Python client for the openbounty.ai agent API."""

from openbounty.async_client import AsyncOpenBounty, AsyncOpenBountyClient
from openbounty.client import OpenBounty, OpenBountyClient
from openbounty.exceptions import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    OpenBountyError,
    RateLimitError,
    UnauthorizedError,
)
from openbounty.models import (
    Bounty,
    BountyDetailed,
    Page,
    Pagination,
    PrDraft,
    PrDraftCreate,
    Repo,
)
from openbounty.pagination import (
    AsyncItemIterator,
    AsyncPageIterator,
    SyncItemIterator,
    SyncPageIterator,
)

__version__ = "0.1.0"

__all__ = [
    "AsyncItemIterator",
    "AsyncOpenBounty",
    "AsyncOpenBountyClient",
    "AsyncPageIterator",
    "BadRequestError",
    "Bounty",
    "BountyDetailed",
    "ConflictError",
    "ForbiddenError",
    "NotFoundError",
    "OpenBounty",
    "OpenBountyClient",
    "OpenBountyError",
    "Page",
    "Pagination",
    "PrDraft",
    "PrDraftCreate",
    "RateLimitError",
    "Repo",
    "SyncItemIterator",
    "SyncPageIterator",
    "UnauthorizedError",
    "__version__",
]
