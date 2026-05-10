import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Change } from '../../types/change';
import { ChangeStatusPill } from './ChangeStatusPill';
import { ChangeTypeChip } from './ChangeTypeChip';
import { RiskBadge } from './RiskBadge';
import { formatDate } from '../../lib/format';

interface ChangeRowProps {
  change: Change;
}

export const ChangeRow: React.FC<ChangeRowProps> = ({ change }) => {
  const navigate = useNavigate();
  return (
    <tr
      className="hover:bg-ois-bg cursor-pointer border-b border-ois-border last:border-0 transition-colors"
      onClick={() => navigate(`/changes/${change.publicId}`)}
    >
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-bold text-ois-primary">{change.publicId}</span>
      </td>
      <td className="px-4 py-3 max-w-xs">
        <p className="text-sm font-medium text-ois-text truncate">{change.title}</p>
      </td>
      <td className="px-4 py-3">
        <ChangeTypeChip type={change.type} size="sm" />
      </td>
      <td className="px-4 py-3">
        <ChangeStatusPill status={change.status} size="sm" />
      </td>
      <td className="px-4 py-3">
        <RiskBadge risk={change.risk} score={change.riskScore} size="sm" />
      </td>
      <td className="px-4 py-3 text-xs text-ois-text-muted">{change.ownerName}</td>
      <td className="px-4 py-3 text-xs text-ois-text-muted whitespace-nowrap">
        {formatDate(change.plannedStart, 'MMM d, HH:mm')}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/changes/${change.publicId}`); }}
          className="text-ois-text-subtle hover:text-ois-primary transition-colors"
        >
          <ExternalLink size={14} />
        </button>
      </td>
    </tr>
  );
};
