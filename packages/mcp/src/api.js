/**
 * Thin HTTP client for the openbounty.ai agent API.
 */

const DEFAULT_BASE_URL = "https://openbounty.ai/api/v1";

export class OpenBountyApi {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENBOUNTY_API_KEY || null;
    this.baseUrl = (options.baseUrl || process.env.OPENBOUNTY_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  _getHeaders() {
    if (!this.apiKey) {
      throw new Error("Missing OPENBOUNTY_API_KEY environment variable.");
    }
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": "openbounty-mcp/0.1.0",
    };
  }

  async _request(path, options = {}) {
    const url = `${this.baseUrl}/${path.replace(/^\/+/, "")}`;
    const headers = this._getHeaders();

    const response = await this.fetchFn(url, {
      ...options,
      headers: {
        ...headers,
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
      const message = data?.error?.message || data?.message || `HTTP ${response.status} ${response.statusText || ""}`.trim();
      const err = new Error(`[${response.status}] ${code}: ${message}`);
      err.status = response.status;
      err.code = code;
      err.raw = data;
      throw err;
    }

    return data?.data !== undefined ? data.data : data;
  }

  async listBounties(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.eligibility) params.set("eligibility", filters.eligibility);
    if (filters.min_amount_cents != null) params.set("min_amount_cents", String(filters.min_amount_cents));
    if (filters.max_amount_cents != null) params.set("max_amount_cents", String(filters.max_amount_cents));
    if (filters.cursor) params.set("cursor", filters.cursor);
    if (filters.limit != null) params.set("limit", String(filters.limit));

    const queryString = params.toString();
    const path = queryString ? `bounties?${queryString}` : "bounties";

    // For list, return full envelope to preserve pagination if present
    const url = `${this.baseUrl}/${path}`;
    const headers = this._getHeaders();
    const response = await this.fetchFn(url, { headers });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const code = data?.error?.code || "request_failed";
      const message = data?.error?.message || `HTTP ${response.status}`;
      const err = new Error(`[${response.status}] ${code}: ${message}`);
      err.status = response.status;
      err.code = code;
      throw err;
    }

    return data;
  }

  async getBounty(id) {
    if (!id) throw new Error("bounty id is required");
    return this._request(`bounties/${encodeURIComponent(id)}`);
  }

  async claimBounty(id) {
    if (!id) throw new Error("bounty id is required");
    return this._request(`bounties/${encodeURIComponent(id)}/claim`, {
      method: "POST",
    });
  }

  async releaseClaim(id) {
    if (!id) throw new Error("bounty id is required");
    return this._request(`bounties/${encodeURIComponent(id)}/release-claim`, {
      method: "POST",
    });
  }

  async submitPrDraft(payload) {
    if (!payload?.bounty_id) throw new Error("bounty_id is required");
    if (!payload?.branch_name) throw new Error("branch_name is required");
    if (!payload?.diff) throw new Error("diff is required");
    if (!Array.isArray(payload?.files_changed) || payload.files_changed.length === 0) {
      throw new Error("files_changed must be a non-empty array");
    }

    return this._request("pr-drafts", {
      method: "POST",
      body: JSON.stringify({
        bounty_id: payload.bounty_id,
        branch_name: payload.branch_name,
        diff: payload.diff,
        files_changed: payload.files_changed,
        ...(payload.test_output ? { test_output: payload.test_output } : {}),
      }),
    });
  }

  async getPrDraft(id) {
    if (!id) throw new Error("draft id is required");
    return this._request(`pr-drafts/${encodeURIComponent(id)}`);
  }
}
