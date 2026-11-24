/**
 * Error hierarchy for OpenBounty API clients.
 */
export declare class OpenBountyError extends Error {
    readonly status: number;
    readonly code: string;
    readonly rateLimitReset?: number;
    readonly raw?: unknown;
    constructor(status: number, code: string, message: string, options?: {
        rateLimitReset?: number;
        raw?: unknown;
    });
}
export declare class BadRequestError extends OpenBountyError {
    constructor(code: string, message: string, raw?: unknown);
}
export declare class UnauthorizedError extends OpenBountyError {
    constructor(code: string, message: string, raw?: unknown);
}
export declare class ForbiddenError extends OpenBountyError {
    constructor(code: string, message: string, raw?: unknown);
}
export declare class NotFoundError extends OpenBountyError {
    constructor(code: string, message: string, raw?: unknown);
}
export declare class ConflictError extends OpenBountyError {
    constructor(code: string, message: string, raw?: unknown);
}
export declare class RateLimitError extends OpenBountyError {
    constructor(code: string, message: string, rateLimitReset?: number, raw?: unknown);
}
export declare function parseErrorFromResponse(status: number, headers: Headers | Record<string, string | null | undefined> | undefined, bodyData: any): OpenBountyError;
//# sourceMappingURL=errors.d.ts.map