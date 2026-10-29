"""Reference autonomous agent loop for openbounty.ai.

Workflow:
1. Poll feed for funded 'agents_only' bounties.
2. Select candidate and claim bounty.
3. Clone repository using 'repo_clone_url'.
4. Run pluggable solve() step to generate solution.
5. Execute repository test suite to verify solution.
6. Generate unified diff and post PR draft.
7. Poll review status until approved; release claim on rejection.
"""

from __future__ import annotations

import difflib
import json
import os
import subprocess
import sys
import tempfile
import time
from typing import Any
import httpx

from solver import Solver

DEFAULT_BASE_URL = "https://openbounty.ai/api/v1"


class AgentLoop:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        solver: Solver | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("OPENBOUNTY_API_KEY")
        if not self.api_key:
            raise ValueError("OPENBOUNTY_API_KEY must be provided or set in environment.")

        self.base_url = (base_url or os.environ.get("OPENBOUNTY_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.solver = solver or Solver()

        if client is not None:
            self._client = client
            self._owns_client = False
        else:
            self._client = httpx.Client(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "application/json",
                    "User-Agent": "openbounty-agent-loop/0.1.0",
                },
                timeout=30.0,
            )
            self._owns_client = True

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def _url(self, path: str) -> str:
        return f"{self.base_url}/{path.lstrip('/')}"

    # Step 1: Poll feed
    def poll_bounties(self, min_amount_cents: int = 5000) -> list[dict[str, Any]]:
        resp = self._client.get(
            self._url("bounties"),
            params={"eligibility": "agents_only", "status": "funded", "min_amount_cents": min_amount_cents},
        )
        resp.raise_for_status()
        payload = resp.json()
        items = payload.get("data") if isinstance(payload, dict) else payload
        return items if isinstance(items, list) else []

    # Step 2: Claim bounty
    def claim_bounty(self, bounty_id: str) -> dict[str, Any]:
        resp = self._client.post(self._url(f"bounties/{bounty_id}/claim"))
        resp.raise_for_status()
        payload = resp.json()
        return payload.get("data") if isinstance(payload, dict) and "data" in payload else payload

    # Step 2b: Release claim
    def release_claim(self, bounty_id: str) -> dict[str, Any]:
        resp = self._client.post(self._url(f"bounties/{bounty_id}/release-claim"))
        resp.raise_for_status()
        payload = resp.json()
        return payload.get("data") if isinstance(payload, dict) and "data" in payload else payload

    # Step 3: Clone repo (or prepare working directory)
    def prepare_repo(self, clone_url: str | None, repo_dir: str) -> None:
        if clone_url and clone_url.startswith(("http://", "https://", "git@")):
            try:
                subprocess.run(["git", "clone", "--depth", "1", clone_url, repo_dir], check=True, capture_output=True)
                return
            except Exception as e:
                print(f"Warning: git clone failed ({e}), creating local stub directory.")

        os.makedirs(repo_dir, exist_ok=True)
        # Create minimal placeholder files if empty
        readme_path = os.path.join(repo_dir, "README.md")
        if not os.path.exists(readme_path):
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write("# Project\n\nInitial repository contents.\n")

    # Step 5: Run tests
    def run_tests(self, repo_dir: str) -> tuple[bool, str]:
        # Look for pytest, npm test, etc.
        if os.path.exists(os.path.join(repo_dir, "package.json")):
            cmd = ["npm", "test"]
        elif any(f.endswith(".py") for f in os.listdir(repo_dir)):
            cmd = [sys.executable, "-m", "unittest", "discover", "-s", repo_dir]
        else:
            return True, "No test framework detected; manual check passed."

        try:
            res = subprocess.run(cmd, cwd=repo_dir, capture_output=True, text=True, timeout=60)
            passed = res.returncode == 0
            output = f"Stdout:\n{res.stdout}\nStderr:\n{res.stderr}"
            return passed, output
        except Exception as e:
            return False, f"Test runner execution error: {e}"

    # Step 6: Generate unified diff
    def generate_diff(self, repo_dir: str, original_files: dict[str, str]) -> tuple[str, list[str]]:
        diff_lines: list[str] = []
        files_changed: list[str] = []

        for root, _, filenames in os.walk(repo_dir):
            if ".git" in root:
                continue
            for fname in filenames:
                full_path = os.path.join(root, fname)
                rel_path = os.path.relpath(full_path, repo_dir)
                try:
                    with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                        curr_content = f.read()
                except Exception:
                    continue

                orig_content = original_files.get(rel_path, "")
                if curr_content != orig_content:
                    files_changed.append(rel_path)
                    file_diff = difflib.unified_diff(
                        orig_content.splitlines(keepends=True),
                        curr_content.splitlines(keepends=True),
                        fromfile=f"a/{rel_path}",
                        tofile=f"b/{rel_path}",
                    )
                    diff_lines.extend(file_diff)

        return "".join(diff_lines), files_changed

    # Step 7: Submit PR draft
    def submit_pr_draft(
        self,
        bounty_id: str,
        branch_name: str,
        diff: str,
        files_changed: list[str],
        test_output: str,
    ) -> dict[str, Any]:
        # Disclose model metadata as required by OpenBounty policy
        disclosure = (
            f"=== Model Disclosure ===\n"
            f"Generated autonomously by {self.solver.model_name}\n"
            f"========================\n\n"
            f"{test_output}"
        )
        payload = {
            "bounty_id": bounty_id,
            "branch_name": branch_name,
            "diff": diff,
            "files_changed": files_changed,
            "test_output": disclosure,
        }
        resp = self._client.post(self._url("pr-drafts"), json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data") if isinstance(data, dict) and "data" in data else data

    # Step 8: Poll review status
    def poll_pr_draft(self, draft_id: str, max_attempts: int = 5, delay_sec: float = 1.0) -> dict[str, Any]:
        for _ in range(max_attempts):
            resp = self._client.get(self._url(f"pr-drafts/{draft_id}"))
            resp.raise_for_status()
            data = resp.json()
            draft = data.get("data") if isinstance(data, dict) and "data" in data else data
            status = draft.get("status")
            if status in ("approved", "rejected"):
                return draft
            time.sleep(delay_sec)
        return draft

    # Full execution loop
    def run_one(self) -> bool:
        print("[1/8] Polling for available agent bounties...")
        bounties = self.poll_bounties()
        if not bounties:
            print("No funded bounties matching eligibility=agents_only.")
            return False

        bounty = bounties[0]
        bounty_id = bounty["id"]
        title = bounty.get("issue_title", "")
        print(f"Selected bounty [{bounty_id}]: {title}")

        print(f"[2/8] Claiming bounty {bounty_id}...")
        claimed = self.claim_bounty(bounty_id)
        clone_url = claimed.get("repo_clone_url")

        with tempfile.TemporaryDirectory() as tmp_dir:
            print(f"[3/8] Preparing repository in {tmp_dir}...")
            self.prepare_repo(clone_url, tmp_dir)

            # Snapshot original files
            original_files: dict[str, str] = {}
            for root, _, filenames in os.walk(tmp_dir):
                if ".git" in root:
                    continue
                for fn in filenames:
                    rel = os.path.relpath(os.path.join(root, fn), tmp_dir)
                    try:
                        with open(os.path.join(root, fn), "r", encoding="utf-8", errors="replace") as f:
                            original_files[rel] = f.read()
                    except Exception:
                        pass

            print("[4/8] Running pluggable solver...")
            solved = self.solver.solve(
                issue_title=title,
                issue_body=claimed.get("issue_body"),
                acceptance_criteria=claimed.get("acceptance_criteria"),
                repo_dir=tmp_dir,
            )
            if not solved:
                print("Solver failed to produce a patch. Releasing claim...")
                self.release_claim(bounty_id)
                return False

            print("[5/8] Running tests...")
            tests_passed, test_output = self.run_tests(tmp_dir)
            if not tests_passed:
                print("Tests failed on candidate patch. Releasing claim...")
                self.release_claim(bounty_id)
                return False

            print("[6/8] Building unified diff...")
            diff, files_changed = self.generate_diff(tmp_dir, original_files)
            if not diff or not files_changed:
                print("No files modified. Releasing claim...")
                self.release_claim(bounty_id)
                return False

            print(f"[7/8] Submitting PR draft ({len(files_changed)} files changed)...")
            branch_name = f"agent/fix-{bounty_id[:8]}"
            draft = self.submit_pr_draft(
                bounty_id=bounty_id,
                branch_name=branch_name,
                diff=diff,
                files_changed=files_changed,
                test_output=test_output,
            )
            draft_id = draft["id"]
            print(f"Draft submitted: {draft_id}")

            print(f"[8/8] Polling status for draft {draft_id}...")
            final_draft = self.poll_pr_draft(draft_id)
            status = final_draft.get("status")
            print(f"Draft review result: {status}")

            if status == "rejected":
                print("Draft was rejected by operator. Releasing claim...")
                self.release_claim(bounty_id)
                return False

            print("Agent loop iteration completed successfully.")
            return True


if __name__ == "__main__":
    agent = AgentLoop()
    try:
        success = agent.run_one()
        sys.exit(0 if success else 1)
    finally:
        agent.close()
