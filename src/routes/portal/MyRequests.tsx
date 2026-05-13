import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import {
  ClipboardList, Plus, ChevronRight, Clock, CheckCircle2,
  Package, ShoppingBag, XCircle, AlertCircle, Check,
  ArrowRight, Inbox,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative } from '@/src/lib/format';
import { requestsService, useResource } from '@/src/services';
import { ServiceRequest, RequestStatus, WorkflowStepStatus, CatalogCategory } from '@/src/types/request';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import { useCurrentUser } from '@/src/lib/rbac';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<RequestStatus, {
  label: string; dot: string; text: string; bg: string; border: string;
}> = {
  draft:          { label: 'Draft',          dot: 'bg-ois-text-subtle',  text: 'text-ois-text-muted',  bg: 'bg-ois-surface-muted',  border: 'border-ois-border' },
  submitted:      { label: 'Submitted',      dot: 'bg-ois-info',         text: 'text-ois-info',         bg: 'bg-ois-info-pale',      border: 'border-ois-info/20' },
  approved:       { label: 'Approved',       dot: 'bg-ois-success',      text: 'text-ois-success',      bg: 'bg-ois-success-pale',   border: 'border-ois-success/20' },
  in_fulfillment: { label: 'In Fulfillment', dot: 'bg-ois-warning',      text: 'text-ois-warning',      bg: 'bg-ois-warning-pale',   border: 'border-[#F79009]/20' },
  pending_user:   { label: 'Pending You',    dot: 'bg-purple-500',       text: 'text-purple-600',       bg: 'bg-purple-50',          border: 'border-purple-200' },
  fulfilled:      { label: 'Fulfilled',      dot: 'bg-ois-success',      text: 'text-ois-success',      bg: 'bg-ois-success-pale',   border: 'border-ois-success/20' },
  closed:         { label: 'Closed',         dot: 'bg-ois-text-subtle',  text: 'text-ois-text-muted',  bg: 'bg-ois-surface-muted',  border: 'border-ois-border' },
  rejected:       { label: 'Rejected',       dot: 'bg-ois-danger',       text: 'text-ois-danger',       bg: 'bg-ois-danger-pale',    border: 'border-ois-danger/20' },
  cancelled:      { label: 'Cancelled',      dot: 'bg-ois-text-subtle',  text: 'text-ois-text-muted',  bg: 'bg-ois-surface-muted',  border: 'border-ois-border' },
};

const CATEGORY_ICONS: Record<CatalogCategory, React.FC<{ size?: number; className?: string }>> = {
  access:        (LucideIcons as any).Key,
  equipment:     (LucideIcons as any).Laptop,
  software:      (LucideIcons as any).Package,
  communication: (LucideIcons as any).Mail,
  personnel:     (LucideIcons as any).Users,
  general:       (LucideIcons as any).Folder,
};

const CATEGORY_COLORS: Record<CatalogCategory, string> = {
  access:        'text-ois-primary',
  equipment:     'text-ois-info',
  software:      'text-purple-600',
  communication: 'text-ois-success',
  personnel:     'text-ois-warning',
  general:       'text-ois-text-muted',
};

