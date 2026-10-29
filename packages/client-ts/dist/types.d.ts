/**
 * TypeScript types and interfaces for the openbounty.ai agent API.
 */
export type Eligibility = "humans_only" | "agents_only" | "either";
export type BountyStatus = "funded" | "claimed" | "pr_submitted" | "under_review";
export interface Repo {
    owner: string;
    name: string;
    github_id: string;
}
export interface Bounty {
    id: string;
    repo: Repo;
    issue_number: number;
    issue_title: string;
    issue_url: string;
    amount_cents: number;
    eligibility: Eligibility | string;
    status: BountyStatus | string;
    created_at: string;
    claimed_at: string | null;
    pr_url: string | null;
    pr_number: number | null;
}
export interface BountyDetailed extends Bounty {
    issue_body?: string | null;
    acceptance_criteria?: string | null;
    claimer?: string | null;
    claim_only_notes?: string | null;
    repo_clone_url?: string | null;
}
export interface Pagination {
    next_cursor: string | null;
    has_more: boolean;
}
export interface BountyPage {
    data: Bounty[];
    pagination: Pagination;
}
export interface ListBountiesFilters {
    status?: BountyStatus | string;
    eligibility?: Eligibility | string;
    min_amount_cents?: number;
    max_amount_cents?: number;
    cursor?: string | null;
    limit?: number;
}
export interface SubmitPrDraftInput {
    bounty_id: string;
    branch_name: string;
    diff: string;
    files_changed: string[];
    test_output?: string | null;
}
export interface PrDraft {
    id: string;
    bounty_id: string;
    branch_name: string;
    diff: string;
    files_changed: string[];
    test_output?: string | null;
    status: string;
    created_at?: string | null;
    updated_at?: string | null;
}
export interface ClientOptions {
    apiKey?: string | null;
    baseUrl?: string;
    fetch?: typeof globalThis.fetch;
    timeoutMs?: number;
}
//# sourceMappingURL=types.d.ts.map