import { useSyncExternalStore } from 'react';

const KEY = 'ois.sidebar.pins.v1';
const listeners = new Set<() => void>();

// useSyncExternalStore requires getSnapshot() to return a referentially-stable
// value when the underlying state hasn't changed. Re-parsing localStorage on
// every call yields a new array each time → infinite re-render. Cache the
// parsed snapshot here and only refresh it when the raw string changes
// (driven by write() invalidating the cache).
const EMPTY: string[] = [];
let snapshotCache: string[] | null = null;
let lastRaw: string | null | undefined;

function parseRaw(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const filtered = parsed.filter((p): p is string => typeof p === 'string');
    return filtered.length === 0 ? EMPTY : filtered;
  } catch {
    return EMPTY;
  }
}

function read(): string[] {
  if (typeof window === 'undefined') return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (snapshotCache !== null && raw === lastRaw) return snapshotCache;
  lastRaw = raw;
  snapshotCache = parseRaw(raw);
  return snapshotCache;
}

function write(pins: string[]) {
  const next = pins.length === 0 ? EMPTY : pins;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  // Invalidate cache so the next read() returns a fresh snapshot reference.
  lastRaw = undefined;
  snapshotCache = null;
  listeners.forEach(l => l());
}

export function togglePin(path: string) {
  const current = read();
  const next = current.includes(path)
    ? current.filter(p => p !== path)
    : [...current, path];
  write(next);
}

export function isPinned(path: string): boolean {
  return read().includes(path);
}

export function usePinnedPaths(): string[] {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    read,
    () => EMPTY,
  );
}
