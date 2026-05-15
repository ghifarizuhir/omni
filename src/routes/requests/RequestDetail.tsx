import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MoreHorizontal, Check, X, Clock, Shield,
  Zap, CheckCircle2, ChevronRight, BookOpen, AlertCircle,
  MessageCircle, Package,
  FileText, UserCheck, Ban, Send,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative } from '@/src/lib/format';
import { requestsService, knowledgeService, usersService, useResource } from '@/src/services';
import { useAuthSession } from '@/src/lib/auth/session';
import { useCan as useCanRbac, requestResource } from '@/src/lib/rbac';
import { Avatar } from '@/src/components/ui/Avatar';
import { Modal } from '@/src/components/ui/Modal';
import {
  ServiceRequest, WorkflowStepInstance, CatalogCategory,
  RequestStatus, FormField,
} from '@/src/types/request';

// ── Constants ─────────────────────────────────────────────────────────────────

const NOW = Date.now();

const CATEGORY_COLOR: Record<CatalogCategory, string> = {
  access:        '#1F4FD4',
  equipment:     '#DC6803',
  software:      '#0BA5EC',
  communication: '#6941C6',
  personnel:     '#027A48',
  general:       '#475467',
};

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'form',      label: 'Form responses' },
  { id: 'activity',  label: 'Activity' },
  { id: 'comments',  label: 'Comments' },
  { id: 'linked',    label: 'Linked items' },
] as const;
type TabId = typeof TABS[number]['id'];

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

