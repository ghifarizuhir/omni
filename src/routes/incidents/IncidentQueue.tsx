import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, BarChart2, Plus, CheckSquare, Square, MoreHorizontal,
  CheckCircle2, Filter, X, ChevronDown
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative } from '@/src/lib/format';
import { mockIncidents, getMajorIncidents, getActiveIncidents } from '@/src/mocks/incidents';
import { mockUsers } from '@/src/mocks/users';
import { mockServices } from '@/src/mocks/services';
import { Incident, IncidentStatus, IncidentPriority } from '@/src/types/incident';
import { IncidentStatusPill } from '@/src/components/incidents/IncidentStatusPill';
import { IncidentPriorityBadge } from '@/src/components/incidents/IncidentPriorityBadge';
import { SLAIndicator } from '@/src/components/incidents/SLAIndicator';
import { MajorIncidentBanner } from '@/src/components/incidents/MajorIncidentBanner';
import { CreateIncidentModal } from '@/src/components/incidents/CreateIncidentModal';
import { Avatar } from '@/src/components/ui/Avatar';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: IncidentStatus[] = ['new', 'triaging', 'in_progress', 'pending'];

const STATUS_FILTERS: { value: IncidentStatus | 'all'; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'new',         label: 'New' },
  { value: 'triaging',    label: 'Triaging' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'pending',     label: 'Pending' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'closed',      label: 'Closed' },
];

const PRIORITY_ORDER: Record<IncidentPriority, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

function getAssigneeName(id?: string) {
  if (!id) return null;
  return mockUsers.find(u => u.id === id)?.name ?? null;
}

function getAssigneeInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getServiceName(ids: string[]) {
  if (!ids.length) return '—';
  return mockServices.find(s => ids.includes(s.id))?.name ?? ids[0];
}

// ── Quick filter chip definitions ─────────────────────────────────────────

type QuickFilter = 'my_open' | 'sla_risk' | 'p1p2' | 'last_24h' | 'customer_facing' | null;

