import React, { useState } from 'react';
import { ChevronDown, ShieldCheck, User } from 'lucide-react';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import { LEVEL_LABEL } from '@/src/types/rbac';
import { cn } from '@/src/lib/utils';

// Mock-mode user switcher so superadmins can preview the app as any user.
export const UserSwitcher: React.FC = () => {
  const { user, users, setUserById, divisions } = useCurrentUser();
  const [open, setOpen] = useState(false);

  if (!user) return null;
  const divName = (id: string | null) => id ? divisions.find(d => d.id === id)?.code ?? '' : '';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-ois-btn border border-ois-border bg-white hover:bg-ois-surface-muted text-xs"
      >
        {user.isSuperadmin
          ? <ShieldCheck size={14} className="text-ois-primary" />
          : <User size={14} className="text-ois-text-subtle" />}
        <span className="font-medium text-ois-text max-w-[140px] truncate">{user.name}</span>
        <span className="text-ois-text-subtle">·</span>
        <span className="text-ois-text-muted">
          {user.isSuperadmin ? 'Superadmin' : `${divName(user.divisionId)} ${user.level ? LEVEL_LABEL[user.level] : ''}`}
        </span>
        <ChevronDown size={12} className="text-ois-text-subtle" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-80 max-h-[420px] overflow-y-auto bg-white border border-ois-border rounded-xl shadow-xl z-40">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-ois-text-subtle font-bold border-b border-ois-border">
              Switch user (mock)
            </div>
            {users.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => { setUserById(u.id); setOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-ois-surface-muted flex items-start gap-2',
                  u.id === user.id && 'bg-ois-primary-pale/40',
                )}
              >
                {u.isSuperadmin
                  ? <ShieldCheck size={14} className="text-ois-primary shrink-0 mt-0.5" />
                  : <User size={14} className="text-ois-text-subtle shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ois-text truncate">{u.name}</div>
                  <div className="text-[11px] text-ois-text-muted truncate">
                    {u.isSuperadmin
                      ? 'Superadmin'
                      : [divName(u.divisionId), u.level ? LEVEL_LABEL[u.level] : null].filter(Boolean).join(' · ')}
                  </div>
                  {u.functionalRoles.length > 0 && (
                    <div className="text-[10px] text-ois-text-subtle truncate">
                      {u.functionalRoles.join(', ')}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
