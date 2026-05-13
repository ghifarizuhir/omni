import React, { useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Incident } from '@/src/types/incident';
import { usersService, useResource } from '@/src/services';
import { cn } from '@/src/lib/utils';

interface RolesPanelProps {
  incident: Incident;
}

interface Role {
  key: string;
  label: string;
  userId: string | null;
}

const getUserInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase();

const AVATAR_COLORS = [
  '#1F4FD4', '#0BA5EC', '#6941C6', '#DC6803',
  '#067647', '#B42318', '#0E7490', '#A16207',
];

const avatarColor = (userId: string) => {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

export const RolesPanel: React.FC<RolesPanelProps> = ({ incident }) => {
  const { data: usersData } = useResource(() => usersService.list(), []);
  const mockUsers = usersData ?? [];
  const [roles, setRoles] = useState<Role[]>([
    { key: 'ic', label: 'Incident Commander', userId: incident.incidentCommander ?? null },
    { key: 'ops', label: 'Operations Lead', userId: incident.assigneeId ?? null },
    { key: 'comms', label: 'Communications Lead', userId: 'u-006' }, // Helena Vasquez
    { key: 'scribe', label: 'Scribe', userId: null },
  ]);

  const [editing, setEditing] = useState<string | null>(null);

  const assignRole = (key: string, userId: string) => {
    setRoles(prev => prev.map(r => r.key === key ? { ...r, userId } : r));
    setEditing(null);
  };

  return (
    <div className="rounded-lg border border-ois-border bg-ois-bg overflow-hidden">
      <div className="px-3 py-2.5 border-b border-ois-border bg-ois-surface-muted/40 flex items-center gap-2">
        <Users size={13} className="text-ois-text-muted" />
        <span className="text-[11px] font-bold text-ois-text uppercase tracking-widest">Roles</span>
      </div>

      <div className="divide-y divide-ois-border">
        {roles.map(role => {
          const user = role.userId ? mockUsers.find(u => u.id === role.userId) : null;
          const isEditing = editing === role.key;

          return (
            <div key={role.key} className="px-3 py-2.5">
              <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-wider mb-1.5">
                {role.label}
              </p>

              {isEditing ? (
                <div className="space-y-1">
                  {mockUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => assignRole(role.key, u.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ois-surface-muted text-left transition-colors"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                        style={{ backgroundColor: avatarColor(u.id) }}
                      >
                        {getUserInitials(u.name)}
                      </div>
                      <span className="text-xs text-ois-text">{u.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setEditing(null)}
                    className="text-xs text-ois-text-muted hover:text-ois-text mt-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: avatarColor(user.id) }}
                    >
                      {getUserInitials(user.name)}
                    </div>
                    <span className="text-xs font-medium text-ois-text">{user.name}</span>
                  </div>
                  <button
                    onClick={() => setEditing(role.key)}
                    className="text-[11px] text-ois-primary hover:underline"
                  >
                    Reassign
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(role.key)}
                  className="flex items-center gap-1.5 text-xs text-ois-text-subtle hover:text-ois-primary transition-colors"
                >
                  <UserPlus size={12} />
                  <span>Assign</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
