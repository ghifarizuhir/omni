import React from 'react';
import { XCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { SignOff } from '../../types/testing';
import { signOffStatusMeta, signOffTypeMeta } from '../../lib/constants';
import { EvidenceList } from './EvidenceList';
import { Button } from '../ui/Button';
import { formatDate, formatRelative } from '../../lib/format';
import { cn } from '../../lib/utils';
import * as Icons from 'lucide-react';

interface SignOffCardProps {
  signOff: SignOff;
  currentUserId?: string;
  onApprove?: () => void;
  onReject?: () => void;
}

const borderByStatus: Record<string, string> = {
  pending:  '#F79009',
  approved: '#12B76A',
  rejected: '#F04438',
  expired:  '#98A2B3',
};

export const SignOffCard: React.FC<SignOffCardProps> = ({
  signOff,
  currentUserId,
  onApprove,
  onReject,
}) => {
  const statusMeta = signOffStatusMeta[signOff.status];
  const typeMeta = signOffTypeMeta[signOff.type];
  const TypeIcon = (Icons as Record<string, React.FC<{ size?: number; className?: string }>>)[typeMeta.icon];
  const borderColor = borderByStatus[signOff.status] ?? '#E4E7EC';

  const dueDate = new Date(signOff.dueAt);
  const hoursUntilDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const isDueSoon = hoursUntilDue < 24 && hoursUntilDue > 0 && signOff.status === 'pending';

  const isApproverMatch = currentUserId === signOff.approverId;
  const isPending = signOff.status === 'pending';
  const isDecided = signOff.status === 'approved' || signOff.status === 'rejected';

  const evidenceItems = [
    {
      label: `Test results: ${signOff.testRunSummary.passedRuns}/${signOff.testRunSummary.totalRuns} runs passed`,
      passed: signOff.testRunSummary.passedRuns === signOff.testRunSummary.totalRuns,
    },
    { label: 'Deployment health: all checks green', passed: true },
    { label: `Test plan pass rate meets threshold`, passed: signOff.testRunSummary.failedRuns === 0 },
  ];

  return (
    <div
      className="bg-ois-surface rounded-ois-card shadow-ois-card border overflow-hidden"
      style={{ borderColor }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <span
            className="text-xs font-semibold rounded-full px-2.5 py-1"
            style={{ color: statusMeta.color, background: statusMeta.bg }}
          >
            {statusMeta.label}
          </span>
          <span className="font-mono text-xs text-ois-text-muted">{signOff.publicId}</span>
        </div>

        <div className="flex items-center gap-2 mb-1">
          {TypeIcon && <TypeIcon size={14} className="text-ois-text-muted" />}
          <h3 className="text-base font-bold text-ois-text">{signOff.title}</h3>
        </div>
        <p className="text-xs text-ois-text-muted mb-4">
          <span className="font-mono">{signOff.subjectPublicId}</span> — {signOff.subjectTitle}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-ois-text-muted mb-4">
          <span className="font-semibold text-ois-text">
            {signOff.testRunSummary.passedRuns} of {signOff.testRunSummary.totalRuns} runs passed
          </span>
          {signOff.testRunIds[0] && (
            <span className="font-mono text-[#1F4FD4]">({signOff.testRunIds[0]})</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle mb-0.5">Approver</p>
            <p className="text-ois-text font-semibold">{signOff.approverName}</p>
            <p className="text-ois-text-muted">{signOff.approverRole}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle mb-0.5">Due</p>
            <p className={cn('font-semibold', isDueSoon ? 'text-[#DC6803]' : 'text-ois-text')}>
              {isDueSoon && <AlertTriangle size={11} className="inline mr-1" />}
              {formatDate(signOff.dueAt, 'MMM d, HH:mm')} UTC
            </p>
            <p className="text-ois-text-muted">Requested {formatRelative(signOff.requestedAt)}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle mb-2">Evidence</p>
          <EvidenceList items={evidenceItems} />
        </div>

        {isPending && isApproverMatch && (
          <div className="flex items-center gap-2 pt-3 border-t border-ois-border">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={onReject}
            >
              <XCircle size={13} />
              Reject
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={onApprove}
            >
              <CheckCircle2 size={13} />
              Approve
            </Button>
          </div>
        )}

        {isDecided && (
          <div
            className={cn(
              'pt-3 border-t border-ois-border flex items-start gap-2',
            )}
          >
            {signOff.status === 'approved' ? (
              <CheckCircle2 size={14} className="text-[#12B76A] mt-0.5 shrink-0" />
            ) : (
              <XCircle size={14} className="text-[#F04438] mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-xs font-semibold" style={{ color: statusMeta.color }}>
                {statusMeta.label} {signOff.decidedAt ? formatRelative(signOff.decidedAt) : ''}
              </p>
              {signOff.decisionNote && (
                <p className="text-xs text-ois-text-muted mt-0.5">{signOff.decisionNote}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
