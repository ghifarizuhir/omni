import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bug, Search, X, ChevronDown, MoreVertical,
  BookOpen, Plus, Filter,
  Activity, AlertCircle, Clock, CheckCircle2,
  FileText, Wrench, ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { SeverityBadge } from '@/src/components/ui/StatusSeverityBadges';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import { Avatar } from '@/src/components/ui/Avatar';
import { ProblemSourceChip } from '@/src/components/problems/ProblemSourceChip';
import { problemsService, usersService, useResource } from '@/src/services';
import { Can, useCurrentUser, filterReadable, problemResource } from '@/src/lib/rbac';
import { problemStatusMeta, problemSourceMeta } from '@/src/lib/constants';
import { formatRelative } from '@/src/lib/format';
import { Problem, ProblemStatus, ProblemSource } from '@/src/types/problem';
import { cn } from '@/src/lib/utils';
import { IDCell } from '@/src/components/ui/IDCell';
import { StatusRing, type RingState } from '@/src/components/ui/StatusRing';

type SortKey = 'lastIncidentDate' | 'createdAt' | 'relatedIncidentCount' | 'severity';
type SortDir = 'asc' | 'desc';

const STATUSES: ProblemStatus[] = ['identified', 'investigating', 'known_error', 'fix_in_progress', 'closed'];
const SOURCES: ProblemSource[] = ['incident_pattern', 'major_incident', 'proactive', 'audit', 'user_reported'];

const SEVERITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

const PROBLEM_STATUS_TO_RING: Record<string, RingState> = {
  identified:      'open',
  investigating:   'investigating',
  known_error:     'investigating',
  fix_in_progress: 'acknowledged',
  closed:          'closed',
};

const SEVERITY_STRIPE: Record<string, string> = {
  P1: '#B42318',
  P2: '#DC6803',
  P3: '#DC6803',
  P4: '#027A48',
};

// Linked items icon row for a problem
// Create Problem Modal Component
interface CreateProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (problem: { title: string; description: string }) => void;
}

const CreateProblemModal: React.FC<CreateProblemModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), description: description.trim() });
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New problem" size="md">
      <div className="space-y-4 py-2">
        {/* Title */}
        <div>
          <label className="text-sm font-medium text-ois-text block mb-1.5">
            Title <span className="text-ois-danger">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Brief, descriptive summary"
            className="w-full border border-ois-border rounded-lg px-3 py-2 text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-ois-text block mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional details"
            rows={3}
            className="w-full border border-ois-border rounded-lg px-3 py-2 text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!title.trim()} onClick={handleCreate}>
            Create problem
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Linked items icon row for a problem
const LinkedItemsIcons: React.FC<{ problem: Problem }> = ({ problem }) => (
  <div className="flex items-center gap-2">
    {problem.rca && (
      <span title="RCA present" className="text-ois-primary">
        <Activity size={13} />
      </span>
    )}
    {problem.linkedKBArticleIds.length > 0 && (
      <span title={`${problem.linkedKBArticleIds.length} KB article(s)`} className="text-ois-text-muted">
        <BookOpen size={13} />
      </span>
    )}
    {problem.linkedChangeIds.length > 0 && (
      <span title={`${problem.linkedChangeIds.length} change(s)`} className="text-ois-text-muted">
        <Wrench size={13} />
      </span>
    )}
    {problem.linkedChangeIds.length === 0 && problem.linkedKBArticleIds.length === 0 && !problem.rca && (
      <span className="text-ois-text-subtle text-xs">—</span>
    )}
  </div>
);

