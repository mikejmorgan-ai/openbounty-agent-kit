import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, runCli } from "../src/commands.js";

test("parseArgs parses flags and positional arguments", () => {
  const parsed = parseArgs([
    "list",
    "--eligibility",
    "agents_only",
    "--min",
    "50",
    "--json",
  ]);

  assert.equal(parsed.command, "list");
  assert.equal(parsed.options.eligibility, "agents_only");
  assert.equal(parsed.options.min, "50");
  assert.equal(parsed.options.json, true);
});

test("runCli executes list command with table and json formatting", async () => {
  process.env.OPENBOUNTY_API_KEY = "test_key";
  let capturedUrl = "";

  const mockFetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: [
          {
            id: "b1",
            repo: { owner: "acme", name: "app" },
            issue_number: 1,
            issue_title: "Bug fix",
            amount_cents: 5000,
            eligibility: "agents_only",
            status: "funded",
          },
        ],
      }),
    };
  };

  let stdoutText = "";
  const io = {
    stdout: (s) => (stdoutText += s + "\n"),
    stderr: () => {},
    fetch: mockFetch,
  };

  // Test table output
  const code = await runCli(["list", "--eligibility", "agents_only", "--min", "50"], io);
  assert.equal(code, 0);
  assert.ok(stdoutText.includes("acme/app"));
  assert.ok(stdoutText.includes("$50.00"));
  assert.ok(capturedUrl.includes("eligibility=agents_only"));
  assert.ok(capturedUrl.includes("min_amount_cents=5000"));

  // Test JSON output
  stdoutText = "";
  const jsonCode = await runCli(["list", "--json"], io);
  assert.equal(jsonCode, 0);
  const parsed = JSON.parse(stdoutText);
  assert.equal(parsed[0].id, "b1");
});

test("runCli executes show, claim, release commands", async () => {
  process.env.OPENBOUNTY_API_KEY = "test_key";
  const calls = [];

  const mockFetch = async (url, init = {}) => {
    calls.push({ url, method: init.method || "GET" });
    if (url.endsWith("/bounties/b1")) {
      return {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: {
            id: "b1",
            repo: { owner: "acme", name: "app" },
            issue_number: 1,
            issue_title: "Fix bug",
            amount_cents: 10000,
            status: "funded",
          },
        }),
      };
    }
    if (url.endsWith("/claim")) {
      return {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: { id: "b1", status: "claimed" },
        }),
      };
    }
    if (url.endsWith("/release-claim")) {
      return {
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          data: { id: "b1", status: "funded" },
        }),
      };
    }
    throw new Error(`Unexpected url: ${url}`);
  };

  let stdoutText = "";
  const io = {
    stdout: (s) => (stdoutText += s + "\n"),
    stderr: () => {},
    fetch: mockFetch,
  };

  await runCli(["show", "b1"], io);
  assert.ok(stdoutText.includes("Bounty ID    : b1"));

  stdoutText = "";
  await runCli(["claim", "b1"], io);
  assert.ok(stdoutText.includes("Successfully claimed bounty b1"));

  stdoutText = "";
  await runCli(["release", "b1"], io);
  assert.ok(stdoutText.includes("Successfully released claim on bounty b1"));
});

test("runCli returns non-zero exit code on API failure", async () => {
  process.env.OPENBOUNTY_API_KEY = "test_key";

  const mockFetch = async () => ({
    ok: false,
    status: 404,
    statusText: "Not Found",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      error: { code: "not_found", message: "Bounty not found" },
    }),
  });

  const io = {
    stdout: () => {},
    stderr: () => {},
    fetch: mockFetch,
  };

  await assert.rejects(
    () => runCli(["show", "missing"], io),
    /\[404\] not_found/
  );
});
