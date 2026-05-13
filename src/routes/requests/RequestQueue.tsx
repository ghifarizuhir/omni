import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, CheckCircle2, Plus, MoreVertical,
  AlertTriangle, Clock, Check, ThumbsUp, UserCheck, Ban,
  SlidersHorizontal, Flame, ShieldAlert, Users, Radio,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative } from '@/src/lib/format';
import { mockServiceRequests, getMyPendingApprovals } from '@/src/mocks/serviceRequests';
import { mockUsers } from '@/src/mocks/users';
import { currentUser } from '@/src/mocks/users';
import { Avatar } from '@/src/components/ui/Avatar';
import {
  ServiceRequest, RequestStatus, CatalogCategory, WorkflowStepInstance,
} from '@/src/types/request';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import { useCurrentUser, filterReadable, requestResource } from '@/src/lib/rbac';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<RequestStatus, { label: string; dot: string; text: string; bg: string }> = {
  draft:          { label: 'Draft',          dot: 'bg-ois-text-subtle', text: 'text-ois-text-muted',  bg: 'bg-ois-surface-muted' },
  submitted:      { label: 'Submitted',      dot: 'bg-ois-info',        text: 'text-ois-info',         bg: 'bg-ois-info-pale' },
  approved:       { label: 'Approved',       dot: 'bg-ois-success',     text: 'text-ois-success',      bg: 'bg-ois-success-pale' },
  in_fulfillment: { label: 'In Fulfillment', dot: 'bg-ois-warning',     text: 'text-ois-warning',      bg: 'bg-ois-warning-pale' },
  pending_user:   { label: 'Pending User',   dot: 'bg-purple-500',      text: 'text-purple-600',       bg: 'bg-purple-50' },
  fulfilled:      { label: 'Fulfilled',      dot: 'bg-ois-success',     text: 'text-ois-success',      bg: 'bg-ois-success-pale' },
  closed:         { label: 'Closed',         dot: 'bg-ois-text-subtle', text: 'text-ois-text-muted',  bg: 'bg-ois-surface-muted' },
  rejected:       { label: 'Rejected',       dot: 'bg-ois-danger',      text: 'text-ois-danger',       bg: 'bg-ois-danger-pale' },
  cancelled:      { label: 'Cancelled',      dot: 'bg-ois-text-subtle', text: 'text-ois-text-muted',  bg: 'bg-ois-surface-muted' },
};

const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  access: 'Access', equipment: 'Equipment', software: 'Software',
  communication: 'Communication', personnel: 'Personnel', general: 'General',
};

const NOW = new Date('2026-05-09T10:00:00Z').getTime();

// ── Helpers ───────────────────────────────────────────────────────────────────

function getActiveStep(req: ServiceRequest): WorkflowStepInstance | null {
  return req.workflow.steps.find(s => s.status === 'active') ?? null;
}

function getAssigneeName(step: WorkflowStepInstance | null): string {
  if (!step) return '—';
  return step.assigneeName ?? (step.type === 'automated' ? 'Auto' : '—');
}

function slaRemaining(step: WorkflowStepInstance | null): { label: string; color: string; dot: string } | null {
  if (!step || !step.startedAt) return null;
  const elapsed = (NOW - new Date(step.startedAt).getTime()) / 3_600_000; // hours
  const remaining = step.slaHours - elapsed;

  if (step.slaStatus === 'breached' || remaining <= 0) {
    return { label: 'Breached', color: 'text-ois-danger', dot: 'bg-ois-danger' };
  }
  if (step.slaStatus === 'warning' || remaining < step.slaHours * 0.25) {
    const h = Math.max(0, Math.ceil(remaining));
    const label = h < 1 ? '<1h' : h < 24 ? `${h}h left` : `${Math.ceil(h / 24)}d left`;
    return { label, color: 'text-ois-warning', dot: 'bg-ois-warning' };
  }
  const h = Math.ceil(remaining);
  const label = h < 1 ? '<1h' : h < 24 ? `${h}h left` : `${Math.ceil(h / 24)}d left`;
  return { label, color: 'text-ois-success', dot: 'bg-ois-success' };
}

