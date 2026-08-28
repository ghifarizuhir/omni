import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, BarChart2, Plus, CheckSquare, Square, MoreHorizontal,
  CheckCircle2, Filter, X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative } from '@/src/lib/format';
import { incidentsService, usersService, servicesService, useResource } from '@/src/services';
import { Incident, IncidentStatus, IncidentPriority } from '@/src/types/incident';
import { IncidentPriorityBadge } from '@/src/components/incidents/IncidentPriorityBadge';
import { SLAIndicator } from '@/src/components/incidents/SLAIndicator';
import { MajorIncidentBanner } from '@/src/components/incidents/MajorIncidentBanner';
import { CreateIncidentModal } from '@/src/components/incidents/CreateIncidentModal';
import { UserPickerModal } from '@/src/components/incidents/UserPickerModal';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import { Modal } from '@/src/components/ui/Modal';
import { Input } from '@/src/components/ui/Input';
import { Can, useCurrentUser, filterReadable, incidentResource } from '@/src/lib/rbac';
import { IDCell } from '@/src/components/ui/IDCell';
import { StatusRing, type RingState } from '@/src/components/ui/StatusRing';

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

function getAssigneeName(users: { id: string; name: string }[], id?: string) {
  if (!id) return null;
  return users.find(u => u.id === id)?.name ?? null;
}

function getAssigneeInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getServiceName(services: { id: string; name: string }[], ids: string[]) {
  if (!ids.length) return '—';
  return services.find(s => ids.includes(s.id))?.name ?? ids[0];
}

// ── Quick filter chip definitions ─────────────────────────────────────────

type QuickFilter = 'my_open' | 'sla_risk' | 'p1p2' | 'last_24h' | 'customer_facing' | null;

