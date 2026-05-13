import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { EntityToolbar } from '@/src/components/admin/EntityToolbar';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import type { Department } from '@/src/types/rbac';
import { Pencil, Trash2 } from 'lucide-react';

export const Departments: React.FC = () => {
  const { divisions, departments, teams, upsertDepartment, removeDepartment } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [divFilter, setDivFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = departments.filter(d => {
    if (divFilter !== 'all' && d.divisionId !== divFilter) return false;
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
  });
  const divName = (id: string) => divisions.find(d => d.id === id)?.name ?? '—';
  const teamCount = (id: string) => teams.filter(t => t.departmentId === id).length;

  return (
    <div className="bg-white border border-ois-border rounded-xl p-5">
      <EntityToolbar
        title="Departments" count={filtered.length}
        search={search} onSearchChange={setSearch}
        onCreate={() => { setEditing(null); setOpen(true); }}
        createLabel="New Department"
        rightSlot={
          <select
            value={divFilter} onChange={(e) => setDivFilter(e.target.value)}
            className="h-9 rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
          >
            <option value="all">All divisions</option>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        }
      />

      <Table>
        <THead>
          <TR><TH>Code</TH><TH>Name</TH><TH>Division</TH><TH>Teams</TH><TH className="w-20" /></TR>
        </THead>
        <TBody>
          {filtered.map(d => (
            <TR key={d.id}>
              <TD className="font-mono text-xs">{d.code}</TD>
              <TD className="font-medium">{d.name}</TD>
              <TD>{divName(d.divisionId)}</TD>
              <TD>{teamCount(d.id)}</TD>
              <TD>
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(d); setOpen(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => {
                    if (teamCount(d.id) > 0) { alert('Department still has teams.'); return; }
                    if (confirm(`Delete department ${d.name}?`)) removeDepartment(d.id);
                  }}>
                    <Trash2 size={14} className="text-ois-danger" />
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {open && (
        <DeptForm
          initial={editing}
          onClose={() => setOpen(false)}
          onSave={(d) => { upsertDepartment(d); setOpen(false); }}
        />
      )}
    </div>
  );
};

const DeptForm: React.FC<{
  initial: Department | null;
  onClose: () => void;
  onSave: (d: Department) => void;
}> = ({ initial, onClose, onSave }) => {
  const { divisions } = useCurrentUser();
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [divisionId, setDivisionId] = useState(initial?.divisionId ?? divisions[0]?.id ?? '');

  return (
    <Modal isOpen onClose={onClose} title={initial ? 'Edit Department' : 'New Department'}>
      <div className="space-y-3 py-4">
        <div>
          <label className="text-xs font-medium text-ois-text-muted">Division</label>
          <select
            className="mt-1 h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
            value={divisionId} onChange={(e) => setDivisionId(e.target.value)}
          >
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} />
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 py-4 border-t border-ois-border">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => {
          if (!code.trim() || !name.trim() || !divisionId) return;
          onSave({
            id: initial?.id ?? `dept-${Date.now()}`,
            divisionId,
            code: code.trim(),
            name: name.trim(),
          });
        }}>Save</Button>
      </div>
    </Modal>
  );
};
