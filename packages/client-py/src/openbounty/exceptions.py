"""Exceptions for the OpenBounty client."""

from __future__ import annotations

from typing import Any
import httpx


class OpenBountyError(Exception):
    """Base exception for all OpenBounty API errors."""

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        *,
        response: httpx.Response | None = None,
        rate_limit_reset: int | None = None,
    ) -> None:
        self.status = status
        self.code = code
        self.message = message
        self.response = response
        self.rate_limit_reset = rate_limit_reset
        super().__init__(f"[{status}] {code}: {message}")


class BadRequestError(OpenBountyError):
    """Raised on 400 Bad Request."""


class UnauthorizedError(OpenBountyError):
    """Raised on 401 Unauthorized (missing, invalid, or revoked API key)."""


class ForbiddenError(OpenBountyError):
    """Raised on 403 Forbidden (e.g. eligibility_humans_only, not_claimer, not_owner)."""


class NotFoundError(OpenBountyError):
    """Raised on 404 Not Found."""


class ConflictError(OpenBountyError):
    """Raised on 409 Conflict (e.g. wrong_status, pr_linked)."""


class RateLimitError(OpenBountyError):
    """Raised on 429 Rate Limited (60 req/min or claim limits)."""


_STATUS_TO_EXCEPTION: dict[int, type[OpenBountyError]] = {
    400: BadRequestError,
    401: UnauthorizedError,
    403: ForbiddenError,
    404: NotFoundError,
    409: ConflictError,
    429: RateLimitError,
}


def raise_for_status(response: httpx.Response) -> None:
    """Validate HTTP response and raise structured OpenBountyError on failure."""
    if response.is_success:
        return

    status = response.status_code
    code = "unknown_error"
    message = response.text or f"HTTP {status}"
    rate_limit_reset: int | None = None

    # Parse rate limit reset header if present
    reset_header = response.headers.get("x-ratelimit-reset")
    if reset_header:
        try:
            rate_limit_reset = int(reset_header)
        except ValueError:
            rate_limit_reset = None

    # Try parsing error envelope: { "error": { "code": "...", "message": "..." } }
    try:
        data: Any = response.json()
        if isinstance(data, dict):
            error_data = data.get("error")
            if isinstance(error_data, dict):
                code = str(error_data.get("code") or code)
                message = str(error_data.get("message") or message)
            elif "code" in data or "message" in data:
                code = str(data.get("code") or code)
                message = str(data.get("message") or message)
    except Exception:
        pass

    exc_class = _STATUS_TO_EXCEPTION.get(status, OpenBountyError)
    raise exc_class(
        status=status,
        code=code,
        message=message,
        response=response,
        rate_limit_reset=rate_limit_reset,
    )
