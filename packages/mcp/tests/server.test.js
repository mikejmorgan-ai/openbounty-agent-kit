import { test } from "node:test";
import assert from "node:assert/strict";
import { handleRpcMessage } from "../src/server.js";

test("handleRpcMessage handles initialize request", async () => {
  const req = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    },
  };

  const res = await handleRpcMessage(req, {});
  assert.equal(res.id, 1);
  assert.equal(res.result.protocolVersion, "2024-11-05");
  assert.equal(res.result.serverInfo.name, "openbounty-mcp");
  assert.ok(res.result.capabilities.tools);
});

test("handleRpcMessage handles notifications without response", async () => {
  const req = {
    jsonrpc: "2.0",
    method: "notifications/initialized",
  };
  const res = await handleRpcMessage(req, {});
  assert.equal(res, null);
});

test("handleRpcMessage handles ping request", async () => {
  const req = { jsonrpc: "2.0", id: 2, method: "ping" };
  const res = await handleRpcMessage(req, {});
  assert.equal(res.id, 2);
  assert.deepEqual(res.result, {});
});

test("handleRpcMessage lists tools", async () => {
  const req = { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} };
  const res = await handleRpcMessage(req, {});
  assert.equal(res.id, 3);
  assert.ok(Array.isArray(res.result.tools));
  assert.equal(res.result.tools.length, 6);
});

test("handleRpcMessage calls tool handler", async () => {
  const handlers = {
    async list_bounties(args) {
      return {
        content: [{ type: "text", text: `Found bounties for ${args.status}` }],
        isError: false,
      };
    },
  };

  const req = {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "list_bounties",
      arguments: { status: "funded" },
    },
  };

  const res = await handleRpcMessage(req, handlers);
  assert.equal(res.id, 4);
  assert.equal(res.result.isError, false);
  assert.ok(res.result.content[0].text.includes("Found bounties for funded"));
});

test("handleRpcMessage returns error for unknown tool", async () => {
  const req = {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "non_existent_tool",
      arguments: {},
    },
  };

  const res = await handleRpcMessage(req, {});
  assert.equal(res.id, 5);
  assert.equal(res.error.code, -32601);
  assert.ok(res.error.message.includes("Tool not found"));
});