function applyQuickFilter(incidents: Incident[], qf: QuickFilter): Incident[] {
  const now = Date.now();
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
  const location = useLocation();

  const { user, applications, teams, departments } = useCurrentUser();

  const { data: incidentsData, refresh: refreshIncidents } = useResource(() => incidentsService.list(), []);
  const { data: usersData } = useResource(() => usersService.list(), []);
  const { data: servicesData } = useResource(() => servicesService.list(), []);
  const mockUsers = usersData ?? [];
  const mockServices = servicesData ?? [];

  // mutable incidents state — filtered to what the current user can read
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  useEffect(() => {
    if (incidentsData) setAllIncidents([...incidentsData]);
  }, [incidentsData]);
  const incidents = useMemo(
    () => filterReadable(
      user,
      'incident',
      allIncidents.map(i => ({ ...i, ...incidentResource(i) })),
    ) as typeof allIncidents,
    [user, allIncidents, applications, teams, departments],
  );
  const setIncidents = setAllIncidents;

  // filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<IncidentPriority | 'all'>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // row overflow menu
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  // bulk-mutation status
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // pre-fill search from location state
  useEffect(() => {
    if ((location.state as any)?.search) {
      setSearch((location.state as any).search);
    }
  }, []);

  // major incidents
  const majorActive = useMemo(
    () => (incidentsData ?? []).filter(i => i.isMajor && i.status !== 'closed'),
    [incidentsData],
  );

  // derived counts
  const totalCount = incidents.length;
  const activeCount = useMemo(() => incidents.filter(i => ACTIVE_STATUSES.includes(i.status)).length, [incidents]);
  const majorCount = majorActive.length;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(i => { counts[i.status] = (counts[i.status] ?? 0) + 1; });
    return counts;
  }, [incidents]);

  const statusOptions = useMemo(() =>
    STATUS_FILTERS.map(s => ({
      value: s.value,
      label: s.label,
      count: s.value === 'all' ? totalCount : (statusCounts[s.value] ?? 0),
    })),
    [statusCounts, totalCount]
  );

  const priorityOptions = [
    { value: 'all', label: 'All priorities' },
    { value: 'P1',  label: 'P1 — Critical' },
    { value: 'P2',  label: 'P2 — High' },
    { value: 'P3',  label: 'P3 — Medium' },
    { value: 'P4',  label: 'P4 — Low' },
  ];

  const bulkPriorityOptions = [
    { value: 'P1', label: 'P1 — Critical' },
    { value: 'P2', label: 'P2 — High' },
    { value: 'P3', label: 'P3 — Medium' },
    { value: 'P4', label: 'P4 — Low' },
  ];

  // filtered & sorted list
  const filtered = useMemo(() => {
    let list = [...incidents];

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
        (i.assigneeId && getAssigneeName(mockUsers, i.assigneeId)?.toLowerCase().includes(q)) ||
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents, search, statusFilter, priorityFilter, quickFilter, usersData]);

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
  const now = Date.now();
  const myOpenCount = incidents.filter(i => ACTIVE_STATUSES.includes(i.status) && i.assigneeId === 'u-001').length;
  const slaRiskCount = incidents.filter(i =>
    i.slaResponseStatus === 'warning' || i.slaResponseStatus === 'breached' ||
    i.slaResolveStatus === 'warning' || i.slaResolveStatus === 'breached'
  ).length;
  const p1p2Count = incidents.filter(i => i.priority === 'P1' || i.priority === 'P2').length;
  const last24hCount = incidents.filter(i => now - new Date(i.createdAt).getTime() < 86_400_000).length;
  const customerFacingCount = incidents.filter(i => i.tags.includes('customer-facing')).length;

  // ── Bulk action handlers ──────────────────────────────────────────────────

  const handleBulkExport = () => {
    const selected = incidents.filter(i => selectedIds.has(i.id));
    const headers = ['ID', 'Title', 'Priority', 'Status', 'Assignee', 'Service', 'Created', 'Tags'];
    const rows = selected.map(inc => {
      const assigneeName = mockUsers.find((u: { id: string; name: string }) => u.id === inc.assigneeId)?.name ?? '';
      const serviceName = inc.affectedServiceIds.map(id => mockServices.find((s: { id: string; name: string }) => s.id === id)?.name ?? id).join('; ');
      return [inc.publicId, `"${inc.title.replace(/"/g, '""')}"`, inc.priority, inc.status, `"${assigneeName}"`, `"${serviceName}"`, inc.createdAt, `"${inc.tags.join(', ')}"`].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Resolve a partial-failure result-set into a user-visible banner string and
  // refresh the canonical list from the server. Called from every bulk handler.
  const reportBulkResults = (
    results: PromiseSettledResult<unknown>[],
    verb: string,
  ): boolean => {
    const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    if (failures.length > 0) {
      const firstReason = failures[0].reason instanceof Error
        ? failures[0].reason.message
        : String(failures[0].reason);
      setBulkError(
        `${results.length - failures.length} of ${results.length} ${verb} succeeded — ${failures.length} failed (${firstReason}).`,
      );
    }
    refreshIncidents();
    return failures.length === 0;
  };

  const handleBulkClose = async () => {
    const ids = Array.from(selectedIds);
    const selected = allIncidents.filter(i => ids.includes(i.id));
    if (selected.length === 0) { setConfirmClose(false); return; }
    setBulkError(null);
    setBulkSubmitting(true);
    // optimistic
    setIncidents(prev => prev.map(i => ids.includes(i.id) ? { ...i, status: 'closed' as const } : i));
    const results = await Promise.allSettled(
      selected.map(inc => incidentsService.setStatus(inc.publicId, 'closed')),
    );
    reportBulkResults(results, 'close');
    setBulkSubmitting(false);
    setSelectedIds(new Set());
    setConfirmClose(false);
  };

  const handleBulkAssign = async (userId: string) => {
    const ids = Array.from(selectedIds);
    const selected = allIncidents.filter(i => ids.includes(i.id));
    if (selected.length === 0) { setAssignOpen(false); return; }
    const assigneeName = mockUsers.find((u: { id: string; name: string }) => u.id === userId)?.name;
    setBulkError(null);
    setBulkSubmitting(true);
    setAssignOpen(false);
    setIncidents(prev => prev.map(i => ids.includes(i.id) ? { ...i, assigneeId: userId } : i));
    const results = await Promise.allSettled(
      selected.map(inc => incidentsService.assign(inc.publicId, { assigneeId: userId, assigneeName })),
    );
    reportBulkResults(results, 'assign');
    setBulkSubmitting(false);
    setSelectedIds(new Set());
  };

  const handleBulkPriority = async (priority: IncidentPriority) => {
    const ids = Array.from(selectedIds);
    const selected = allIncidents.filter(i => ids.includes(i.id));
    if (selected.length === 0) return;
    setBulkError(null);
    setBulkSubmitting(true);
    setIncidents(prev => prev.map(i => ids.includes(i.id) ? { ...i, priority } : i));
    const results = await Promise.allSettled(
      selected.map(inc => incidentsService.update(inc.publicId, { priority })),
    );
    reportBulkResults(results, 'priority update');
    setBulkSubmitting(false);
    setSelectedIds(new Set());
  };

  const handleBulkTag = async () => {
    const tag = tagInput.trim();
    if (!tag) return;
    const ids = Array.from(selectedIds);
    const selected = allIncidents.filter(i => ids.includes(i.id));
    if (selected.length === 0) { setTagOpen(false); setTagInput(''); return; }
    setBulkError(null);
    setBulkSubmitting(true);
    setTagOpen(false);
    // Compute new merged tags per incident — the PATCH replaces tags wholesale.
    const payloads = selected.map(inc => ({
      inc,
      tags: Array.from(new Set([...inc.tags, tag])),
    }));
    setIncidents(prev => prev.map(i => {
      const p = payloads.find(x => x.inc.id === i.id);
      return p ? { ...i, tags: p.tags } : i;
    }));
    const results = await Promise.allSettled(
      payloads.map(({ inc, tags }) => incidentsService.update(inc.publicId, { tags })),
    );
    reportBulkResults(results, 'tag');
    setBulkSubmitting(false);
    setSelectedIds(new Set());
    setTagInput('');
  };

  const handleRowAssignToMe = async (incident: Incident) => {
    if (!user) return;
    setBulkError(null);
    setAssigningId(incident.id);
    setIncidents(prev => prev.map(i => i.id === incident.id ? { ...i, assigneeId: user.id } : i));
    try {
      await incidentsService.assign(incident.publicId, { assigneeId: user.id, assigneeName: user.name });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBulkError(`Failed to assign ${incident.publicId}: ${msg}`);
    } finally {
      setAssigningId(null);
      refreshIncidents();
    }
  };

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
            <Button variant="outline" size="sm" onClick={() => navigate('/incidents/analytics')}>
              <BarChart2 size={15} className="mr-1.5" />
              Analytics
            </Button>
            <Can module="incident" action="create">
              <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} className="mr-1.5" />
                New incident
              </Button>
            </Can>
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
          <FilterDropdown
            value={statusFilter}
            onChange={val => setStatusFilter(val as IncidentStatus | 'all')}
            options={statusOptions}
            placeholder="Status"
          />

          {/* Priority filter */}
          <FilterDropdown
            value={priorityFilter}
            onChange={val => setPriorityFilter(val as IncidentPriority | 'all')}
            options={priorityOptions}
            placeholder="All priorities"
          />

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

      {/* Bulk error banner — sits above the action bar so failures stay visible
          even after the selection has been cleared by the bulk handler. */}
      {bulkError && (
        <div className="px-6 py-2 bg-ois-danger/5 border-b border-ois-danger/20 flex items-center gap-2 shrink-0">
          <span className="text-xs text-ois-danger flex-1">{bulkError}</span>
          <button
            onClick={() => setBulkError(null)}
            className="text-xs text-ois-danger/70 hover:text-ois-danger"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="px-6 py-2 bg-ois-primary/5 border-b border-ois-primary/20 flex items-center gap-3 shrink-0">
          <span className="text-sm font-medium text-ois-primary">{selectedIds.size} selected</span>
          {confirmClose ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-ois-danger font-medium">
                Close {selectedIds.size} incident{selectedIds.size > 1 ? 's' : ''}?
              </span>
              <Button variant="destructive" size="sm" onClick={handleBulkClose} disabled={bulkSubmitting}>
                {bulkSubmitting ? 'Updating…' : 'Confirm'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClose(false)} disabled={bulkSubmitting}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setAssignOpen(true)}
                disabled={bulkSubmitting}
                className="px-2.5 py-1 text-xs font-medium text-ois-primary border border-ois-primary/30 rounded-md hover:bg-ois-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign
              </button>
              <div className={cn('h-7', bulkSubmitting && 'opacity-50 pointer-events-none')}>
                <FilterDropdown
                  value=""
                  onChange={val => { void handleBulkPriority(val as IncidentPriority); }}
                  options={bulkPriorityOptions}
                  placeholder="Change priority"
                />
              </div>
              <button
                onClick={() => setTagOpen(true)}
                disabled={bulkSubmitting}
                className="px-2.5 py-1 text-xs font-medium text-ois-primary border border-ois-primary/30 rounded-md hover:bg-ois-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tag
              </button>
              <button
                onClick={() => setConfirmClose(true)}
                disabled={bulkSubmitting}
                className="px-2.5 py-1 text-xs font-medium text-ois-primary border border-ois-primary/30 rounded-md hover:bg-ois-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close
              </button>
              <button
                onClick={handleBulkExport}
                disabled={bulkSubmitting}
                className="px-2.5 py-1 text-xs font-medium text-ois-primary border border-ois-primary/30 rounded-md hover:bg-ois-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export
              </button>
            </div>
          )}
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
                  users={mockUsers}
                  services={mockServices}
                  selected={selectedIds.has(incident.id)}
                  onSelect={() => toggleOne(incident.id)}
                  onClick={() => navigate(`/incidents/${incident.publicId}`)}
                  menuOpen={rowMenuId === incident.id}
                  onMenuOpen={() => setRowMenuId(incident.id)}
                  onMenuClose={() => setRowMenuId(null)}
                  onAssignToMe={() => handleRowAssignToMe(incident)}
                  assigningToMe={assigningId === incident.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CreateIncidentModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={id => { refreshIncidents(); navigate(`/incidents/${id}`); }}
      />

      <UserPickerModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign to"
        onSelect={handleBulkAssign}
      />

      {tagOpen && (
        <Modal isOpen={tagOpen} onClose={() => { setTagOpen(false); setTagInput(''); }} title="Add Tag" size="sm">
          <div className="py-4 space-y-4">
            <Input
              label="Tag"
              placeholder="e.g. customer-facing, database"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) handleBulkTag(); }}
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
              <Button variant="ghost" size="sm" onClick={() => { setTagOpen(false); setTagInput(''); }}>Cancel</Button>
              <Button variant="primary" size="sm" disabled={!tagInput.trim()} onClick={handleBulkTag}>Add Tag</Button>
            </div>
          </div>
        </Modal>
      )}
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

