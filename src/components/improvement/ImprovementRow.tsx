import React, { useMemo } from 'react';
import { MoreVertical, AlertCircle, Zap } from 'lucide-react';
import { ImprovementInitiative } from '../../types/improvement';
import { formatBenefitUSD } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { ImprovementStatusPill } from './ImprovementStatusPill';
import { ImprovementCategoryChip } from './ImprovementCategoryChip';
import { ImprovementPriorityDot } from './ImprovementPriorityDot';
import { ImprovementProgressBar } from './ImprovementProgressBar';
import { BenefitTypeChip } from './BenefitTypeChip';

export interface ImprovementRowProps {
  initiative: ImprovementInitiative;
  onOpen: () => void;
}

function formatDate(str?: string): string {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const ImprovementRow: React.FC<ImprovementRowProps> = ({ initiative, onOpen }) => {
  const today = useMemo(() => new Date(), []);
  const isPastDue = initiative.targetCompletionDate
    ? new Date(initiative.targetCompletionDate) < today
    : false;

  const linkedId = initiative.linkedProblemPublicId ?? initiative.linkedIncidentPublicId;
  const sourceIcon = initiative.linkedProblemPublicId
    ? <AlertCircle size={12} className="text-purple-500" />
    : initiative.linkedIncidentPublicId
      ? <Zap size={12} className="text-red-500" />
      : null;

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
      <td className="px-3 py-2">
        <ImprovementPriorityDot priority={initiative.priority} />
      </td>
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-gray-600 whitespace-nowrap">{initiative.publicId}</span>
      </td>
      <td className="px-3 py-2 max-w-[200px]">
        <span className="text-sm font-semibold text-gray-900 block truncate">{initiative.title}</span>
      </td>
      <td className="px-3 py-2">
        <ImprovementStatusPill status={initiative.status} />
      </td>
      <td className="px-3 py-2">
        <ImprovementCategoryChip category={initiative.category} />
      </td>
      <td className="px-3 py-2 min-w-[120px]">
        <ImprovementProgressBar percent={initiative.progressPercent} showLabel size="sm" />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-800">
            {formatBenefitUSD(initiative.estimatedBenefit.annualValueUSD)}
          </span>
          <BenefitTypeChip type={initiative.estimatedBenefit.primaryType} />
        </div>
      </td>
      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{initiative.ownerName}</td>
      <td className="px-3 py-2">
        {linkedId ? (
          <span className="flex items-center gap-1 text-xs text-gray-600">
            {sourceIcon}
            <span className="font-mono">{linkedId}</span>
          </span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span className={cn('text-xs', isPastDue ? 'text-red-600 font-medium' : 'text-gray-600')}>
          {formatDate(initiative.targetCompletionDate)}
        </span>
      </td>
      <td className="px-3 py-2">
        <button
          onClick={onOpen}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <MoreVertical size={16} />
        </button>
      </td>
    </tr>
  );
}
