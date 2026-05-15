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
  // the live API on mount. The previous implementation seeded from mocks; the
  // mock import is gone as part of M6.1 leakage sweep.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      rbacService.users() as Promise<RbacUser[]>,
      rbacService.divisions() as Promise<Division[]>,
      rbacService.departments() as Promise<Department[]>,
      rbacService.teams() as Promise<RbacTeam[]>,
      rbacService.applications() as Promise<Application[]>,
      rbacService.roles() as Promise<FunctionalRole[]>,
      requestsService.catalog() as Promise<CatalogItem[]>,
      releasesService.list() as Promise<Release[]>,
    ]).then(([usersResp, divs, depts, tms, apps, roles, cat, rels]) => {
      if (cancelled) return;
      setUsers(usersResp);
      setDivisions(divs);
      setDepartments(depts);
      setTeams(tms);
      setApplications(apps);
      setFunctionalRoles(roles);
      registerRbacOrgTree({ applications: apps, teams: tms, departments: depts, divisions: divs });
      registerCatalogItems(cat);
      registerReleases(rels);
    }).catch(() => {
      // Anonymous sessions hit 401 and the UI redirects to /login via
      // RequireAuth — leave state empty until the user signs in.
    });
    return () => { cancelled = true; };
  }, []);

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

  const user = useMemo(
    () => users.find(u => u.id === currentUserId) ?? null,
    [users, currentUserId],
  );

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
