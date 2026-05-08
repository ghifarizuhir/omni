import React from 'react';
import { RelationshipType } from '../../types/ci';
import { relationshipTypeMeta } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface CIRelationshipBadgeProps {
  type: RelationshipType;
  className?: string;
  isIncoming?: boolean;
}

export const CIRelationshipBadge: React.FC<CIRelationshipBadgeProps> = ({ 
  type, 
  className,
  isIncoming = false 
}) => {
  const meta = relationshipTypeMeta[type] || { label: type, color: '#475467' };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span 
        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight"
        style={{ color: meta.color, backgroundColor: `${meta.color}15` }}
      >
        {isIncoming ? `← ${meta.label}` : `${meta.label} →`}
      </span>
    </div>
  );
};
