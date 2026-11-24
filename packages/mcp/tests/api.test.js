import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenBountyApi } from "../src/api.js";

test("OpenBountyApi requires apiKey", async () => {
  const api = new OpenBountyApi({ apiKey: null });
  await assert.rejects(
    () => api.listBounties(),
    /Missing OPENBOUNTY_API_KEY/
  );
});

test("OpenBountyApi.listBounties passes query parameters", async () => {
  let requestedUrl = "";
  let authHeader = "";

  const mockFetch = async (url, opts) => {
    requestedUrl = url;
    authHeader = opts.headers["Authorization"];
    return {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: [{ id: "b1", amount_cents: 5000 }],
        pagination: { has_more: false },
      }),
    };
  };

  const api = new OpenBountyApi({
    apiKey: "ob_live_sk_secret_123",
    baseUrl: "https://test.api",
    fetchFn: mockFetch,
  });

  const res = await api.listBounties({
    status: "funded",
    eligibility: "agents_only",
    min_amount_cents: 5000,
    limit: 10,
  });

  assert.equal(authHeader, "Bearer ob_live_sk_secret_123");
  assert.ok(requestedUrl.includes("status=funded"));
  assert.ok(requestedUrl.includes("eligibility=agents_only"));
  assert.ok(requestedUrl.includes("min_amount_cents=5000"));
  assert.ok(requestedUrl.includes("limit=10"));
  assert.equal(res.data.length, 1);
});

test("OpenBountyApi.claimBounty and releaseClaim call POST", async () => {
  const calls = [];

  const mockFetch = async (url, opts) => {
    calls.push({ url, method: opts.method });
    return {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ data: { id: "cl9k", status: "claimed" } }),
    };
  };

  const api = new OpenBountyApi({
    apiKey: "key",
    baseUrl: "https://test.api",
    fetchFn: mockFetch,
  });

  await api.claimBounty("cl9k");
  assert.equal(calls[0].method, "POST");
  assert.ok(calls[0].url.endsWith("/bounties/cl9k/claim"));

  await api.releaseClaim("cl9k");
  assert.equal(calls[1].method, "POST");
  assert.ok(calls[1].url.endsWith("/bounties/cl9k/release-claim"));
});

test("OpenBountyApi.submitPrDraft validates payload", async () => {
  const api = new OpenBountyApi({ apiKey: "key" });
  await assert.rejects(() => api.submitPrDraft({}), /bounty_id is required/);
  await assert.rejects(() => api.submitPrDraft({ bounty_id: "b1" }), /branch_name is required/);
  await assert.rejects(() => api.submitPrDraft({ bounty_id: "b1", branch_name: "feat" }), /diff is required/);
  await assert.rejects(() => api.submitPrDraft({ bounty_id: "b1", branch_name: "feat", diff: "diff" }), /files_changed must be a non-empty array/);
});

test("OpenBountyApi handles HTTP errors with structured messages", async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 403,
    statusText: "Forbidden",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      error: { code: "eligibility_humans_only", message: "This bounty is for human contributors only." },
    }),
  });

  const api = new OpenBountyApi({
    apiKey: "key",
    fetchFn: mockFetch,
  });

  await assert.rejects(
    () => api.claimBounty("b1"),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.code, "eligibility_humans_only");
      assert.ok(err.message.includes("human contributors only"));
      return true;
    }
  );
});
