import { test } from "node:test";
import assert from "node:assert/strict";
import { OpenBountyClient } from "../src/client.js";

test("iterPages and iterBounties traverse cursor pagination", async () => {
  const store = {
    undefined: {
      data: [{ id: "b1", issue_title: "One" }],
      pagination: { next_cursor: "cur_2", has_more: true },
    },
    cur_2: {
      data: [{ id: "b2", issue_title: "Two" }],
      pagination: { next_cursor: "cur_3", has_more: true },
    },
    cur_3: {
      data: [{ id: "b3", issue_title: "Three" }],
      pagination: { next_cursor: null, has_more: false },
    },
  };

  const mockFetch = async (url) => {
    const parsed = new URL(url);
    const cursor = parsed.searchParams.get("cursor") || undefined;
    const res = store[cursor];
    return {
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => res,
    };
  };

  const client = new OpenBountyClient({
    apiKey: "test_key",
    fetch: mockFetch,
  });

  // Test iterPages
  const pages = [];
  for await (const page of client.iterPages()) {
    pages.push(page);
  }
  assert.equal(pages.length, 3);
  assert.equal(pages[0].data[0].id, "b1");
  assert.equal(pages[1].data[0].id, "b2");
  assert.equal(pages[2].data[0].id, "b3");

  // Test iterBounties
  const bounties = [];
  for await (const b of client.iterBounties()) {
    bounties.push(b);
  }
  assert.equal(bounties.length, 3);
  assert.deepEqual(
    bounties.map((b) => b.id),
    ["b1", "b2", "b3"]
  );
});
