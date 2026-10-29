/**
 * Async pagination iterators for cursor-based streams.
 */
export async function* createPageIterator(fetchPage) {
    let nextCursor = null;
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
export async function* createItemIterator(fetchPage) {
    for await (const page of createPageIterator(fetchPage)) {
        for (const item of page.data || []) {
            yield item;
        }
    }
}
//# sourceMappingURL=pagination.js.map