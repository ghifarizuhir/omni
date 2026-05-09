import { Calendar, User, Edit, History, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { slaStatusMeta_avail } from '../../lib/constants';
import { SLATarget, SLABreach } from '../../types';
import { SLAStatusPill } from './SLAStatusPill';
import { ErrorBudgetBar } from './ErrorBudgetBar';

const tierColors: Record<string, { label: string; color: string; bg: string }> = {
  critical:  { label: 'Critical',  color: '#B42318', bg: '#FEF3F2' },
  important: { label: 'Important', color: '#DC6803', bg: '#FFFAEB' },
  standard:  { label: 'Standard',  color: '#475467', bg: '#F1F3F7' },
};

interface SLACardProps {
  sla: SLATarget;
  breach?: SLABreach;
}

export function SLACard({ sla, breach }: SLACardProps) {
  const statusMeta = slaStatusMeta_avail[sla.status];
  const tier = tierColors[sla.serviceTier] ?? tierColors.standard;

  const isAboveTarget = sla.currentValue >= sla.target;
  const delta = Math.abs(sla.currentValue - sla.target).toFixed(3);
  const performancePct = sla.target > 0
    ? Math.min((sla.currentValue / sla.target) * 100, 100)
    : 0;

  const showBudget =
    sla.metric === 'availability' &&
    sla.errorBudgetMinutes !== undefined &&
    sla.errorBudgetConsumedMinutes !== undefined &&
    sla.errorBudgetRemainingPercent !== undefined;

  return (
    <div
      className="relative rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: statusMeta.color }}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <SLAStatusPill status={sla.status} size="sm" />
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ color: tier.color, backgroundColor: tier.bg }}
              >
                {tier.label}
              </span>
            </div>
            <h3 className="mt-1.5 text-sm font-semibold text-gray-900 truncate">
              {sla.serviceName}
            </h3>
          </div>
          <span className="shrink-0 text-xs font-mono text-gray-400">{sla.publicId}</span>
        </div>

        {/* Target info */}
        <p className="text-xs text-gray-500">
          Availability target:{' '}
          <span className="font-medium text-gray-700">{sla.target}{sla.unit}</span>
          {' · '}Window: rolling 30 days
        </p>

        {/* Performance bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Current: <span className="font-medium text-gray-800">{sla.currentValue}{sla.unit}</span></span>
            <span className={cn('font-medium', isAboveTarget ? 'text-green-700' : 'text-red-600')}>
              {isAboveTarget ? `↑ exceeding by ${delta}%` : `↓ below by ${delta}%`}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${performancePct}%`,
                backgroundColor: isAboveTarget ? '#12B76A' : '#F04438',
              }}
            />
          </div>
        </div>

        {/* Error budget bar */}
        {showBudget && (
          <ErrorBudgetBar
            consumed={sla.errorBudgetConsumedMinutes!}
            total={sla.errorBudgetMinutes!}
            remainingPercent={sla.errorBudgetRemainingPercent!}
            showLabels
          />
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {sla.ownerName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Effective {new Date(sla.effectiveFrom).toLocaleDateString()}
          </span>
          {sla.reviewDueAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Review {new Date(sla.reviewDueAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Active breach */}
        {breach && breach.status === 'active' && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Active Breach
            </div>
            <p className="text-xs text-red-600">
              Breached at {new Date(breach.breachedAt).toLocaleString()}
            </p>
            {breach.triggeringIncidentIds.length > 0 && (
              <p className="text-xs text-red-600">
                Linked: {breach.triggeringIncidentIds.join(', ')}
              </p>
            )}
            <button className="mt-1 inline-flex items-center rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
              Open incident
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <Edit className="h-3 w-3" />
            Edit
          </button>
          <button className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <History className="h-3 w-3" />
            History
          </button>
        </div>
      </div>
    </div>
  );
}
