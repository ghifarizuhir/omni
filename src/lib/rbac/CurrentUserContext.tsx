import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import type {
  RbacUser, Division, Department, RbacTeam, Application, FunctionalRole,
} from '@/src/types/rbac';
import type { CatalogItem } from '@/src/types/request';
import type { Release } from '@/src/types/release';
import { rbacService, requestsService, releasesService } from '@/src/services';
import { useAuthSession } from '@/src/lib/auth/session';
import { registerRbacOrgTree } from './engine';
import { registerCatalogItems } from './requestResource';
import { registerReleases } from './deploymentResource';

interface CurrentUserContextValue {
  user: RbacUser | null;
  setUserById: (id: string) => void;

  // Master data (mutable locally for the admin/persona UI; the source of
  // truth is the API, but the admin panel may experiment with "what-if"
  // changes without persisting).
  users: RbacUser[];
  divisions: Division[];
  departments: Department[];
  teams: RbacTeam[];   // RBAC org teams (distinct from mocks/teams.ts service teams)
  applications: Application[];
  functionalRoles: FunctionalRole[];

  // Mutators (mock state)
  upsertUser: (u: RbacUser) => void;
  removeUser: (id: string) => void;

  upsertDivision: (d: Division) => void;
  removeDivision: (id: string) => void;

  upsertDepartment: (d: Department) => void;
  removeDepartment: (id: string) => void;

  upsertTeam: (t: RbacTeam) => void;
  removeTeam: (id: string) => void;

  upsertApplication: (a: Application) => void;
  removeApplication: (id: string) => void;

  upsertFunctionalRole: (r: FunctionalRole) => void;
  removeFunctionalRole: (id: string) => void;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

const STORAGE_KEY = 'ois.rbac.currentUserId';

export const CurrentUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const session = useAuthSession();
  const sessionUserId = session?.user.id ?? null;

