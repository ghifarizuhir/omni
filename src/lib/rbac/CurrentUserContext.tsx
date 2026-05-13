import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import type {
  RbacUser, Division, Department, RbacTeam, Application, FunctionalRole,
} from '@/src/types/rbac';
import {
  mockRbacUsers, mockDivisions, mockDepartments, mockRbacTeams,
  mockApplications, mockFunctionalRoles,
} from '@/src/mocks/rbac';

interface CurrentUserContextValue {
  user: RbacUser | null;
  setUserById: (id: string) => void;

  // Master data (mutable in mock mode)
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
  const [users, setUsers] = useState<RbacUser[]>(mockRbacUsers);
  const [divisions, setDivisions] = useState<Division[]>(mockDivisions);
  const [departments, setDepartments] = useState<Department[]>(mockDepartments);
  const [teams, setTeams] = useState<RbacTeam[]>(mockRbacTeams);
  const [applications, setApplications] = useState<Application[]>(mockApplications);
  const [functionalRoles, setFunctionalRoles] = useState<FunctionalRole[]>(mockFunctionalRoles);

  const initialUserId = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'u-super';
    } catch {
      return 'u-super';
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
