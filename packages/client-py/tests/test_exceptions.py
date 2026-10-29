import httpx
import pytest
from openbounty.exceptions import (
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    OpenBountyError,
    RateLimitError,
    UnauthorizedError,
    raise_for_status,
)


def test_raise_for_status_success() -> None:
    resp = httpx.Response(200, json={"status": "ok"})
    # Should not raise
    raise_for_status(resp)


def test_raise_for_status_unauthorized() -> None:
    resp = httpx.Response(
        401,
        json={"error": {"code": "unauthorized", "message": "Invalid or missing API key."}},
    )
    with pytest.raises(UnauthorizedError) as exc_info:
        raise_for_status(resp)
    assert exc_info.value.status == 401
    assert exc_info.value.code == "unauthorized"
    assert exc_info.value.message == "Invalid or missing API key."
    assert "[401] unauthorized: Invalid or missing API key." in str(exc_info.value)


def test_raise_for_status_forbidden() -> None:
    resp = httpx.Response(
        403,
        json={"error": {"code": "eligibility_humans_only", "message": "Humans only bounty."}},
    )
    with pytest.raises(ForbiddenError) as exc_info:
        raise_for_status(resp)
    assert exc_info.value.status == 403
    assert exc_info.value.code == "eligibility_humans_only"


def test_raise_for_status_not_found() -> None:
    resp = httpx.Response(
        404,
        json={"error": {"code": "not_found", "message": "Bounty cl9k not found."}},
    )
    with pytest.raises(NotFoundError) as exc_info:
        raise_for_status(resp)
    assert exc_info.value.status == 404
    assert exc_info.value.code == "not_found"


def test_raise_for_status_conflict() -> None:
    resp = httpx.Response(
        409,
        json={"error": {"code": "wrong_status", "message": "Bounty is not funded."}},
    )
    with pytest.raises(ConflictError) as exc_info:
        raise_for_status(resp)
    assert exc_info.value.status == 409
    assert exc_info.value.code == "wrong_status"


def test_raise_for_status_rate_limit() -> None:
    resp = httpx.Response(
        429,
        headers={"x-ratelimit-reset": "1730246400"},
        json={"error": {"code": "rate_limited", "message": "Too many requests."}},
    )
    with pytest.raises(RateLimitError) as exc_info:
        raise_for_status(resp)
    assert exc_info.value.status == 429
    assert exc_info.value.code == "rate_limited"
    assert exc_info.value.rate_limit_reset == 1730246400


def test_raise_for_status_fallback_plain_text() -> None:
    resp = httpx.Response(500, text="Internal Server Error")
    with pytest.raises(OpenBountyError) as exc_info:
        raise_for_status(resp)
    assert exc_info.value.status == 500
    assert exc_info.value.code == "unknown_error"
    assert "Internal Server Error" in exc_info.value.message
