import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from './apiMode';

// ── Errors ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

// ── HTTP client ───────────────────────────────────────────────────────────────

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const base = API_BASE_URL.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(window.location.origin.replace(/\/$/, '') + base + suffix);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    credentials: 'include',
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      // M6.6 — broadcast session-expiry so the top-level listener can flush
      // the cached `useAuthSession` and route to /login with a banner. A DOM
      // event keeps `services/core` free of upstream coupling on
      // `lib/auth/session`. The login-flow 401 (bad credentials) is filtered
      // out by the listener via `location.pathname`.
      window.dispatchEvent(new CustomEvent('auth:session-expired', {
        detail: { from: window.location.pathname + window.location.search },
      }));
    }
    throw new ApiError(res.status, (json as { message?: string })?.message ?? res.statusText, json);
  }
  return json as T;
}

// ── React hooks ───────────────────────────────────────────────────────────────

export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

// Standard fetch-with-loading hook. `fn` must be stable across renders or
// wrapped in useCallback; the dep array drives re-fetching.
export function useResource<T>(fn: () => Promise<T>, deps: ReadonlyArray<unknown> = []): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fnRef.current()
      .then(d => { if (!cancelled) { setData(d); setError(null); } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, refresh: () => setTick(t => t + 1) };
}

// Mutation hook for create/update/delete style calls.
export function useMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const mutate = async (args: TArgs): Promise<TResult> => {
    setLoading(true);
    setError(null);
    try {
      return await fnRef.current(args);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}
