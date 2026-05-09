import { AlertTriangle } from 'lucide-react';
import { SLABreach, SLATarget } from '../../types';

interface ActiveBreachesListProps {
  breaches: SLABreach[];
  slas: SLATarget[];
}

export function ActiveBreachesList({ breaches, slas }: ActiveBreachesListProps) {
  const active = breaches.filter((b) => b.status === 'active');

  const getSLAName = (slaId: string) => {
    return slas.find((s) => s.id === slaId)?.serviceName ?? slaId;
  };

  if (active.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        No active SLA breaches
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {active.map((breach) => {
        const overMinutes = breach.severityRatio > 1
          ? ((breach.severityRatio - 1) * 100).toFixed(0)
          : '0';
        const overPct = ((breach.severityRatio - 1) * 100).toFixed(1);

        return (
          <li key={breach.id} className="flex items-start gap-3 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-gray-900">{getSLAName(breach.slaId)}</p>
              <p className="text-xs text-red-600">
                {overMinutes} min over budget ({overPct}%)
              </p>
              {breach.triggeringIncidentIds.length > 0 && (
                <p className="text-xs text-gray-500">
                  Linked: {breach.triggeringIncidentIds.join(', ')}
                </p>
              )}
              {breach.linkedProblemPublicId && (
                <p className="text-xs text-gray-500">
                  Linked: {breach.linkedProblemPublicId}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
