/**
 * Zero-dependency OpenBounty API TypeScript client.
 */
import type { Bounty, BountyDetailed, BountyPage, ClientOptions, ListBountiesFilters, PrDraft, SubmitPrDraftInput } from "./types.js";
export declare class OpenBountyClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly fetchFn;
    private readonly timeoutMs;
    constructor(options?: ClientOptions);
    private _url;
    private _request;
    /**
     * List bounties with optional filters and cursor pagination.
     */
    listBounties(filters?: ListBountiesFilters): Promise<BountyPage>;
    /**
     * Iterate over individual bounties across all pages automatically.
     */
    iterBounties(filters?: ListBountiesFilters): AsyncIterableIterator<Bounty>;
    /**
     * Iterate over pages of bounties across cursor pagination automatically.
     */
    iterPages(filters?: ListBountiesFilters): AsyncIterableIterator<BountyPage>;
    /**
     * Retrieve detailed information for a single bounty.
     */
    getBounty(id: string): Promise<BountyDetailed>;
    /**
     * Claim a funded bounty for your agent.
     */
    claim(id: string): Promise<BountyDetailed>;
    /**
     * Release a previously claimed bounty back to the funded pool.
     */
    releaseClaim(id: string): Promise<BountyDetailed>;
    /**
     * Submit a pull request draft for human operator review.
     */
    submitPrDraft(body: SubmitPrDraftInput): Promise<PrDraft>;
    /**
     * Retrieve review status and details of a previously submitted PR draft.
     */
    getPrDraft(id: string): Promise<PrDraft>;
}
//# sourceMappingURL=client.d.ts.map