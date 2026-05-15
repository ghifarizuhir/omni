import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { EntityToolbar } from '@/src/components/admin/EntityToolbar';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import { rbacService } from '@/src/services/platformServices';
import type {
  RbacUser, HierarchyLevel, FunctionalRoleCode,
} from '@/src/types/rbac';
import { LEVEL_LABEL } from '@/src/types/rbac';
import { Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { Tabs } from '@/src/components/ui/Tabs';
import { UserSystemRoles } from './UserSystemRoles';
import { adminApi } from '@/src/services/adminService';
import { NewPasswordModal } from '@/src/components/admin/NewPasswordModal';

const ALL_LEVELS: HierarchyLevel[] = ['group_head', 'dept_head', 'team_lead', 'officer', 'requester'];

const USER_TABS = [
  { id: 'system', label: 'System Roles' },
  { id: 'profile', label: 'Profile & Functional Roles' },
];

export const Users: React.FC = () => {
  return (
    <Tabs tabs={USER_TABS}>
      <div className="bg-white border border-ois-border rounded-xl p-5">
        <UserSystemRoles />
      </div>
      <div className="bg-white border border-ois-border rounded-xl p-5">
        <UserProfiles />
      </div>
    </Tabs>
  );
};

const UserProfiles: React.FC = () => {
  const {
    users, divisions, departments, teams, functionalRoles,
    upsertUser, removeUser,
  } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [divFilter, setDivFilter] = useState('all');
  const [editing, setEditing] = useState<RbacUser | null>(null);
  const [open, setOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const filtered = users.filter(u => {
    if (divFilter !== 'all' && u.divisionId !== divFilter) return false;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const divName = (id: string | null) => id ? divisions.find(d => d.id === id)?.name ?? '—' : '—';
  const deptName = (id: string | null) => id ? departments.find(d => d.id === id)?.name ?? '—' : '—';
  const teamName = (id: string | null) => id ? teams.find(t => t.id === id)?.name ?? '—' : '—';
  const roleName = (code: string) => functionalRoles.find(r => r.code === code)?.name ?? code;

  const handleSave = async (u: RbacUser) => {
    const isCreate = editing === null;
    const saved = await rbacService.upsertRbacUser(u);
    upsertUser(saved ?? u);
    setOpen(false);
    if (isCreate) {
      const result = await adminApi.resetUserPassword((saved ?? u).id);
      setTempPassword(result.tempPassword);
    }
  };

  const handleDelete = async (u: RbacUser) => {
    if (!confirm(`Delete user ${u.name}?`)) return;
    try {
      await rbacService.deleteRbacUser(u.id);
      removeUser(u.id);
    } catch (e) {
      alert('Delete failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  return (
    <>
      <EntityToolbar
        title="Users" count={filtered.length}
        search={search} onSearchChange={setSearch}
        onCreate={() => { setEditing(null); setOpen(true); }}
        createLabel="New User"
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
          <TR>
            <TH>Name</TH><TH>Email</TH><TH>Division</TH><TH>Department</TH><TH>Team</TH>
            <TH>Level</TH><TH>Roles</TH><TH>Status</TH><TH className="w-20" />
          </TR>
        </THead>
        <TBody>
          {filtered.map(u => (
            <TR key={u.id}>
              <TD className="font-medium flex items-center gap-2">
                {u.name}
                {u.isSuperadmin && <ShieldCheck size={14} className="text-ois-primary" />}
              </TD>
              <TD className="text-ois-text-muted">{u.email}</TD>
              <TD>{divName(u.divisionId)}</TD>
              <TD>{deptName(u.departmentId)}</TD>
              <TD>{teamName(u.teamId)}</TD>
              <TD>{u.level ? <Badge variant="info">{LEVEL_LABEL[u.level]}</Badge> : '—'}</TD>
              <TD>
                <div className="flex flex-wrap gap-1">
                  {u.functionalRoles.length === 0
                    ? <span className="text-xs text-ois-text-subtle">—</span>
                    : u.functionalRoles.map(r => <Badge key={r} variant="neutral">{roleName(r as string)}</Badge>)}
                </div>
              </TD>
              <TD>
                {u.active
                  ? <Badge variant="success">Active</Badge>
                  : <Badge variant="neutral">Inactive</Badge>}
              </TD>
              <TD>
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setOpen(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" title="Reset password" onClick={async () => {
                    const result = await adminApi.resetUserPassword(u.id);
                    setTempPassword(result.tempPassword);
                  }}>
                    <ShieldCheck size={14} className="text-ois-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(u)}>
                    <Trash2 size={14} className="text-ois-danger" />
                  </Button>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      {open && (
        <UserForm
          initial={editing}
          onClose={() => setOpen(false)}
          onSave={handleSave}
        />
      )}

      {tempPassword && (
        <NewPasswordModal tempPassword={tempPassword} onClose={() => setTempPassword(null)} />
      )}
    </>
  );
};

const UserForm: React.FC<{
  initial: RbacUser | null;
  onClose: () => void;
  onSave: (u: RbacUser) => Promise<void>;
}> = ({ initial, onClose, onSave }) => {
  const { divisions, departments, teams, functionalRoles } = useCurrentUser();
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [divisionId, setDivisionId] = useState<string | null>(initial?.divisionId ?? null);
  const [departmentId, setDepartmentId] = useState<string | null>(initial?.departmentId ?? null);
  const [teamId, setTeamId] = useState<string | null>(initial?.teamId ?? null);
  const [level, setLevel] = useState<HierarchyLevel | ''>(initial?.level ?? '');
  const [roles, setRoles] = useState<string[]>(initial?.functionalRoles as string[] ?? []);
  const [isSuperadmin, setIsSuperadmin] = useState(initial?.isSuperadmin ?? false);
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const division = divisions.find(d => d.id === divisionId);
  const filteredDepts = departments.filter(d => d.divisionId === divisionId);
  const filteredTeams = teams.filter(t => t.departmentId === departmentId);

  React.useEffect(() => {
    if (departmentId && !filteredDepts.find(d => d.id === departmentId)) setDepartmentId(null);
  }, [divisionId]); // eslint-disable-line
  React.useEffect(() => {
    if (teamId && !filteredTeams.find(t => t.id === teamId)) setTeamId(null);
  }, [departmentId]); // eslint-disable-line

  const isUserBusiness = division?.code === 'USER_BUSINESS';
  const availableLevels: HierarchyLevel[] = isUserBusiness
    ? ['requester']
    : ALL_LEVELS.filter(l => l !== 'requester');

  const toggleRole = (code: string) => {
    setRoles(rs => rs.includes(code) ? rs.filter(r => r !== code) : [...rs, code]);
  };

  const save = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initial?.id ?? `u-${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        avatarUrl: initial?.avatarUrl,
        divisionId, departmentId, teamId,
        level: level || null,
        functionalRoles: roles as FunctionalRoleCode[],
        isSuperadmin, active,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={initial ? 'Edit User' : 'New User'} size="lg">
      <div className="space-y-4 py-4">
        {error && (
          <div className="rounded-md border border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs text-ois-danger">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-ois-text-muted">Division</label>
            <select
              className="mt-1 h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
              value={divisionId ?? ''} onChange={(e) => setDivisionId(e.target.value || null)}
            >
              <option value="">—</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ois-text-muted">Department</label>
            <select
              className="mt-1 h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
              value={departmentId ?? ''} onChange={(e) => setDepartmentId(e.target.value || null)}
              disabled={!divisionId}
            >
              <option value="">—</option>
              {filteredDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ois-text-muted">Team</label>
            <select
              className="mt-1 h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
              value={teamId ?? ''} onChange={(e) => setTeamId(e.target.value || null)}
              disabled={!departmentId}
            >
              <option value="">—</option>
              {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ois-text-muted">Hierarchy Level</label>
          <select
            className="mt-1 h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
            value={level} onChange={(e) => setLevel(e.target.value as HierarchyLevel | '')}
          >
            <option value="">—</option>
            {availableLevels.map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-ois-text-muted">Functional Roles</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {functionalRoles.map(r => (
              <label key={r.id} className="inline-flex items-center gap-1.5 text-sm px-2 py-1 border border-ois-border rounded-ois-btn cursor-pointer hover:bg-ois-surface-muted">
                <input
                  type="checkbox" checked={roles.includes(r.code)}
                  onChange={() => toggleRole(r.code)}
                />
                <span>{r.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6 pt-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isSuperadmin} onChange={(e) => setIsSuperadmin(e.target.checked)} />
            <span>Superadmin</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Active</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 py-4 border-t border-ois-border">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving}>Save</Button>
      </div>
    </Modal>
  );
};
