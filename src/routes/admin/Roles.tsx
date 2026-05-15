import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Tabs } from '@/src/components/ui/Tabs';
import { EntityToolbar } from '@/src/components/admin/EntityToolbar';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import { rbacService } from '@/src/services/platformServices';
import type { FunctionalRole } from '@/src/types/rbac';
import { Pencil, Trash2, Lock } from 'lucide-react';
import { SystemRoles } from './SystemRoles';

const ROLE_TABS = [
  { id: 'system', label: 'System Roles' },
  { id: 'functional', label: 'Functional Roles' },
];

export const Roles: React.FC = () => {
  return (
    <Tabs tabs={ROLE_TABS}>
      <div className="bg-white border border-ois-border rounded-xl p-5">
        <SystemRoles />
      </div>
      <div className="bg-white border border-ois-border rounded-xl p-5">
        <FunctionalRoles />
      </div>
    </Tabs>
  );
};

const FunctionalRoles: React.FC = () => {
  const { functionalRoles, users, upsertFunctionalRole, removeFunctionalRole } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<FunctionalRole | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = functionalRoles.filter(r => {
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
  });

  const userCount = (code: string) =>
    users.filter(u => (u.functionalRoles as string[]).includes(code)).length;

  const handleSave = async (r: FunctionalRole) => {
    await rbacService.upsertFunctionalRole(r);
    upsertFunctionalRole(r);
    setOpen(false);
  };

  const handleDelete = async (r: FunctionalRole) => {
    if (userCount(r.code) > 0) { alert('Role still assigned to users.'); return; }
    if (!confirm(`Delete role ${r.name}?`)) return;
    try {
      await rbacService.deleteFunctionalRole(r.id);
      removeFunctionalRole(r.id);
    } catch (e) {
      alert('Delete failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  return (
    <>
      <EntityToolbar
        title="Functional Roles" count={filtered.length}
        search={search} onSearchChange={setSearch}
        onCreate={() => { setEditing(null); setOpen(true); }}
        createLabel="New Role"
      />

      <Table>
        <THead>
          <TR><TH>Code</TH><TH>Name</TH><TH>Description</TH><TH>Users</TH><TH className="w-20" /></TR>
        </THead>
        <TBody>
          {filtered.map(r => (
            <TR key={r.id}>
              <TD className="font-mono text-xs flex items-center gap-1">
                {r.builtIn && <Lock size={11} className="text-ois-text-subtle" />}
                {r.code}
              </TD>
              <TD className="font-medium">
                {r.name}
                {r.builtIn && <Badge variant="neutral" className="ml-2">built-in</Badge>}
              </TD>
              <TD className="text-ois-text-muted text-xs">{r.description}</TD>
              <TD>{userCount(r.code)}</TD>
              <TD>
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={r.builtIn} onClick={() => handleDelete(r)}>
                    <Trash2 size={14} className={r.builtIn ? 'text-ois-text-subtle' : 'text-ois-danger'} />
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
          onClose={() => setOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
};

const RoleForm: React.FC<{
  initial: FunctionalRole | null;
  onClose: () => void;
  onSave: (r: FunctionalRole) => Promise<void>;
}> = ({ initial, onClose, onSave }) => {
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const builtIn = initial?.builtIn ?? false;

  const save = async () => {
    if (!code.trim() || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initial?.id ?? `role-${Date.now()}`,
        code: code.trim(), name: name.trim(),
        description: description.trim(), builtIn,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial ? 'Edit Role' : 'New Functional Role'}>
      <div className="space-y-3 py-4">
        {error && (
          <div className="rounded-md border border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs text-ois-danger">
            {error}
          </div>
        )}
        <Input label="Code (snake_case)" value={code}
          onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
          disabled={builtIn}
        />
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <label className="text-xs font-medium text-ois-text-muted">Description</label>
          <textarea
            className="mt-1 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 py-2 text-sm"
            rows={3}
            value={description} onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 py-4 border-t border-ois-border">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save</Button>
      </div>
    </Modal>
  );
};
