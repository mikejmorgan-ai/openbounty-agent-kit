/**
 * Zero-dependency OpenBounty API TypeScript client.
 */
import { parseErrorFromResponse } from "./errors.js";
import { createItemIterator, createPageIterator } from "./pagination.js";
const DEFAULT_BASE_URL = "https://openbounty.ai/api/v1";
export class OpenBountyClient {
    apiKey;
    baseUrl;
    fetchFn;
    timeoutMs;
    constructor(options = {}) {
        const globalProcess = globalThis.process;
        const envKey = globalProcess?.env?.OPENBOUNTY_API_KEY;
        const key = options.apiKey || envKey;
        if (!key) {
            throw new Error("An API key must be provided either via the apiKey option or the OPENBOUNTY_API_KEY environment variable.");
        }
        this.apiKey = key;
        this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
        this.fetchFn = options.fetch || globalThis.fetch.bind(globalThis);
        this.timeoutMs = options.timeoutMs || 30_000;
    }
    _url(path) {
        return `${this.baseUrl}/${path.replace(/^\/+/, "")}`;
    }
    async _request(path, init = {}) {
        const url = this._url(path);
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "openbounty-client-ts/0.1.0",
            ...(init.headers || {}),
        };
        let response;
        try {
            response = await this.fetchFn(url, {
                ...init,
                headers,
            });
        }
        catch (err) {
            throw new Error(`Network request failed: ${err.message || String(err)}`);
        }
        let payload = null;
        const contentType = response.headers?.get?.("content-type") || "";
        if (contentType.includes("application/json")) {
            try {
                payload = await response.json();
            }
            catch {
                payload = null;
            }
        }
        else {
            try {
                const text = await response.text();
                payload = text ? JSON.parse(text) : null;
            }
            catch {
                payload = null;
            }
        }
        if (!response.ok) {
            throw parseErrorFromResponse(response.status, response.headers, payload);
        }
        if (payload && typeof payload === "object" && "data" in payload) {
            return payload.data;
        }
        return payload;
    }
    /**
     * List bounties with optional filters and cursor pagination.
     */
    async listBounties(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status)
            params.set("status", filters.status);
        if (filters.eligibility)
            params.set("eligibility", filters.eligibility);
        if (filters.min_amount_cents != null)
            params.set("min_amount_cents", String(filters.min_amount_cents));
        if (filters.max_amount_cents != null)
            params.set("max_amount_cents", String(filters.max_amount_cents));
        if (filters.cursor)
            params.set("cursor", filters.cursor);
        if (filters.limit != null)
            params.set("limit", String(filters.limit));
        const qs = params.toString();
        const path = qs ? `bounties?${qs}` : "bounties";
        // For listBounties, we want the entire envelope containing data and pagination
        const url = this._url(path);
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: "application/json",
            "User-Agent": "openbounty-client-ts/0.1.0",
        };
        const response = await this.fetchFn(url, { headers });
        let payload = null;
        try {
            payload = await response.json();
        }
        catch {
            payload = null;
        }
        if (!response.ok) {
            throw parseErrorFromResponse(response.status, response.headers, payload);
        }
        return {
            data: (payload?.data || []),
            pagination: payload?.pagination || { next_cursor: null, has_more: false },
        };
    }
    /**
     * Iterate over individual bounties across all pages automatically.
     */
    iterBounties(filters = {}) {
        return createItemIterator((cursor) => this.listBounties({ ...filters, cursor }));
    }
    /**
     * Iterate over pages of bounties across cursor pagination automatically.
     */
    iterPages(filters = {}) {
        return createPageIterator((cursor) => this.listBounties({ ...filters, cursor }));
    }
    /**
     * Retrieve detailed information for a single bounty.
     */
    async getBounty(id) {
        if (!id)
            throw new Error("bounty id is required");
        return this._request(`bounties/${encodeURIComponent(id)}`);
    }
    /**
     * Claim a funded bounty for your agent.
     */
    async claim(id) {
        if (!id)
            throw new Error("bounty id is required");
        return this._request(`bounties/${encodeURIComponent(id)}/claim`, {
            method: "POST",
        });
    }
    /**
     * Release a previously claimed bounty back to the funded pool.
     */
    async releaseClaim(id) {
        if (!id)
            throw new Error("bounty id is required");
        return this._request(`bounties/${encodeURIComponent(id)}/release-claim`, {
            method: "POST",
        });
    }
    /**
     * Submit a pull request draft for human operator review.
     */
    async submitPrDraft(body) {
        if (!body?.bounty_id)
            throw new Error("bounty_id is required");
        if (!body?.branch_name)
            throw new Error("branch_name is required");
        if (!body?.diff)
            throw new Error("diff is required");
        if (!Array.isArray(body?.files_changed) || body.files_changed.length === 0) {
            throw new Error("files_changed must be a non-empty array");
        }
        return this._request("pr-drafts", {
            method: "POST",
            body: JSON.stringify(body),
        });
    }
    /**
     * Retrieve review status and details of a previously submitted PR draft.
     */
    async getPrDraft(id) {
        if (!id)
            throw new Error("draft id is required");
        return this._request(`pr-drafts/${encodeURIComponent(id)}`);
    }
}
//# sourceMappingURL=client.js.map