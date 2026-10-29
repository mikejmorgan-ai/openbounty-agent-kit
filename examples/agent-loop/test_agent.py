import os
import tempfile
import pytest
import respx
import httpx
from agent import AgentLoop
from solver import Solver

BASE_URL = "https://openbounty.ai/api/v1"


def test_solver_generates_diff() -> None:
    solver = Solver(model_name="test-model")
    with tempfile.TemporaryDirectory() as tmp_dir:
        readme = os.path.join(tmp_dir, "README.md")
        with open(readme, "w") as f:
            f.write("# Original\n")

        success = solver.solve(
            issue_title="Test Issue",
            issue_body="Description",
            acceptance_criteria="Pass",
            repo_dir=tmp_dir,
        )
        assert success is True
        with open(readme, "r") as f:
            content = f.read()
        assert "Test Issue" in content
        assert "test-model" in content


@respx.mock
def test_agent_loop_end_to_end_success() -> None:
    # 1. Mock list bounties
    respx.get(f"{BASE_URL}/bounties").respond(
        200,
        json={
            "data": [
                {
                    "id": "bounty_123",
                    "issue_title": "Add retry to client",
                    "amount_cents": 10000,
                    "eligibility": "agents_only",
                    "status": "funded",
                }
            ]
        },
    )

    # 2. Mock claim
    respx.post(f"{BASE_URL}/bounties/bounty_123/claim").respond(
        200,
        json={
            "data": {
                "id": "bounty_123",
                "status": "claimed",
                "repo_clone_url": None,
                "issue_body": "Please add exponential retry",
                "acceptance_criteria": "3 retries max",
            }
        },
    )

    # 3. Mock submit PR draft
    respx.post(f"{BASE_URL}/pr-drafts").respond(
        200,
        json={
            "data": {
                "id": "draft_999",
                "bounty_id": "bounty_123",
                "status": "pending_review",
            }
        },
    )

    # 4. Mock poll PR draft
    respx.get(f"{BASE_URL}/pr-drafts/draft_999").respond(
        200,
        json={
            "data": {
                "id": "draft_999",
                "status": "approved",
            }
        },
    )

    agent = AgentLoop(api_key="ob_live_sk_test", base_url=BASE_URL)
    success = agent.run_one()
    assert success is True
    agent.close()


@respx.mock
def test_agent_loop_releases_claim_on_rejection() -> None:
    respx.get(f"{BASE_URL}/bounties").respond(
        200,
        json={
            "data": [
                {
                    "id": "bounty_fail",
                    "issue_title": "Fix bug",
                    "amount_cents": 5000,
                    "eligibility": "agents_only",
                    "status": "funded",
                }
            ]
        },
    )

    respx.post(f"{BASE_URL}/bounties/bounty_fail/claim").respond(
        200,
        json={"data": {"id": "bounty_fail", "status": "claimed"}},
    )

    respx.post(f"{BASE_URL}/pr-drafts").respond(
        200,
        json={"data": {"id": "draft_fail", "status": "pending_review"}},
    )

    respx.get(f"{BASE_URL}/pr-drafts/draft_fail").respond(
        200,
        json={"data": {"id": "draft_fail", "status": "rejected"}},
    )

    release_route = respx.post(f"{BASE_URL}/bounties/bounty_fail/release-claim").respond(
        200,
        json={"data": {"id": "bounty_fail", "status": "funded"}},
    )

    agent = AgentLoop(api_key="ob_live_sk_test", base_url=BASE_URL)
    success = agent.run_one()
    assert success is False
    assert release_route.called is True
    agent.close()
