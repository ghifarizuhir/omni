import type { Request, Response, NextFunction, RequestHandler } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'HttpError';
  }
}

export class NotFoundError extends HttpError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

// Wraps an async handler so thrown errors hit the central error middleware
// instead of crashing the process. Uses Express's default Request typing so
// `req.params` and `req.query` resolve correctly at the call site.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Returns the value or throws NotFoundError. Used to make 404 mapping concise.
export const required = <T>(value: T | null | undefined, resource: string): T => {
  if (value == null) throw new NotFoundError(resource);
  return value;
};

// Query string values come in as `string | string[] | undefined`. This narrows
// to a single string when the consumer expects one.
export const qString = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : undefined;

export const qBool = (v: unknown): boolean =>
  v === 'true' || v === '1' || v === true;

export const qStringArray = (v: unknown): string[] | undefined => {
  if (typeof v === 'string') return v.split(',').filter(Boolean);
  if (Array.isArray(v)) return v.map(String);
  return undefined;
};

export const qInt = (v: unknown, fallback?: number): number | undefined => {
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};
