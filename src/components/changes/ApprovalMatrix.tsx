import React, { useState } from 'react';
import { Check, Clock, X, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ChangeApproval, CABVote } from '../../types/change';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { cabVoteMeta } from '../../lib/constants';
import { formatRelative } from '../../lib/format';

const CURRENT_USER = 'u-001'; // Sarah Chen (Change Manager)

const VoteIcon: React.FC<{ decision: CABVote | 'pending' }> = ({ decision }) => {
  if (decision === 'pending') return <Clock size={14} className="text-ois-text-subtle" />;
  if (decision === 'approve') return <Check size={14} className="text-emerald-600" />;
  if (decision === 'approve_with_conditions') return <AlertCircle size={14} className="text-amber-500" />;
  if (decision === 'reject') return <X size={14} className="text-ois-danger" />;
  return <span className="text-xs text-ois-text-subtle">—</span>;
};

interface CastVoteModalProps {
  approval: ChangeApproval;
  onClose: () => void;
  onSubmit: (decision: CABVote, rationale: string) => void;
}

const CastVoteModal: React.FC<CastVoteModalProps> = ({ approval, onClose, onSubmit }) => {
  const [decision, setDecision] = useState<CABVote>('approve');
  const [rationale, setRationale] = useState('');
  const [locked, setLocked] = useState(false);

  return (
    <Modal isOpen onClose={onClose} title={`Cast vote — ${approval.approverRole}`} size="md">
      <div className="py-4 space-y-5">
        <div>
          <p className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-3">Decision</p>
          <div className="space-y-2">
            {(['approve', 'approve_with_conditions', 'reject', 'abstain'] as CABVote[]).map((v) => {
              const meta = cabVoteMeta[v];
              return (
                <label key={v} className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    decision === v ? 'border-ois-primary' : 'border-ois-border',
                  )}>
                    {decision === v && <div className="w-2 h-2 rounded-full bg-ois-primary" />}
                  </div>
                  <input type="radio" className="sr-only" checked={decision === v} onChange={() => setDecision(v)} />
                  <span className="text-sm font-medium text-ois-text">{meta.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-1.5">
            Rationale{(decision === 'reject' || decision === 'approve_with_conditions') ? ' *' : ' (optional)'}
          </p>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            placeholder={decision === 'reject' ? 'Required — explain why you are rejecting' : 'Optional rationale for your decision'}
            className="w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} className="rounded border-ois-border" />
          <span className="text-xs text-ois-text-muted">Lock my vote (cannot change after submission)</span>
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={(decision === 'reject' || decision === 'approve_with_conditions') && !rationale.trim()}
            onClick={() => onSubmit(decision, rationale)}
          >
            Submit vote
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface ApprovalMatrixProps {
  approvals: ChangeApproval[];
  changeId: string;
  cabSessionDate?: string;
}

export const ApprovalMatrix: React.FC<ApprovalMatrixProps> = ({
  approvals,
  cabSessionDate = 'Thursday May 9, 10:00 UTC',
}) => {
  const [votes, setVotes] = useState<Record<string, { decision: CABVote; rationale: string }>>(
    Object.fromEntries(
      approvals
        .filter((a) => a.decision !== 'pending')
        .map((a) => [a.id, { decision: a.decision as CABVote, rationale: a.rationale ?? '' }]),
    ),
  );
  const [votingFor, setVotingFor] = useState<ChangeApproval | null>(null);

  const getDecision = (a: ChangeApproval): CABVote | 'pending' =>
    (votes[a.id]?.decision as CABVote) ?? (a.decision === 'pending' ? 'pending' : a.decision as CABVote);

  const approved = approvals.filter((a) => getDecision(a) === 'approve').length;
  const total = approvals.filter((a) => a.approverId !== 'proposer').length;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {approvals.map((a) => {
          const decision = getDecision(a);
          const isMe = a.approverId === CURRENT_USER;
          const myVote = votes[a.id];

          return (
            <div key={a.id} className={cn(
              'flex items-start gap-3 p-4 rounded-xl border',
              decision === 'approve' ? 'bg-emerald-50 border-emerald-200' :
              decision === 'reject' ? 'bg-red-50 border-red-200' :
              decision === 'approve_with_conditions' ? 'bg-amber-50 border-amber-200' :
              'bg-ois-bg border-ois-border',
            )}>
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                decision === 'approve' ? 'bg-emerald-100' :
                decision === 'reject' ? 'bg-red-100' :
                decision === 'pending' ? 'bg-ois-border' : 'bg-amber-100',
              )}>
                <VoteIcon decision={decision} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-ois-text">{a.approverRole}</span>
                  <span className="text-xs text-ois-text-muted">— {a.approverName}</span>
                  {isMe && <span className="text-[10px] bg-ois-primary/10 text-ois-primary px-1.5 py-0.5 rounded-full font-bold">you</span>}
                </div>
                {decision === 'pending' ? (
                  <p className="text-xs text-ois-text-subtle">Awaiting decision</p>
                ) : (
                  <div>
                    <p className="text-xs font-semibold" style={{ color: cabVoteMeta[decision as CABVote]?.color }}>
                      {cabVoteMeta[decision as CABVote]?.label}
                      {(myVote?.rationale || a.rationale) && ' ·'}
                      {(myVote?.rationale || a.rationale) && (
                        <span className="font-normal text-ois-text-muted ml-1">
                          "{myVote?.rationale || a.rationale}"
                        </span>
                      )}
                    </p>
                    {a.decidedAt && (
                      <p className="text-[10px] text-ois-text-subtle mt-0.5">{formatRelative(a.decidedAt)}</p>
                    )}
                  </div>
                )}
                {isMe && decision === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setVotingFor(a)}>
                      <Check size={12} /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setVotingFor(a)}>
                      Cast vote
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-ois-text-muted pt-2 border-t border-ois-border flex items-center justify-between">
        <span>{approved} of {total} approvals received</span>
        <span className="font-medium text-ois-text">CAB session: {cabSessionDate}</span>
      </div>

      {votingFor && (
        <CastVoteModal
          approval={votingFor}
          onClose={() => setVotingFor(null)}
          onSubmit={(decision, rationale) => {
            setVotes((v) => ({ ...v, [votingFor.id]: { decision, rationale } }));
            setVotingFor(null);
          }}
        />
      )}
    </div>
  );
};
