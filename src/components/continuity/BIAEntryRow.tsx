import React from 'react';
import { MoreHorizontal, AlertCircle } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { BIAImpactLevelPill } from './BIAImpactLevelPill';
import { rtoClassMeta } from '@/src/lib/constants';
import { BIAEntry } from '@/src/types/continuity';

interface Props {
  entry: BIAEntry;
  onOpen: (entry: BIAEntry) => void;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isOverdue(isoString: string): boolean {
  return new Date(isoString) < new Date('2026-05-10');
}

export const BIAEntryRow: React.FC<Props> = ({ entry, onOpen }) => {
  const rtoMeta = rtoClassMeta[entry.rtoClass];
  const overdue = isOverdue(entry.nextReviewAt);

  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => onOpen(entry)}>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm font-semibold text-gray-900">{entry.serviceName}</p>
        <p className="text-xs font-mono text-gray-400">{entry.publicId}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <BIAImpactLevelPill level={entry.impactLevel} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
        {entry.rto} min
        <span className="text-xs text-gray-400 ml-1">({rtoMeta.label})</span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
        {entry.rpoMinutes} min
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
        ${entry.estimatedHourlyCostUSD.toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {entry.regulatoryCompliance.map((std) => (
            <span
              key={std}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
            >
              {std}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {entry.linkedDRPlanPublicIds.length > 0 ? (
          <span className="font-mono text-xs text-blue-600 hover:underline">
            {entry.linkedDRPlanPublicIds[0]}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-600">{formatDate(entry.lastReviewedAt)}</span>
          {overdue && (
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" title="Review overdue" />
          )}
        </div>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
};
