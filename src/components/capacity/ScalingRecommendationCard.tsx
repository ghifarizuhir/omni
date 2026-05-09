import { Clock, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { ScalingRecommendation } from '../../types';
import { recommendationPriorityMeta } from '../../lib/constants';

interface ScalingRecommendationCardProps {
  rec: ScalingRecommendation;
  compact?: boolean;
}

const priorityBorder: Record<ScalingRecommendation['priority'], string> = {
  low: '#98A2B3',
  medium: '#1F4FD4',
  high: '#F79009',
  urgent: '#F04438',
};

const statusMeta: Record<ScalingRecommendation['status'], { label: string; color: string; bg: string }> = {
  open:         { label: 'Open',         color: '#1F4FD4', bg: '#EEF2FF' },
  acknowledged: { label: 'Acknowledged', color: '#0BA5EC', bg: '#F0F9FF' },
  in_progress:  { label: 'In Progress',  color: '#DC6803', bg: '#FFFAEB' },
  implemented:  { label: 'Implemented',  color: '#067647', bg: '#ECFDF3' },
  dismissed:    { label: 'Dismissed',    color: '#475467', bg: '#F1F3F7' },
};

export function ScalingRecommendationCard({ rec, compact }: ScalingRecommendationCardProps) {
  const priorityMeta = recommendationPriorityMeta[rec.priority];
  const status = statusMeta[rec.status];
  const borderColor = priorityBorder[rec.priority];
  const isDismissed = rec.status === 'dismissed';

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm',
          isDismissed && 'opacity-60',
        )}
        style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
      >
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
          style={{ color: priorityMeta.color, backgroundColor: priorityMeta.bg }}
        >
          {priorityMeta.label}
        </span>
        <span className="font-mono text-xs text-gray-400 shrink-0">{rec.publicId}</span>
        <span className="text-sm font-medium text-gray-800 truncate flex-1">{rec.metricName}</span>
        {rec.daysUntilCriticalIfIgnored !== undefined && (
          <span className="text-xs text-gray-500 shrink-0 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {rec.daysUntilCriticalIfIgnored}d
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden',
        isDismissed && 'opacity-70',
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ color: priorityMeta.color, backgroundColor: priorityMeta.bg }}
            >
              {priorityMeta.label}
            </span>
            <span className="font-mono text-xs text-gray-400">{rec.publicId}</span>
          </div>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
            style={{ color: status.color, backgroundColor: status.bg }}
          >
            {status.label}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-gray-900">{rec.metricName}</h3>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-gray-600">
          <p><span className="font-medium text-gray-700">Reason:</span> {rec.reason}</p>
          <p><span className="font-medium text-gray-700">Action:</span> {rec.suggestedAction}</p>
          <p><span className="font-medium text-gray-700">Impact:</span> {rec.estimatedImpact}</p>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          {rec.daysUntilCriticalIfIgnored !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {rec.daysUntilCriticalIfIgnored} days until critical
            </span>
          )}
          {rec.estimatedCostMonthlyUSD !== undefined && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {rec.estimatedCostMonthlyUSD > 0
                ? `+$${rec.estimatedCostMonthlyUSD}/month`
                : `-$${Math.abs(rec.estimatedCostMonthlyUSD)}/month`}
            </span>
          )}
        </div>

        {/* In-progress change link */}
        {rec.status === 'in_progress' && rec.implementedViaChangeId && (
          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
            Fix in progress:{' '}
            <Link to="/changes" className="font-mono font-medium underline hover:text-blue-900">
              {rec.implementedViaChangeId.toUpperCase().replace('chg-', 'CHG-')}
            </Link>
          </div>
        )}

        {/* Dismissed reason */}
        {rec.status === 'dismissed' && rec.dismissedReason && (
          <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500 italic">
            Dismissed: {rec.dismissedReason}
          </div>
        )}
      </div>
    </div>
  );
}
