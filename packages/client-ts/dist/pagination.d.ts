/**
 * Async pagination iterators for cursor-based streams.
 */
import type { Bounty, BountyPage } from "./types.js";
export declare function createPageIterator(fetchPage: (cursor?: string | null) => Promise<BountyPage>): AsyncIterableIterator<BountyPage>;
export declare function createItemIterator(fetchPage: (cursor?: string | null) => Promise<BountyPage>): AsyncIterableIterator<Bounty>;
//# sourceMappingURL=pagination.d.ts.map