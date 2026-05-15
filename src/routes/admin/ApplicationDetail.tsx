import React, { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Plus } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table, THead, TBody, TR, TH, TD } from '@/src/components/ui/Table';
import { useCurrentUser } from '@/src/lib/rbac/CurrentUserContext';
import { useResource, ApiError } from '@/src/services/core';
import { applicationMembershipApi, MembershipRole, MembershipDto } from '@/src/services/adminService';
import type { Application } from '@/src/types/rbac';

const ROLES: MembershipRole[] = ['OWNER', 'CONTRIBUTOR', 'VIEWER'];

function roleBadgeVariant(role: MembershipRole): 'danger' | 'info' | 'default' {
  if (role === 'OWNER') return 'danger';
  if (role === 'CONTRIBUTOR') return 'info';
  return 'default';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const ApplicationDetail: React.FC = () => {
  const { appId } = useParams<{ appId: string }>();
  const { applications, teams, users } = useCurrentUser();

  const app = applications.find(a => a.id === appId);

  const fetchMembers = useCallback(
    () => applicationMembershipApi.list(appId!),
    [appId],
  );
  const { data: members, loading, error, refresh } = useResource<MembershipDto[]>(fetchMembers, [appId]);

  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const memberTeamIds = new Set((members ?? []).map(m => m.teamId));

  const handleRoleChange = async (teamId: string, role: MembershipRole) => {
    setSaving(teamId);
    setRowError(prev => ({ ...prev, [teamId]: '' }));
    try {
      await applicationMembershipApi.changeRole(appId!, teamId, role);
      refresh();
    } catch (e) {
      const code = e instanceof ApiError ? (e.body as { error?: string } | null)?.error : null;
      setRowError(prev => ({
        ...prev,
        [teamId]: code === 'last_owner' ? 'Cannot demote last owner' : 'Failed to change role',
      }));
    } finally {
      setSaving(null);
    }
  };

  const handleRemove = async (teamId: string) => {
    if (!window.confirm('Remove this team from the application?')) return;
    setSaving(teamId + ':remove');
    setRowError(prev => ({ ...prev, [teamId]: '' }));
    try {
      await applicationMembershipApi.remove(appId!, teamId);
      refresh();
    } catch (e) {
      const code = e instanceof ApiError ? (e.body as { error?: string } | null)?.error : null;
      setRowError(prev => ({
        ...prev,
        [teamId]: code === 'last_owner' ? 'Cannot remove last owner' : 'Failed to remove',
      }));
    } finally {
      setSaving(null);
    }
  };

  if (!app) {
    return (
      <div className="bg-white border border-ois-border rounded-xl p-8 text-center text-sm text-ois-text-muted">
        Application not found.{' '}
        <Link to="/admin/applications" className="text-ois-primary underline">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-ois-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Link
            to="/admin/applications"
            className="inline-flex items-center gap-1 text-xs text-ois-text-muted hover:text-ois-text"
          >
            <ArrowLeft size={14} /> Applications
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{app.code}</Badge>
          <h1 className="text-lg font-bold text-ois-text">{app.name}</h1>
          {(app as Application & { criticality?: string | null }).criticality && (
            <Badge variant="default">{(app as Application & { criticality?: string | null }).criticality}</Badge>
          )}
        </div>
        {app.description && (
          <p className="mt-2 text-sm text-ois-text-muted">{app.description}</p>
        )}
      </div>

      {/* Teams panel */}
      <div className="bg-white border border-ois-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ois-text">Teams</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={14} className="mr-1" /> Add team
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs text-ois-danger">
            {error.message}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-ois-text-muted py-4 text-center">Loading…</p>
        ) : !members || members.length === 0 ? (
          <p className="text-sm text-ois-text-muted py-4 text-center">No teams assigned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Team</TH>
                  <TH>Role</TH>
                  <TH>Added by</TH>
                  <TH>Added at</TH>
                  <TH className="w-48" />
                </TR>
              </THead>
              <TBody>
                {members.map(m => {
                  const team = teams.find(t => t.id === m.teamId);
                  const addedBy = users?.find(u => u.id === m.addedById)?.name ?? m.addedById ?? '—';
                  const isSaving = saving === m.teamId || saving === m.teamId + ':remove';
                  const err = rowError[m.teamId];
                  return (
                    <TR key={m.teamId}>
                      <TD className="font-medium">{team?.name ?? m.teamId}</TD>
                      <TD>
                        <Badge variant={roleBadgeVariant(m.role)}>{m.role}</Badge>
                      </TD>
                      <TD className="text-xs text-ois-text-muted">{addedBy}</TD>
                      <TD className="text-xs text-ois-text-muted">{fmtDate(m.addedAt)}</TD>
                      <TD>
                        <div className="flex items-center gap-2 justify-end flex-wrap">
                          {err && (
                            <span className="text-xs text-ois-danger bg-ois-danger/5 border border-ois-danger/30 rounded px-2 py-0.5">
                              {err}
                            </span>
                          )}
                          <select
                            className="h-7 rounded-ois-btn border border-ois-border-strong bg-white px-2 text-xs disabled:opacity-50"
                            value={m.role}
                            disabled={isSaving}
                            onChange={e => handleRoleChange(m.teamId, e.target.value as MembershipRole)}
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSaving}
                            loading={saving === m.teamId + ':remove'}
                            onClick={() => handleRemove(m.teamId)}
                            className="text-ois-danger border-ois-danger/40 hover:bg-ois-danger/5"
                          >
                            Remove
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}
      </div>

      {addOpen && (
        <AddTeamModal
          appId={appId!}
          allTeams={teams}
          memberTeamIds={memberTeamIds}
          onClose={() => setAddOpen(false)}
          onAdded={refresh}
        />
      )}
    </div>
  );
};

const AddTeamModal: React.FC<{
  appId: string;
  allTeams: { id: string; name: string }[];
  memberTeamIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}> = ({ appId, allTeams, memberTeamIds, onClose, onAdded }) => {
  const available = allTeams.filter(t => !memberTeamIds.has(t.id));
  const [teamId, setTeamId] = useState(available[0]?.id ?? '');
  const [role, setRole] = useState<MembershipRole>('CONTRIBUTOR');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = available.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const save = async () => {
    if (!teamId) return;
    setSaving(true);
    setError(null);
    try {
      await applicationMembershipApi.add(appId, { teamId, role });
      onAdded();
      onClose();
    } catch (e) {
      const code = e instanceof ApiError ? (e.body as { error?: string } | null)?.error : null;
      setError(code === 'already_member' ? 'Team is already a member.' : 'Failed to add team.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Add Team" size="sm">
      <div className="space-y-3 py-4">
        {error && (
          <div className="rounded-md border border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs text-ois-danger">
            {error}
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-ois-text-muted">Search team</label>
          <input
            className="mt-1 h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
            placeholder="Filter teams…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ois-text-muted">Team</label>
          <select
            className="mt-1 h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
          >
            {filtered.length === 0 && <option value="">No teams available</option>}
            {filtered.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ois-text-muted">Role</label>
          <select
            className="mt-1 h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 text-sm"
            value={role}
            onChange={e => setRole(e.target.value as MembershipRole)}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 py-4 border-t border-ois-border">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} loading={saving} disabled={!teamId || filtered.length === 0}>Add</Button>
      </div>
    </Modal>
  );
};