  const [users, setUsers] = useState<RbacUser[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<RbacTeam[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [functionalRoles, setFunctionalRoles] = useState<FunctionalRole[]>([]);

  // Load the org tree (plus catalog + releases for the resource helpers) from
  // the live API. The previous implementation seeded from mocks; the
  // mock import is gone as part of M6.1 leakage sweep.
  // The fetch is deferred until `session` is known so we don't fire
  // `rbac/*` (which requires `rbac.read`) while the session is still
  // `null` and risk a transient 401 that leaves `users` empty and the
  // admin page stuck on “Loading user persona…”.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const calls = [
      ['users', () => rbacService.users() as Promise<RbacUser[]>] as const,
      ['divisions', () => rbacService.divisions() as Promise<Division[]>] as const,
      ['departments', () => rbacService.departments() as Promise<Department[]>] as const,
      ['teams', () => rbacService.teams() as Promise<RbacTeam[]>] as const,
      ['applications', () => rbacService.applications() as Promise<Application[]>] as const,
      ['roles', () => rbacService.roles() as Promise<FunctionalRole[]>] as const,
      ['catalog', () => requestsService.catalog() as Promise<CatalogItem[]>] as const,
      ['releases', () => releasesService.list() as Promise<Release[]>] as const,
    ];
    Promise.allSettled(calls.map(([, fn]) => fn())).then(results => {
      if (cancelled) return;
      const get = <T,>(i: number): T | null => {
        const r = results[i];
        if (r.status === 'fulfilled') return r.value as T;
        console.error(`[rbac] ${calls[i][0]} failed:`, r.reason);
        return null;
      };
      const usersResp = get<RbacUser[]>(0) ?? [];
      const divs     = get<Division[]>(1) ?? [];
      const depts    = get<Department[]>(2) ?? [];
      const tms      = get<RbacTeam[]>(3) ?? [];
      const apps     = get<Application[]>(4) ?? [];
      const roles    = get<FunctionalRole[]>(5) ?? [];
      const cat      = get<CatalogItem[]>(6) ?? [];
      const rels     = get<Release[]>(7) ?? [];
      // If the critical `users` call failed but we have a valid session,
      // synthesize a fallback user so the UI doesn't stay stuck on
      // “Loading user persona…”. The admin page can still render
      // (it gates on `session.permissions`, not the org tree).
      const effectiveUsers = (usersResp.length === 0 && session?.user)
        ? [{
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            divisionId: null,
            departmentId: null,
            teamId: null,
            level: null,
            functionalRoles: [],
            isSuperadmin: session.permissions.includes('system.admin'),
            active: true,
          } as RbacUser]
        : usersResp;
      setUsers(effectiveUsers);
      setDivisions(divs);
      setDepartments(depts);
      setTeams(tms);
      setApplications(apps);
      setFunctionalRoles(roles);
      registerRbacOrgTree({ applications: apps, teams: tms, departments: depts, divisions: divs });
      registerCatalogItems(cat);
      registerReleases(rels);
    });
    return () => { cancelled = true; };
  }, [session]);

  // Re-register whenever the in-memory state diverges from the API (e.g. the
  // persona-switcher admin panel mutates `users` locally). Keeps the engine's
  // registry in sync with what `useCan` sees.
  useEffect(() => {
    registerRbacOrgTree({ applications, teams, departments, divisions });
  }, [applications, teams, departments, divisions]);

  const initialUserId = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || sessionUserId || '';
    } catch {
      return sessionUserId || '';
    }
  })();
  const [currentUserId, setCurrentUserId] = useState<string>(initialUserId);

  // `user` is resolved from the org tree when available, but falls back to
  // a synthetic user derived from the session so the UI (e.g. /admin)
  // doesn't stay stuck on “Loading user persona…” when the org tree is
  // empty or a transient fetch fails. This is what makes the page work
  // without a manual refresh.
  const user = useMemo(() => {
    if (users.length > 0) {
      return users.find(u => u.id === currentUserId) ?? users.find(u => u.id === (sessionUserId ?? '')) ?? users[0] ?? null;
    }
    if (session?.user) {
      return {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        divisionId: null,
        departmentId: null,
        teamId: null,
        level: null,
        functionalRoles: [],
        isSuperadmin: session.permissions.includes('system.admin'),
        active: true,
      } as RbacUser;
    }
    return null;
  }, [users, currentUserId, session, sessionUserId]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, currentUserId); } catch {}
  }, [currentUserId]);

  useEffect(() => {
    if (users.length === 0) return;
    const resolved = users.find(u => u.id === currentUserId);
    if (resolved) return;
    const fromSession = sessionUserId ? users.find(u => u.id === sessionUserId) : null;
    const fallback = fromSession ?? users[0];
    if (fallback && fallback.id !== currentUserId) {
      setCurrentUserId(fallback.id);
    }
  }, [users, currentUserId, sessionUserId]);

  // Keep currentUserId in sync with the session once it loads (covers the
  // case where initialUserId was computed before `session` was available).
  useEffect(() => {
    if (!sessionUserId) return;
    if (currentUserId) return;
    setCurrentUserId(sessionUserId);
  }, [sessionUserId, currentUserId]);

  const setUserById = useCallback((id: string) => setCurrentUserId(id), []);

  function makeUpsert<T extends { id: string }>(setList: React.Dispatch<React.SetStateAction<T[]>>) {
    return (item: T) => setList(list => {
      const idx = list.findIndex(x => x.id === item.id);
      if (idx === -1) return [...list, item];
      const next = [...list]; next[idx] = item; return next;
    });
  }
  function makeRemove<T extends { id: string }>(setList: React.Dispatch<React.SetStateAction<T[]>>) {
    return (id: string) => setList(list => list.filter(x => x.id !== id));
  }

  const value: CurrentUserContextValue = {
    user,
    setUserById,
    users, divisions, departments, teams, applications, functionalRoles,
    upsertUser: makeUpsert(setUsers),
    removeUser: makeRemove(setUsers),
    upsertDivision: makeUpsert(setDivisions),
    removeDivision: makeRemove(setDivisions),
    upsertDepartment: makeUpsert(setDepartments),
    removeDepartment: makeRemove(setDepartments),
    upsertTeam: makeUpsert(setTeams),
    removeTeam: makeRemove(setTeams),
    upsertApplication: makeUpsert(setApplications),
    removeApplication: makeRemove(setApplications),
    upsertFunctionalRole: makeUpsert(setFunctionalRoles),
    removeFunctionalRole: makeRemove(setFunctionalRoles),
  };

  return (
    <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
  );
};

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) throw new Error('useCurrentUser must be used inside CurrentUserProvider');
  return ctx;
}
