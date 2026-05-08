import React from 'react';
import { CIType, RelationshipType } from '../../../types/ci';
import { ciTypeMeta, relationshipTypeMeta } from '../../../lib/constants';
import { Filter, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface GraphFilterPanelProps {
  selectedTypes: CIType[];
  onToggleType: (type: CIType) => void;
  selectedRels: RelationshipType[];
  onToggleRel: (rel: RelationshipType) => void;
}

export const GraphFilterPanel: React.FC<GraphFilterPanelProps> = ({
  selectedTypes,
  onToggleType,
  selectedRels,
  onToggleRel
}) => {
  return (
    <div className="w-64 bg-white border-r border-ois-border flex flex-col">
      <div className="p-4 border-b border-ois-border bg-ois-surface-muted/30">
        <div className="flex items-center gap-2 font-bold text-ois-text">
          <Filter size={16} /> Filters
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {/* Node Types */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest flex items-center justify-between">
            CI Types
            <span className="text-[10px] lowercase font-normal italic">({selectedTypes.length} selected)</span>
          </div>
          <div className="space-y-1">
            {(Object.keys(ciTypeMeta) as CIType[]).map(type => {
              const meta = ciTypeMeta[type];
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => onToggleType(type)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                    isSelected ? "bg-ois-primary-pale text-ois-primary font-semibold" : "hover:bg-ois-surface-muted text-ois-text-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                    {meta.label}
                  </div>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Relationship Types */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest flex items-center justify-between">
            Relationships
          </div>
          <div className="space-y-1">
            {(Object.keys(relationshipTypeMeta) as RelationshipType[]).map(rel => {
              const meta = relationshipTypeMeta[rel];
              const isSelected = selectedRels.includes(rel);
              return (
                <button
                  key={rel}
                  onClick={() => onToggleRel(rel)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                    isSelected ? "bg-ois-surface-muted text-ois-text font-semibold" : "hover:bg-ois-surface-muted/50 text-ois-text-muted"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-0.5" 
                      style={{ 
                        backgroundColor: meta.color,
                        borderBottom: meta.lineStyle === 'dashed' ? `1px dashed ${meta.color}` : 'none',
                        height: meta.lineStyle === 'dashed' ? '0' : '2px'
                      }} 
                    />
                    {meta.label}
                  </div>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-ois-border">
         <button className="w-full py-2 text-xs font-bold text-ois-text-subtle hover:text-ois-primary transition-colors">
           Reset All
         </button>
      </div>
    </div>
  );
};
