/**
 * Async pagination iterators for cursor-based streams.
 */

import type { Bounty, BountyPage } from "./types.js";

export async function* createPageIterator(
  fetchPage: (cursor?: string | null) => Promise<BountyPage>
): AsyncIterableIterator<BountyPage> {
  let nextCursor: string | null = null;
  let hasMore = true;
  let started = false;

  while (hasMore && (!started || nextCursor !== null)) {
    const page = await fetchPage(started ? nextCursor : undefined);
    started = true;
    hasMore = page.pagination?.has_more ?? false;
    nextCursor = page.pagination?.next_cursor ?? null;
    yield page;
  }
}

export async function* createItemIterator(
  fetchPage: (cursor?: string | null) => Promise<BountyPage>
): AsyncIterableIterator<Bounty> {
  for await (const page of createPageIterator(fetchPage)) {
    for (const item of page.data || []) {
      yield item;
    }
  }
}
