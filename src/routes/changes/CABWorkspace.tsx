import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Download, AlertTriangle, CheckCircle2, Clock, ChevronRight,
  ChevronLeft, SkipForward, Calendar, Users,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/utils';
import { changesService, useResource } from '../../services';
import { Change, CABVote, ChangeApproval } from '../../types/change';
import { cabVoteMeta, changeTypeMeta, riskMeta } from '../../lib/constants';
import { RiskBadge } from '../../components/changes/RiskBadge';
import { ChangeTypeChip } from '../../components/changes/ChangeTypeChip';
import { formatDate } from '../../lib/format';
import { Can, changeResource, useCurrentUser } from '../../lib/rbac';

// ─── SectionCard ──────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const SESSION = {
  date: 'Thursday May 9, 10:00 UTC',
  members: [
    { id: 'u-001', name: 'Sarah Chen', role: 'Chair (Change Manager)' },
    { id: 'u-007', name: 'Tom Bergstrom', role: 'Service Owner' },
    { id: 'u-006', name: 'Helena Vasquez', role: 'Release Manager' },
    { id: 'u-004', name: 'David Okafor', role: 'Observer (proposer)' },
    { id: 'u-008', name: 'Aisha Khan', role: 'Observer' },
  ],
};

// ─── Cast Vote Modal ──────────────────────────────────────────────────────────

interface CastVoteModalProps {
  change: Change;
  approval: ChangeApproval;
  onClose: () => void;
  onSubmit: (decision: CABVote, rationale: string, conditions?: string) => void;
}