function isMyApproval(req: ServiceRequest): boolean {
  return req.workflow.steps.some(
    s => s.status === 'active' && s.type === 'approval' && s.assigneeId === currentUser.id
  );
}

function isMyTeam(req: ServiceRequest): boolean {
  const step = getActiveStep(req);
  if (!step?.assigneeId) return false;
  const u = mockUsers.find(u => u.id === step.assigneeId);
  return u?.team === currentUser.team;
}

function isLast24h(req: ServiceRequest): boolean {
  if (!req.submittedAt) return false;
  return NOW - new Date(req.submittedAt).getTime() < 86_400_000;
}

type QuickFilter = 'my_approval' | 'sla_risk' | 'my_team' | 'last_24h' | null;

function applyQuick(reqs: ServiceRequest[], qf: QuickFilter): ServiceRequest[] {
  if (!qf) return reqs;
  if (qf === 'my_approval') return reqs.filter(isMyApproval);
  if (qf === 'sla_risk')    return reqs.filter(r => r.slaBreached || r.workflow.steps.some(s => s.slaStatus === 'warning' || s.slaStatus === 'breached'));
  if (qf === 'my_team')     return reqs.filter(isMyTeam);
  if (qf === 'last_24h')    return reqs.filter(isLast24h);
  return reqs;
}

// ── Status pill ────────────────────────────────────────────────────────────────

const StatusPill: React.FC<{ status: RequestStatus }> = ({ status }) => {
  const m = STATUS_META[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none', m.bg, m.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', m.dot)} />
      {m.label}
    </span>
  );
};


// ── Quick-filter chip ─────────────────────────────────────────────────────────

const QChip: React.FC<{
  icon: React.ReactNode; label: string; count: number;
  active: boolean; onClick: () => void; colorCls?: string;
}> = ({ icon, label, count, active, onClick, colorCls = 'text-ois-primary bg-ois-primary-pale border-ois-primary/30' }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
      active ? colorCls : 'bg-white text-ois-text-muted border-ois-border hover:border-ois-primary/40 hover:text-ois-primary',
    )}
  >
    {icon}
    {label}
    <span className={cn(
      'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
      active ? 'bg-white/60' : 'bg-ois-surface-muted',
    )}>
      {count}
    </span>
  </button>
);

// ── Row actions dropdown ──────────────────────────────────────────────────────

