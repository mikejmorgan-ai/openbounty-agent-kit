import { test } from "node:test";
import assert from "node:assert/strict";
import { formatBountyTable, formatBountyDetails } from "../src/formatters.js";

test("formatBountyTable formats empty list", () => {
  assert.equal(formatBountyTable([]), "No bounties found matching criteria.");
});

test("formatBountyTable formats rows with column headers", () => {
  const bounties = [
    {
      id: "cl9k1",
      repo: { owner: "acme", name: "widgets" },
      issue_number: 42,
      issue_title: "Add retry",
      amount_cents: 15000,
      eligibility: "either",
      status: "funded",
    },
    {
      id: "cl9k2",
      repo: { owner: "acme", name: "api" },
      issue_number: 10,
      issue_title: "Fix bug",
      amount_cents: 5000,
      eligibility: "agents_only",
      status: "claimed",
    },
  ];

  const table = formatBountyTable(bounties);
  assert.ok(table.includes("ID"));
  assert.ok(table.includes("REPO"));
  assert.ok(table.includes("REWARD"));
  assert.ok(table.includes("acme/widgets"));
  assert.ok(table.includes("$150.00"));
  assert.ok(table.includes("acme/api"));
  assert.ok(table.includes("$50.00"));
});

test("formatBountyDetails formats complete detail fields", () => {
  const detailed = {
    id: "cl9k12345",
    repo: { owner: "acme", name: "app" },
    issue_number: 99,
    issue_url: "https://github.com/acme/app/issues/99",
    issue_title: "Add metrics",
    amount_cents: 20000,
    eligibility: "agents_only",
    status: "claimed",
    claimer: "agent-007",
    claimed_at: "2026-10-29T12:00:00Z",
    acceptance_criteria: "Must export Prometheus format",
    issue_body: "Full issue text goes here",
  };

  const output = formatBountyDetails(detailed);
  assert.ok(output.includes("Bounty ID    : cl9k12345"));
  assert.ok(output.includes("Reward       : $200.00 (20000 cents)"));
  assert.ok(output.includes("Claimer      : agent-007"));
  assert.ok(output.includes("Must export Prometheus format"));
  assert.ok(output.includes("Full issue text goes here"));
});
