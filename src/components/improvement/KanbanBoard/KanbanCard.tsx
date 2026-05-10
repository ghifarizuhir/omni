import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, CheckCircle } from 'lucide-react';
import { ImprovementInitiative } from '../../../types/improvement';
import { formatBenefitUSD } from '../../../lib/constants';
import { cn } from '../../../lib/utils';
import { ImprovementPriorityDot } from '../ImprovementPriorityDot';
import { ImprovementCategoryChip } from '../ImprovementCategoryChip';
import { ImprovementProgressBar } from '../ImprovementProgressBar';
import { useKanbanDrag } from './KanbanDragDropProvider';

interface KanbanCardProps {
  initiative: ImprovementInitiative;
  onClick: () => void;
}

export function KanbanCard({ initiative, onClick }: KanbanCardProps) {
  const { setDraggingId } = useKanbanDrag();
  const isCompleted = initiative.status === 'completed';
  const showProgress = ['in_progress', 'validating'].includes(initiative.status);

  const targetDateStr = initiative.targetCompletionDate
    ? new Date(initiative.targetCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';

  return (
    <div
      draggable
      onDragStart={() => setDraggingId(initiative.id)}
      onDragEnd={() => setDraggingId(null)}
      onClick={onClick}
      className={cn(
        'relative rounded-lg border p-3 cursor-pointer transition-shadow hover:shadow-md select-none',
        isCompleted
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-white',
      )}
    >
      {isCompleted && (
        <span className="absolute top-2 right-2">
          <CheckCircle size={14} className="text-green-600" />
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <ImprovementPriorityDot priority={initiative.priority} />
        <ImprovementCategoryChip category={initiative.category} />
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-0.5">{initiative.title}</p>
      <p className="text-xs text-gray-400 font-mono mb-2">{initiative.publicId}</p>

      {/* Progress */}
      {showProgress && (
        <div className="mb-2">
          <ImprovementProgressBar percent={initiative.progressPercent} size="sm" showLabel />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <User size={11} />
          {initiative.ownerName.split(' ')[0]}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {targetDateStr}
        </span>
      </div>
      <div className="mt-1.5 text-xs text-gray-500">
        {formatBenefitUSD(initiative.estimatedBenefit.annualValueUSD)}/yr
        {' · '}
        <span className="text-green-700 font-medium">{initiative.estimatedROIPercent}% ROI</span>
      </div>
    </div>
  );
}
