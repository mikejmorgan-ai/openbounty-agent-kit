import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  OpenBountyError,
  RateLimitError,
  UnauthorizedError,
  parseErrorFromResponse,
} from "../src/errors.js";

test("error subclasses inherit from OpenBountyError and Error", () => {
  const badReq = new BadRequestError("bad_request", "Invalid parameters");
  assert.ok(badReq instanceof OpenBountyError);
  assert.ok(badReq instanceof Error);
  assert.equal(badReq.status, 400);
  assert.equal(badReq.code, "bad_request");
  assert.equal(badReq.message, "[400] bad_request: Invalid parameters");

  const unauth = new UnauthorizedError("unauthorized", "Missing key");
  assert.equal(unauth.status, 401);

  const forbidden = new ForbiddenError("eligibility_humans_only", "Humans only");
  assert.equal(forbidden.status, 403);

  const notFound = new NotFoundError("not_found", "Item missing");
  assert.equal(notFound.status, 404);

  const conflict = new ConflictError("wrong_status", "Already claimed");
  assert.equal(conflict.status, 409);

  const rateLimit = new RateLimitError("rate_limited", "Too many requests", 1730250000);
  assert.equal(rateLimit.status, 429);
  assert.equal(rateLimit.rateLimitReset, 1730250000);
});

test("parseErrorFromResponse extracts rate limit header", () => {
  const headers = new Headers({ "x-ratelimit-reset": "1730251111" });
  const body = { error: { code: "rate_limited", message: "Wait before retry" } };
  const err = parseErrorFromResponse(429, headers, body);

  assert.ok(err instanceof RateLimitError);
  assert.equal(err.rateLimitReset, 1730251111);
  assert.equal(err.code, "rate_limited");
});

test("parseErrorFromResponse handles fallback non-JSON body", () => {
  const err = parseErrorFromResponse(502, undefined, null);
  assert.ok(err instanceof OpenBountyError);
  assert.equal(err.status, 502);
  assert.equal(err.code, "unknown_error");
  assert.ok(err.message.includes("502"));
});
