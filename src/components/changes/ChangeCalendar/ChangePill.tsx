import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { Change } from '../../../types/change';
import { formatDate } from '../../../lib/format';

const riskColor: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-red-200 text-red-900 border-red-300',
};

interface ChangePillProps {
  change: Change;
}

export const ChangePill: React.FC<ChangePillProps> = ({ change }) => {
  const navigate = useNavigate();
  const short = change.publicId.replace('CHG-2026-', '');
  const component = change.affectedCIIds[0]?.split('-')[2] ?? change.ownerTeamId;
  const time = formatDate(change.plannedStart, 'HH:mm');

  return (
    <button
      onClick={() => navigate(`/changes/${change.publicId}`)}
      className={cn(
        'w-full text-left text-[10px] leading-tight px-1.5 py-1 rounded border font-medium truncate hover:opacity-80 transition-opacity',
        riskColor[change.risk],
      )}
      title={`${change.publicId} — ${change.title}`}
    >
      <span className="font-bold">{short}</span>{' '}
      <span className="opacity-75">{component?.toLowerCase()} {time}</span>
    </button>
  );
};
