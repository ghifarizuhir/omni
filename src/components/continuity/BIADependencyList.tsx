import React from 'react';
import { Layers, Server, Globe, AlertTriangle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { BIAEntry } from '@/src/types/continuity';

interface Props {
  dependencies: BIAEntry['criticalDependencies'];
}

const typeIcon = {
  service: Layers,
  ci: Server,
  external: Globe,
} as const;

const typeLabel = {
  service: 'Service',
  ci: 'CI',
  external: 'External',
} as const;

export const BIADependencyList: React.FC<Props> = ({ dependencies }) => {
  if (!dependencies.length) {
    return <p className="text-sm text-gray-400 italic">No dependencies recorded.</p>;
  }

  return (
    <ul className="space-y-2">
      {dependencies.map((dep) => {
        const Icon = typeIcon[dep.type];
        return (
          <li
            key={dep.referenceId}
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            <Icon className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">{dep.referenceName}</span>
            </div>
            <span className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
              {typeLabel[dep.type]}
            </span>
            {dep.failoverAvailable ? (
              <span className="text-[11px] font-medium text-green-700 bg-green-50 rounded px-1.5 py-0.5 shrink-0">
                ✓ Failover available
              </span>
            ) : (
              <span className="text-[11px] font-medium text-red-700 bg-red-50 rounded px-1.5 py-0.5 shrink-0">
                ✗ No fallback
              </span>
            )}
            {dep.dependencyType === 'hard' && (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" title="Hard dependency" />
            )}
          </li>
        );
      })}
    </ul>
  );
};
