import React, { useState } from 'react';
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
import { mockChanges } from '../../mocks';
import { Change, CABVote, ChangeApproval } from '../../types/change';
import { cabVoteMeta, changeTypeMeta, riskMeta } from '../../lib/constants';
import { RiskBadge } from '../../components/changes/RiskBadge';
import { ChangeTypeChip } from '../../components/changes/ChangeTypeChip';
import { formatDate } from '../../lib/format';

// CAB agenda: in_review changes
const AGENDA = mockChanges.filter((c) => c.status === 'in_review');
const CURRENT_USER = 'u-001'; // Sarah Chen

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
  onSubmit: (decision: CABVote, rationale: string) => void;
}

const CastVoteModal: React.FC<CastVoteModalProps> = ({ change, approval, onClose, onSubmit }) => {
  const [decision, setDecision] = useState<CABVote>('approve');
  const [rationale, setRationale] = useState('');
  const [locked, setLocked] = useState(false);

  const disabled = (decision === 'reject' || decision === 'approve_with_conditions') && !rationale.trim();

  return (
    <Modal isOpen onClose={onClose} title={`Cast vote — ${change.publicId}`} size="md">
      <div className="py-4 space-y-5">
        <div className="bg-ois-bg border border-ois-border rounded-lg p-3 text-xs text-ois-text-muted">
          Your role: <span className="font-semibold text-ois-text">{approval.approverRole}</span>
        </div>

        <div>
          <p className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-3">Decision</p>
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
          <p className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5">
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

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} className="rounded border-ois-border" />
          <span className="text-xs text-ois-text-muted">Lock my vote (cannot change after submission)</span>
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={disabled} onClick={() => onSubmit(decision, rationale)}>
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
  const approved = change.approvals.filter((a) => votes[a.id] === 'approve' || (a.decision !== 'pending' && a.decision === 'approve')).length;
  const total = change.approvals.length;

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
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-bg flex items-center justify-between">
          <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Description</h3>
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
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-bg">
          <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Risk Assessment</h3>
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
            {change.riskFactors.map((f, i) => (
              <li key={i} className="text-xs text-ois-text flex items-start gap-1.5">
                <span className="text-ois-text-subtle mt-0.5">•</span> {f}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Conflict analysis */}
      <Card>
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-bg">
          <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Conflict Analysis</h3>
        </div>
        <CardBody>
          {change.conflicts.length === 0 ? (
            <div className="space-y-1 text-xs">
              {['FSC validation: No time conflicts', 'CI overlap check: No overlapping CI changes in window', 'Freeze window: Outside active freeze window'].map((line) => (
                <p key={line} className="flex items-center gap-2 text-ois-success font-medium">
                  <CheckCircle2 size={13} /> {line}
                </p>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {change.conflicts.map((cf) => (
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
      {(change.linkedProblemIds.length > 0 || change.linkedIncidentIds.length > 0 || change.linkedReleasePublicId) && (
        <Card>
          <div className="px-4 py-2.5 border-b border-ois-border bg-ois-bg">
            <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Linked Context</h3>
          </div>
          <CardBody>
            <dl className="space-y-2 text-xs">
              {change.linkedProblemIds.length > 0 && (
                <div className="flex gap-3">
                  <dt className="text-ois-text-muted w-32 shrink-0">Problem fixed:</dt>
                  <dd className="font-mono text-ois-primary">{change.linkedProblemIds.join(', ')}</dd>
                </div>
              )}
              {change.linkedIncidentIds.length > 0 && (
                <div className="flex gap-3">
                  <dt className="text-ois-text-muted w-32 shrink-0">Incidents:</dt>
                  <dd className="font-mono text-ois-text">{change.linkedIncidentIds.join(', ')}</dd>
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
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-bg">
          <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Voting</h3>
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
              {change.approvals.map((a) => {
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
                        <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => onCastVote(a)}>
                          Cast vote
                        </Button>
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
        <div className="px-4 py-3 border-t border-ois-border bg-ois-bg flex items-center justify-between text-xs">
          <span className="text-ois-text-muted">Result: {approved} approve · {total - approved} pending</span>
          <span className="text-ois-text-muted">Required: all {total} voting members must approve</span>
        </div>
      </Card>

      {/* Discussion */}
      <Card>
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-bg">
          <h3 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">Discussion Notes</h3>
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

// ─── Main page ────────────────────────────────────────────────────────────────

export const CABWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [votes, setVotes] = useState<Record<string, Record<string, CABVote>>>({});
  const [votingFor, setVotingFor] = useState<ChangeApproval | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const selected = AGENDA[selectedIdx];

  const getVote = (changeId: string, approvalId: string): CABVote | undefined =>
    votes[changeId]?.[approvalId];

  const getVotesForChange = (c: Change) =>
    Object.fromEntries(c.approvals.map((a) => [a.id, getVote(c.id, a.id) ?? (a.decision !== 'pending' ? a.decision as CABVote : undefined)]).filter(([, v]) => v) as [string, CABVote][]);

  if (AGENDA.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Calendar size={48} className="text-ois-text-subtle mb-4" />
        <h2 className="text-xl font-bold text-ois-text mb-2">No active CAB session</h2>
        <p className="text-sm text-ois-text-muted mb-6">
          Next scheduled session: Thursday May 9, 10:00 UTC (changes on agenda)
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/changes')}>View upcoming changes</Button>
          <Button onClick={() => navigate('/changes')}>Schedule new session</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-5 min-h-0">
      {/* Agenda sidebar */}
      <div className="w-60 shrink-0 space-y-3">
        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h3 className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">Agenda</h3>
          </div>
          <div className="divide-y divide-ois-border">
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
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-bold text-ois-primary">{c.publicId.replace('CHG-2026-', 'CHG-')}</span>
                    <RiskBadge risk={c.risk} size="sm" />
                  </div>
                  <p className="text-[11px] text-ois-text leading-snug line-clamp-2">{c.title}</p>
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
        </Card>
      </div>

      {/* Center: voting card */}
      <div className="flex-1 min-w-0">
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
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
              <Download size={12} /> Export agenda
            </Button>
          </div>
        </div>

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
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
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
      <div className="w-56 shrink-0 space-y-3">
        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h3 className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Users size={11} /> Session
            </h3>
          </div>
          <CardBody>
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
          </CardBody>
        </Card>

        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-amber-50">
            <h3 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={10} /> Freeze Windows
            </h3>
          </div>
          <CardBody>
            <p className="text-xs text-ois-text font-medium">⚠ Active until May 11:</p>
            <p className="text-[11px] text-ois-text-muted mt-1">Marketing campaign (P1/P2 changes only)</p>
          </CardBody>
        </Card>

        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h3 className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">Stats This Quarter</h3>
          </div>
          <CardBody>
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
          </CardBody>
        </Card>
      </div>

      {/* Vote modal */}
      {votingFor && selected && (
        <CastVoteModal
          change={selected}
          approval={votingFor}
          onClose={() => setVotingFor(null)}
          onSubmit={(decision, rationale) => {
            setVotes((v) => ({
              ...v,
              [selected.id]: { ...(v[selected.id] ?? {}), [votingFor.id]: decision },
            }));
            setVotingFor(null);
          }}
        />
      )}
    </div>
  );
};
