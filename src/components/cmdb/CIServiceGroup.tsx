import React from 'react';
import { ChevronDown, ChevronRight, Globe, Settings } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { StatusBadge } from '../ui/StatusSeverityBadges';
import { ServiceHealthStatus } from '../../types/common';
import { cn } from '../../lib/utils';

interface CIServiceGroupProps {
  name: string;
  count: number;
  health: ServiceHealthStatus;
  isExpanded: boolean;
  onToggle: () => void;
  isUnassigned?: boolean;
}

export const CIServiceGroup: React.FC<CIServiceGroupProps> = ({ 
  name, 
  count, 
  health, 
  isExpanded, 
  onToggle, 
  isUnassigned = false 
}) => {
  return (
    <div 
      className="flex items-center justify-between p-4 bg-ois-surface-muted/30 cursor-pointer hover:bg-ois-surface-muted/50 transition-colors border-b border-ois-border"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {isUnassigned ? (
          <Settings size={18} className="text-ois-text-subtle" />
        ) : (
          <Globe size={18} className="text-ois-primary" />
        )}
        <span className="font-bold text-ois-text">{name}</span>
        <Badge variant="neutral" className="bg-ois-surface-muted text-ois-text-muted text-[10px] py-0 h-5 md:h-6">
          {count} items
        </Badge>
      </div>
      <StatusBadge status={health} />
    </div>
  );
};