function isApprover(step: WorkflowStepInstance, userId: string | undefined): boolean {
  if (!userId) return false;
  return step.type === 'approval' && step.status === 'active' && step.assigneeId === userId;
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
  canApprove: boolean;
  userId: string | undefined;
}> = ({ steps, onApprove, onReject, canApprove, userId }) => (
  <div className="overflow-x-auto">
    <div className="flex justify-center min-w-full">
      <div className="flex items-center gap-0 py-1">
        {steps.map((step, i) => {
          const done     = step.status === 'completed';
          const active   = step.status === 'active';
          const rejected = step.status === 'rejected';
          const skipped  = step.status === 'skipped';
          const pending  = step.status === 'pending';
          const canAct   = isApprover(step, userId) && canApprove;
          const prevDone = i > 0 && steps[i - 1].status === 'completed';

          const TypeIcon =
            step.type === 'automated' ? Zap :
            step.type === 'approval'  ? Shield :
            CheckCircle2;

          return (
            <React.Fragment key={step.id}>
              {/* Arrow connector */}
              {i > 0 && (
                <div className="flex items-center shrink-0 mx-1.5">
                  <div className={cn('h-[2px] w-8 transition-colors', prevDone ? 'bg-ois-success' : 'bg-ois-border')} />
                  <ChevronRight size={14} className={cn('-ml-1 transition-colors', prevDone ? 'text-ois-success' : 'text-ois-border')} />
                </div>
              )}

              {/* Step card */}
              <div className={cn(
                'flex flex-col gap-2 rounded-xl border-2 px-3 py-2.5 min-w-[148px] max-w-[172px] transition-all duration-200',
                done     && 'border-ois-success bg-[#F0FDF4]',
                active   && 'border-ois-primary bg-white shadow-md shadow-ois-primary/10',
                rejected && 'border-ois-danger bg-ois-danger-pale',
                skipped  && 'border-ois-border bg-ois-surface-muted',
                pending  && 'border-ois-border bg-ois-surface-muted',
              )}>

                {/* Top row: step number badge + type icon */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
                    done     && 'bg-ois-success text-white',
                    active   && 'bg-ois-primary text-white',
                    rejected && 'bg-ois-danger text-white',
                    (skipped || pending) && 'bg-ois-border-strong text-ois-text-subtle',
                  )}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <TypeIcon size={12} className={cn(
                    done     && 'text-ois-success',
                    active   && 'text-ois-primary',
                    rejected && 'text-ois-danger',
                    (skipped || pending) && 'text-ois-text-subtle',
                  )} />
                </div>

                {/* Step name */}
                <div className={cn(
                  'text-[12px] font-bold leading-tight',
                  done     && 'text-ois-success',
                  active   && 'text-ois-primary',
                  rejected && 'text-ois-danger line-through',
                  skipped  && 'text-ois-text-subtle line-through',
                  pending  && 'text-ois-text-muted',
                )}>
                  {step.name}
                </div>

                {/* Sub-info */}
                <div className="flex flex-col gap-0.5">
                  {done && step.decidedBy && (
                    <span className="text-[10px] text-ois-success font-medium">
                      ✓ {step.decidedBy.split(' ')[0]}
                      {step.completedAt && <span className="text-ois-success/70 font-normal"> · {formatRelative(step.completedAt)}</span>}
                    </span>
                  )}
                  {done && !step.decidedBy && (
                    <span className="text-[10px] text-ois-success font-medium">✓ Completed</span>
                  )}
                  {active && step.assigneeName && (
                    <span className="text-[10px] text-ois-text-muted">{step.assigneeName}</span>
                  )}
                  {(pending || skipped) && step.assigneeName && (
                    <span className="text-[10px] text-ois-text-subtle">{step.assigneeName}</span>
                  )}
                  {active && step.startedAt && (
                    <span className={cn(
                      'text-[10px] font-semibold flex items-center gap-0.5',
                      step.slaStatus === 'breached' ? 'text-ois-danger' :
                      step.slaStatus === 'warning'  ? 'text-ois-warning' : 'text-ois-text-subtle',
                    )}>
                      <Clock size={9} /> {stepSlaLabel(step)}
                    </span>
                  )}
                  {rejected && (
                    <span className="text-[10px] text-ois-danger font-medium">Rejected</span>
                  )}
                  {skipped && (
                    <span className="text-[10px] text-ois-text-subtle">Skipped</span>
                  )}
                  {pending && !step.assigneeName && (
                    <span className="text-[10px] text-ois-text-subtle">Waiting</span>
                  )}
                </div>

                {/* Approve / Reject for current approver */}
                {canAct && (
                  <div className="flex gap-1.5 pt-2 border-t border-ois-primary/20">
                    <button
                      onClick={() => onApprove(step.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-ois-success text-white text-[10px] font-bold hover:bg-green-700 transition-colors active:scale-95"
                    >
                      <Check size={10} /> Approve
                    </button>
                    <button
                      onClick={() => onReject(step.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-ois-danger text-ois-danger text-[10px] font-bold hover:bg-ois-danger-pale transition-colors"
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
      <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
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

// ── Request info modal ────────────────────────────────────────────────────────

const RequestInfoModal: React.FC<{
  requesterName: string;
  onConfirm: (msg: string) => void;
  onClose: () => void;
}> = ({ requesterName, onConfirm, onClose }) => {
  const [msg, setMsg] = useState('');
  return (
    <Modal isOpen onClose={onClose} title="Request info from user" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ois-text-muted">
          Send a message to <span className="font-semibold text-ois-text">{requesterName}</span> asking for clarification. The request will be paused until they respond.
        </p>
        <div>
          <label className="text-xs font-semibold text-ois-text-muted block mb-1.5">Message <span className="text-ois-danger">*</span></label>
          <textarea
            rows={4}
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder="Please provide more details about…"
            className="w-full rounded-lg border border-ois-border-strong px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-ois-border-strong text-sm font-semibold text-ois-text hover:bg-ois-surface-muted transition-colors">Cancel</button>
          <button onClick={() => msg.trim() && onConfirm(msg)} disabled={!msg.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-ois-primary text-white text-sm font-bold hover:bg-ois-primary-hover disabled:opacity-50 disabled:pointer-events-none transition-colors">
            <Send size={14} /> Send message
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Reassign modal ────────────────────────────────────────────────────────────

const ReassignModal: React.FC<{
  currentAssignee?: string;
  users: { id: string; name: string; email: string; role?: string }[];
  submitting?: boolean;
  error?: string | null;
  onConfirm: (userId: string, userName: string) => void;
  onClose: () => void;
}> = ({ currentAssignee, users, submitting, error, onConfirm, onClose }) => {
  const [selected, setSelected] = useState<string>('');
  const candidates = users.filter(u => u.name !== currentAssignee);
  return (
    <Modal isOpen onClose={onClose} title="Reassign current step" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ois-text-muted">Choose a new assignee for the active workflow step.</p>
        <div className="border border-ois-border rounded-lg overflow-hidden divide-y divide-ois-border max-h-56 overflow-y-auto">
          {candidates.map(u => (
            <button key={u.id} onClick={() => setSelected(u.id)}
              className={cn('flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors',
                selected === u.id ? 'bg-ois-primary-pale' : 'hover:bg-ois-surface-muted')}>
              <Avatar name={u.name} size="xs" />
              <div className="flex-1 min-w-0">
                <div className={cn('text-xs font-semibold', selected === u.id ? 'text-ois-primary' : 'text-ois-text')}>{u.name}</div>
                <div className="text-[10px] text-ois-text-subtle">{u.role ?? u.email}</div>
              </div>
              {selected === u.id && <Check size={13} className="text-ois-primary shrink-0" />}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-xs text-ois-danger">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 rounded-lg border border-ois-border-strong text-sm font-semibold text-ois-text hover:bg-ois-surface-muted transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={() => { const u = candidates.find(c => c.id === selected); if (u && !submitting) onConfirm(u.id, u.name); }} disabled={!selected || !!submitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-ois-primary text-white text-sm font-bold hover:bg-ois-primary-hover disabled:opacity-50 disabled:pointer-events-none transition-colors">
            <UserCheck size={14} /> {submitting ? 'Reassigning…' : 'Reassign'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Cancel modal ──────────────────────────────────────────────────────────────

const CancelModal: React.FC<{
  reqId: string;
  submitting?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}> = ({ reqId, submitting, error, onConfirm, onClose }) => {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 10;
  return (
    <Modal isOpen onClose={onClose} title={`Cancel ${reqId}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ois-text-muted">This will cancel the request and notify all stakeholders. This action cannot be undone.</p>
        <div>
          <label className="text-xs font-semibold text-ois-text-muted block mb-1.5">Reason <span className="text-ois-danger">*</span></label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Explain why this request is being cancelled…"
            className={cn('w-full rounded-lg border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2',
              valid ? 'border-ois-border-strong focus:ring-ois-primary/20 focus:border-ois-primary'
                    : reason.length > 0 ? 'border-ois-danger focus:ring-ois-danger/20' : 'border-ois-border-strong focus:ring-ois-primary/20 focus:border-ois-primary')}
          />
          <div className={cn('text-[11px] mt-1', valid ? 'text-ois-success' : 'text-ois-text-subtle')}>
            {valid ? <><Check size={10} className="inline mr-0.5" />{reason.length} / 10 minimum</> : <>{reason.length} / 10 minimum</>}
          </div>
        </div>
        {error && (
          <p className="text-xs text-ois-danger">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 rounded-lg border border-ois-border-strong text-sm font-semibold text-ois-text hover:bg-ois-surface-muted transition-colors disabled:opacity-50">Keep request</button>
          <button onClick={() => valid && !submitting && onConfirm(reason)} disabled={!valid || !!submitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-ois-danger text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none transition-colors">
            <Ban size={14} /> {submitting ? 'Cancelling…' : 'Cancel request'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Add watcher modal ─────────────────────────────────────────────────────────

const AddWatcherModal: React.FC<{
  existingIds: Set<string>;
  users: { id: string; name: string; email: string; role?: string }[];
  submitting?: boolean;
  error?: string | null;
  onConfirm: (userId: string, userName: string) => void;
  onClose: () => void;
}> = ({ existingIds, users, submitting, error, onConfirm, onClose }) => {
  const [selected, setSelected] = useState<string>('');
  const candidates = users.filter(u => !existingIds.has(u.id));
  return (
    <Modal isOpen onClose={onClose} title="Add watcher" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ois-text-muted">Watchers receive notifications when the request status changes.</p>
        <div className="border border-ois-border rounded-lg overflow-hidden divide-y divide-ois-border max-h-56 overflow-y-auto">
          {candidates.length === 0 && (
            <p className="px-4 py-3 text-sm text-ois-text-subtle italic">All users are already watching.</p>
          )}
          {candidates.map(u => (
            <button key={u.id} onClick={() => setSelected(u.id)}
              className={cn('flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors',
                selected === u.id ? 'bg-ois-primary-pale' : 'hover:bg-ois-surface-muted')}>
              <Avatar name={u.name} size="xs" />
              <div className="flex-1 min-w-0">
                <div className={cn('text-xs font-semibold', selected === u.id ? 'text-ois-primary' : 'text-ois-text')}>{u.name}</div>
                <div className="text-[10px] text-ois-text-subtle">{u.role ?? u.email}</div>
              </div>
              {selected === u.id && <Check size={13} className="text-ois-primary shrink-0" />}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-xs text-ois-danger">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 rounded-lg border border-ois-border-strong text-sm font-semibold text-ois-text hover:bg-ois-surface-muted transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={() => { const u = candidates.find(c => c.id === selected); if (u && !submitting) onConfirm(u.id, u.name); }} disabled={!selected || candidates.length === 0 || !!submitting}
            className="px-5 py-2 rounded-lg bg-ois-primary text-white text-sm font-bold hover:bg-ois-primary-hover disabled:opacity-50 disabled:pointer-events-none transition-colors">
            {submitting ? 'Adding…' : 'Add watcher'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const RequestDetail: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const session = useAuthSession();
  const userId = session?.user.id;
  const userName = session?.user.name ?? '';

  const [approveStep,      setApproveStep]      = useState<string | null>(null);
  const [rejectStep,       setRejectStep]       = useState<string | null>(null);
  const [approved,         setApproved]         = useState(false);
  const [comment,          setComment]          = useState('');
  const [activeTab,        setActiveTab]        = useState<TabId>('overview');
  const [showRequestInfo,  setShowRequestInfo]  = useState(false);
  const [showReassign,     setShowReassign]     = useState(false);
  const [showCancel,       setShowCancel]       = useState(false);
  const [showAddWatcher,   setShowAddWatcher]   = useState(false);
  const [cancelSubmitting,   setCancelSubmitting]   = useState(false);
  const [cancelError,        setCancelError]        = useState<string | null>(null);
  const [reassignSubmitting, setReassignSubmitting] = useState(false);
  const [reassignError,      setReassignError]      = useState<string | null>(null);
  const [addWatcherSubmitting, setAddWatcherSubmitting] = useState(false);
  const [addWatcherError,    setAddWatcherError]    = useState<string | null>(null);
  const [watcherError,       setWatcherError]       = useState<string | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const jumpToComments = useCallback(() => {
    setActiveTab('comments');
    setTimeout(() => commentTextareaRef.current?.focus(), 50);
  }, []);

  const { data: requestsData, refresh: refreshRequests } = useResource(() => requestsService.list(), []);
  const { data: catalogData } = useResource(() => requestsService.catalog(), []);
  const { data: articlesData } = useResource(() => knowledgeService.articles(), []);
  const { data: usersData } = useResource(() => usersService.list(), []);
  const mockUsers = usersData ?? [];

  const reqPublicId = useMemo(
    () => (requestsData ?? []).find(r => r.id === (requestId ?? ''))?.publicId ?? '',
    [requestsData, requestId],
  );
  const { data: commentsData, refresh: refetchComments } = useResource(
    () => reqPublicId ? requestsService.comments(reqPublicId) : Promise.resolve([]),
    [reqPublicId],
  );

  const req = useMemo(
    () => (requestsData ?? []).find(r => r.id === (requestId ?? '')),
    [requestsData, requestId]
  );
  const catalogItem = useMemo(
    () => req ? (catalogData ?? []).find(c => c.id === req.catalogItemId) ?? null : null,
    [req, catalogData]
  );
  const getArticleBySlug = (s: string) => (articlesData ?? []).find(a => a.slug === s);

  const requestRes = req ? requestResource(req) : undefined;
  const canApproveRequest = useCanRbac('request', 'approve', { resource: requestRes });

  // Hooks below must run unconditionally — declare them before any early
  // return so hook order stays stable when `req` loads.
  const autoWatcherIds = useMemo(() => {
    const ids = new Set<string>();
    if (!req) return ids;
    ids.add(req.requesterId);
    (req.workflow?.steps ?? []).forEach(s => { if (s.assigneeId) ids.add(s.assigneeId); });
    return ids;
  }, [req]);

  const explicitWatcherIds = useMemo(
    () => (req?.watchers ?? []).map(w => w.userId),
    [req?.watchers],
  );

  const watchers = useMemo(() => {
    const ids = new Set<string>();
    autoWatcherIds.forEach(id => ids.add(id));
    explicitWatcherIds.forEach(id => ids.add(id));
    return Array.from(ids).map(id => mockUsers.find(u => u.id === id)).filter(Boolean);
  }, [autoWatcherIds, explicitWatcherIds, mockUsers]);

  const watcherIdSet = useMemo(() => new Set(watchers.map(u => u!.id)), [watchers]);

  if (!req) {
    if (!requestsData) return <div className="p-6 text-sm text-ois-text-muted">Loading…</div>;
    return <NotFound />;
  }

  const statusMeta  = STATUS_META[req.status];
  const activity    = buildActivity(req);
  const linkedArticles = (req.linkedKBSlugs ?? []).map(s => getArticleBySlug(s)).filter(Boolean);
  const activeStepForApproval = (req.workflow?.steps ?? []).find(s => s.id === approveStep);
  const activeStepForReject   = (req.workflow?.steps ?? []).find(s => s.id === rejectStep);
  const slaElapsed  = slaPercent(req);
  const canUserApprove = (req.workflow?.steps ?? []).some(s => isApprover(s, userId));

  const activeStep = req.workflow.steps.find(s => s.status === 'active');
  const activeStepCurrentAssignee = activeStep?.assigneeName;

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
  async function handlePostComment() {
    const text = comment.trim();
    if (!text) return;
    await requestsService.addComment(req.publicId, text);
    setComment('');
    refetchComments();
  }

  const resolvedComments = commentsData ?? [];
  const CommentsTab = (
    <div className="space-y-4">
      {/* Posted comments */}
      {resolvedComments.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <MessageCircle size={28} className="text-ois-text-subtle mb-2" />
          <p className="text-sm text-ois-text-subtle">No comments yet.</p>
        </div>
      )}
      {resolvedComments.map(c => {
        const author = mockUsers.find(u => u.id === c.authorId)?.name ?? c.authorId.slice(0, 8);
        return (
          <div key={c.id} className="flex gap-3">
            <Avatar name={author} size="sm" className="shrink-0" />
            <div className="flex-1 bg-ois-surface-muted border border-ois-border rounded-lg px-3 py-2.5">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold text-ois-text">{author}</span>
                <span className="text-[10px] text-ois-text-subtle">{formatRelative(c.createdAt)}</span>
              </div>
              <p className="text-sm text-ois-text whitespace-pre-wrap">{c.body}</p>
            </div>
          </div>
        );
      })}

      {/* New comment box */}
      <div className="flex gap-3 pt-2 border-t border-ois-border">
        <Avatar name={userName || '—'} size="sm" className="shrink-0" />
        <div className="flex-1">
          <textarea
            ref={commentTextareaRef}
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add a comment…"
            className="w-full rounded-lg border border-ois-border-strong px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
          <div className="flex justify-end mt-2">
            <button
              disabled={!comment.trim()}
              onClick={handlePostComment}
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
  const stripeColor = CATEGORY_COLOR[req.catalogCategory];

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── PINNED HEADER ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-ois-border shrink-0 z-30">

        {/* Nav row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
          <button
            onClick={() => navigate('/requests')}
            className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
          >
            <ArrowLeft size={15} /> Queue
          </button>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', statusMeta.bg, statusMeta.text, statusMeta.border)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dot)} />
              {statusMeta.label}
            </span>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Entity header with category stripe */}
        <div className="flex items-start gap-0">
          <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: stripeColor }} />
          <div className="flex-1 px-6 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-semibold text-ois-text-muted">{req.publicId}</span>
              <span className="text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full capitalize">
                {req.catalogCategory}
              </span>
              <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full capitalize', req.priority === 'high' ? 'text-ois-danger bg-ois-danger-pale' : req.priority === 'normal' ? 'text-ois-text bg-ois-surface-muted border border-ois-border' : 'text-ois-text-muted bg-ois-surface-muted border border-ois-border')}>
                {req.priority} priority
              </span>
            </div>
            <h1 className="text-xl font-bold text-ois-text leading-tight">{req.title}</h1>
            <div className="flex flex-wrap gap-1 mt-2">
              {(req.tags ?? []).map(tag => (
                <span key={tag} className="text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-ois-text-muted mt-2">
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

      {/* ── WORKFLOW STEPPER (full-width pinned band) ──────────────────── */}
      <div className="px-6 py-4 bg-white border-b border-ois-border shrink-0 overflow-x-auto">
        <WorkflowStepper
          steps={req.workflow.steps}
          onApprove={id => setApproveStep(id)}
          onReject={id => setRejectStep(id)}
          canApprove={canApproveRequest}
          userId={userId}
        />
      </div>

      {/* ── BODY: LEFT SIDEBAR + CENTER + RIGHT SIDEBAR ───────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">

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
              <div className="h-2 rounded-full bg-ois-surface-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', req.slaBreached ? 'bg-ois-danger' : slaElapsed > 75 ? 'bg-ois-warning' : 'bg-ois-primary')}
                  style={{ width: `${slaElapsed}%` }}
                />
              </div>
              <div className="text-[10px] text-ois-text-subtle text-right">{slaElapsed}%</div>

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

        {/* ── CENTER: PINNED TAB BAR + SCROLLABLE CONTENT ───────────────── */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="border-b border-ois-border bg-white shrink-0 px-6">
            <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn('py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-ois-primary text-ois-primary font-bold'
                      : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong')}>
                  {tab.label}{tab.id === 'comments' ? ` (${resolvedComments.length})` : ''}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {activeTab === 'overview'  && OverviewTab}
            {activeTab === 'form'      && FormTab}
            {activeTab === 'activity'  && ActivityTab}
            {activeTab === 'comments'  && CommentsTab}
            {activeTab === 'linked'    && LinkedTab}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────── */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">

          <SideCard title="Quick actions">
            <div className="space-y-1.5">
              {canUserApprove && !approved && (
                <button
                  onClick={() => {
                    const step = req.workflow.steps.find(s => isApprover(s, userId));
                    if (step) setApproveStep(step.id);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left bg-ois-primary text-white hover:bg-ois-primary-hover"
                >
                  <Check size={13} /> Approve
                </button>
              )}
              {canUserApprove && !approved && (
                <button
                  onClick={() => {
                    const step = req.workflow.steps.find(s => isApprover(s, userId));
                    if (step) setRejectStep(step.id);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border border-ois-border text-ois-text hover:bg-ois-surface-muted"
                >
                  <X size={13} /> Reject
                </button>
              )}
              {approved && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ois-success-pale text-ois-success text-xs font-semibold">
                  <CheckCircle2 size={13} /> Approved
                </div>
              )}
              <button
                onClick={() => setShowRequestInfo(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted transition-colors text-left border border-ois-border"
              >
                <MessageCircle size={13} className="shrink-0" /> Request info from user
              </button>
              <button
                onClick={() => setShowReassign(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted transition-colors text-left border border-ois-border"
              >
                <UserCheck size={13} className="shrink-0" /> Reassign current step
              </button>
              <button
                onClick={jumpToComments}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted transition-colors text-left border border-ois-border"
              >
                <MessageCircle size={13} className="shrink-0" /> Add comment
              </button>
              <div className="pt-1 border-t border-ois-border">
                <button
                  onClick={() => setShowCancel(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border border-ois-border text-ois-danger hover:bg-ois-danger-pale">
                  <Ban size={13} className="shrink-0" /> Cancel request
                </button>
              </div>
            </div>
          </SideCard>

          <SideCard title={`Watchers (${watchers.length})`}>
            <div className="space-y-2">
              {watchers.map(u => u && (
                <div key={u.id} className="flex items-center gap-2 group">
                  <Avatar name={u.name} size="xs" />
                  <span className="text-xs text-ois-text flex-1 min-w-0 truncate">{u.name}</span>
                  {u.id === req.requesterId && <span className="text-[10px] text-ois-text-subtle">(req.)</span>}
                  {/* Only explicit (user-added) watchers can be removed; auto-watchers
                      (requester + step assignees) are derived from the workflow snapshot. */}
                  {!autoWatcherIds.has(u.id) && explicitWatcherIds.includes(u.id) && (
                    <button
                      onClick={async () => {
                        setWatcherError(null);
                        try {
                          await requestsService.removeWatcher(req.publicId, u.id);
                          refreshRequests();
                        } catch (err) {
                          // eslint-disable-next-line no-console
                          console.error('Failed to remove watcher:', err);
                          setWatcherError((err as Error).message || `Failed to remove ${u.name}.`);
                        }
                      }}
                      aria-label={`Remove ${u.name}`}
                      title="Remove watcher"
                      className="opacity-60 hover:opacity-100 text-ois-text-subtle hover:text-ois-danger transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setShowAddWatcher(true)} className="flex items-center gap-1.5 text-xs text-ois-primary hover:underline mt-1">
                <span className="w-5 h-5 rounded-full border-2 border-dashed border-ois-primary flex items-center justify-center text-ois-primary">
                  +
                </span>
                Add watcher
              </button>
              {watcherError && (
                <p className="text-[11px] text-ois-danger mt-1.5">{watcherError}</p>
              )}
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
          onConfirm={async note => {
            try {
              await requestsService.approveStep(req.publicId, approveStep, note || undefined);
              setApproved(true);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error('Failed to approve request step:', err);
            } finally {
              setApproveStep(null);
              refreshRequests();
            }
          }}
        />
      )}

      {rejectStep && activeStepForReject && (
        <RejectModal
          stepName={activeStepForReject.name}
          reqId={req.publicId}
          onClose={() => setRejectStep(null)}
          onConfirm={async reason => {
            try {
              await requestsService.rejectStep(req.publicId, rejectStep, reason);
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error('Failed to reject request step:', err);
            } finally {
              setRejectStep(null);
              refreshRequests();
              navigate('/requests');
            }
          }}
        />
      )}

      {showRequestInfo && (
        <RequestInfoModal
          requesterName={req.requesterName}
          onClose={() => setShowRequestInfo(false)}
          onConfirm={_msg => {
            setShowRequestInfo(false);
            jumpToComments();
          }}
        />
      )}

      {showReassign && (
        <ReassignModal
          currentAssignee={activeStepCurrentAssignee}
          users={mockUsers}
          submitting={reassignSubmitting}
          error={reassignError}
          onClose={() => { if (!reassignSubmitting) { setShowReassign(false); setReassignError(null); } }}
          onConfirm={async (id, name) => {
            const step = req.workflow.steps.find(s => s.status === 'active');
            if (!step) { setShowReassign(false); return; }
            setReassignSubmitting(true);
            setReassignError(null);
            try {
              await requestsService.reassignStep(req.publicId, step.id, {
                assigneeId: id, assigneeName: name,
              });
              setShowReassign(false);
              refreshRequests();
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error('Failed to reassign step:', err);
              setReassignError((err as Error).message || 'Failed to reassign step.');
            } finally {
              setReassignSubmitting(false);
            }
          }}
        />
      )}

      {showCancel && (
        <CancelModal
          reqId={req.publicId}
          submitting={cancelSubmitting}
          error={cancelError}
          onClose={() => { if (!cancelSubmitting) { setShowCancel(false); setCancelError(null); } }}
          onConfirm={async reason => {
            setCancelSubmitting(true);
            setCancelError(null);
            try {
              await requestsService.cancel(req.publicId, { reason });
              setShowCancel(false);
              refreshRequests();
              navigate('/requests');
            } catch (err) {
              setCancelError((err as Error).message || 'Failed to cancel request.');
            } finally {
              setCancelSubmitting(false);
            }
          }}
        />
      )}

      {showAddWatcher && (
        <AddWatcherModal
          existingIds={watcherIdSet}
          users={mockUsers}
          submitting={addWatcherSubmitting}
          error={addWatcherError}
          onClose={() => { if (!addWatcherSubmitting) { setShowAddWatcher(false); setAddWatcherError(null); } }}
          onConfirm={async (id, name) => {
            setAddWatcherSubmitting(true);
            setAddWatcherError(null);
            try {
              await requestsService.addWatcher(req.publicId, { userId: id, userName: name });
              setShowAddWatcher(false);
              setWatcherError(null);
              refreshRequests();
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error('Failed to add watcher:', err);
              setAddWatcherError((err as Error).message || 'Failed to add watcher.');
            } finally {
              setAddWatcherSubmitting(false);
            }
          }}
        />
      )}
    </div>
  );
};
