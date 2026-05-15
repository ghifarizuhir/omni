import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle2, XCircle, Clock, CalendarDays, MessageSquare, User } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { OnCallOverride } from '@/src/types/platform';
import { formatDate } from '@/src/lib/format';

interface OverrideCardProps {
  override: OnCallOverride;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

function getOverrideStatus(override: OnCallOverride, today: Date): 'PENDING APPROVAL' | 'APPROVED' | 'PAST' | 'REJECTED' | 'CANCELLED' {
  if (override.status === 'pending') return 'PENDING APPROVAL';
  if (override.status === 'rejected') return 'REJECTED';
  if (override.status === 'cancelled') return 'CANCELLED';
  // approved — check if past
  if (new Date(override.endAt) < today) return 'PAST';
  return 'APPROVED';
}

function statusBadgeVariant(status: string): 'warning' | 'success' | 'neutral' | 'danger' {
  if (status === 'PENDING APPROVAL') return 'warning';
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'danger';
  return 'neutral';
}

export const OverrideCard: React.FC<OverrideCardProps> = ({ override, onApprove, onReject }) => {
  const today = useMemo(() => new Date(), []);
  const displayStatus = getOverrideStatus(override, today);

  return (
    <Card className="flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-ois-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={statusBadgeVariant(displayStatus)}>{displayStatus}</Badge>
            <span className="text-[11px] font-mono text-ois-text-muted">{override.publicId}</span>
          </div>
          <p className="text-sm font-semibold text-ois-text">{override.scheduleName}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col gap-3 text-sm flex-1">
        {/* Original → Replacement */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <User size={13} className="text-ois-text-muted" />
            <span className="font-medium text-ois-text">{override.originalUserName}</span>
          </div>
          <ArrowRight size={13} className="text-ois-text-muted shrink-0" />
          <div className="flex items-center gap-1.5">
            <User size={13} className="text-ois-primary" />
            <span className="font-semibold text-ois-primary">{override.overrideUserName}</span>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-1.5 text-xs text-ois-text-muted">
          <CalendarDays size={13} />
          <span>
            {formatDate(override.startAt, 'MMM d, yyyy HH:mm')} UTC
            {' – '}
            {formatDate(override.endAt, 'MMM d, yyyy HH:mm')} UTC
          </span>
        </div>

        {/* Reason */}
        {override.reason && (
          <div className="flex items-start gap-1.5 text-xs text-ois-text-muted">
            <MessageSquare size={13} className="mt-0.5 shrink-0" />
            <span className="text-ois-text-subtle">{override.reason}</span>
          </div>
        )}

        {/* Requested by */}
        <div className="flex items-center gap-1.5 text-xs text-ois-text-muted">
          <Clock size={13} />
          <span>Requested by <span className="text-ois-text-subtle font-medium">{override.requestedByName}</span></span>
          <span>·</span>
          <span>{formatDate(override.createdAt, 'MMM d, yyyy')}</span>
        </div>

        {/* Approval info */}
        {override.approvedByName && (
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 size={13} className="text-ois-success" />
            <span className="text-ois-text-muted">
              Approved by <span className="text-ois-text-subtle font-medium">{override.approvedByName}</span>
              {override.approvedAt && (
                <> · {formatDate(override.approvedAt, 'MMM d, yyyy')}</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Actions for pending */}
      {override.status === 'pending' && onApprove && onReject && (
        <div className="px-5 py-3 border-t border-ois-border bg-ois-surface-muted/50 flex items-center gap-2 justify-end">
          <Button
            variant="secondary"
            size="sm"
            className="text-ois-danger border-ois-danger/30 hover:bg-ois-danger-pale"
            onClick={() => onReject(override.id)}
          >
            <XCircle size={13} className="mr-1.5" />
            Reject
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onApprove(override.id)}
          >
            <CheckCircle2 size={13} className="mr-1.5" />
            Approve
          </Button>
        </div>
      )}
    </Card>
  );
};
