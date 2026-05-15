import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { applicationCatalogApi, type CatalogAppDto } from '@/src/services/adminService';
import { useAuthSession } from '@/src/lib/auth/session';
import { readScope, writeScope, readPinned, writePinned } from './persistence';

export type ScopeValue = 'all' | { kind: 'app'; appId: string };

export interface MyApp {
  id: string;
  code: string;
  name: string;
  criticality: string | null;
  role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';
}

interface ScopeContextValue {
  scope: ScopeValue;
  setScope: (next: ScopeValue) => void;
  myApps: MyApp[];
  scopedAppIds: string[];
  writableApps: Array<Pick<MyApp, 'id' | 'code' | 'name'>>;
  pinned: string[];
  togglePin: (appId: string) => void;
  loading: boolean;
}

const ScopeCtx = createContext<ScopeContextValue | undefined>(undefined);

export const ScopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const session = useAuthSession();
  const userId = session?.user?.id ?? null;
  const [scope, setScopeState] = useState<ScopeValue>('all');
  const [pinned, setPinned] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogAppDto[] | null>(null);

  // Load persisted state once we know the user.
  useEffect(() => {
    if (!userId) return;
    setScopeState(readScope(userId));
    setPinned(readPinned(userId));
  }, [userId]);

  // Load catalog once.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    applicationCatalogApi.list()
      .then((rows) => { if (alive) setCatalog(rows); })
      .catch(() => { if (alive) setCatalog([]); });
    return () => { alive = false; };
  }, [userId]);

  const myApps: MyApp[] = useMemo(() => {
    return (catalog ?? [])
      .filter((a) => a.isMember && a.myRole !== null)
      .map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        criticality: a.criticality,
        role: a.myRole as MyApp['role'],
      }));
  }, [catalog]);

  const scopedAppIds = useMemo(() => {
    if (scope === 'all') return myApps.map((a) => a.id);
    return [scope.appId];
  }, [scope, myApps]);

  const writableApps = useMemo(
    () =>
      myApps
        .filter((a) => a.role === 'OWNER' || a.role === 'CONTRIBUTOR')
        .map(({ id, code, name }) => ({ id, code, name })),
    [myApps],
  );

  const setScope = (next: ScopeValue) => {
    setScopeState(next);
    if (userId) writeScope(userId, next);
    // eslint-disable-next-line no-console
    console.debug('[scope] switch', { from: scope, to: next });
  };

  const togglePin = (appId: string) => {
    setPinned((prev) => {
      const next = prev.includes(appId) ? prev.filter((x) => x !== appId) : [...prev, appId];
      if (userId) writePinned(userId, next);
      return next;
    });
  };

  return (
    <ScopeCtx.Provider
      value={{ scope, setScope, myApps, scopedAppIds, writableApps, pinned, togglePin, loading: catalog === null }}
    >
      {children}
    </ScopeCtx.Provider>
  );
};

export function useScope(): ScopeContextValue {
  const v = useContext(ScopeCtx);
  if (!v) throw new Error('useScope() outside <ScopeProvider>');
  return v;
}
