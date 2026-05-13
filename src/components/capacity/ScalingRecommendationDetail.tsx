import { useState } from 'react';
import { Clock, DollarSign, Calendar, Link as LinkIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ScalingRecommendation } from '../../types';
import { recommendationPriorityMeta } from '../../lib/constants';
import { Button } from '../ui/Button';
import { useToast, ToastView } from '../../lib/useToast';

interface ScalingRecommendationDetailProps {
  rec: ScalingRecommendation;
}

const statusMeta: Record<ScalingRecommendation['status'], { label: string; color: string; bg: string }> = {
  open:         { label: 'Open',         color: '#1F4FD4', bg: '#EEF2FF' },
  acknowledged: { label: 'Acknowledged', color: '#0BA5EC', bg: '#F0F9FF' },
  in_progress:  { label: 'In Progress',  color: '#DC6803', bg: '#FFFAEB' },
  implemented:  { label: 'Implemented',  color: '#067647', bg: '#ECFDF3' },
  dismissed:    { label: 'Dismissed',    color: '#475467', bg: '#F1F3F7' },
};

export function ScalingRecommendationDetail({ rec }: ScalingRecommendationDetailProps) {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [localStatus, setLocalStatus] = useState<ScalingRecommendation['status']>(rec.status);
  const [dismissReason, setDismissReason] = useState<string | undefined>(rec.dismissedReason);

  const priorityMeta = recommendationPriorityMeta[rec.priority];
  const status = statusMeta[localStatus];

  const handleAcknowledge = () => {
    setLocalStatus('acknowledged');
    showToast(`Acknowledged ${rec.publicId}`, 'success');
  };

  const handleImplement = () => {
    showToast(`Drafting change for ${rec.publicId}…`, 'info');
    setLocalStatus('in_progress');
    setTimeout(() => navigate('/changes'), 600);
  };

  const handleDismiss = () => {
    const reason = window.prompt('Why are you dismissing this recommendation?');
    if (reason === null) return;
    setDismissReason(reason || 'No reason provided');
    setLocalStatus('dismissed');
    showToast(`Dismissed ${rec.publicId}`, 'warning');
  };

  const costSign = rec.estimatedCostMonthlyUSD !== undefined
    ? rec.estimatedCostMonthlyUSD >= 0
      ? `+$${rec.estimatedCostMonthlyUSD}`
      : `-$${Math.abs(rec.estimatedCostMonthlyUSD)}`
    : null;

  return (
    <div className="space-y-5">
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ color: priorityMeta.color, backgroundColor: priorityMeta.bg }}
        >
          {priorityMeta.label} priority
        </span>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ color: status.color, backgroundColor: status.bg }}
        >
          {status.label}
        </span>
        <span className="font-mono text-xs text-gray-400">{rec.publicId}</span>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-base font-semibold text-gray-900">{rec.metricName}</h3>
        {rec.serviceName && <p className="text-sm text-gray-500">{rec.serviceName}</p>}
      </div>

      {/* Detail grid */}
      <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
        <DetailRow label="Reason" value={rec.reason} />
        <DetailRow label="Suggested action" value={rec.suggestedAction} />
        <DetailRow label="Estimated impact" value={rec.estimatedImpact} />
        <DetailRow label="CI" value={rec.ciPublicId} mono />
        <DetailRow label="Metric" value={rec.metricPublicId} mono />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        {rec.daysUntilCriticalIfIgnored !== undefined && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-gray-400" />
            {rec.daysUntilCriticalIfIgnored} days until critical if ignored
          </span>
        )}
        {costSign !== null && (
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-gray-400" />
            {costSign}/month
          </span>
        )}
        {rec.expiresAt && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            Expires {new Date(rec.expiresAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Links */}
      <div className="flex flex-col gap-2">
        {rec.forecastId && (
          <Link
            to="/capacity/forecast"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
          >
            <LinkIcon className="h-4 w-4" />
            View forecast
          </Link>
        )}
        {rec.implementedViaChangeId && (
          <Link
            to="/changes"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
          >
            <LinkIcon className="h-4 w-4" />
            Linked change: {rec.implementedViaChangeId.toUpperCase().replace('chg-', 'CHG-')}
          </Link>
        )}
      </div>

      {/* Dismissed reason */}
      {localStatus === 'dismissed' && dismissReason && (
        <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500">
          <span className="font-medium text-gray-600">Dismissed reason: </span>
          {dismissReason}
        </div>
      )}

      {/* Actions */}
      {localStatus !== 'dismissed' && localStatus !== 'implemented' && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <Button
            variant="default"
            size="sm"
            onClick={handleAcknowledge}
            disabled={localStatus === 'acknowledged' || localStatus === 'in_progress'}
          >
            {localStatus === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleImplement}>
            Implement via change
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-red-600"
            onClick={handleDismiss}
          >
            Dismiss
          </Button>
        </div>
      )}
      <ToastView toast={toast} />
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-4 py-3 flex gap-4">
      <span className="text-xs font-medium text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
