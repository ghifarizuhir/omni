import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { EntityToolbar } from '@/src/components/admin/EntityToolbar';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import { rbacService } from '@/src/services/platformServices';
import type { Division, DivisionCode } from '@/src/types/rbac';
import { Pencil, Trash2 } from 'lucide-react';

export const Divisions: React.FC = () => {
  const { divisions, departments, upsertDivision, removeDivision } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Division | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = divisions.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase()),
  );

  const deptCount = (divId: string) => departments.filter(d => d.divisionId === divId).length;

  const handleSave = async (d: Division) => {
    await rbacService.upsertDivision(d);
    upsertDivision(d);
    setOpen(false);
  };

  const handleDelete = async (d: Division) => {
    if (deptCount(d.id) > 0) { alert('Division still has departments.'); return; }
    if (!confirm(`Delete division ${d.name}?`)) return;
    try {
      await rbacService.deleteDivision(d.id);
      removeDivision(d.id);
    } catch (e) {
      alert('Delete failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  return (
    <div className="bg-white border border-ois-border rounded-xl p-5">
      <EntityToolbar
        title="Divisions" count={filtered.length}
        search={search} onSearchChange={setSearch}
        onCreate={() => { setEditing(null); setOpen(true); }}
        createLabel="New Division"
      />

      <Table>
        <THead>
          <TR>
            <TH>Code</TH><TH>Name</TH><TH>Departments</TH><TH className="w-20" />
          </TR>
        </THead>
        <TBody>
          {filtered.map(d => (
            <TR key={d.id}>
              <TD><Badge variant="info">{d.code}</Badge></TD>
              <TD className="font-medium">{d.name}</TD>
              <TD>{deptCount(d.id)}</TD>
              <TD>
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(d); setOpen(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(d)}>
                    <Trash2 size={14} className="text-ois-danger" />
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {open && (
        <DivisionFormModal
          initial={editing}
          onClose={() => setOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

const DivisionFormModal: React.FC<{
  initial: Division | null;
  onClose: () => void;
  onSave: (d: Division) => Promise<void>;
}> = ({ initial, onClose, onSave }) => {
  const [code, setCode] = useState<DivisionCode | string>(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!code.trim() || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initial?.id ?? `div-${Date.now()}`,
        code: code.trim() as DivisionCode,
        name: name.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial ? 'Edit Division' : 'New Division'}>
      <div className="space-y-3 py-4">
        {error && (
          <div className="rounded-md border border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs text-ois-danger">
            {error}
          </div>
        )}
        <Input label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="STA / IFM / APS / USER_BUSINESS" />
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 py-4 border-t border-ois-border">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save</Button>
      </div>
    </Modal>
  );
};
