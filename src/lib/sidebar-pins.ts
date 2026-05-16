import { useSyncExternalStore } from 'react';

const KEY = 'ois.sidebar.pins.v1';
const listeners = new Set<() => void>();

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function write(pins: string[]) {
  window.localStorage.setItem(KEY, JSON.stringify(pins));
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
    () => [],
  );
}
