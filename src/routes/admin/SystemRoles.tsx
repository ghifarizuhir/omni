// DB-backed system / tenant role editor. Lives alongside the functional-role
// editor (rich engine) on the same Roles admin page. M2 RBAC surface.

import React, { useEffect, useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Pencil, Trash2, Lock, Plus } from 'lucide-react';
import { ApiError } from '@/src/services/core';
import { adminApi, type PermissionDto, type RoleDto } from '@/src/services/adminService';

export const SystemRoles: React.FC = () => {
  const [roles, setRoles] = useState<RoleDto[] | null>(null);
  const [catalog, setCatalog] = useState<PermissionDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RoleDto | null>(null);
  const [open, setOpen] = useState(false);

  const reload = () => Promise.all([adminApi.listRoles(), adminApi.listPermissions()])
    .then(([r, c]) => { setRoles(r); setCatalog(c); })
    .catch((err: Error) => setError(err.message));

  useEffect(() => { reload(); }, []);

  const remove = async (role: RoleDto) => {
    if (role.isSystem) return;
    if (role.membershipCount > 0) {
      alert(`Cannot delete: ${role.membershipCount} member(s) still assigned.`);
      return;
    }
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await adminApi.deleteRole(role.id);
      await reload();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Delete failed');
    }
  };

  if (error) return <div className="text-sm text-ois-danger">Failed to load roles: {error}</div>;
  if (!roles) return <div className="text-sm text-ois-text-muted">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-base font-bold text-ois-text">System Roles</h3>
          <div className="text-xs text-ois-text-muted">
            DB-backed roles enforced by the API. Built-in roles cannot be edited or deleted.
          </div>
        </div>
        <Button size="sm" className="ml-auto" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus size={14} className="mr-1" /> New Role
        </Button>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Description</TH>
            <TH>Permissions</TH>
            <TH>Members</TH>
            <TH className="w-20" />
          </TR>
        </THead>
        <TBody>
          {roles.map(r => (
            <TR key={r.id}>
              <TD className="font-mono text-xs flex items-center gap-1">
                {r.isSystem && <Lock size={11} className="text-ois-text-subtle" />}
                {r.name}
                {r.isSystem && <Badge variant="neutral" className="ml-2">built-in</Badge>}
              </TD>
              <TD className="text-ois-text-muted text-xs">{r.description ?? '—'}</TD>
              <TD className="text-xs">{r.permissions.length}</TD>
              <TD>{r.membershipCount}</TD>
              <TD>
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost"
                    onClick={() => { setEditing(r); setOpen(true); }}
                    disabled={r.isSystem}
                    title={r.isSystem ? 'System role — view only' : 'Edit'}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={r.isSystem} onClick={() => remove(r)}>
                    <Trash2 size={14} className={r.isSystem ? 'text-ois-text-subtle' : 'text-ois-danger'} />
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {open && (
        <RoleForm
          initial={editing}
          catalog={catalog}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); reload(); }}
        />
      )}
    </div>
  );
};

const RoleForm: React.FC<{
  initial: RoleDto | null;
  catalog: PermissionDto[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ initial, catalog, onClose, onSaved }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [perms, setPerms] = useState<Set<string>>(new Set(initial?.permissions ?? []));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toggle = (key: string) => {
    setPerms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const save = async () => {
    if (!name.trim()) { setFormError('Name is required'); return; }
    setSaving(true);
    setFormError(null);
    try {
      if (initial) {
        await adminApi.updateRole(initial.id, {
          name: name.trim(),
          description: description.trim() || null,
          permissions: Array.from(perms),
        });
      } else {
        await adminApi.createRole({
          name: name.trim(),
          description: description.trim() || undefined,
          permissions: Array.from(perms),
        });
      }
      onSaved();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial ? `Edit Role: ${initial.name}` : 'New Role'}>
      <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-1">
        {formError && (
          <div className="rounded-md border border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs text-ois-danger">
            {formError}
          </div>
        )}
        <Input
          label="Name (alphanumeric, dash, underscore)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <label className="text-xs font-medium text-ois-text-muted">Description</label>
          <textarea
            className="mt-1 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 py-2 text-sm"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs font-medium text-ois-text-muted mb-2">
            Permissions ({perms.size} / {catalog.length})
          </div>
          <div className="border border-ois-border rounded-md divide-y divide-ois-border max-h-72 overflow-y-auto">
            {catalog.map(p => (
              <label
                key={p.key}
                className="flex items-start gap-2 px-3 py-2 hover:bg-ois-bg cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={perms.has(p.key)}
                  onChange={() => toggle(p.key)}
                />
                <span className="flex-1">
                  <span className="font-mono text-xs">{p.key}</span>
                  {p.description && (
                    <span className="block text-xs text-ois-text-muted">{p.description}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 py-4 border-t border-ois-border">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving}>{initial ? 'Save changes' : 'Create role'}</Button>
      </div>
    </Modal>
  );
};
