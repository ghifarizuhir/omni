import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import { useAuthSession } from '@/src/lib/auth/session';
import { cn } from '@/src/lib/utils';
import {
  Shield, Building2, FolderTree, Users, AppWindow, Key, Eye, LayoutGrid,
} from 'lucide-react';

const tabs = [
  { to: '/admin',                end: true,  icon: LayoutGrid,  label: 'Overview' },
  { to: '/admin/divisions',                 icon: Building2,   label: 'Divisions' },
  { to: '/admin/departments',               icon: FolderTree,  label: 'Departments' },
  { to: '/admin/teams',                     icon: FolderTree,  label: 'Teams' },
  { to: '/admin/users',                     icon: Users,       label: 'Users' },
  { to: '/admin/applications',              icon: AppWindow,   label: 'Applications' },
  { to: '/admin/roles',                     icon: Key,         label: 'Functional Roles' },
  { to: '/admin/permissions',               icon: Eye,         label: 'Permissions' },
];

export const AdminLayout: React.FC = () => {
  const { user } = useCurrentUser();
  const session = useAuthSession();
  const location = useLocation();

  // Still loading session or persona list. Distinguish the two so a stuck
  // loading state is diagnosable instead of an opaque spinner.
  if (session === null) {
    return <div className="text-sm text-ois-text-muted p-8">Loading session…</div>;
  }
  if (user === null) {
    return (
      <div className="text-sm text-ois-text-muted p-8">
        Loading user persona… If this persists, the RBAC org tree did not load (check browser console for `[rbac] … failed` errors).
      </div>
    );
  }

  // Gate 1 — actual session: does the logged-in account have system.admin?
  const hasAdminPerm = session.permissions.includes('system.admin');
  if (!hasAdminPerm) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl border border-ois-border text-center">
        <Shield className="mx-auto text-ois-warning" size={36} />
        <h2 className="mt-3 text-lg font-bold text-ois-text">Session lacks admin access</h2>
        <p className="text-sm text-ois-text-muted mt-1">
          You are logged in as <strong>{session.user.email}</strong> which does not have the
          <code className="mx-1 px-1 bg-ois-bg rounded text-xs">system.admin</code>
          permission.
        </p>
        <p className="text-sm text-ois-text-muted mt-2">
          Log out and log back in as <strong>admin@omni.local</strong>{' '}
          (password: <code className="px-1 bg-ois-bg rounded text-xs">demo</code>), or run{' '}
          <code className="px-1 bg-ois-bg rounded text-xs">npm run db:seed</code> if the DB
          hasn't been seeded yet.
        </p>
      </div>
    );
  }

  // Gate 2 — persona: the switched-to persona must be a superadmin so the
  // engine and permission-rule UI work correctly.
  if (!user.isSuperadmin) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl border border-ois-border text-center">
        <Shield className="mx-auto text-ois-danger" size={36} />
        <h2 className="mt-3 text-lg font-bold text-ois-text">Switch to a superadmin persona</h2>
        <p className="text-sm text-ois-text-muted mt-1">
          Your login has admin access, but the active persona in the top-bar user switcher
          is not a superadmin. Switch the persona to <strong>Super Admin</strong> to use
          the admin panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="text-ois-primary" size={22} />
        <div>
          <h1 className="text-xl font-bold text-ois-text">RBAC Administration</h1>
          <p className="text-xs text-ois-text-muted">Manage org structure, users, applications, and roles.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-ois-border">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => cn(
              'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'text-ois-primary border-ois-primary'
                : 'text-ois-text-muted border-transparent hover:text-ois-text hover:border-ois-border',
            )}
          >
            <t.icon size={15} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </div>

      <div key={location.pathname}>
        <Outlet />
      </div>
    </div>
  );
};
