import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MoreHorizontal, Check, X, Clock, Shield,
  Zap, CheckCircle2, ChevronRight, BookOpen, AlertCircle,
  MessageCircle, Link2, Package, Database, User, Tag,
  FileText, Users, UserCheck, Ban, Send, Info,
  Eye, ExternalLink, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative, formatDate } from '@/src/lib/format';
import { getRequestById } from '@/src/mocks/serviceRequests';
import { getCatalogItemById } from '@/src/mocks/catalogItems';
import { getArticleBySlug } from '@/src/mocks/kbArticles';
import { mockUsers, currentUser } from '@/src/mocks/users';
import { Avatar } from '@/src/components/ui/Avatar';
import { Tabs } from '@/src/components/ui/Tabs';
import { Modal } from '@/src/components/ui/Modal';
import {
  ServiceRequest, WorkflowStepInstance, CatalogCategory,
  RequestStatus, FormField,
} from '@/src/types/request';

// ── Constants ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-05-09T10:00:00Z').getTime();

const STATUS_META: Record<RequestStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  draft:          { label: 'Draft',          dot: 'bg-ois-text-subtle', text: 'text-ois-text-muted',  bg: 'bg-ois-surface-muted',  border: 'border-ois-border' },
  submitted:      { label: 'Submitted',      dot: 'bg-ois-info',        text: 'text-ois-info',         bg: 'bg-ois-info-pale',      border: 'border-ois-info/20' },
  approved:       { label: 'Approved',       dot: 'bg-ois-success',     text: 'text-ois-success',      bg: 'bg-ois-success-pale',   border: 'border-ois-success/20' },
  in_fulfillment: { label: 'In Fulfillment', dot: 'bg-ois-warning',     text: 'text-ois-warning',      bg: 'bg-ois-warning-pale',   border: 'border-[#F79009]/20' },
  pending_user:   { label: 'Pending User',   dot: 'bg-purple-500',      text: 'text-purple-600',       bg: 'bg-purple-50',          border: 'border-purple-200' },
  fulfilled:      { label: 'Fulfilled',      dot: 'bg-ois-success',     text: 'text-ois-success',      bg: 'bg-ois-success-pale',   border: 'border-ois-success/20' },
  closed:         { label: 'Closed',         dot: 'bg-ois-text-subtle', text: 'text-ois-text-muted',  bg: 'bg-ois-surface-muted',  border: 'border-ois-border' },
  rejected:       { label: 'Rejected',       dot: 'bg-ois-danger',      text: 'text-ois-danger',       bg: 'bg-ois-danger-pale',    border: 'border-ois-danger/20' },
  cancelled:      { label: 'Cancelled',      dot: 'bg-ois-text-subtle', text: 'text-ois-text-muted',  bg: 'bg-ois-surface-muted',  border: 'border-ois-border' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function slaPercent(req: ServiceRequest): number {
  if (!req.submittedAt) return 0;
  const elapsed = (NOW - new Date(req.submittedAt).getTime()) / 3_600_000;
  return Math.min(100, Math.round((elapsed / req.totalSlaHours) * 100));
}

function slaElapsedLabel(req: ServiceRequest): string {
  if (!req.submittedAt) return '0h';
  const h = Math.round((NOW - new Date(req.submittedAt).getTime()) / 3_600_000);
  return h < 24 ? `${h}h` : `${Math.ceil(h / 24)}d`;
}

function resolveFieldValue(field: FormField, raw: unknown): string {
  if (field.type === 'checkbox') return raw === true ? '✓ Acknowledged' : '—';
  if (field.type === 'multiselect') {
    const arr = Array.isArray(raw) ? raw as string[] : [];
    if (!arr.length) return '—';
    return arr.map(v => field.options?.find(o => o.value === v)?.label ?? v).join(', ');
  }
  if (field.type === 'select') {
    const opt = field.options?.find(o => o.value === String(raw));
    return opt?.label ?? String(raw) ?? '—';
  }
  return raw != null && String(raw).trim() ? String(raw) : '—';
}

function isApprover(step: WorkflowStepInstance): boolean {
  return step.type === 'approval' && step.status === 'active' && step.assigneeId === currentUser.id;
}

function stepSlaLabel(step: WorkflowStepInstance): string {
  if (!step.startedAt) return '';
  const elapsed = (NOW - new Date(step.startedAt).getTime()) / 3_600_000;
  const remaining = step.slaHours - elapsed;
  if (remaining <= 0) return 'Breached';
  if (remaining < 1) return '<1h left';
  if (remaining < 24) return `${Math.ceil(remaining)}h left`;
  return `${Math.ceil(remaining / 24)}d left`;
}

// ── Workflow stepper ──────────────────────────────────────────────────────────

const WorkflowStepper: React.FC<{
  steps: WorkflowStepInstance[];
  onApprove: (stepId: string) => void;
  onReject:  (stepId: string) => void;
}> = ({ steps, onApprove, onReject }) => (
  <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card p-6 mb-6 overflow-x-auto">
    {/* Node row */}
    <div className="flex items-start min-w-max gap-0">
      {steps.map((step, i) => {
        const done     = step.status === 'completed';
        const active   = step.status === 'active';
        const rejected = step.status === 'rejected';
        const skipped  = step.status === 'skipped';
        const pending  = step.status === 'pending';
        const canAct   = isApprover(step);

        const typeIcon =
          step.type === 'automated' ? <Zap size={14} /> :
          step.type === 'approval'  ? <Shield size={14} /> :
          <CheckCircle2 size={14} />;

        return (
          <React.Fragment key={step.id}>
            {/* Connector line (before node, skip for first) */}
            {i > 0 && (
              <div className={cn(
                'flex-1 h-0.5 min-w-[40px] max-w-[80px] mt-[19px] transition-all',
                steps[i - 1].status === 'completed' ? 'bg-ois-success' : 'border-t-2 border-dashed border-ois-border-strong',
              )} />
            )}

            {/* Node + labels */}
            <div className="flex flex-col items-center gap-2 min-w-[90px] max-w-[120px]">
              {/* Circle */}
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white transition-all',
                done     && 'bg-ois-success',
                active   && 'bg-ois-primary ring-4 ring-ois-primary/20 animate-pulse',
                rejected && 'bg-ois-danger',
                skipped  && 'bg-ois-border text-ois-text-subtle',
                pending  && 'bg-ois-surface border-2 border-ois-border-strong text-ois-text-subtle',
              )}>
                {done     ? <Check size={18} /> :
                 rejected ? <X size={18} /> :
                 skipped  ? <span className="text-xs font-bold">—</span> :
                 typeIcon}
              </div>

              {/* Step name */}
              <span className={cn(
                'text-[11px] font-semibold text-center leading-tight',
                active   && 'text-ois-primary',
                done     && 'text-ois-success',
                rejected && 'text-ois-danger line-through',
                skipped  && 'text-ois-text-subtle line-through',
                pending  && 'text-ois-text-muted',
              )}>
                {step.name}
              </span>

              {/* Status sub-label */}
              <span className={cn(
                'text-[10px] font-medium',
                active   && 'text-ois-primary',
                done     && 'text-ois-success',
                rejected && 'text-ois-danger',
                (pending || skipped) && 'text-ois-text-subtle',
              )}>
                {done     ? 'Done' :
                 active   ? 'Active' :
                 rejected ? 'Rejected' :
                 skipped  ? 'Skipped' :
                 'Pending'}
              </span>

              {/* Assignee */}
              {step.assigneeName && !done && !skipped && (
                <span className="text-[10px] text-ois-text-muted text-center leading-tight">
                  {step.assigneeName.split(' ')[0]}
                </span>
              )}

              {/* SLA */}
              {active && step.startedAt && (
                <span className={cn(
                  'text-[10px] font-semibold flex items-center gap-0.5',
                  step.slaStatus === 'breached' ? 'text-ois-danger' :
                  step.slaStatus === 'warning'  ? 'text-ois-warning' : 'text-ois-text-subtle',
                )}>
                  <Clock size={9} /> {stepSlaLabel(step)}
                </span>
              )}

              {/* Inline approve/reject for current user */}
              {canAct && (
                <div className="flex gap-1.5 mt-1">
                  <button
                    onClick={() => onApprove(step.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-ois-success text-white text-[10px] font-bold hover:bg-green-700 transition-colors active:scale-95"
                  >
                    <Check size={10} /> Approve
                  </button>
                  <button
                    onClick={() => onReject(step.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-ois-surface border border-ois-danger text-ois-danger text-[10px] font-bold hover:bg-ois-danger-pale transition-colors"
                  >
                    <X size={10} /> Reject
                  </button>
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

// ── Approve modal ─────────────────────────────────────────────────────────────

const ApproveModal: React.FC<{
  stepName: string; reqId: string;
  onConfirm: (note: string) => void; onClose: () => void;
}> = ({ stepName, reqId, onConfirm, onClose }) => {
  const [note, setNote] = useState('');
  return (
    <Modal isOpen onClose={onClose} title={`Approve ${reqId}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ois-text-muted">
          Approving step: <span className="font-semibold text-ois-text">{stepName}</span>
        </p>
        <div>
          <label className="text-xs font-semibold text-ois-text-muted block mb-1.5">
            Add a note <span className="font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Looks good. Approving for 30-day window."
            className="w-full rounded-lg border border-ois-border-strong px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-ois-border-strong text-sm font-semibold text-ois-text hover:bg-ois-surface-muted transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(note)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-ois-success text-white text-sm font-bold hover:bg-green-700 transition-colors active:scale-95">
            <Check size={14} /> Approve &amp; continue
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Reject modal ──────────────────────────────────────────────────────────────

const RejectModal: React.FC<{
  stepName: string; reqId: string;
  onConfirm: (reason: string) => void; onClose: () => void;
}> = ({ stepName, reqId, onConfirm, onClose }) => {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 20;
  return (
    <Modal isOpen onClose={onClose} title={`Reject ${reqId}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ois-text-muted">
          Rejecting step: <span className="font-semibold text-ois-text">{stepName}</span>.
          Subsequent steps will be skipped.
        </p>
        <div>
          <label className="text-xs font-semibold text-ois-text-muted block mb-1.5">
            Reason <span className="text-ois-danger">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain why this request is being rejected…"
            className={cn(
              'w-full rounded-lg border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2',
              valid
                ? 'border-ois-border-strong focus:ring-ois-primary/20 focus:border-ois-primary'
                : reason.length > 0 ? 'border-ois-danger focus:ring-ois-danger/20' : 'border-ois-border-strong focus:ring-ois-primary/20 focus:border-ois-primary',
            )}
          />
          <div className={cn('text-[11px] mt-1 flex items-center gap-1', valid ? 'text-ois-success' : 'text-ois-text-subtle')}>
            {valid ? <><Check size={10} /> {reason.length} / 20 minimum</> : <>{reason.length} / 20 minimum</>}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-ois-border-strong text-sm font-semibold text-ois-text hover:bg-ois-surface-muted transition-colors">
            Cancel
          </button>
          <button onClick={() => valid && onConfirm(reason)} disabled={!valid}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-ois-danger text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none transition-colors active:scale-95">
            <X size={14} /> Reject
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Section card (sidebar) ────────────────────────────────────────────────────

const SideCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
      <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">{title}</p>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// ── Simple activity timeline ──────────────────────────────────────────────────

function buildActivity(req: ServiceRequest) {
  const entries: { ts: string; actor: string; text: string; icon: React.ReactNode }[] = [];

  if (req.createdAt)   entries.push({ ts: req.createdAt,   actor: req.requesterName, text: 'Created request', icon: <FileText size={12} /> });
  if (req.submittedAt) entries.push({ ts: req.submittedAt, actor: req.requesterName, text: 'Submitted request', icon: <Send size={12} /> });

  req.workflow.steps.forEach(s => {
    if (s.startedAt)   entries.push({ ts: s.startedAt,   actor: 'System', text: `Started step: ${s.name}`, icon: <ChevronRight size={12} /> });
    if (s.completedAt && s.decision === 'approved') entries.push({ ts: s.completedAt, actor: s.decidedBy ?? s.assigneeName ?? 'System', text: `Approved: ${s.name}${s.decisionNote ? ` — "${s.decisionNote}"` : ''}`, icon: <Check size={12} className="text-ois-success" /> });
    if (s.completedAt && s.decision === 'rejected') entries.push({ ts: s.completedAt, actor: s.decidedBy ?? s.assigneeName ?? 'System', text: `Rejected: ${s.name}${s.decisionNote ? ` — "${s.decisionNote}"` : ''}`, icon: <X size={12} className="text-ois-danger" /> });
    if (s.completedAt && s.type === 'automated')    entries.push({ ts: s.completedAt, actor: 'System', text: `Completed: ${s.name}`, icon: <Zap size={12} className="text-ois-success" /> });
  });

  if (req.fulfilledAt) entries.push({ ts: req.fulfilledAt, actor: 'System', text: 'Request fulfilled', icon: <CheckCircle2 size={12} className="text-ois-success" /> });
  if (req.closedAt)    entries.push({ ts: req.closedAt,    actor: req.requesterName, text: 'Request closed', icon: <Check size={12} /> });

  return entries.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

// ── Not found ─────────────────────────────────────────────────────────────────

const NotFound: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-32">
    <Package size={32} className="text-ois-text-subtle mb-3" />
    <h2 className="text-lg font-bold text-ois-text mb-1">Request not found</h2>
    <Link to="/requests" className="text-sm text-ois-primary hover:underline flex items-center gap-1 mt-1">
      <ArrowLeft size={14} /> Back to queue
    </Link>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const RequestDetail: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();

  const [approveStep, setApproveStep] = useState<string | null>(null);
  const [rejectStep,  setRejectStep]  = useState<string | null>(null);
  const [approved,    setApproved]    = useState(false);
  const [comment,     setComment]     = useState('');

  const req = useMemo(() => getRequestById(requestId ?? ''), [requestId]);
  const catalogItem = useMemo(() => req ? getCatalogItemById(req.catalogItemId) : null, [req]);

  if (!req) return <NotFound />;

  const statusMeta  = STATUS_META[req.status];
  const activity    = buildActivity(req);
  const linkedArticles = req.linkedKBSlugs.map(s => getArticleBySlug(s)).filter(Boolean);
  const activeStepForApproval = req.workflow.steps.find(s => s.id === approveStep);
  const activeStepForReject   = req.workflow.steps.find(s => s.id === rejectStep);
  const slaElapsed  = slaPercent(req);
  const canUserApprove = req.workflow.steps.some(isApprover);

  const watchers = useMemo(() => {
    const ids = new Set<string>();
    ids.add(req.requesterId);
    req.workflow.steps.forEach(s => { if (s.assigneeId) ids.add(s.assigneeId); });
    return Array.from(ids).map(id => mockUsers.find(u => u.id === id)).filter(Boolean);
  }, [req]);

  // ── Overview tab ────────────────────────────────────────────────────────────
  const OverviewTab = (
    <div className="space-y-4">
      {req.description && (
        <div className="border border-ois-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
            <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Description</p>
          </div>
          <p className="px-4 py-3 text-sm text-ois-text-muted">{req.description}</p>
        </div>
      )}

      {/* Form responses summary */}
      {catalogItem && (
        <div className="border border-ois-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted flex items-center justify-between">
            <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Form responses</p>
          </div>
          <div className="divide-y divide-ois-border">
            {catalogItem.formFields.slice(0, 4).map(field => {
              const raw = req.formData[field.id];
              if (raw === undefined) return null;
              return (
                <div key={field.id} className="flex items-start gap-4 px-4 py-2.5 text-sm">
                  <span className="text-ois-text-muted w-36 shrink-0 font-medium leading-relaxed text-xs">{field.label}</span>
                  <span className="text-ois-text flex-1 leading-relaxed text-xs break-words">
                    {resolveFieldValue(field, raw)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Linked items */}
      <div className="border border-ois-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
          <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Linked items</p>
        </div>
        <div className="px-4 py-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Package size={12} className="text-ois-text-subtle shrink-0" />
            <span className="text-ois-text-muted text-xs w-24">Catalog item</span>
            <Link to={`/portal/catalog/${req.catalogItemId}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1 font-mono">
              {req.catalogItemPublicId} <ExternalLink size={10} />
            </Link>
            <span className="text-xs text-ois-text-muted">— {req.catalogItemName}</span>
          </div>
          {req.formData.related_ticket && (
            <div className="flex items-center gap-2">
              <AlertCircle size={12} className="text-ois-text-subtle shrink-0" />
              <span className="text-ois-text-muted text-xs w-24">Related ticket</span>
              <Link to={`/incidents`} className="text-xs text-ois-primary hover:underline font-mono flex items-center gap-1">
                {String(req.formData.related_ticket)} <ExternalLink size={10} />
              </Link>
            </div>
          )}
          {linkedArticles.length > 0 && linkedArticles.map(a => a && (
            <div key={a.id} className="flex items-center gap-2">
              <BookOpen size={12} className="text-ois-success shrink-0" />
              <span className="text-ois-text-muted text-xs w-24">KB article</span>
              <Link to={`/kb/${a.slug}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1">
                {a.publicId} — {a.title} <ExternalLink size={10} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Form responses tab ───────────────────────────────────────────────────────
  const FormTab = (
    <div className="border border-ois-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Submitted form</p>
      </div>
      {catalogItem ? (
        <div className="divide-y divide-ois-border">
          {catalogItem.formFields.map(field => {
            const raw = req.formData[field.id];
            return (
              <div key={field.id} className="flex items-start gap-6 px-5 py-3.5 text-sm">
                <div className="w-52 shrink-0">
                  <div className="text-xs font-semibold text-ois-text">{field.label}</div>
                  {field.required && <div className="text-[10px] text-ois-text-subtle">Required</div>}
                </div>
                <div className="flex-1 text-sm text-ois-text break-words leading-relaxed">
                  {raw !== undefined ? resolveFieldValue(field, raw) : <span className="text-ois-text-subtle italic">Not provided</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-5 py-4 text-sm text-ois-text-muted italic">Catalog item details not available.</p>
      )}
    </div>
  );

  // ── Activity tab ─────────────────────────────────────────────────────────────
  const ActivityTab = (
    <div className="space-y-0">
      {activity.map((entry, i) => (
        <div key={i} className="flex items-start gap-3 pb-4">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-6 h-6 rounded-full bg-ois-surface border border-ois-border flex items-center justify-center text-ois-text-subtle">
              {entry.icon}
            </div>
            {i < activity.length - 1 && <div className="w-px flex-1 bg-ois-border mt-1 min-h-[20px]" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xs font-semibold text-ois-text">{entry.actor}</span>
              <span className="text-xs text-ois-text-muted">{entry.text}</span>
              <span className="text-[10px] text-ois-text-subtle ml-auto">{formatRelative(entry.ts)}</span>
            </div>
          </div>
        </div>
      ))}
      {activity.length === 0 && (
        <p className="text-sm text-ois-text-muted italic">No activity yet.</p>
      )}
    </div>
  );

  // ── Comments tab ─────────────────────────────────────────────────────────────
  const CommentsTab = (
    <div className="space-y-4">
      {/* Placeholder comment */}
      <div className="flex gap-3">
        <Avatar name={req.requesterName} size="sm" className="shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-ois-text">{req.requesterName}</span>
            <span className="text-xs text-ois-text-subtle">{req.submittedAt ? formatRelative(req.submittedAt) : ''}</span>
          </div>
          <div className="text-sm text-ois-text-muted bg-ois-surface-muted rounded-lg px-3 py-2.5">
            Adding context: this is for investigating the reconciliation issue (case #1247). I'll only run SELECT queries with LIMIT clauses.
          </div>
        </div>
      </div>

      {/* New comment box */}
      <div className="flex gap-3 pt-2 border-t border-ois-border">
        <Avatar name={currentUser.name} size="sm" className="shrink-0" />
        <div className="flex-1">
          <textarea
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add a comment…"
            className="w-full rounded-lg border border-ois-border-strong px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
          <div className="flex justify-end mt-2">
            <button
              disabled={!comment.trim()}
              onClick={() => setComment('')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-ois-primary text-white text-xs font-semibold hover:bg-ois-primary-hover disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Send size={12} /> Post comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Linked items tab ─────────────────────────────────────────────────────────
  const LinkedTab = (
    <div className="space-y-3">
      {/* Catalog item */}
      <Link to={`/portal/catalog/${req.catalogItemId}`} className="flex items-center gap-3 p-3 rounded-lg border border-ois-border hover:bg-ois-surface-muted transition-colors group">
        <div className="w-9 h-9 rounded-lg bg-ois-primary-pale flex items-center justify-center shrink-0">
          <Package size={16} className="text-ois-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-ois-text group-hover:text-ois-primary">{req.catalogItemName}</div>
          <div className="text-[10px] text-ois-text-subtle font-mono">{req.catalogItemPublicId}</div>
        </div>
        <ExternalLink size={13} className="text-ois-text-subtle" />
      </Link>

      {/* Related incident */}
      {req.formData.related_ticket && (
        <Link to="/incidents" className="flex items-center gap-3 p-3 rounded-lg border border-ois-border hover:bg-ois-surface-muted transition-colors group">
          <div className="w-9 h-9 rounded-lg bg-ois-danger-pale flex items-center justify-center shrink-0">
            <AlertCircle size={16} className="text-ois-danger" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-ois-text group-hover:text-ois-primary">Related incident</div>
            <div className="text-[10px] text-ois-text-subtle font-mono">{String(req.formData.related_ticket)}</div>
          </div>
          <ExternalLink size={13} className="text-ois-text-subtle" />
        </Link>
      )}

      {/* KB articles */}
      {linkedArticles.map(a => a && (
        <Link key={a.id} to={`/kb/${a.slug}`} className="flex items-center gap-3 p-3 rounded-lg border border-ois-border hover:bg-ois-surface-muted transition-colors group">
          <div className="w-9 h-9 rounded-lg bg-ois-success-pale flex items-center justify-center shrink-0">
            <BookOpen size={16} className="text-ois-success" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-ois-text group-hover:text-ois-primary line-clamp-1">{a.title}</div>
            <div className="text-[10px] text-ois-text-subtle font-mono">{a.publicId}</div>
          </div>
          <ExternalLink size={13} className="text-ois-text-subtle" />
        </Link>
      ))}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="-mt-6 -mx-6 flex flex-col min-h-full">

      {/* ── TOP BAR ───────────────────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-4 border-b border-ois-border bg-ois-surface shrink-0">
        {/* Breadcrumb row */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate('/requests')}
            className="flex items-center gap-1.5 text-xs font-medium text-ois-text-muted hover:text-ois-primary transition-colors"
          >
            <ArrowLeft size={14} /> Queue
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ois-border text-xs font-medium text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
            <MoreHorizontal size={15} /> Actions
          </button>
        </div>

        {/* Status + title */}
        <div className="flex items-start gap-3 flex-wrap">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0', statusMeta.bg, statusMeta.text, statusMeta.border, 'border')}>
            <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dot)} />
            {statusMeta.label}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold text-ois-text leading-tight">
              <span className="font-mono text-sm text-ois-text-muted font-normal mr-2">{req.publicId}</span>
              {req.title}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {req.tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-ois-surface-muted border border-ois-border text-ois-text-subtle">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-ois-text-muted mt-1.5">
              Submitted {req.submittedAt ? formatRelative(req.submittedAt) : '—'} by{' '}
              <span className="font-semibold text-ois-text">{req.requesterName}</span>
              {req.requesterTeamId && <span className="text-ois-text-subtle"> · {req.requesterTeamId}</span>}
              {' '}· Catalog:{' '}
              <Link to={`/portal/catalog/${req.catalogItemId}`} className="text-ois-primary hover:underline font-mono">
                {req.catalogItemPublicId}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── WORKFLOW STEPPER (full width) ─────────────────────────────── */}
      <div className="px-6 pt-5">
        <WorkflowStepper
          steps={req.workflow.steps}
          onApprove={id => setApproveStep(id)}
          onReject={id => setRejectStep(id)}
        />
      </div>

      {/* ── THREE-COLUMN BODY ─────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[260px_1fr_260px] divide-x divide-ois-border">

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <aside className="sticky top-0 max-h-screen overflow-y-auto p-4 space-y-4">

          <SideCard title="At a glance">
            <dl className="space-y-2.5 text-xs">
              {[
                { label: 'Status',    val: <span className={cn('font-semibold', statusMeta.text)}>{statusMeta.label}</span> },
                { label: 'Priority',  val: <span className={cn('font-semibold capitalize', req.priority === 'high' ? 'text-ois-danger' : req.priority === 'normal' ? 'text-ois-text' : 'text-ois-text-muted')}>{req.priority}</span> },
                { label: 'Submitted', val: req.submittedAt ? formatRelative(req.submittedAt) : '—' },
                { label: 'Requester', val: req.requesterName },
                { label: 'Category',  val: <span className="capitalize">{req.catalogCategory}</span> },
                { label: 'Catalog',   val: <Link to={`/portal/catalog/${req.catalogItemId}`} className="text-ois-primary hover:underline font-mono">{req.catalogItemPublicId}</Link> },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-start gap-2">
                  <dt className="text-ois-text-subtle w-20 shrink-0">{label}</dt>
                  <dd className="text-ois-text font-medium flex-1">{val}</dd>
                </div>
              ))}
            </dl>
          </SideCard>

          <SideCard title="SLA timer">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ois-text-muted">Total</span>
                <span className="font-semibold text-ois-text">{req.totalSlaHours}h target</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ois-text-muted">Elapsed</span>
                <span className="font-semibold text-ois-text">{slaElapsedLabel(req)}</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full bg-ois-surface-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', req.slaBreached ? 'bg-ois-danger' : slaElapsed > 75 ? 'bg-ois-warning' : 'bg-ois-primary')}
                  style={{ width: `${slaElapsed}%` }}
                />
              </div>
              <div className="text-[10px] text-ois-text-subtle text-right">{slaElapsed}%</div>

              {/* Active step SLA */}
              {req.workflow.steps.find(s => s.status === 'active') && (
                <div className="mt-2 pt-2 border-t border-ois-border">
                  <div className="text-[10px] text-ois-text-subtle mb-0.5">Current step</div>
                  <div className="text-xs font-semibold text-ois-text">
                    {req.workflow.steps.find(s => s.status === 'active')?.name}
                  </div>
                  {req.workflow.steps.find(s => s.status === 'active')?.startedAt && (
                    <div className={cn('text-xs font-semibold flex items-center gap-1 mt-0.5',
                      req.workflow.steps.find(s => s.status === 'active')?.slaStatus === 'breached' ? 'text-ois-danger' :
                      req.workflow.steps.find(s => s.status === 'active')?.slaStatus === 'warning'  ? 'text-ois-warning' : 'text-ois-success')}>
                      <Clock size={10} />
                      {stepSlaLabel(req.workflow.steps.find(s => s.status === 'active')!)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </SideCard>
        </aside>

        {/* ── CENTER: TABS ──────────────────────────────────────────────── */}
        <main className="p-5 min-w-0 overflow-y-auto">
          <Tabs
            tabs={[
              { id: 'overview',  label: 'Overview' },
              { id: 'form',      label: 'Form responses' },
              { id: 'activity',  label: 'Activity' },
              { id: 'comments',  label: `Comments (${req.commentCount})` },
              { id: 'linked',    label: 'Linked items' },
            ]}
          >
            {OverviewTab}
            {FormTab}
            {ActivityTab}
            {CommentsTab}
            {LinkedTab}
          </Tabs>
        </main>

        {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────── */}
        <aside className="sticky top-0 max-h-screen overflow-y-auto p-4 space-y-4">

          <SideCard title="Quick actions">
            <div className="space-y-1.5">
              {canUserApprove && !approved && (
                <button
                  onClick={() => {
                    const step = req.workflow.steps.find(isApprover);
                    if (step) setApproveStep(step.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-ois-success-pale text-ois-success text-xs font-bold hover:bg-green-100 transition-colors"
                >
                  <Check size={13} /> Approve
                </button>
              )}
              {canUserApprove && !approved && (
                <button
                  onClick={() => {
                    const step = req.workflow.steps.find(isApprover);
                    if (step) setRejectStep(step.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-ois-danger-pale text-ois-danger text-xs font-bold hover:bg-red-100 transition-colors"
                >
                  <X size={13} /> Reject
                </button>
              )}
              {approved && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ois-success-pale text-ois-success text-xs font-semibold">
                  <CheckCircle2 size={13} /> Approved
                </div>
              )}
              {[
                { icon: MessageCircle, label: 'Request info from user' },
                { icon: UserCheck,     label: 'Reassign current step' },
                { icon: MessageCircle, label: 'Add comment' },
                { icon: Ban,           label: 'Cancel request', cls: 'text-ois-text-subtle hover:text-ois-danger hover:bg-ois-danger-pale' },
              ].map(({ icon: Icon, label, cls }) => (
                <button key={label}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-ois-text-muted hover:bg-ois-surface-muted transition-colors text-left', cls)}
                >
                  <Icon size={13} className="shrink-0" /> {label}
                </button>
              ))}
            </div>
          </SideCard>

          <SideCard title={`Watchers (${watchers.length})`}>
            <div className="space-y-2">
              {watchers.map(u => u && (
                <div key={u.id} className="flex items-center gap-2">
                  <Avatar name={u.name} size="xs" />
                  <span className="text-xs text-ois-text">{u.name}</span>
                  {u.id === req.requesterId && <span className="text-[10px] text-ois-text-subtle">(req.)</span>}
                </div>
              ))}
              <button className="flex items-center gap-1.5 text-xs text-ois-primary hover:underline mt-1">
                <span className="w-5 h-5 rounded-full border-2 border-dashed border-ois-primary flex items-center justify-center text-ois-primary">
                  +
                </span>
                Add watcher
              </button>
            </div>
          </SideCard>
        </aside>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {approveStep && activeStepForApproval && (
        <ApproveModal
          stepName={activeStepForApproval.name}
          reqId={req.publicId}
          onClose={() => setApproveStep(null)}
          onConfirm={_note => { setApproved(true); setApproveStep(null); }}
        />
      )}

      {rejectStep && activeStepForReject && (
        <RejectModal
          stepName={activeStepForReject.name}
          reqId={req.publicId}
          onClose={() => setRejectStep(null)}
          onConfirm={_reason => { setRejectStep(null); navigate('/requests'); }}
        />
      )}
    </div>
  );
};
