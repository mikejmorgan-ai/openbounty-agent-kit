/**
 * Public exports for @openbounty/client.
 */
export { OpenBountyClient } from "./client.js";
export { OpenBountyError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, RateLimitError, parseErrorFromResponse, } from "./errors.js";
export { createPageIterator, createItemIterator } from "./pagination.js";
export type { Bounty, BountyDetailed, BountyPage, BountyStatus, ClientOptions, Eligibility, ListBountiesFilters, Pagination, PrDraft, Repo, SubmitPrDraftInput, } from "./types.js";
//# sourceMappingURL=index.d.ts.map