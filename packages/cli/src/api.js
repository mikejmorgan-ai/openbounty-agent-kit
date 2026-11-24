/**
 * API client methods for obk CLI.
 */

const DEFAULT_BASE_URL = "https://openbounty.ai/api/v1";

function getBaseUrl() {
  return (process.env.OPENBOUNTY_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function request(apiKey, endpoint, options = {}, fetchFn = globalThis.fetch) {
  const url = `${getBaseUrl()}/${endpoint.replace(/^\/+/, "")}`;
  const response = await fetchFn(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": "obk-cli/0.1.0",
      ...(options.headers || {}),
    },
  });

  let data = null;
  const contentType = response.headers?.get?.("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const code = data?.error?.code || data?.code || "request_failed";
    const msg = data?.error?.message || data?.message || `HTTP ${response.status} ${response.statusText || ""}`.trim();
    const err = new Error(`[${response.status}] ${code}: ${msg}`);
    err.status = response.status;
    err.code = code;
    err.data = data;
    throw err;
  }

  return data;
}

export async function fetchBounties(apiKey, filters = {}, fetchFn = globalThis.fetch) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.eligibility) params.set("eligibility", filters.eligibility);

  if (filters.min != null) {
    const minVal = Number(filters.min);
    // If min value is small (e.g. 50), treat as dollars ($50 -> 5000 cents); if >= 500 treat as cents
    const minCents = minVal < 500 ? Math.round(minVal * 100) : Math.round(minVal);
    params.set("min_amount_cents", String(minCents));
  }

  const qs = params.toString();
  const endpoint = qs ? `bounties?${qs}` : "bounties";
  const envelope = await request(apiKey, endpoint, {}, fetchFn);
  return envelope?.data || envelope || [];
}

export async function fetchBounty(apiKey, id, fetchFn = globalThis.fetch) {
  const envelope = await request(apiKey, `bounties/${encodeURIComponent(id)}`, {}, fetchFn);
  return envelope?.data || envelope;
}

export async function claimBounty(apiKey, id, fetchFn = globalThis.fetch) {
  const envelope = await request(apiKey, `bounties/${encodeURIComponent(id)}/claim`, {
    method: "POST",
  }, fetchFn);
  return envelope?.data || envelope;
}

export async function releaseBounty(apiKey, id, fetchFn = globalThis.fetch) {
  const envelope = await request(apiKey, `bounties/${encodeURIComponent(id)}/release-claim`, {
    method: "POST",
  }, fetchFn);
  return envelope?.data || envelope;
}
