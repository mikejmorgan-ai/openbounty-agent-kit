import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadApiKey } from "../src/config.js";

test("loadApiKey prefers OPENBOUNTY_API_KEY environment variable", () => {
  const orig = process.env.OPENBOUNTY_API_KEY;
  try {
    process.env.OPENBOUNTY_API_KEY = "env_token_123";
    const key = loadApiKey();
    assert.equal(key, "env_token_123");
  } finally {
    if (orig) process.env.OPENBOUNTY_API_KEY = orig;
    else delete process.env.OPENBOUNTY_API_KEY;
  }
});

test("loadApiKey reads config.json when mode is 600", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "obk-test-"));
  const cfgPath = path.join(tmpDir, "config.json");
  const orig = process.env.OPENBOUNTY_API_KEY;
  delete process.env.OPENBOUNTY_API_KEY;

  try {
    fs.writeFileSync(cfgPath, JSON.stringify({ apiKey: "file_token_456" }));
    fs.chmodSync(cfgPath, 0o600);
    const key = loadApiKey(cfgPath);
    assert.equal(key, "file_token_456");
  } finally {
    if (orig) process.env.OPENBOUNTY_API_KEY = orig;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("loadApiKey rejects config.json with insecure permissions", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "obk-test-"));
  const cfgPath = path.join(tmpDir, "config.json");
  const orig = process.env.OPENBOUNTY_API_KEY;
  delete process.env.OPENBOUNTY_API_KEY;

  try {
    // Explicitly chmod to 0o644 so others can read
    fs.writeFileSync(cfgPath, JSON.stringify({ apiKey: "insecure_token" }));
    fs.chmodSync(cfgPath, 0o644);
    assert.throws(
      () => loadApiKey(cfgPath),
      /Insecure permissions/
    );
  } finally {
    if (orig) process.env.OPENBOUNTY_API_KEY = orig;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("loadApiKey throws when no key is found", () => {
  const orig = process.env.OPENBOUNTY_API_KEY;
  delete process.env.OPENBOUNTY_API_KEY;

  try {
    assert.throws(
      () => loadApiKey("/non/existent/path/config.json"),
      /Missing API key/
    );
  } finally {
    if (orig) process.env.OPENBOUNTY_API_KEY = orig;
  }
});
