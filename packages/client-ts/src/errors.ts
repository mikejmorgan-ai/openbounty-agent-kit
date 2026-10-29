/**
 * Error hierarchy for OpenBounty API clients.
 */

export class OpenBountyError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly rateLimitReset?: number;
  public readonly raw?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    options: { rateLimitReset?: number; raw?: unknown } = {}
  ) {
    super(`[${status}] ${code}: ${message}`);
    this.name = "OpenBountyError";
    this.status = status;
    this.code = code;
    this.rateLimitReset = options.rateLimitReset;
    this.raw = options.raw;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends OpenBountyError {
  constructor(code: string, message: string, raw?: unknown) {
    super(400, code, message, { raw });
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends OpenBountyError {
  constructor(code: string, message: string, raw?: unknown) {
    super(401, code, message, { raw });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends OpenBountyError {
  constructor(code: string, message: string, raw?: unknown) {
    super(403, code, message, { raw });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends OpenBountyError {
  constructor(code: string, message: string, raw?: unknown) {
    super(404, code, message, { raw });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends OpenBountyError {
  constructor(code: string, message: string, raw?: unknown) {
    super(409, code, message, { raw });
    this.name = "ConflictError";
  }
}

export class RateLimitError extends OpenBountyError {
  constructor(code: string, message: string, rateLimitReset?: number, raw?: unknown) {
    super(429, code, message, { rateLimitReset, raw });
    this.name = "RateLimitError";
  }
}

export function parseErrorFromResponse(
  status: number,
  headers: Headers | Record<string, string | null | undefined> | undefined,
  bodyData: any
): OpenBountyError {
  const code = bodyData?.error?.code || bodyData?.code || "unknown_error";
  const message = bodyData?.error?.message || bodyData?.message || `HTTP ${status}`;

  let rateLimitReset: number | undefined;
  let resetHeader: string | null = null;
  if (headers && typeof (headers as Headers).get === "function") {
    resetHeader = (headers as Headers).get("x-ratelimit-reset");
  } else if (headers && typeof headers === "object") {
    resetHeader = (headers as Record<string, string>)["x-ratelimit-reset"] || null;
  }

  if (resetHeader) {
    const parsed = parseInt(resetHeader, 10);
    if (!Number.isNaN(parsed)) {
      rateLimitReset = parsed;
    }
  }

  switch (status) {
    case 400:
      return new BadRequestError(code, message, bodyData);
    case 401:
      return new UnauthorizedError(code, message, bodyData);
    case 403:
      return new ForbiddenError(code, message, bodyData);
    case 404:
      return new NotFoundError(code, message, bodyData);
    case 409:
      return new ConflictError(code, message, bodyData);
    case 429:
      return new RateLimitError(code, message, rateLimitReset, bodyData);
    default:
      return new OpenBountyError(status, code, message, { rateLimitReset, raw: bodyData });
  }
}
