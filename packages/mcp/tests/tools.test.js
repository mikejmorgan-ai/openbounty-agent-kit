import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, createToolHandlers } from "../src/tools.js";

test("all required tools are registered", () => {
  const toolNames = TOOLS.map((t) => t.name);
  const required = [
    "list_bounties",
    "get_bounty",
    "claim_bounty",
    "release_claim",
    "submit_pr_draft",
    "get_pr_draft",
  ];
  for (const name of required) {
    assert.ok(toolNames.includes(name), `Missing tool: ${name}`);
  }
});

test("tool descriptions state that claims are binding and expire after 7 days without a PR", () => {
  for (const tool of TOOLS) {
    assert.ok(
      tool.description.toLowerCase().includes("claims are binding") &&
      tool.description.toLowerCase().includes("7 days"),
      `Tool ${tool.name} must state claims are binding and expire after 7 days in description`
    );
  }
});

test("tool handlers execute with mocked API and redact API key", async () => {
  const SECRET_KEY = "ob_live_sk_super_secret_key_999";
  const mockApi = {
    apiKey: SECRET_KEY,
    async listBounties() {
      return { data: [{ id: "b1", amount_cents: 10000 }] };
    },
    async getBounty(id) {
      return { id, issue_title: "Fix bug", repo: { owner: "acme", name: "app" } };
    },
    async claimBounty(id) {
      return { id, status: "claimed" };
    },
    async releaseClaim(id) {
      return { id, status: "funded" };
    },
    async submitPrDraft(payload) {
      return { id: "prd_1", bounty_id: payload.bounty_id, status: "pending_review" };
    },
    async getPrDraft(id) {
      return { id, status: "approved" };
    },
  };

  const handlers = createToolHandlers(mockApi);

  const listRes = await handlers.list_bounties({ status: "funded" });
  assert.equal(listRes.isError, false);
  assert.ok(listRes.content[0].text.includes("b1"));
  assert.ok(!listRes.content[0].text.includes(SECRET_KEY));

  const getRes = await handlers.get_bounty({ id: "b1" });
  assert.equal(getRes.isError, false);
  assert.ok(getRes.content[0].text.includes("Fix bug"));

  const claimRes = await handlers.claim_bounty({ id: "b1" });
  assert.equal(claimRes.isError, false);
  assert.ok(claimRes.content[0].text.includes("claimed"));

  const releaseRes = await handlers.release_claim({ id: "b1" });
  assert.equal(releaseRes.isError, false);
  assert.ok(releaseRes.content[0].text.includes("funded"));

  const draftRes = await handlers.submit_pr_draft({
    bounty_id: "b1",
    branch_name: "obk/fix",
    diff: "diff",
    files_changed: ["src/index.js"],
  });
  assert.equal(draftRes.isError, false);
  assert.ok(draftRes.content[0].text.includes("prd_1"));

  const getDraftRes = await handlers.get_pr_draft({ id: "prd_1" });
  assert.equal(getDraftRes.isError, false);
  assert.ok(getDraftRes.content[0].text.includes("approved"));
});

test("tool handlers format errors cleanly and sanitize any API key", async () => {
  const SECRET_KEY = "ob_live_sk_secret_error_leak";
  const mockApi = {
    apiKey: SECRET_KEY,
    async claimBounty() {
      throw new Error(`Unauthorized access with token ${SECRET_KEY}`);
    },
  };

  const handlers = createToolHandlers(mockApi);
  const res = await handlers.claim_bounty({ id: "b1" });

  assert.equal(res.isError, true);
  assert.ok(!res.content[0].text.includes(SECRET_KEY));
  assert.ok(res.content[0].text.includes("[REDACTED_API_KEY]"));
});