const CastVoteModal: React.FC<CastVoteModalProps> = ({ change, approval, onClose, onSubmit }) => {
  const [decision, setDecision] = useState<CABVote>('approve');
  const [rationale, setRationale] = useState('');
  const [conditions, setConditions] = useState('');
  const [locked, setLocked] = useState(false);

  const disabled = (decision === 'reject' && !rationale.trim()) || (decision === 'approve_with_conditions' && !conditions.trim());

  return (
    <Modal isOpen onClose={onClose} title={`Cast vote — ${change.publicId}`} size="md">
      <div className="py-4 space-y-5">
        <div className="bg-ois-bg border border-ois-border rounded-lg p-3 text-xs text-ois-text-muted">
          Your role: <span className="font-semibold text-ois-text">{approval.approverRole}</span>
        </div>

        <div>
          <p className="text-xs font-bold text-ois-text-muted uppercase tracking-widest mb-3">Decision</p>
          <div className="space-y-2">
            {(['approve', 'approve_with_conditions', 'reject', 'abstain'] as CABVote[]).map((v) => {
              const meta = cabVoteMeta[v];
              return (
                <label key={v} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-ois-bg transition-colors">
                  <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    decision === v ? 'border-ois-primary' : 'border-ois-border',
                  )}>
                    {decision === v && <div className="w-2 h-2 rounded-full bg-ois-primary" />}
                  </div>
                  <input type="radio" className="sr-only" checked={decision === v} onChange={() => setDecision(v)} />
                  <span className="text-sm font-medium" style={{ color: decision === v ? meta.color : undefined }}>{meta.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-ois-text-muted uppercase tracking-widest mb-1.5">
            Rationale
            {(decision === 'reject' || decision === 'approve_with_conditions') && <span className="text-ois-danger ml-1">*</span>}
          </p>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            placeholder={decision === 'approve' ? 'Optional' : 'Required — explain your decision'}
            className="w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
          />
        </div>

        {decision === 'approve_with_conditions' && (
          <div>
            <p className="text-xs font-bold text-ois-text-muted uppercase tracking-widest mb-1.5">
              Conditions <span className="text-ois-danger ml-1">*</span>
            </p>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              rows={2}
              placeholder="Required — describe conditions"
              className="w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
            />
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} className="rounded border-ois-border" />
          <span className="text-xs text-ois-text-muted">Lock my vote (cannot change after submission)</span>
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={disabled} onClick={() => onSubmit(decision, rationale, conditions)}>
            Submit vote
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Voting card (center) ─────────────────────────────────────────────────────

interface VotingCardProps {
  change: Change;
  votes: Record<string, CABVote>;
  onCastVote: (approval: ChangeApproval) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}

const VotingCard: React.FC<VotingCardProps> = ({ change, votes, onCastVote, notes, onNotesChange }) => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const CURRENT_USER = user?.id ?? 'u-001';
  const approved = (change.approvals ?? []).filter((a) => votes[a.id] === 'approve' || (a.decision !== 'pending' && a.decision === 'approve')).length;
  const total = (change.approvals ?? []).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-sm font-bold text-ois-primary">{change.publicId}</span>
          <ChangeTypeChip type={change.type} size="sm" />
          <RiskBadge risk={change.risk} score={change.riskScore} size="sm" />
          <span className="text-xs text-ois-text-muted">Window: {change.implementationWindow}</span>
        </div>
        <h2 className="text-lg font-bold text-ois-text">{change.title}</h2>
      </div>

      {/* Description */}
      <Card>
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted flex items-center justify-between">
          <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-widest">Description</h3>
          <button className="text-xs text-ois-primary hover:underline" onClick={() => navigate(`/changes/${change.publicId}`)}>
            Full detail →
          </button>
        </div>
        <CardBody>
          <p className="text-sm text-ois-text leading-relaxed line-clamp-3">{change.description}</p>
        </CardBody>
      </Card>

      {/* Risk */}
      <Card>
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
          <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-widest">Risk Assessment</h3>
        </div>
        <CardBody>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-2 rounded-full bg-ois-border overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${change.riskScore}%`,
                  background: change.riskScore > 65 ? '#F04438' : change.riskScore > 30 ? '#F79009' : '#12B76A',
                }}
              />
            </div>
            <span className="text-sm font-bold text-ois-text">{change.riskScore}/100 — {riskMeta[change.risk].label}</span>
          </div>
          <ul className="space-y-1">
            {(change.riskFactors ?? []).map((f, i) => (
              <li key={i} className="text-xs text-ois-text flex items-start gap-1.5">
                <span className="text-ois-text-subtle mt-0.5">•</span> {f}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Conflict analysis */}
      <Card>
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
          <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-widest">Conflict Analysis</h3>
        </div>
        <CardBody>
          {(change.conflicts ?? []).length === 0 ? (
            <div className="space-y-1 text-xs">
              {['FSC validation: No time conflicts', 'CI overlap check: No overlapping CI changes in window', 'Freeze window: Outside active freeze window'].map((line) => (
                <p key={line} className="flex items-center gap-2 text-ois-success font-medium">
                  <CheckCircle2 size={13} /> {line}
                </p>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(change.conflicts ?? []).map((cf) => (
                <div key={cf.id} className="flex items-start gap-2 text-xs text-ois-warning">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>{cf.description}</span>
                  {cf.resolvedAt && <Badge variant="success" className="text-[9px]">Resolved</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Linked context */}
      {((change.linkedProblemIds ?? []).length > 0 || (change.linkedIncidentIds ?? []).length > 0 || change.linkedReleasePublicId) && (
        <Card>
          <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
            <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-widest">Linked Context</h3>
          </div>
          <CardBody>
            <dl className="space-y-2 text-xs">
              {(change.linkedProblemIds ?? []).length > 0 && (
                <div className="flex gap-3">
                  <dt className="text-ois-text-muted w-32 shrink-0">Problem fixed:</dt>
                  <dd className="font-mono text-ois-primary">{(change.linkedProblemIds ?? []).join(', ')}</dd>
                </div>
              )}
              {(change.linkedIncidentIds ?? []).length > 0 && (
                <div className="flex gap-3">
                  <dt className="text-ois-text-muted w-32 shrink-0">Incidents:</dt>
                  <dd className="font-mono text-ois-text">{(change.linkedIncidentIds ?? []).join(', ')}</dd>
                </div>
              )}
              {change.linkedReleasePublicId && (
                <div className="flex gap-3">
                  <dt className="text-ois-text-muted w-32 shrink-0">Release:</dt>
                  <dd className="font-mono text-ois-primary">{change.linkedReleasePublicId}</dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>
      )}

      {/* Voting table */}
      <Card>
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
          <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-widest">Voting</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ois-border">
                {['Approver', 'Role', 'Decision', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-bold text-ois-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ois-border">
              {(change.approvals ?? []).map((a) => {
                const currentDecision = votes[a.id] ?? (a.decision !== 'pending' ? a.decision : 'pending');
                const isMe = a.approverId === CURRENT_USER;
                const isPending = currentDecision === 'pending';
                const meta = currentDecision !== 'pending' ? cabVoteMeta[currentDecision as CABVote] : null;

                return (
                  <tr key={a.id} className={cn(isMe && 'bg-blue-50/40')}>
                    <td className="px-4 py-3 font-medium text-ois-text">
                      {a.approverName}
                      {isMe && <span className="ml-1 text-[9px] bg-ois-primary/10 text-ois-primary px-1 py-0.5 rounded font-bold">you</span>}
                    </td>
                    <td className="px-4 py-3 text-ois-text-muted">{a.approverRole}</td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <span className="flex items-center gap-1 text-ois-text-subtle">
                          <Clock size={12} /> Pending
                        </span>
                      ) : (
                        <span className="font-semibold" style={{ color: meta?.color }}>{meta?.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isMe && isPending ? (
                        <Can
                          module="change"
                          action="approve"
                          variant={change.type}
                          resource={changeResource(change)}
                          fallback={
                            <span className="text-[10px] text-ois-text-subtle italic">
                              Not authorised
                            </span>
                          }
                        >
                          <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => onCastVote(a)}>
                            Cast vote
                          </Button>
                        </Can>
                      ) : (
                        <span className="text-ois-text-subtle">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-ois-border bg-ois-surface-muted flex items-center justify-between text-xs">
          <span className="text-ois-text-muted">Result: {approved} approve · {total - approved} pending</span>
          <span className="text-ois-text-muted">Required: all {total} voting members must approve</span>
        </div>
      </Card>

      {/* Discussion */}
      <Card>
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
          <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-widest">Discussion Notes</h3>
        </div>
        <CardBody>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={5}
            placeholder="Add discussion notes here (visible to all in session)..."
            className="w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none text-ois-text font-mono"
          />
        </CardBody>
      </Card>
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  variant?: 'success' | 'info';
}

const Toast: React.FC<ToastProps> = ({ message, variant = 'success' }) => (
  <div
    className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-none',
      variant === 'success' ? 'bg-ois-success text-white' : 'bg-ois-primary text-white',
    )}
  >
    {variant === 'success' && <CheckCircle2 size={15} />}
    {message}
  </div>
);

// ─── Schedule Session Modal ───────────────────────────────────────────────────

const ScheduleSessionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onDateChange: (v: string) => void;
  attendees: string[];
  onAttendeesChange: (ids: string[]) => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, date, onDateChange, attendees, onAttendeesChange, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Schedule new CAB session" size="md">
    <div className="py-4 space-y-5">
      <div>
        <label className="text-xs font-bold text-ois-text-muted uppercase tracking-widest mb-1.5 block">
          Session date & time (UTC) <span className="text-ois-danger">*</span>
        </label>
        <input
          type="datetime-local"
          value={date}
          onChange={e => onDateChange(e.target.value)}
          className="w-full h-9 rounded-lg border border-ois-border-strong bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
        />
      </div>
      <div>
        <p className="text-xs font-bold text-ois-text-muted uppercase tracking-widest mb-2">Attendees</p>
        <div className="space-y-2">
          {SESSION.members.map(m => (
            <label key={m.id} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={attendees.includes(m.id)}
                onChange={e => onAttendeesChange(
                  e.target.checked
                    ? [...attendees, m.id]
                    : attendees.filter(id => id !== m.id)
                )}
                className="rounded border-ois-border"
              />
              <span className="text-sm text-ois-text">{m.name}</span>
              <span className="text-xs text-ois-text-subtle">{m.role}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" disabled={!date} onClick={onConfirm}>Schedule session</Button>
      </div>
    </div>
  </Modal>
);

// ─── Main page ────────────────────────────────────────────────────────────────

export const CABWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const CURRENT_USER = user?.id ?? 'u-001';
  void CURRENT_USER;
  const { data: allChanges } = useResource(() => changesService.list(), []);
  const [changes, setChanges] = useState<Change[]>([]);
  useEffect(() => { if (allChanges) setChanges(allChanges); }, [allChanges]);
  const AGENDA = useMemo(
    () => changes.filter((c) => c.status === 'in_review'),
    [changes],
  );
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [votes, setVotes] = useState<Record<string, Record<string, CABVote>>>({});
  const [votingFor, setVotingFor] = useState<ChangeApproval | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [deferredIds, setDeferredIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastProps | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleAttendees, setScheduleAttendees] = useState<string[]>(SESSION.members.map(m => m.id));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const showToast = (message: string, variant: ToastProps['variant'] = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, variant });
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleScheduleConfirm = () => {
    const formatted = scheduleDate
      ? new Date(scheduleDate).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
      : '';
    showToast(`Session scheduled for ${formatted}`);
    setScheduleOpen(false);
    setScheduleDate('');
  };

  const handleCastVote = async (changeId: string, decision: CABVote, rationale?: string, conditions?: string) => {
    setSavingId(changeId);
    setVoteError(null);
    try {
      const updated = await changesService.castVote(changeId, { decision, rationale, conditions } as any);
      setChanges((prev) => prev.map((c) => c.publicId === changeId ? updated : c));
      setVotes((prev) => { const next = { ...prev }; delete next[changeId]; return next; });
      showToast('Vote recorded');
      setVotingFor(null);
    } catch (e) {
      setVoteError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingId(null);
    }
  };

  const selected = AGENDA[selectedIdx];

  const getVote = (changeId: string, approvalId: string): CABVote | undefined =>
    votes[changeId]?.[approvalId];

  const getVotesForChange = (c: Change) =>
    Object.fromEntries(c.approvals.map((a) => [a.id, getVote(c.id, a.id) ?? (a.decision !== 'pending' ? a.decision as CABVote : undefined)]).filter(([, v]) => v) as [string, CABVote][]);

  if (AGENDA.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Calendar size={48} className="text-ois-text-subtle mb-4" />
          <h2 className="text-xl font-bold text-ois-text mb-2">No active CAB session</h2>
          <p className="text-sm text-ois-text-muted mb-6">
            Next scheduled session: Thursday May 9, 10:00 UTC (changes on agenda)
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/changes')}>View upcoming changes</Button>
            <Button onClick={() => setScheduleOpen(true)}>Schedule new session</Button>
          </div>
        </div>
        {toast && <Toast message={toast.message} variant={toast.variant} />}
        <ScheduleSessionModal
          isOpen={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          date={scheduleDate}
          onDateChange={setScheduleDate}
          attendees={scheduleAttendees}
          onAttendeesChange={setScheduleAttendees}
          onConfirm={handleScheduleConfirm}
        />
      </>
    );
  }

  return (
    <div className="-m-6 flex bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Agenda sidebar */}
      <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
        <SectionCard title="Agenda">
          <div className="divide-y divide-ois-border -m-4">
            {AGENDA.map((c, i) => {
              const approved = c.approvals.filter((a) =>
                getVote(c.id, a.id) === 'approve' || (a.decision !== 'pending' && a.decision === 'approve'),
              ).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedIdx(i)}
                  className={cn(
                    'w-full text-left px-4 py-3 transition-colors',
                    i === selectedIdx ? 'bg-ois-primary/5 border-l-2 border-ois-primary' : 'hover:bg-ois-bg',
                    deferredIds.has(c.id) && 'opacity-60',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-bold text-ois-primary">{c.publicId.replace('CHG-2026-', 'CHG-')}</span>
                    {deferredIds.has(c.id) ? (
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Deferred</span>
                    ) : (
                      <RiskBadge risk={c.risk} size="sm" />
                    )}
                  </div>
                  <p className={cn('text-[11px] leading-snug line-clamp-2', deferredIds.has(c.id) ? 'text-ois-text-muted line-through' : 'text-ois-text')}>{c.title}</p>
                  {(() => {
                    const ta = c.technicalAssessment;
                    if (!ta) {
                      return (
                        <p className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide bg-red-50 text-ois-danger px-1.5 py-0.5 rounded">
                          ⚠ No tech assessment
                        </p>
                      );
                    }
                    if (ta.status === 'approved') {
                      return (
                        <p className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                          ✓ Tech assessment
                        </p>
                      );
                    }
                    return (
                      <p className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                        ● Assessment {ta.status.replace(/_/g, ' ')}
                      </p>
                    );
                  })()}
                  <div className="flex gap-0.5 mt-1.5">
                    {c.approvals.map((a) => {
                      const v = getVote(c.id, a.id) ?? (a.decision !== 'pending' ? a.decision : 'pending');
                      return (
                        <div key={a.id} className={cn('w-3 h-3 rounded-full',
                          v === 'approve' ? 'bg-emerald-500' :
                          v === 'reject' ? 'bg-ois-danger' : 'bg-ois-border',
                        )} />
                      );
                    })}
                    <span className="text-[9px] text-ois-text-subtle ml-1">approvals</span>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>
      </aside>

      {/* Center: voting card */}
      <div className="flex-1 min-w-0 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-ois-text">CAB Workspace</h1>
            <p className="text-xs text-ois-text-muted">Session: {SESSION.date} · {AGENDA.length} changes · {SESSION.members.length} members</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={sessionStarted ? 'outline' : 'primary'}
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setSessionStarted(!sessionStarted)}
            >
              <Play size={12} /> {sessionStarted ? 'End session' : 'Start session'}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setScheduleOpen(true)}>
              <Calendar size={12} /> Schedule session
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => {
              const headers = ['ID', 'Title', 'Type', 'Risk', 'Risk Score', 'Window'];
              const rows = AGENDA.map(c => [
                c.publicId,
                `"${c.title.replace(/"/g, '""')}"`,
                c.type,
                c.risk,
                String(c.riskScore),
                `"${c.implementationWindow ?? ''}"`,
              ].join(','));
              const csv = [headers.join(','), ...rows].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `cab-agenda-${SESSION.date.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              showToast('Agenda exported');
            }}>
              <Download size={12} /> Export agenda
            </Button>
          </div>
        </div>

        {voteError && (
          <div className="mb-4 p-3 rounded-lg bg-ois-danger-pale border border-red-200 text-sm text-ois-danger">
            {voteError}
          </div>
        )}
        {savingId && (
          <div className="mb-2 text-xs text-ois-text-subtle">Saving vote for {savingId}...</div>
        )}

        {selected && (
          <>
            <VotingCard
              change={selected}
              votes={getVotesForChange(selected)}
              onCastVote={(a) => setVotingFor(a)}
              notes={notes[selected.id] ?? ''}
              onNotesChange={(v) => setNotes((n) => ({ ...n, [selected.id]: v }))}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-ois-border">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={selectedIdx === 0}
                onClick={() => setSelectedIdx(selectedIdx - 1)}
              >
                <ChevronLeft size={14} /> Previous
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    setDeferredIds((ids) => new Set([...ids, selected.id]));
                    if (selectedIdx < AGENDA.length - 1) {
                      setSelectedIdx(selectedIdx + 1);
                    }
                  }}
                >
                  <SkipForward size={12} /> Defer to next session
                </Button>
              </div>
              <Button
                variant={selectedIdx === AGENDA.length - 1 ? 'outline' : 'primary'}
                size="sm"
                className="gap-1.5"
                disabled={selectedIdx === AGENDA.length - 1}
                onClick={() => setSelectedIdx(selectedIdx + 1)}
              >
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Right: Session info */}
      <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
        <SectionCard title="Session">
          <p className="text-xs font-semibold text-ois-text mb-1">{SESSION.date}</p>
          <p className="text-[11px] text-ois-text-muted mb-3">
            {sessionStarted ? '⏱ In progress' : 'Not started'} · {AGENDA.length} changes · {SESSION.members.length} members
          </p>
          <div className="space-y-2">
            {SESSION.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-ois-primary/10 text-ois-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                  {m.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="text-[11px] font-medium text-ois-text">{m.name}</p>
                  <p className="text-[9px] text-ois-text-subtle">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Freeze Windows">
          <p className="text-xs text-ois-text font-medium">⚠ Active until May 11:</p>
          <p className="text-[11px] text-ois-text-muted mt-1">Marketing campaign (P1/P2 changes only)</p>
        </SectionCard>

        <SectionCard title="Stats This Quarter">
          <dl className="space-y-2 text-xs">
            {[
              { label: 'Changes reviewed', value: '47' },
              { label: 'Approval rate', value: '89%' },
              { label: 'Avg discussion', value: '8 min' },
              { label: 'Failed PIRs', value: '2' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-ois-text-muted">{label}</dt>
                <dd className="font-bold text-ois-text">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </aside>

      {/* Vote modal */}
      {votingFor && selected && (
        <CastVoteModal
          change={selected}
          approval={votingFor}
          onClose={() => setVotingFor(null)}
          onSubmit={(decision, rationale, conditions) => handleCastVote(selected.publicId, decision, rationale, conditions)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} variant={toast.variant} />}

      <ScheduleSessionModal
        isOpen={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        date={scheduleDate}
        onDateChange={setScheduleDate}
        attendees={scheduleAttendees}
        onAttendeesChange={setScheduleAttendees}
        onConfirm={handleScheduleConfirm}
      />
    </div>
  );
};
