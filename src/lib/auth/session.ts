// Small session-cache hook backed by /api/v1/auth/me.
// The session is fetched once per page-load and shared across consumers via a
// tiny pub-sub. `RequireAuth` already calls `/auth/me` for its gate, so this
// adds at most one extra request for the same data; React-Query is overkill
// for a single endpoint with no invalidation story yet.

import { useEffect, useState } from 'react';
import { apiFetch } from '@/src/services/core';

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthSession {
  user: AuthSessionUser;
  tenantId: string;
  roles: { id: string; name: string }[];
  roleNames: string[];
  permissions: string[];
}

let cached: AuthSession | null = null;
let pending: Promise<AuthSession> | null = null;
const subscribers = new Set<(s: AuthSession | null) => void>();

function notify(): void {
  for (const fn of subscribers) fn(cached);
}

function loadSession(): Promise<AuthSession> {
  if (pending) return pending;
  pending = apiFetch<AuthSession>('/auth/me')
    .then(s => { cached = s; notify(); return s; })
    .finally(() => { pending = null; });
  return pending;
}

// Force a refresh (e.g. after login). Safe to call on logout — clears cache.
export function refreshAuthSession(): Promise<AuthSession | null> {
  pending = null;
  return loadSession().catch(() => { cached = null; notify(); return null; });
}

export function clearAuthSession(): void {
  cached = null;
  pending = null;
  notify();
}

// M6.6 — clear the cache when any apiFetch returns 401, so `useAuthSession`
// consumers immediately see `null` (driving the UI to its anonymous state).
if (typeof window !== 'undefined') {
  window.addEventListener('auth:session-expired', () => {
    cached = null;
    pending = null;
    notify();
  });
}

// Returns the current session or null while loading / anonymous.
export function useAuthSession(): AuthSession | null {
  const [s, setS] = useState<AuthSession | null>(cached);
  useEffect(() => {
    subscribers.add(setS);
    if (!cached) loadSession().catch(() => {});
    return () => { subscribers.delete(setS); };
  }, []);
  return s;
}
