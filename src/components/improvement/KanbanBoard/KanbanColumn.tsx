import React from 'react';
import { Plus } from 'lucide-react';
import { ImprovementInitiative, ImprovementStatus } from '../../../types/improvement';
import { improvementStatusMeta, formatBenefitUSD } from '../../../lib/constants';
import { cn } from '../../../lib/utils';
import { KanbanCard } from './KanbanCard';
import { useKanbanDrag } from './KanbanDragDropProvider';

interface KanbanColumnProps {
  status: ImprovementStatus;
  initiatives: ImprovementInitiative[];
  totalBenefit: number;
  actualBenefit?: number;
  onDrop: (initiativeId: string) => void;
  onAdd?: () => void;
  onNavigate: (publicId: string) => void;
}

export function KanbanColumn({
  status,
  initiatives,
  totalBenefit,
  actualBenefit,
  onDrop,
  onAdd,
  onNavigate,
}: KanbanColumnProps) {
  const meta = improvementStatusMeta[status];
  const { draggingId, overColumn, setOverColumn } = useKanbanDrag();
  const isOver = overColumn === meta.column;
  const isCompleted = status === 'completed';

  const displayBenefit = isCompleted && actualBenefit != null ? actualBenefit : totalBenefit;

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setOverColumn(meta.column);
  }

  function handleDragLeave() {
    setOverColumn(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setOverColumn(null);
    if (draggingId) {
      onDrop(draggingId);
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border transition-colors min-w-[220px] w-[220px]',
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
          <span className="text-xs font-medium text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: meta.dot }}>
            {initiatives.length}
          </span>
        </div>
        <span className="text-xs text-gray-400">{formatBenefitUSD(displayBenefit)}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
        {initiatives.map((initiative) => (
          <React.Fragment key={initiative.id}>
            <KanbanCard
              initiative={initiative}
              onClick={() => onNavigate(initiative.publicId)}
            />
          </React.Fragment>
        ))}

        {initiatives.length === 0 && (
          <div
            className={cn(
              'rounded-lg border-2 border-dashed p-4 text-center',
              isOver ? 'border-blue-400' : 'border-gray-200',
            )}
          >
            <p className="text-xs text-gray-400">Drop here</p>
            {onAdd && (
              <button
                onClick={onAdd}
                className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 mx-auto"
              >
                <Plus size={12} /> Add
              </button>
            )}
          </div>
        )}

        {initiatives.length > 0 && onAdd && (
          <button
            onClick={onAdd}
            className="w-full text-xs text-gray-400 hover:text-blue-600 flex items-center justify-center gap-1 py-1 rounded border border-dashed border-gray-200 hover:border-blue-300 transition-colors"
          >
            <Plus size={12} /> Add
          </button>
        )}
      </div>
    </div>
  );
}