const ACTIVE_STATUSES: RequestStatus[]    = ['submitted', 'approved', 'in_fulfillment', 'pending_user'];
const COMPLETED_STATUSES: RequestStatus[] = ['fulfilled', 'closed'];
const DRAFT_STATUSES: RequestStatus[]     = ['draft'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getActiveStepInfo(req: ServiceRequest): { name: string; assigneeName?: string } | null {
  const s = req.workflow.steps.find(s => s.status === 'active');
  return s ? { name: s.name, assigneeName: s.assigneeName } : null;
}

function completionDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Horizontal stepper inside a card ─────────────────────────────────────────

const CardStepper: React.FC<{ steps: { name: string; status: WorkflowStepStatus }[] }> = ({ steps }) => (
  <div className="mt-3 mb-1">
    {/* Node row */}
    <div className="flex items-center">
      {steps.map((s, i) => {
        const done     = s.status === 'completed';
        const active   = s.status === 'active';
        const rejected = s.status === 'rejected';
        const skipped  = s.status === 'skipped';

        return (
          <React.Fragment key={`node-${i}`}>
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 transition-all',
              done     && 'bg-ois-success text-white',
              active   && 'bg-ois-primary text-white ring-[3px] ring-ois-primary/25',
              rejected && 'bg-ois-danger text-white',
              skipped  && 'bg-ois-border text-ois-text-subtle',
              !done && !active && !rejected && !skipped && 'bg-ois-surface border-2 border-ois-border-strong text-ois-text-subtle',
            )}>
              {done     ? <Check size={9} /> :
               rejected ? <span>✗</span> :
               skipped  ? <span>—</span> :
               i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-px mx-1 min-w-[8px]',
                done ? 'bg-ois-success' : 'bg-ois-border-strong',
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
    {/* Label row */}
    <div className="flex items-start mt-1">
      {steps.map((s, i) => {
        const active = s.status === 'active';
        const done   = s.status === 'completed';
        return (
          <React.Fragment key={`lbl-${i}`}>
            <div className="flex flex-col items-center" style={{ minWidth: 20, maxWidth: 64 }}>
              <span className={cn(
                'text-[9px] font-medium text-center leading-tight break-words w-full',
                active ? 'text-ois-primary' :
                done   ? 'text-ois-success' :
                'text-ois-text-subtle',
              )}>
                {s.name.length > 12 ? s.name.slice(0, 11) + '…' : s.name}
              </span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 min-w-[8px]" />}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

// ── Request card ──────────────────────────────────────────────────────────────

const RequestCard: React.FC<{ req: ServiceRequest }> = ({ req }) => {
  const meta       = STATUS_META[req.status];
  const CatIcon    = CATEGORY_ICONS[req.catalogCategory] ?? Package;
  const catColor   = CATEGORY_COLORS[req.catalogCategory];
  const activeStep = getActiveStepInfo(req);
  const isDone     = COMPLETED_STATUSES.includes(req.status);
  const isRejected = req.status === 'rejected';

  return (
    <div className={cn(
      'bg-ois-surface border rounded-ois-card shadow-ois-card overflow-hidden transition-all hover:shadow-ois-card-hover',
      isRejected ? 'border-ois-danger/30' : 'border-ois-border',
    )}>
      {/* Top bar: status + ID */}
      <div className={cn(
        'flex items-center justify-between px-5 py-2.5 border-b',
        meta.bg, meta.border,
      )}>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full shrink-0', meta.dot)} />
          <span className={cn('text-xs font-bold', meta.text)}>{meta.label}</span>
        </div>
        <span className="font-mono text-[10px] text-ois-text-subtle">{req.publicId}</span>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {/* Title + category */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-ois-text leading-snug">{req.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <CatIcon size={11} className={catColor} />
              <span className="text-[11px] text-ois-text-muted capitalize">{req.catalogCategory}</span>
              {req.submittedAt && (
                <>
                  <span className="text-ois-border-strong">·</span>
                  <span className="text-[11px] text-ois-text-subtle">{formatRelative(req.submittedAt)}</span>
                </>
              )}
              {req.slaBreached && (
                <>
                  <span className="text-ois-border-strong">·</span>
                  <span className="text-[11px] text-ois-danger font-semibold flex items-center gap-0.5">
                    <AlertCircle size={10} /> SLA breached
                  </span>
                </>
              )}
            </div>
          </div>

          <Link
            to={`/requests/${req.id}`}
            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-ois-primary hover:underline whitespace-nowrap mt-0.5"
          >
            View details <ChevronRight size={12} />
          </Link>
        </div>

        {/* Stepper */}
        <CardStepper steps={req.workflow.steps} />

        {/* Footer: current step or completion */}
        <div className="mt-2 text-[11px] text-ois-text-muted flex items-center gap-1.5 flex-wrap">
          {isDone ? (
            <>
              <CheckCircle2 size={11} className="text-ois-success shrink-0" />
              {req.closedAt
                ? `Closed ${completionDate(req.closedAt)}`
                : req.fulfilledAt
                ? `Fulfilled ${completionDate(req.fulfilledAt)}`
                : 'Complete'}
            </>
          ) : isRejected ? (
            <>
              <XCircle size={11} className="text-ois-danger shrink-0" />
              Rejected
              {req.workflow.steps.find(s => s.status === 'rejected')?.decisionNote && (
                <span className="text-ois-text-subtle truncate max-w-xs">
                  — {req.workflow.steps.find(s => s.status === 'rejected')?.decisionNote}
                </span>
              )}
            </>
          ) : req.status === 'draft' ? (
            <>
              <span className="text-ois-text-subtle">Not yet submitted.</span>
              <Link to={`/portal/catalog/${req.catalogItemId}`} className="text-ois-primary font-semibold hover:underline">
                Continue →
              </Link>
            </>
          ) : activeStep ? (
            <>
              <Clock size={10} className="shrink-0" />
              <span className="font-medium text-ois-text">{activeStep.name}</span>
              {activeStep.assigneeName && (
                <span className="text-ois-text-subtle">· {activeStep.assigneeName}</span>
              )}
              {req.estimatedCompletion && (
                <span className="text-ois-text-subtle ml-auto">Est. {completionDate(req.estimatedCompletion)}</span>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ── Tab button ────────────────────────────────────────────────────────────────

const TabBtn: React.FC<{
  label: string; count: number; active: boolean; onClick: () => void;
}> = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap',
      active
        ? 'border-ois-primary text-ois-primary'
        : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong',
    )}
  >
    {label}
    <span className={cn(
      'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
      active ? 'bg-ois-primary text-white' : 'bg-ois-surface-muted text-ois-text-subtle',
    )}>
      {count}
    </span>
  </button>
);

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{
  icon: React.ReactNode; title: string; sub?: React.ReactNode;
}> = ({ icon, title, sub }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-12 h-12 rounded-xl bg-ois-surface-muted flex items-center justify-center mb-3 text-ois-text-subtle">
      {icon}
    </div>
    <p className="text-sm font-semibold text-ois-text mb-1">{title}</p>
    {sub && <div className="text-xs text-ois-text-muted mt-0.5">{sub}</div>}
  </div>
);

// ── Sort ──────────────────────────────────────────────────────────────────────

type SortKey = 'newest' | 'oldest' | 'status';

function sortRequests(reqs: ServiceRequest[], sort: SortKey): ServiceRequest[] {
  return [...reqs].sort((a, b) => {
    if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sort === 'status') {
      const ORDER: RequestStatus[] = ['pending_user', 'submitted', 'in_fulfillment', 'approved', 'draft', 'fulfilled', 'closed', 'rejected', 'cancelled'];
      return ORDER.indexOf(a.status) - ORDER.indexOf(b.status);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ── Main Component ────────────────────────────────────────────────────────────

type TabKey = 'all' | 'active' | 'completed' | 'drafts';

export const MyRequests: React.FC = () => {
  const navigate = useNavigate();
  const [tab,  setTab]  = useState<TabKey>('all');
  const [sort, setSort] = useState<SortKey>('newest');

  // Show only the current user's own requests. Superadmin sees all for demo richness.
  const { user } = useCurrentUser();
  const { data: requestsData } = useResource(() => requestsService.list(), []);
  const mockServiceRequests = requestsData ?? [];
  const all = useMemo(
    () => user?.isSuperadmin
      ? mockServiceRequests
      : mockServiceRequests.filter(r => r.requesterId === user?.id),
    [user, mockServiceRequests],
  );
  const active    = all.filter(r => ACTIVE_STATUSES.includes(r.status));
  const completed = all.filter(r => COMPLETED_STATUSES.includes(r.status));
  const drafts    = all.filter(r => DRAFT_STATUSES.includes(r.status));

  const tabCounts: Record<TabKey, number> = {
    all: all.length, active: active.length,
    completed: completed.length, drafts: drafts.length,
  };

  const listed = useMemo(() => {
    const base = tab === 'active' ? active : tab === 'completed' ? completed : tab === 'drafts' ? drafts : all;
    return sortRequests(base, sort);
  }, [tab, sort, active, completed, drafts, all]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full pb-16 p-6">
      <div className="flex items-center justify-end mb-6">
        <Link
          to="/portal/catalog"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-ois-primary-hover transition-colors active:scale-95"
        >
          <Plus size={15} /> New request
        </Link>
      </div>

      {/* ── TABS + SORT ROW ─────────────────────────────────────────── */}
      <div className="flex items-end justify-between border-b border-ois-border mb-5">
        <div className="flex items-center gap-0 overflow-x-auto">
          {(['all', 'active', 'completed', 'drafts'] as TabKey[]).map(t => (
            <TabBtn
              key={t}
              label={t.charAt(0).toUpperCase() + t.slice(1)}
              count={tabCounts[t]}
              active={tab === t}
              onClick={() => setTab(t)}
            />
          ))}
        </div>

        {/* Sort */}
        <div className="shrink-0 pb-2 pl-4">
          <FilterDropdown
            value={sort}
            onChange={v => setSort(v as SortKey)}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'status', label: 'By status' },
            ]}
            placeholder="Newest first"
          />
        </div>
      </div>

      {/* ── REQUEST LIST ────────────────────────────────────────────── */}
      {listed.length === 0 ? (
        tab === 'active' ? (
          <EmptyState
            icon={<CheckCircle2 size={22} />}
            title="No active requests"
            sub={
              <Link to="/portal/catalog" className="text-ois-primary font-semibold hover:underline flex items-center justify-center gap-1 mt-1">
                <ShoppingBag size={12} /> Browse catalog
              </Link>
            }
          />
        ) : tab === 'completed' ? (
          <EmptyState
            icon={<ClipboardList size={22} />}
            title="No completed requests yet"
          />
        ) : tab === 'drafts' ? (
          <EmptyState
            icon={<Inbox size={22} />}
            title="No saved drafts"
            sub="Start a request from the catalog to create a draft."
          />
        ) : (
          <EmptyState
            icon={<ShoppingBag size={22} />}
            title="You haven't submitted any requests yet"
            sub={
              <Link to="/portal/catalog" className="text-ois-primary font-semibold hover:underline flex items-center justify-center gap-1 mt-1">
                Browse the service catalog <ArrowRight size={11} />
              </Link>
            }
          />
        )
      ) : (
        <div className="space-y-3">
          {listed.map(req => <RequestCard key={req.id} req={req} />)}
        </div>
      )}
    </div>
  );
};
