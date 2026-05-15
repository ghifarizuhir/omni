import React from 'react';
import { Layers } from 'lucide-react';
import { useScope } from '@/src/lib/scope/ScopeContext';
import { useScopeUiEnabled } from '@/src/lib/scope/featureFlag';
import { cn } from '@/src/lib/utils';

const criticalityColors: Record<string, string> = {
  critical: 'bg-red-50 border-red-300 text-red-700',
  high:     'bg-amber-50 border-amber-300 text-amber-700',
  medium:   'bg-yellow-50 border-yellow-300 text-yellow-700',
  low:      'bg-emerald-50 border-emerald-300 text-emerald-700',
};

export const PageScopeChip: React.FC = () => {
  const enabled = useScopeUiEnabled();
  const { scope, myApps } = useScope();

  if (!enabled) return null;

  if (scope === 'all') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-ois-border text-xs font-medium text-ois-text-muted">
        <Layers size={12} />
        All my apps
      </span>
    );
  }

  const app = myApps.find((a) => a.id === scope.appId);
  const colorClass = app?.criticality ? (criticalityColors[app.criticality] ?? 'bg-gray-100 border-gray-300 text-gray-700') : 'bg-gray-100 border-gray-300 text-gray-700';

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium', colorClass)}>
      <Layers size={12} />
      {app?.name ?? scope.appId}
    </span>
  );
};
