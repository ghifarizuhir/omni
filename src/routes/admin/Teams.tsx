import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { EntityToolbar } from '@/src/components/admin/EntityToolbar';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import { rbacService } from '@/src/services/platformServices';
import type { RbacTeam } from '@/src/types/rbac';
import { Pencil, Trash2 } from 'lucide-react';

export const Teams: React.FC = () => {
  const {
    divisions, departments, teams, users, applications,
    upsertTeam, removeTeam,
  } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [editing, setEditing] = useState<RbacTeam | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = teams.filter(t => {
    if (deptFilter !== 'all' && t.departmentId !== deptFilter) return false;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
  });

  const deptName = (id: string) => departments.find(d => d.id === id)?.name ?? '—';
  const divName = (deptId: string) => {
    const d = departments.find(x => x.id === deptId);
    return divisions.find(v => v.id === d?.divisionId)?.name ?? '—';
  };
  const memberCount = (id: string) => users.filter(u => u.teamId === id).length;
  const appsOwned = (id: string) => applications.filter(a => a.ownerTeamId === id).length;

  const handleSave = async (t: RbacTeam) => {
    await rbacService.upsertTeam(t);
    upsertTeam(t);
    setOpen(false);
  };

  const handleDelete = async (t: RbacTeam) => {
    if (memberCount(t.id) > 0 || appsOwned(t.id) > 0) {
      alert('Team still has members or owns applications.');
      return;
    }
    if (!confirm(`Delete team ${t.name}?`)) return;
    try {
      await rbacService.deleteTeam(t.id);
      removeTeam(t.id);
    } catch (e) {
      alert('Delete failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  return (
    <div className="bg-white border border-ois-border rounded-xl p-5">
      <EntityToolbar
        title="Teams" count={filtered.length}
        search={search} onSearchChange={setSearch}
        onCreate={() => { setEditing(null); setOpen(true); }}
        createLabel="New Team"
        rightSlot={
          <select
            value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="h-9 rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
          >
            <option value="all">All departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        }
      />

      <Table>
        <THead>
          <TR><TH>Code</TH><TH>Name</TH><TH>Department</TH><TH>Division</TH><TH>Members</TH><TH>Apps</TH><TH className="w-20" /></TR>
        </THead>
        <TBody>
          {filtered.map(t => (
            <TR key={t.id}>
              <TD className="font-mono text-xs">{t.code}</TD>
              <TD className="font-medium">{t.name}</TD>
              <TD>{deptName(t.departmentId)}</TD>
              <TD>{divName(t.departmentId)}</TD>
              <TD>{memberCount(t.id)}</TD>
              <TD>{appsOwned(t.id)}</TD>
              <TD>
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(t)}>
                    <Trash2 size={14} className="text-ois-danger" />
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {open && (
        <TeamForm
          initial={editing}
          onClose={() => setOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

const TeamForm: React.FC<{
  initial: RbacTeam | null;
  onClose: () => void;
  onSave: (t: RbacTeam) => Promise<void>;
}> = ({ initial, onClose, onSave }) => {
  const { departments } = useCurrentUser();
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [departmentId, setDepartmentId] = useState(initial?.departmentId ?? departments[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!code.trim() || !name.trim() || !departmentId) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initial?.id ?? `team-${Date.now()}`,
        departmentId, code: code.trim(), name: name.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial ? 'Edit Team' : 'New Team'}>
      <div className="space-y-3 py-4">
        {error && (
          <div className="rounded-md border border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs text-ois-danger">
            {error}
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-ois-text-muted">Department</label>
          <select
            className="mt-1 h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
            value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
          >
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 py-4 border-t border-ois-border">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save</Button>
      </div>
    </Modal>
  );
};
