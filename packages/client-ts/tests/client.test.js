import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenBountyClient } from "../src/client.js";
import { ConflictError, NotFoundError, RateLimitError, UnauthorizedError } from "../src/errors.js";

const BASE_URL = "https://openbounty.ai/api/v1";

test("OpenBountyClient throws when apiKey is missing", () => {
  const origEnv = process.env.OPENBOUNTY_API_KEY;
  delete process.env.OPENBOUNTY_API_KEY;

  try {
    assert.throws(
      () => new OpenBountyClient(),
      /An API key must be provided/
    );
  } finally {
    if (origEnv) process.env.OPENBOUNTY_API_KEY = origEnv;
  }
});

test("OpenBountyClient uses OPENBOUNTY_API_KEY from environment", () => {
  process.env.OPENBOUNTY_API_KEY = "ob_live_sk_from_env";
  const client = new OpenBountyClient();
  assert.equal(client["apiKey"], "ob_live_sk_from_env");
});

test("listBounties sends authorization header and query params", async () => {
  let capturedUrl = "";
  let capturedHeaders = {};

  const mockFetch = async (url, init) => {
    capturedUrl = url;
    capturedHeaders = init.headers;
    return {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: [
          {
            id: "b1",
            repo: { owner: "acme", name: "app", github_id: "1" },
            issue_number: 42,
            issue_title: "Fix bug",
            issue_url: "https://github.com/acme/app/issues/42",
            amount_cents: 15000,
            eligibility: "agents_only",
            status: "funded",
            created_at: "2026-10-29T18:00:00Z",
          },
        ],
        pagination: { next_cursor: "cur_next", has_more: true },
      }),
    };
  };

  const client = new OpenBountyClient({
    apiKey: "ob_live_sk_test",
    fetch: mockFetch,
  });

  const page = await client.listBounties({
    status: "funded",
    eligibility: "agents_only",
    min_amount_cents: 10000,
    limit: 5,
  });

  assert.equal(capturedHeaders["Authorization"], "Bearer ob_live_sk_test");
  assert.ok(capturedUrl.includes("status=funded"));
  assert.ok(capturedUrl.includes("eligibility=agents_only"));
  assert.ok(capturedUrl.includes("min_amount_cents=10000"));
  assert.ok(capturedUrl.includes("limit=5"));
  assert.equal(page.data.length, 1);
  assert.equal(page.data[0].id, "b1");
  assert.equal(page.pagination.has_more, true);
});

test("getBounty, claim, and releaseClaim methods", async () => {
  const calls = [];

  const mockFetch = async (url, init = {}) => {
    calls.push({ url, method: init.method || "GET" });
    if (url.endsWith("/bounties/cl9k")) {
      return {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: {
            id: "cl9k",
            issue_title: "Detailed Bounty",
            acceptance_criteria: "Must pass tests",
          },
        }),
      };
    }
    if (url.endsWith("/claim")) {
      return {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: { id: "cl9k", status: "claimed" },
        }),
      };
    }
    if (url.endsWith("/release-claim")) {
      return {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: { id: "cl9k", status: "funded" },
        }),
      };
    }
    throw new Error(`Unexpected url: ${url}`);
  };

  const client = new OpenBountyClient({
    apiKey: "test_key",
    fetch: mockFetch,
  });

  const bounty = await client.getBounty("cl9k");
  assert.equal(bounty.id, "cl9k");
  assert.equal(bounty.acceptance_criteria, "Must pass tests");

  const claimed = await client.claim("cl9k");
  assert.equal(claimed.status, "claimed");

  const released = await client.releaseClaim("cl9k");
  assert.equal(released.status, "funded");

  assert.equal(calls.length, 3);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[1].method, "POST");
  assert.equal(calls[2].method, "POST");
});

test("submitPrDraft and getPrDraft", async () => {
  let submittedBody = null;

  const mockFetch = async (url, init = {}) => {
    if (url.endsWith("/pr-drafts") && init.method === "POST") {
      submittedBody = JSON.parse(init.body);
      return {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: {
            id: "prd_123",
            bounty_id: submittedBody.bounty_id,
            status: "pending_review",
          },
        }),
      };
    }
    if (url.endsWith("/pr-drafts/prd_123")) {
      return {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: {
            id: "prd_123",
            status: "approved",
          },
        }),
      };
    }
    throw new Error(`Unexpected url: ${url}`);
  };

  const client = new OpenBountyClient({
    apiKey: "test_key",
    fetch: mockFetch,
  });

  const draft = await client.submitPrDraft({
    bounty_id: "cl9k",
    branch_name: "obk/feat",
    diff: "--- a\n+++ b",
    files_changed: ["src/app.ts"],
    test_output: "15 passed",
  });

  assert.equal(draft.id, "prd_123");
  assert.equal(draft.status, "pending_review");
  assert.equal(submittedBody.bounty_id, "cl9k");
  assert.equal(submittedBody.files_changed[0], "src/app.ts");

  const fetched = await client.getPrDraft("prd_123");
  assert.equal(fetched.id, "prd_123");
  assert.equal(fetched.status, "approved");
});

test("error envelope throws typed error classes", async () => {
  const mockFetch = async (url) => {
    if (url.includes("/unauthorized")) {
      return {
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          error: { code: "unauthorized", message: "Invalid or missing API key." },
        }),
      };
    }
    if (url.includes("/not-found")) {
      return {
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          error: { code: "not_found", message: "Bounty cl9k not found." },
        }),
      };
    }
    if (url.includes("/conflict")) {
      return {
        ok: false,
        status: 409,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          error: { code: "wrong_status", message: "Bounty is not claimed." },
        }),
      };
    }
    if (url.includes("/rate-limit")) {
      return {
        ok: false,
        status: 429,
        headers: new Headers({
          "content-type": "application/json",
          "x-ratelimit-reset": "1730248888",
        }),
        json: async () => ({
          error: { code: "rate_limited", message: "60 req/min exceeded." },
        }),
      };
    }
    throw new Error("Unhandled route");
  };

  const client = new OpenBountyClient({
    apiKey: "test_key",
    fetch: mockFetch,
  });

  await assert.rejects(
    () => client.getBounty("unauthorized"),
    (err) => {
      assert.ok(err instanceof UnauthorizedError);
      assert.equal(err.status, 401);
      assert.equal(err.code, "unauthorized");
      return true;
    }
  );

  await assert.rejects(
    () => client.getBounty("not-found"),
    (err) => {
      assert.ok(err instanceof NotFoundError);
      assert.equal(err.status, 404);
      assert.equal(err.code, "not_found");
      return true;
    }
  );

  await assert.rejects(
    () => client.claim("conflict"),
    (err) => {
      assert.ok(err instanceof ConflictError);
      assert.equal(err.status, 409);
      assert.equal(err.code, "wrong_status");
      return true;
    }
  );

  await assert.rejects(
    () => client.getBounty("rate-limit"),
    (err) => {
      assert.ok(err instanceof RateLimitError);
      assert.equal(err.status, 429);
      assert.equal(err.code, "rate_limited");
      assert.equal(err.rateLimitReset, 1730248888);
      return true;
    }
  );
});