const RowActions: React.FC<{ req: ServiceRequest; onOpen: () => void }> = ({ req, onOpen }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const canApprove = isMyApproval(req);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-md text-ois-text-subtle hover:text-ois-text hover:bg-ois-surface-muted transition-colors"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-ois-surface border border-ois-border rounded-lg shadow-ois-dropdown min-w-[160px] py-1 text-sm">
          <button onClick={() => { onOpen(); setOpen(false); }}
            className="w-full text-left px-3 py-2 hover:bg-ois-surface-muted transition-colors text-ois-text flex items-center gap-2">
            <Search size={13} className="text-ois-text-muted" /> Open
          </button>

          {canApprove && (
            <button onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 hover:bg-ois-success-pale transition-colors text-ois-success font-semibold flex items-center gap-2">
              <Check size={13} /> Approve
            </button>
          )}

          <button onClick={() => setOpen(false)}
            className="w-full text-left px-3 py-2 hover:bg-ois-surface-muted transition-colors text-ois-text flex items-center gap-2">
            <UserCheck size={13} className="text-ois-text-muted" /> Assign
          </button>

          {!['closed', 'fulfilled', 'rejected', 'cancelled'].includes(req.status) && (
            <button onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 hover:bg-ois-danger-pale transition-colors text-ois-danger flex items-center gap-2">
              <Ban size={13} /> Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const RequestQueue: React.FC = () => {
  const navigate = useNavigate();

  const [search,     setSearch]     = useState('');
  const [statusFlt,  setStatusFlt]  = useState('');
  const [catFlt,     setCatFlt]     = useState('');
  const [stepFlt,    setStepFlt]    = useState('');
  const [slaFlt,     setSlaFlt]     = useState('');
  const [quickFlt,   setQuickFlt]   = useState<QuickFilter>(null);

  const { user, applications, teams, departments } = useCurrentUser();
  const all = useMemo(
    () => filterReadable(
      user,
      'request',
      mockServiceRequests.map(r => ({ ...r, ...requestResource(r) })),
    ) as typeof mockServiceRequests,
    [user, applications, teams, departments],
  );

  // ── Pre-computed counts for chips ──────────────────────────────────────────
  const counts = useMemo(() => ({
    myApproval: all.filter(isMyApproval).length,
    slaRisk:    all.filter(r => r.slaBreached || r.workflow.steps.some(s => s.slaStatus === 'warning' || s.slaStatus === 'breached')).length,
    myTeam:     all.filter(isMyTeam).length,
    last24h:    all.filter(isLast24h).length,
    active:     all.filter(r => ['submitted', 'approved', 'in_fulfillment', 'pending_user'].includes(r.status)).length,
    breached:   all.filter(r => r.slaBreached).length,
  }), []);

  // ── Filtered + sorted results ──────────────────────────────────────────────
  const results = useMemo(() => {
    let r = applyQuick(all, quickFlt);

    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(req =>
        req.publicId.toLowerCase().includes(q) ||
        req.title.toLowerCase().includes(q) ||
        req.requesterName.toLowerCase().includes(q) ||
        req.catalogItemName.toLowerCase().includes(q)
      );
    }

    if (statusFlt) r = r.filter(req => req.status === statusFlt);
    if (catFlt)    r = r.filter(req => req.catalogCategory === catFlt);

    if (stepFlt) {
      r = r.filter(req => {
        const step = getActiveStep(req);
        return step ? step.type === stepFlt : false;
      });
    }

    if (slaFlt === 'breached') r = r.filter(req => req.slaBreached);
    if (slaFlt === 'warning')  r = r.filter(req => req.workflow.steps.some(s => s.slaStatus === 'warning'));
    if (slaFlt === 'healthy')  r = r.filter(req => !req.slaBreached && req.workflow.steps.every(s => s.slaStatus === 'healthy'));

    // Sort: my pending approvals first, then by submitted desc
    return [...r].sort((a, b) => {
      const aApproval = isMyApproval(a) ? 0 : 1;
      const bApproval = isMyApproval(b) ? 0 : 1;
      if (aApproval !== bApproval) return aApproval - bApproval;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [search, statusFlt, catFlt, stepFlt, slaFlt, quickFlt]);

  const hasFilters = !!(search || statusFlt || catFlt || stepFlt || slaFlt || quickFlt);

  const resetAll = () => {
    setSearch(''); setStatusFlt(''); setCatFlt('');
    setStepFlt(''); setSlaFlt(''); setQuickFlt(null);
  };

  const openRequest = (req: ServiceRequest) => navigate(`/requests/${req.id}`);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 -mt-6 -mx-6">

      {/* ── PAGE HEADER ───────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-ois-border bg-ois-surface shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-ois-text tracking-tight">Service Requests</h1>
            <p className="text-xs text-ois-text-muted mt-1 flex items-center gap-2 flex-wrap">
              <span><span className="font-semibold text-ois-text">{all.length}</span> total</span>
              <span className="text-ois-border-strong">·</span>
              <span><span className="font-semibold text-ois-text">{counts.active}</span> active</span>
              {counts.myApproval > 0 && (
                <>
                  <span className="text-ois-border-strong">·</span>
                  <span className="text-ois-info font-semibold">{counts.myApproval} awaiting your approval</span>
                </>
              )}
              {counts.breached > 0 && (
                <>
                  <span className="text-ois-border-strong">·</span>
                  <span className="text-ois-danger font-semibold">{counts.breached} SLA breached</span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/portal/catalog')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-ois-primary hover:bg-ois-primary-hover rounded-lg transition-colors active:scale-95"
          >
            <Plus size={15} /> New request
          </button>
        </div>
      </div>

      {/* ── FILTER BAR ────────────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-ois-border bg-ois-surface-muted shrink-0 space-y-2.5">

        {/* Row 1: search + dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-52 max-w-72">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, title, requester…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-ois-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-ois-text-subtle hover:text-ois-text">
                <X size={12} />
              </button>
            )}
          </div>

          <FilterDropdown
            value={statusFlt}
            onChange={setStatusFlt}
            options={[
              { value: '', label: 'Status' },
              { value: 'draft',          label: 'Draft' },
              { value: 'submitted',      label: 'Submitted' },
              { value: 'approved',       label: 'Approved' },
              { value: 'in_fulfillment', label: 'In Fulfillment' },
              { value: 'pending_user',   label: 'Pending User' },
              { value: 'fulfilled',      label: 'Fulfilled' },
              { value: 'closed',         label: 'Closed' },
              { value: 'rejected',       label: 'Rejected' },
            ]}
            placeholder="Status"
          />

          <FilterDropdown
            value={catFlt}
            onChange={setCatFlt}
            options={[
              { value: '', label: 'Category' },
              ...Object.entries(CATEGORY_LABELS).map(([v, label]) => ({ value: v, label })),
            ]}
            placeholder="Category"
          />

          <FilterDropdown
            value={stepFlt}
            onChange={setStepFlt}
            options={[
              { value: '', label: 'Step type' },
              { value: 'approval',  label: 'Approval' },
              { value: 'task',      label: 'Task' },
              { value: 'automated', label: 'Automated' },
            ]}
            placeholder="Step type"
          />

          <FilterDropdown
            value={slaFlt}
            onChange={setSlaFlt}
            options={[
              { value: '', label: 'SLA' },
              { value: 'healthy',  label: 'SLA healthy' },
              { value: 'warning',  label: 'SLA warning' },
              { value: 'breached', label: 'SLA breached' },
            ]}
            placeholder="SLA"
          />

          {hasFilters && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-ois-text-subtle hover:text-ois-danger border border-ois-border rounded-lg bg-white hover:border-ois-danger/40 transition-colors ml-auto"
            >
              <X size={12} /> Reset
            </button>
          )}
        </div>

        {/* Row 2: quick chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <QChip
            icon={<Flame size={11} />}
            label="Awaiting my approval"
            count={counts.myApproval}
            active={quickFlt === 'my_approval'}
            onClick={() => setQuickFlt(p => p === 'my_approval' ? null : 'my_approval')}
            colorCls="text-ois-primary bg-ois-primary-pale border-ois-primary/30"
          />
          <QChip
            icon={<ShieldAlert size={11} />}
            label="SLA at risk"
            count={counts.slaRisk}
            active={quickFlt === 'sla_risk'}
            onClick={() => setQuickFlt(p => p === 'sla_risk' ? null : 'sla_risk')}
            colorCls="text-ois-warning bg-ois-warning-pale border-[#F79009]/30"
          />
          <QChip
            icon={<Users size={11} />}
            label="My team"
            count={counts.myTeam}
            active={quickFlt === 'my_team'}
            onClick={() => setQuickFlt(p => p === 'my_team' ? null : 'my_team')}
            colorCls="text-ois-success bg-ois-success-pale border-ois-success/30"
          />
          <QChip
            icon={<Radio size={11} />}
            label="Last 24h"
            count={counts.last24h}
            active={quickFlt === 'last_24h'}
            onClick={() => setQuickFlt(p => p === 'last_24h' ? null : 'last_24h')}
            colorCls="text-ois-info bg-ois-info-pale border-ois-info/20"
          />

          {/* Results count when filtering */}
          {hasFilters && (
            <span className="text-xs text-ois-text-subtle ml-auto">
              {results.length} of {all.length} requests
            </span>
          )}
        </div>
      </div>

      {/* ── TABLE ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <CheckCircle2 size={32} className="text-ois-success mb-3 opacity-60" />
            <p className="text-sm font-bold text-ois-text">All clear. No active requests.</p>
            {hasFilters && (
              <button onClick={resetAll} className="mt-2 text-xs text-ois-primary font-semibold hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-ois-surface border-b border-ois-border sticky top-0 z-10">
              <tr>
                {['ID', 'Title', 'Status', 'Requester', 'Current step', 'Assigned to', 'Submitted', 'SLA', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ois-border">
              {results.map(req => {
                const activeStep  = getActiveStep(req);
                const assigneeName = getAssigneeName(activeStep);
                const sla         = slaRemaining(activeStep);
                const myApproval  = isMyApproval(req);

                return (
                  <tr
                    key={req.id}
                    onClick={() => openRequest(req)}
                    className={cn(
                      'group cursor-pointer transition-colors hover:bg-ois-surface-muted/60',
                      myApproval && 'bg-ois-primary-pale/40 hover:bg-ois-primary-pale/70',
                    )}
                  >
                    {/* ID */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {myApproval && (
                          <span className="w-1.5 h-1.5 rounded-full bg-ois-primary shrink-0" title="Awaiting your approval" />
                        )}
                        <span className="font-mono text-[11px] text-ois-text-muted group-hover:text-ois-primary transition-colors">
                          {req.publicId}
                        </span>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-sm font-semibold text-ois-text truncate group-hover:text-ois-primary transition-colors">
                        {req.title}
                      </div>
                      <div className="text-[10px] text-ois-text-subtle mt-0.5 capitalize">
                        {CATEGORY_LABELS[req.catalogCategory]}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusPill status={req.status} />
                    </td>

                    {/* Requester */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Avatar name={req.requesterName} size="xs" />
                        <span className="text-xs text-ois-text">{req.requesterName}</span>
                      </div>
                    </td>

                    {/* Current step */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {activeStep ? (
                        <div className="flex items-center gap-1.5 text-xs text-ois-text">
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            activeStep.type === 'approval'  ? 'bg-ois-primary' :
                            activeStep.type === 'automated' ? 'bg-ois-success'  : 'bg-ois-warning',
                          )} />
                          <span className="font-medium">{activeStep.name}</span>
                          {activeStep.assigneeName && (
                            <span className="text-ois-text-subtle">· {activeStep.assigneeName.split(' ')[0]}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-ois-text-subtle">—</span>
                      )}
                    </td>

                    {/* Assigned to */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {activeStep?.assigneeName ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={activeStep.assigneeName} size="xs" />
                          <span className="text-xs text-ois-text">{activeStep.assigneeName.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-ois-text-subtle">{assigneeName}</span>
                      )}
                    </td>

                    {/* Submitted */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-ois-text-muted">
                        {req.submittedAt ? formatRelative(req.submittedAt) : '—'}
                      </span>
                    </td>

                    {/* SLA */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {sla ? (
                        <span className={cn('flex items-center gap-1.5 text-xs font-semibold', sla.color)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sla.dot)} />
                          {sla.label}
                        </span>
                      ) : req.slaBreached ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-ois-danger">
                          <AlertTriangle size={11} /> Breached
                        </span>
                      ) : (
                        <span className="text-xs text-ois-text-subtle">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <RowActions req={req} onOpen={() => openRequest(req)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="px-6 py-2.5 border-t border-ois-border bg-ois-surface-muted shrink-0">
          <p className="text-[11px] text-ois-text-subtle">
            Showing <span className="font-semibold text-ois-text">{results.length}</span> request{results.length !== 1 ? 's' : ''}
            {hasFilters && <> — <button onClick={resetAll} className="text-ois-primary hover:underline">Clear filters</button></>}
          </p>
        </div>
      )}
    </div>
  );
};
