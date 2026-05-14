// DB-backed user → system role assignment. Lists users from /admin/users with
// their currently-assigned system roles, lets admins replace the role set.

import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { ShieldCheck } from 'lucide-react';
import { ApiError } from '@/src/services/core';
import { adminApi, type AdminUserDto, type RoleDto } from '@/src/services/adminService';

export const UserSystemRoles: React.FC = () => {
  const [users, setUsers] = useState<AdminUserDto[] | null>(null);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminUserDto | null>(null);

  const reload = () =>
    Promise.all([adminApi.listUsers(), adminApi.listRoles()])
      .then(([u, r]) => { setUsers(u); setRoles(r); })
      .catch((err: Error) => setError(err.message));

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  if (error) return <div className="text-sm text-ois-danger">Failed to load: {error}</div>;
  if (!users) return <div className="text-sm text-ois-text-muted">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-base font-bold text-ois-text">User → System Role Assignment</h3>
          <div className="text-xs text-ois-text-muted">
            Assign DB-backed system roles. Permission set takes effect on the user's next request.
          </div>
        </div>
        <div className="ml-auto w-64">
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>System Roles</TH>
            <TH className="w-32" />
          </TR>
        </THead>
        <TBody>
          {filtered.map(u => (
            <TR key={u.id}>
              <TD className="font-medium">{u.name}</TD>
              <TD className="text-ois-text-muted">{u.email}</TD>
              <TD>
                <div className="flex flex-wrap gap-1">
                  {u.roles.length === 0
                    ? <span className="text-xs text-ois-text-subtle">—</span>
                    : u.roles.map(r => <Badge key={r.id} variant="neutral">{r.name}</Badge>)}
                </div>
              </TD>
              <TD>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!u.membershipId}
                    onClick={() => setEditing(u)}
                  >
                    <ShieldCheck size={14} className="mr-1" /> Assign
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {editing && (
        <AssignRolesModal
          user={editing}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
};

const AssignRolesModal: React.FC<{
  user: AdminUserDto;
  roles: RoleDto[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ user, roles, onClose, onSaved }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(user.roles.map(r => r.id)));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!user.membershipId) return;
    setSaving(true);
    setFormError(null);
    try {
      await adminApi.setMembershipRoles(user.membershipId, Array.from(selected));
      onSaved();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Assign roles: ${user.name}`}>
      <div className="space-y-3 py-4">
        {formError && (
          <div className="rounded-md border border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs text-ois-danger">
            {formError}
          </div>
        )}
        <div className="text-xs text-ois-text-muted">{user.email}</div>
        <div className="border border-ois-border rounded-md divide-y divide-ois-border max-h-96 overflow-y-auto">
          {roles.map(r => (
            <label
              key={r.id}
              className="flex items-start gap-2 px-3 py-2 hover:bg-ois-bg cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
              />
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs">{r.name}</span>
                  {r.isSystem && <Badge variant="neutral">built-in</Badge>}
                </span>
                {r.description && (
                  <span className="block text-xs text-ois-text-muted mt-0.5">{r.description}</span>
                )}
                <span className="block text-xs text-ois-text-subtle mt-0.5">
                  {r.permissions.length} permission{r.permissions.length === 1 ? '' : 's'}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 py-4 border-t border-ois-border">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save</Button>
      </div>
    </Modal>
  );
};
