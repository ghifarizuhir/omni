import React from 'react';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import { Building2, FolderTree, Users, AppWindow, Key } from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const { divisions, departments, teams, users, applications, functionalRoles } = useCurrentUser();

  const stats = [
    { icon: Building2,  label: 'Divisions',      value: divisions.length },
    { icon: FolderTree, label: 'Departments',    value: departments.length },
    { icon: FolderTree, label: 'Teams',          value: teams.length },
    { icon: Users,      label: 'Users',          value: users.length },
    { icon: AppWindow,  label: 'Applications',   value: applications.length },
    { icon: Key,        label: 'Functional Roles', value: functionalRoles.length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-ois-border rounded-xl p-4">
            <s.icon size={18} className="text-ois-text-subtle" />
            <div className="mt-2 text-2xl font-bold text-ois-text">{s.value}</div>
            <div className="text-xs text-ois-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-ois-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-ois-text mb-2">Model</h3>
        <p className="text-sm text-ois-text-muted leading-relaxed">
          This RBAC uses a hybrid <strong>role + attribute</strong> design. User access is determined by:
          {' '}<strong>division + department + team + hierarchy level</strong> (with full inheritance), plus
          {' '}<strong>functional roles</strong> (Change Manager, CAB Member, etc.). Scope to specific applications
          {' '}is derived from team ownership.
        </p>
        <ul className="mt-3 text-xs text-ois-text-muted space-y-1 list-disc list-inside">
          <li>Edit org structure under <em>Divisions / Departments / Teams</em>.</li>
          <li>Assign team ownership of applications under <em>Applications</em>.</li>
          <li>Manage users and assign hierarchy level + functional roles under <em>Users</em>.</li>
          <li>Inspect the static permission matrix under <em>Permissions</em>.</li>
        </ul>
      </div>
    </div>
  );
};
