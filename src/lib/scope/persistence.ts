import type { ScopeValue } from './ScopeContext';

const SCOPE_KEY = (userId: string) => `ois.scope.${userId}`;
const PIN_KEY   = (userId: string) => `ois.scope.${userId}.pinned`;

export function readScope(userId: string): ScopeValue {
  try {
    const raw = window.localStorage.getItem(SCOPE_KEY(userId));
    if (!raw) return 'all';
    const v = JSON.parse(raw);
    if (v === 'all') return 'all';
    if (typeof v === 'object' && v !== null && v.kind === 'app' && typeof v.appId === 'string') return v;
    return 'all';
  } catch { return 'all'; }
}

export function writeScope(userId: string, scope: ScopeValue): void {
  window.localStorage.setItem(SCOPE_KEY(userId), JSON.stringify(scope));
}

export function readPinned(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(PIN_KEY(userId));
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

export function writePinned(userId: string, pinned: string[]): void {
  window.localStorage.setItem(PIN_KEY(userId), JSON.stringify(pinned));
}
