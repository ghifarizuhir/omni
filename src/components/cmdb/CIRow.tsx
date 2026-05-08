import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfigurationItem } from '../../types/ci';
import { CITypeIcon } from './CITypeIcon';
import { CIStatusBadge } from './CIStatusBadge';
import { CIHealthDot } from './CIHealthDot';
import { StatusBadge } from '../ui/StatusSeverityBadges';
import { Badge } from '../ui/Badge';
import { Layers, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CIRowProps {
  ci: ConfigurationItem;
  depth?: number;
  label?: string;
  isCrossService?: boolean;
  className?: string;
}

export const CIRow: React.FC<CIRowProps> = ({ 
  ci, 
  depth = 0, 
  label, 
  isCrossService,
  className 
}) => {
  const navigate = useNavigate();
  
  return (
    <div 
      onClick={() => navigate(`/cmdb/${ci.id}`)}
      className={cn(
        "group flex items-center gap-3 p-2 rounded-md hover:bg-ois-surface-muted transition-colors cursor-pointer border-l-2 border-transparent",
        depth > 0 && "ml-6",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-[240px]">
        {depth > 0 && label && (
          <span className="text-ois-text-subtle opacity-40 font-mono text-[10px]">▸ {label}</span>
        )}
        <CITypeIcon type={ci.type} size={12} />
        <div className="flex flex-col">
          <span className="text-[10px] font-mono font-bold text-ois-text-subtle uppercase leading-none mb-0.5">{ci.publicId}</span>
          <span className="text-sm font-semibold text-ois-text truncate group-hover:text-ois-primary transition-colors">{ci.name}</span>
        </div>
      </div>

      <div className="flex-1 flex items-center gap-4">
        {/* Attribute Snippet */}
        <span className="text-xs text-ois-text-subtle font-medium hidden md:inline">
          {ci.attributes.kind === 'server' ? ci.attributes.hostname : 
           ci.attributes.kind === 'application' ? ci.attributes.version : 
           ci.attributes.kind === 'database' ? ci.attributes.engine : ci.type}
        </span>
        
        <StatusBadge status={ci.health} />
        
        {isCrossService && <span className="text-[10px] font-bold text-ois-primary italic text-[9px]">(cross-service)</span>}
      </div>

      <div className="flex items-center gap-3 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-ois-text-subtle bg-ois-surface-muted px-1.5 py-0.5 rounded">
           <Layers size={10} /> {ci.monitoringRuleCount}
        </div>
        {ci.openIncidentCount > 0 && (
          <Badge variant="danger" className="text-[10px] h-4 py-0 flex items-center gap-1">
            <AlertTriangle size={10} /> {ci.openIncidentCount}
          </Badge>
        )}
        <span className="text-xs font-bold text-ois-primary">Open →</span>
      </div>
    </div>
  );
};
