import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Change } from '../../../types/change';
import { formatDate } from '../../../lib/format';
import { ChangeStatusPill } from '../ChangeStatusPill';
import { RiskBadge } from '../RiskBadge';

interface DayDetailPopoverProps {
  date: Date;
  changes: Change[];
  onClose: () => void;
}

export const DayDetailPopover: React.FC<DayDetailPopoverProps> = ({ date, changes, onClose }) => {
  const navigate = useNavigate();
  return (
    <div className="absolute z-30 top-full left-0 mt-1 w-80 bg-white rounded-xl shadow-2xl border border-ois-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ois-border bg-ois-bg">
        <span className="text-sm font-bold text-ois-text">
          {formatDate(date, 'EEEE, MMMM d')}
        </span>
        <button onClick={onClose} className="text-ois-text-subtle hover:text-ois-text">
          <X size={14} />
        </button>
      </div>
      <div className="divide-y divide-ois-border max-h-64 overflow-y-auto">
        {changes.map((c) => (
          <button
            key={c.id}
            onClick={() => { navigate(`/changes/${c.publicId}`); onClose(); }}
            className="w-full text-left px-4 py-3 hover:bg-ois-bg transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-ois-primary">{c.publicId}</span>
              <RiskBadge risk={c.risk} size="sm" />
            </div>
            <p className="text-xs text-ois-text font-medium leading-snug mb-1">{c.title}</p>
            <div className="flex items-center gap-2">
              <ChangeStatusPill status={c.status} size="sm" />
              <span className="text-[10px] text-ois-text-subtle">{formatDate(c.plannedStart, 'HH:mm')} UTC</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