function applyQuickFilter(incidents: Incident[], qf: QuickFilter): Incident[] {
  const now = new Date('2026-05-09T00:00:00Z').getTime();
  switch (qf) {
    case 'my_open':
      return incidents.filter(i => ACTIVE_STATUSES.includes(i.status) && i.assigneeId === 'u-001');
    case 'sla_risk':
      return incidents.filter(i =>
        i.slaResponseStatus === 'warning' || i.slaResponseStatus === 'breached' ||
        i.slaResolveStatus === 'warning' || i.slaResolveStatus === 'breached'
      );
    case 'p1p2':
      return incidents.filter(i => i.priority === 'P1' || i.priority === 'P2');
    case 'last_24h':
      return incidents.filter(i => now - new Date(i.createdAt).getTime() < 86_400_000);
    case 'customer_facing':
      return incidents.filter(i => i.tags.includes('customer-facing'));
    default:
      return incidents;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export const IncidentQueue: React.FC = () => {
  const navigate = useNavigate();

  // filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<IncidentPriority | 'all'>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // modal
  const [createOpen, setCreateOpen] = useState(false);

  // major incidents
  const majorActive = useMemo(() => getMajorIncidents().filter(i => i.status !== 'closed'), []);

  // derived counts
  const totalCount = mockIncidents.length;
  const activeCount = getActiveIncidents().length;
  const majorCount = majorActive.length;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mockIncidents.forEach(i => { counts[i.status] = (counts[i.status] ?? 0) + 1; });
    return counts;
  }, []);

  // filtered & sorted list
  const filtered = useMemo(() => {
    let list = [...mockIncidents];

    // quick filter
    list = applyQuickFilter(list, quickFilter);

    // status
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);

    // priority
    if (priorityFilter !== 'all') list = list.filter(i => i.priority === priorityFilter);

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.publicId.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        (i.assigneeId && getAssigneeName(i.assigneeId)?.toLowerCase().includes(q)) ||
        i.affectedCIPublicIds.some(c => c.toLowerCase().includes(q))
      );
    }

    // sort: priority asc, then created desc
    list.sort((a, b) => {
      const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pd !== 0) return pd;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [search, statusFilter, priorityFilter, quickFilter]);

  // selection helpers
  const allSelected = filtered.length > 0 && filtered.every(i => selectedIds.has(i.id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(i => i.id)));
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setQuickFilter(null);
  };

  const hasFilters = search || statusFilter !== 'all' || priorityFilter !== 'all' || quickFilter;

  // quick filter counts
  const now = new Date('2026-05-09T00:00:00Z').getTime();
  const myOpenCount = mockIncidents.filter(i => ACTIVE_STATUSES.includes(i.status) && i.assigneeId === 'u-001').length;
  const slaRiskCount = mockIncidents.filter(i =>
    i.slaResponseStatus === 'warning' || i.slaResponseStatus === 'breached' ||
    i.slaResolveStatus === 'warning' || i.slaResolveStatus === 'breached'
  ).length;
  const p1p2Count = mockIncidents.filter(i => i.priority === 'P1' || i.priority === 'P2').length;
  const last24hCount = mockIncidents.filter(i => now - new Date(i.createdAt).getTime() < 86_400_000).length;
  const customerFacingCount = mockIncidents.filter(i => i.tags.includes('customer-facing')).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-ois-border bg-white shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ois-text tracking-tight">Incidents</h1>
            <p className="text-sm text-ois-text-subtle mt-0.5">
              {totalCount} total · {activeCount} active · {majorCount} major (P1)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/incidents/analytics')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ois-text-subtle hover:text-ois-text border border-ois-border rounded-lg hover:bg-ois-surface-muted transition-colors"
            >
              <BarChart2 size={15} />
              Analytics
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-ois-primary hover:bg-ois-primary/90 rounded-lg transition-colors"
            >
              <Plus size={15} />
              New incident
            </button>
          </div>
        </div>

        {/* Major incident banner */}
        {majorActive.length > 0 && (
          <MajorIncidentBanner incident={majorActive[0]} className="mt-4" />
        )}
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-ois-border bg-ois-surface-muted shrink-0">
        {/* Search + dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-80">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, title, assignee, CI…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-ois-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as IncidentStatus | 'all')}
              className="appearance-none pl-3 pr-7 py-1.5 text-sm border border-ois-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/30 cursor-pointer"
            >
              {STATUS_FILTERS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}{s.value !== 'all' ? ` (${statusCounts[s.value] ?? 0})` : ` (${totalCount})`}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
          </div>

          {/* Priority filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as IncidentPriority | 'all')}
              className="appearance-none pl-3 pr-7 py-1.5 text-sm border border-ois-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/30 cursor-pointer"
            >
              <option value="all">All priorities</option>
              <option value="P1">P1 — Critical</option>
              <option value="P2">P2 — High</option>
              <option value="P3">P3 — Medium</option>
              <option value="P4">P4 — Low</option>
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
          </div>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-ois-text-subtle hover:text-ois-danger border border-ois-border rounded-lg bg-white hover:border-ois-danger/40 transition-colors"
            >
              <X size={12} />
              Reset
            </button>
          )}
        </div>

        {/* Quick filter chips */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <QuickFilterChip
            label={`🔥 My open (${myOpenCount})`}
            active={quickFilter === 'my_open'}
            onClick={() => setQuickFilter(prev => prev === 'my_open' ? null : 'my_open')}
          />
          <QuickFilterChip
            label={`⚠ SLA at risk (${slaRiskCount})`}
            active={quickFilter === 'sla_risk'}
            onClick={() => setQuickFilter(prev => prev === 'sla_risk' ? null : 'sla_risk')}
          />
          <QuickFilterChip
            label={`💥 P1/P2 (${p1p2Count})`}
            active={quickFilter === 'p1p2'}
            onClick={() => setQuickFilter(prev => prev === 'p1p2' ? null : 'p1p2')}
          />
          <QuickFilterChip
            label={`📡 Last 24h (${last24hCount})`}
            active={quickFilter === 'last_24h'}
            onClick={() => setQuickFilter(prev => prev === 'last_24h' ? null : 'last_24h')}
          />
          <QuickFilterChip
            label={`Customer-facing (${customerFacingCount})`}
            active={quickFilter === 'customer_facing'}
            onClick={() => setQuickFilter(prev => prev === 'customer_facing' ? null : 'customer_facing')}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="px-6 py-2 bg-ois-primary/5 border-b border-ois-primary/20 flex items-center gap-3 shrink-0">
          <span className="text-sm font-medium text-ois-primary">{selectedIds.size} selected</span>
          <div className="flex items-center gap-1.5">
            {['Assign', 'Change priority', 'Tag', 'Close', 'Export'].map(action => (
              <button
                key={action}
                className="px-2.5 py-1 text-xs font-medium text-ois-primary border border-ois-primary/30 rounded-md hover:bg-ois-primary/10 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-ois-text-subtle hover:text-ois-text"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <EmptyState hasFilters={!!hasFilters} onReset={resetFilters} onCreate={() => setCreateOpen(true)} />
        ) : (
          <table className="w-full text-sm border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-ois-surface-muted border-b border-ois-border">
                <th className="w-8 px-3 py-2.5">
                  <button onClick={toggleAll}>
                    {allSelected
                      ? <CheckSquare size={14} className="text-ois-primary" />
                      : <Square size={14} className="text-ois-text-subtle" />
                    }
                  </button>
                </th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide w-14">Pri</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide w-36">ID</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">Title</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide w-28">Status</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide w-32">Assignee</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide w-32">Service</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide w-24">Created</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide w-24">SLA</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide w-32">Tags</th>
                <th className="px-2 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ois-border">
              {filtered.map(incident => (
                <IncidentRow
                  key={incident.id}
                  incident={incident}
                  selected={selectedIds.has(incident.id)}
                  onSelect={() => toggleOne(incident.id)}
                  onClick={() => navigate(`/incidents/${incident.publicId}`)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CreateIncidentModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={id => navigate(`/incidents/${id}`)}
      />
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const QuickFilterChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
      active
        ? 'bg-ois-primary text-white border-ois-primary'
        : 'bg-white text-ois-text-subtle border-ois-border hover:border-ois-border-strong hover:text-ois-text'
    )}
  >
    {label}
  </button>
);

const IncidentRow: React.FC<{
  incident: Incident;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}> = ({ incident, selected, onSelect, onClick }) => {
  const assigneeName = getAssigneeName(incident.assigneeId);
  const serviceName = getServiceName(incident.affectedServiceIds);
  const visibleTags = incident.tags.slice(0, 2);
  const extraTags = incident.tags.length - visibleTags.length;

  return (
    <tr
      className={cn(
        'group hover:bg-ois-surface-muted/60 transition-colors cursor-pointer',
        selected && 'bg-ois-primary/5'
      )}
    >
      {/* Checkbox */}
      <td className="px-3 py-2.5" onClick={e => { e.stopPropagation(); onSelect(); }}>
        {selected
          ? <CheckSquare size={14} className="text-ois-primary" />
          : <Square size={14} className="text-ois-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
        }
      </td>

      {/* Priority */}
      <td className="px-2 py-2.5" onClick={onClick}>
        <IncidentPriorityBadge priority={incident.priority} />
      </td>

      {/* Public ID */}
      <td className="px-2 py-2.5" onClick={onClick}>
        <div className="flex items-center gap-1">
          {incident.isMajor && <span title="Major incident">🚨</span>}
          <span className="font-mono text-xs text-ois-primary font-semibold">{incident.publicId}</span>
        </div>
      </td>

      {/* Title */}
      <td className="px-2 py-2.5" onClick={onClick}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate max-w-xs font-medium text-ois-text" title={incident.title}>
            {incident.title}
          </span>
          {incident.triggeringEventPublicId && (
            <span className="shrink-0 px-1.5 py-0.5 text-[10px] bg-ois-info-pale text-ois-info rounded font-medium">
              event
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-2 py-2.5" onClick={onClick}>
        <IncidentStatusPill status={incident.status} />
      </td>

      {/* Assignee */}
      <td className="px-2 py-2.5" onClick={onClick}>
        {assigneeName ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-ois-primary/20 text-ois-primary flex items-center justify-center text-[9px] font-bold shrink-0">
              {getAssigneeInitials(assigneeName)}
            </div>
            <span className="text-xs text-ois-text truncate max-w-[90px]">{assigneeName}</span>
          </div>
        ) : (
          <span className="text-xs text-ois-text-subtle italic">Unassigned</span>
        )}
      </td>

      {/* Service */}
      <td className="px-2 py-2.5" onClick={onClick}>
        <span className="text-xs text-ois-text truncate max-w-[110px] block">{serviceName}</span>
      </td>

      {/* Created */}
      <td className="px-2 py-2.5" onClick={onClick}>
        <span className="text-xs text-ois-text-subtle whitespace-nowrap">
          {formatRelative(incident.createdAt)}
        </span>
      </td>

      {/* SLA */}
      <td className="px-2 py-2.5" onClick={onClick}>
        <SLAIndicator
          responseStatus={incident.slaResponseStatus}
          resolveStatus={incident.slaResolveStatus}
          responseTarget={incident.slaResponseTarget}
          resolveTarget={incident.slaResolveTarget}
          firstResponseAt={incident.firstResponseAt}
        />
      </td>

      {/* Tags */}
      <td className="px-2 py-2.5" onClick={onClick}>
        <div className="flex items-center gap-1 flex-wrap">
          {visibleTags.map(tag => (
            <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-ois-surface-muted text-ois-text-subtle rounded border border-ois-border">
              {tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span className="text-[10px] text-ois-text-subtle">+{extraTags}</span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-2 py-2.5">
        <button
          onClick={e => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-ois-surface-muted"
        >
          <MoreHorizontal size={14} className="text-ois-text-subtle" />
        </button>
      </td>
    </tr>
  );
};

const EmptyState: React.FC<{ hasFilters: boolean; onReset: () => void; onCreate: () => void }> = ({
  hasFilters, onReset, onCreate
}) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    {hasFilters ? (
      <>
        <Filter size={40} className="text-ois-text-subtle mb-3" />
        <p className="text-base font-semibold text-ois-text mb-1">No incidents match</p>
        <p className="text-sm text-ois-text-subtle mb-4">Try adjusting your filters or search.</p>
        <div className="flex gap-2">
          <button onClick={onReset} className="px-3 py-1.5 text-sm border border-ois-border rounded-lg hover:bg-ois-surface-muted">
            Reset filters
          </button>
          <button onClick={onCreate} className="px-3 py-1.5 text-sm bg-ois-primary text-white rounded-lg hover:bg-ois-primary/90">
            + Create incident
          </button>
        </div>
      </>
    ) : (
      <>
        <CheckCircle2 size={48} className="text-ois-success mb-3" />
        <p className="text-base font-semibold text-ois-text mb-1">All clear</p>
        <p className="text-sm text-ois-text-subtle">No active incidents.</p>
      </>
    )}
  </div>
);