export const ProblemList: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProblemStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<ProblemSource | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('lastIncidentDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [extraProblems, setExtraProblems] = useState<Problem[]>([]);
  const { user, applications, teams, departments } = useCurrentUser();
  const { data: loadedProblems } = useResource(() => problemsService.list(), []);
  const mockProblems = loadedProblems ?? [];
  const { data: loadedUsers } = useResource(() => usersService.list(), []);
  const mockUsers = loadedUsers ?? [];
  const USER_MAP = useMemo(
    () => Object.fromEntries(mockUsers.map(u => [u.id, u])),
    [mockUsers],
  );

  const problems = useMemo(
    () => filterReadable(
      user,
      'problem',
      [...extraProblems, ...mockProblems].map(p => ({ ...p, ...problemResource(p) })),
    ) as Problem[],
    [extraProblems, mockProblems, user, applications, teams, departments],
  );

  const handleCreateProblem = ({ title, description }: { title: string; description: string }) => {
    const now = new Date().toISOString();
    const seq = (mockProblems.length + extraProblems.length + 1).toString().padStart(5, '0');
    const newProblem: Problem = {
      id: `prb-${Date.now()}`,
      publicId: `PRB-${new Date().getFullYear()}-${seq}`,
      title,
      description,
      status: 'identified',
      severity: 'P3',
      source: 'user_reported',
      ownerId: mockUsers[0]?.id ?? 'user-current',
      ownerTeamId: 'team-current',
      affectedCIIds: [],
      affectedCIPublicIds: [],
      affectedServiceIds: [],
      relatedIncidentIds: [],
      relatedIncidentCount: 0,
      linkedChangeIds: [],
      linkedKBArticleIds: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    setExtraProblems(prev => [newProblem, ...prev]);
  };

  // Stats
  const statusCounts = useMemo(
    () => STATUSES.reduce((acc, s) => ({ ...acc, [s]: problems.filter(p => p.status === s).length }), {} as Record<ProblemStatus, number>),
    [problems]
  );
  const sourceCounts = useMemo(
    () => SOURCES.reduce((acc, s) => ({ ...acc, [s]: problems.filter(p => p.source === s).length }), {} as Record<ProblemSource, number>),
    [problems]
  );

  const activeCount = problems.filter(p => ['identified', 'investigating', 'fix_in_progress'].includes(p.status)).length;
  const knownErrorCount = statusCounts['known_error'];

  // Filtering
  const filtered = useMemo(() => {
    let result = [...problems];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.publicId.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
    if (sourceFilter !== 'all') result = result.filter(p => p.source === sourceFilter);
    if (ownerFilter !== 'all') result = result.filter(p => p.ownerId === ownerFilter);

    result.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'lastIncidentDate') {
        const ta = a.lastIncidentDate ? new Date(a.lastIncidentDate).getTime() : 0;
        const tb = b.lastIncidentDate ? new Date(b.lastIncidentDate).getTime() : 0;
        diff = ta - tb;
      } else if (sortKey === 'createdAt') {
        diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortKey === 'relatedIncidentCount') {
        diff = a.relatedIncidentCount - b.relatedIncidentCount;
      } else if (sortKey === 'severity') {
        diff = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
      }
      return sortDir === 'asc' ? diff : -diff;
    });
    return result;
  }, [problems, search, statusFilter, sourceFilter, ownerFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon: React.FC<{ col: SortKey }> = ({ col }) => (
    <ArrowUpDown
      size={11}
      className={cn('ml-1 shrink-0 transition-colors', sortKey === col ? 'text-ois-primary' : 'text-ois-border')}
    />
  );

  const hasFilters = search || statusFilter !== 'all' || sourceFilter !== 'all' || ownerFilter !== 'all';
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setSourceFilter('all'); setOwnerFilter('all'); };

  const uniqueOwners: string[] = Array.from(new Set(problems.map(p => p.ownerId)));

  return (
    <div className="space-y-5 pb-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Problems</h1>
          <p className="text-sm text-ois-text-muted mt-0.5">
            {problems.length} total · {activeCount} active investigations · {knownErrorCount} known errors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/kedb">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <BookOpen size={14} />
              KEDB
            </Button>
          </Link>
          <Can module="problem" action="create" fallback={null}>
            <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              New problem
            </Button>
          </Can>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
              statusFilter === 'all'
                ? 'bg-ois-primary text-white border-ois-primary'
                : 'bg-white text-ois-text border-ois-border hover:bg-ois-surface-muted'
            )}
          >
            All {problems.length}
          </button>
          {STATUSES.map(s => (
            statusCounts[s] > 0 && (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                  statusFilter === s
                    ? 'text-white border-transparent'
                    : 'bg-white text-ois-text border-ois-border hover:bg-ois-surface-muted'
                )}
                style={statusFilter === s ? {
                  backgroundColor: problemStatusMeta[s].color,
                  borderColor: problemStatusMeta[s].color,
                } : {}}
              >
                {problemStatusMeta[s].label} {statusCounts[s]}
              </button>
            )
          ))}
        </div>
        <div className="h-4 w-px bg-ois-border hidden sm:block" />
        <p className="text-xs text-ois-text-subtle">
          By source: {SOURCES.filter(s => sourceCounts[s] > 0).map(s => `${problemSourceMeta[s].label} ${sourceCounts[s]}`).join(' · ')}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
          <input
            type="text"
            placeholder="Search ID, title, tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-sm border border-ois-border rounded-lg bg-white text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ois-text-subtle hover:text-ois-text">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Source filter */}
        <FilterDropdown
          value={sourceFilter}
          onChange={v => setSourceFilter(v as ProblemSource | 'all')}
          options={[
            { value: 'all', label: 'All sources' },
            ...SOURCES.map(s => ({ value: s, label: problemSourceMeta[s].label, count: sourceCounts[s] })),
          ]}
          placeholder="Source"
        />

        {/* Owner filter */}
        <FilterDropdown
          value={ownerFilter}
          onChange={setOwnerFilter}
          options={[
            { value: 'all', label: 'All owners' },
            ...uniqueOwners.map(uid => ({ value: uid, label: USER_MAP[uid]?.name ?? uid })),
          ]}
          placeholder="Owner"
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 h-9 px-3 text-sm text-ois-text-muted hover:text-ois-text border border-ois-border rounded-lg hover:bg-ois-surface-muted transition-colors"
          >
            <X size={13} />
            Reset
          </button>
        )}

        <p className="ml-auto text-xs text-ois-text-subtle">
          {filtered.length} of {problems.length} shown
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ois-border bg-ois-surface-muted/50">
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
                ID
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
                Title
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
                Status
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest cursor-pointer hover:text-ois-text select-none"
                onClick={() => handleSort('severity')}
              >
                <span className="flex items-center">Sev <SortIcon col="severity" /></span>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
                Source
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
                Owner
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest cursor-pointer hover:text-ois-text select-none"
                onClick={() => handleSort('relatedIncidentCount')}
              >
                <span className="flex items-center">Incidents <SortIcon col="relatedIncidentCount" /></span>
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest cursor-pointer hover:text-ois-text select-none"
                onClick={() => handleSort('lastIncidentDate')}
              >
                <span className="flex items-center">Last incident <SortIcon col="lastIncidentDate" /></span>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
                Links
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>

          <tbody className="divide-y divide-ois-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <Bug size={32} className="text-ois-text-subtle mx-auto mb-3" />
                  <p className="text-sm font-medium text-ois-text">No problems match your filters</p>
                  <button onClick={clearFilters} className="text-xs text-ois-primary hover:underline mt-1">
                    Reset filters
                  </button>
                </td>
              </tr>
            ) : (
              filtered.map(problem => {
                const owner = USER_MAP[problem.ownerId];
                const stripeColor = SEVERITY_STRIPE[problem.severity] ?? '#1F4FD4';
                return (
                  <tr
                    key={problem.id}
                    className="group hover:bg-ois-surface-muted/30 transition-colors cursor-pointer border-l-[3px]"
                    onClick={() => navigate(`/problems/${problem.publicId}`)}
                    title={problem.description.slice(0, 200)}
                    style={{ borderLeftColor: stripeColor }}
                  >
                    {/* Public ID */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <IDCell value={problem.publicId} />
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="font-medium text-ois-text truncate">{problem.title}</p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {problem.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] font-mono text-ois-text-subtle bg-ois-surface-muted px-1.5 py-0.5 rounded">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusRing state={PROBLEM_STATUS_TO_RING[problem.status] ?? 'open'} aria-label={problem.status} />
                    </td>

                    {/* Severity */}
                    <td className="px-4 py-3">
                      <SeverityBadge severity={problem.severity} />
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ProblemSourceChip source={problem.source} />
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {owner ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={owner.name} size="xs" />
                          <span className="text-xs text-ois-text truncate max-w-[90px]">{owner.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-ois-text-subtle">—</span>
                      )}
                    </td>

                    {/* Related incidents */}
                    <td className="px-4 py-3">
                      {problem.relatedIncidentCount > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono font-bold text-sm"
                            style={{ color: problem.relatedIncidentCount >= 4 ? '#B42318' : problem.relatedIncidentCount >= 2 ? '#DC6803' : '#475467' }}
                          >
                            {problem.relatedIncidentCount}
                          </span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: Math.min(problem.relatedIncidentCount, 5) }).map((_, i) => (
                              <span
                                key={i}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: problem.relatedIncidentCount >= 4 ? '#B42318' : '#DC6803', opacity: 0.7 + i * 0.06 }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-ois-text-subtle">—</span>
                      )}
                    </td>

                    {/* Last incident */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {problem.lastIncidentDate ? (
                        <span className="text-xs text-ois-text-muted">
                          {formatRelative(problem.lastIncidentDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-ois-text-subtle">—</span>
                      )}
                    </td>

                    {/* Linked items icons */}
                    <td className="px-4 py-3">
                      <LinkedItemsIcons problem={problem} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded flex items-center justify-center hover:bg-ois-border text-ois-text-muted">
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Problem Modal */}
      <CreateProblemModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreateProblem} />
    </div>
  );
};
