import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { Change } from '../../../types/change';
import { RiskBadge } from '../RiskBadge';
import { formatDate } from '../../../lib/format';

interface BoardColumnProps {
  label: string;
  changes: Change[];
  highlightId?: string;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({ label, changes, highlightId }) => {
  const navigate = useNavigate();
  return (
    <div className="min-w-[200px] flex flex-col">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-ois-border">
        <span className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">{label}</span>
        <span className="bg-ois-bg border border-ois-border text-[10px] font-bold text-ois-text-subtle px-1.5 py-0.5 rounded-full">
          {changes.length}
        </span>
      </div>
      <div className="space-y-2 flex-1">
        {changes.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/changes/${c.publicId}`)}
            className={cn(
              'w-full text-left p-3 rounded-lg border bg-white hover:shadow-md transition-all text-xs',
              c.publicId === highlightId
                ? 'border-ois-primary shadow-sm ring-1 ring-ois-primary/20'
                : 'border-ois-border hover:border-ois-border-strong',
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] font-bold text-ois-primary">{c.publicId}</span>
              {c.publicId === highlightId && (
                <span className="text-amber-500 text-[11px]">★</span>
              )}
            </div>
            <p className="text-ois-text font-medium leading-snug mb-2 line-clamp-2">{c.title}</p>
            <div className="flex items-center gap-1.5">
              <RiskBadge risk={c.risk} size="sm" />
              {c.plannedStart && (
                <span className="text-[10px] text-ois-text-subtle">
                  {formatDate(c.plannedStart, 'MMM d')}
                </span>
              )}
            </div>
          </button>
        ))}
        {changes.length === 0 && (
          <div className="text-[11px] text-ois-text-subtle italic py-4 text-center">Empty</div>
        )}
      </div>
    </div>
  );
};
