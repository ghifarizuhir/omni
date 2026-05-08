import React, { useState } from 'react';
import { ConfigurationItem, RelationshipType } from '../../types/ci';
import { CIRow } from './CIRow';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TreeDataNode {
  ci: ConfigurationItem;
  label?: string;
  isCrossService?: boolean;
  children?: TreeDataNode[];
}

interface CITreeNodeProps {
  node: TreeDataNode;
  depth?: number;
}

export const CITreeNode: React.FC<CITreeNodeProps> = ({ node, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 1); // Expand first level by default
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative">
      {hasChildren && (
        <div 
          className="absolute left-[-18px] top-6 bottom-0 w-px bg-ois-border opacity-50 z-0" 
          style={{ marginLeft: `${depth * 24}px` }}
        />
      )}
      
      <div className="flex items-center">
        {hasChildren ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-ois-surface-muted rounded-md z-10 -ml-1 mr-1"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <div className="w-5" />
        )}
        
        <CIRow 
          ci={node.ci} 
          depth={0} // Depth is managed by padding-left in parent container
          label={node.label} 
          isCrossService={node.isCrossService}
          className="flex-1"
        />
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-6 space-y-1 mt-1">
          {node.children!.map((child, idx) => (
            <CITreeNode key={`${child.ci.id}-${idx}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