const INCIDENT_STATUS_TO_RING: Record<string, RingState> = {
  new:         'open',
  triaging:    'acknowledged',
  in_progress: 'investigating',
  pending:     'investigating',
  resolved:    'resolved',
  closed:      'closed',
};

interface IncidentRowProps {
  incident: Incident;
  users: { id: string; name: string }[];
  services: { id: string; name: string }[];
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  menuOpen: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onAssignToMe: () => void;
  assigningToMe?: boolean;
}

const IncidentRow: React.FC<IncidentRowProps> = ({
  incident, users, services, selected, onSelect, onClick, menuOpen, onMenuOpen, onMenuClose, onAssignToMe, assigningToMe
}) => {
  const assigneeName = getAssigneeName(users, incident.assigneeId);
  const serviceName = getServiceName(services, incident.affectedServiceIds);
  const visibleTags = incident.tags.slice(0, 2);
  const extraTags = incident.tags.length - visibleTags.length;

  const stripeColor = ({ P1: '#B42318', P2: '#DC6803', P3: '#DC6803', P4: '#027A48' } as Record<string, string>)[incident.severity] ?? '#1F4FD4';

  return (
    <tr
      className={cn(
        'group hover:bg-ois-surface-muted/60 transition-colors cursor-pointer border-l-[3px]',
        selected && 'bg-ois-primary/5'
      )}
      style={{ borderLeftColor: stripeColor }}
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
          <IDCell value={incident.publicId} />
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
        <StatusRing state={INCIDENT_STATUS_TO_RING[incident.status] ?? 'open'} aria-label={incident.status} />
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
      <td className="px-2 py-2.5 relative">
        <button
          onClick={e => { e.stopPropagation(); menuOpen ? onMenuClose() : onMenuOpen(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-ois-surface-muted"
        >
          <MoreHorizontal size={14} className="text-ois-text-subtle" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); onMenuClose(); }} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-ois-border rounded-lg shadow-ois-dropdown overflow-hidden min-w-[140px]">
              <button
                onClick={e => { e.stopPropagation(); onClick(); onMenuClose(); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-ois-surface-muted text-ois-text"
              >
                View
              </button>
              <button
                onClick={e => { e.stopPropagation(); onAssignToMe(); onMenuClose(); }}
                disabled={assigningToMe}
                className="w-full text-left px-3 py-2 text-sm hover:bg-ois-surface-muted text-ois-text disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningToMe ? 'Assigning…' : 'Assign to me'}
              </button>
            </div>
          </>
        )}
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
