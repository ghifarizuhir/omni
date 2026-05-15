import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { EntityToolbar } from '@/src/components/admin/EntityToolbar';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import { rbacService } from '@/src/services/platformServices';
import type { Application } from '@/src/types/rbac';
import { Pencil, Trash2 } from 'lucide-react';

export const Applications: React.FC = () => {
  const {
    applications, teams, departments, divisions,
    upsertApplication, removeApplication,
  } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Application | null>(null);
  const [open, setOpen] = useState(false);

  const apsDivision = divisions.find(d => d.code === 'APS');
  const apsDeptIds = departments.filter(d => d.divisionId === apsDivision?.id).map(d => d.id);
  const apsTeams = teams.filter(t => apsDeptIds.includes(t.departmentId));

  const filtered = applications.filter(a => {
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q);
  });

  const teamName = (id: string) => teams.find(t => t.id === id)?.name ?? '—';
  const deptOfTeam = (id: string) => {
    const t = teams.find(x => x.id === id);
    return departments.find(d => d.id === t?.departmentId)?.name ?? '—';
  };

  const handleSave = async (a: Application) => {
    await rbacService.upsertApplication(a);
    upsertApplication(a);
    setOpen(false);
  };

  const handleDelete = async (a: Application) => {
    if (!confirm(`Delete application ${a.name}?`)) return;
    try {
      await rbacService.deleteApplication(a.id);
      removeApplication(a.id);
    } catch (e) {
      alert('Delete failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  return (
    <div className="bg-white border border-ois-border rounded-xl p-5">
      <EntityToolbar
        title="Applications" count={filtered.length}
        search={search} onSearchChange={setSearch}
        onCreate={() => { setEditing(null); setOpen(true); }}
        createLabel="New Application"
      />

      <Table>
        <THead>
          <TR><TH>Code</TH><TH>Name</TH><TH>Owner Team</TH><TH>Department</TH><TH className="w-20" /></TR>
        </THead>
        <TBody>
          {filtered.map(a => (
            <TR key={a.id}>
              <TD><Badge variant="info">{a.code}</Badge></TD>
              <TD className="font-medium">{a.name}</TD>
              <TD>{teamName(a.ownerTeamId)}</TD>
              <TD>{deptOfTeam(a.ownerTeamId)}</TD>
              <TD>
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(a)}>
                    <Trash2 size={14} className="text-ois-danger" />
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {open && (
        <AppForm
          initial={editing}
          apsTeams={apsTeams}
          onClose={() => setOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

const AppForm: React.FC<{
  initial: Application | null;
  apsTeams: { id: string; name: string }[];
  onClose: () => void;
  onSave: (a: Application) => Promise<void>;
}> = ({ initial, apsTeams, onClose, onSave }) => {
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [ownerTeamId, setOwnerTeamId] = useState(initial?.ownerTeamId ?? apsTeams[0]?.id ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!code.trim() || !name.trim() || !ownerTeamId) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initial?.id ?? `app-${Date.now()}`,
        code: code.trim(), name: name.trim(),
        ownerTeamId, description: description.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial ? 'Edit Application' : 'New Application'}>
      <div className="space-y-3 py-4">
        {error && (
          <div className="rounded-md border border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs text-ois-danger">
            {error}
          </div>
        )}
        <Input label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <label className="text-xs font-medium text-ois-text-muted">Owner Team (APS only)</label>
          <select
            className="mt-1 h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
            value={ownerTeamId} onChange={(e) => setOwnerTeamId(e.target.value)}
          >
            {apsTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
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
