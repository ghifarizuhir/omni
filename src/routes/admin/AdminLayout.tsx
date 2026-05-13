import React from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
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
  const location = useLocation();

  if (!user?.isSuperadmin) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl border border-ois-border text-center">
        <Shield className="mx-auto text-ois-danger" size={36} />
        <h2 className="mt-3 text-lg font-bold text-ois-text">Access denied</h2>
        <p className="text-sm text-ois-text-muted mt-1">
          You need superadmin privileges to access the admin module.
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
